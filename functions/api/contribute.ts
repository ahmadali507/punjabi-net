/**
 * Cloudflare Pages Function: POST /api/contribute
 *
 * Receives the contribution form (multipart), validates it, and then either
 *   - stores it in Workers KV (binding CONTRIBUTIONS), with any photo in R2
 *     (binding CONTRIBUTION_FILES) or, without R2, in KV; or
 *   - forwards it to Formspree (env FORMSPREE_ENDPOINT) if KV is not bound.
 * Then it redirects (303) to /contribute/thanks or /contribute/error, so the
 * form works without JavaScript. No accounts, no cookies.
 */
interface KV { put(key: string, value: string | ArrayBuffer, opts?: { metadata?: unknown }): Promise<void> }
interface R2 { put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown> }
export interface Env {
  CONTRIBUTIONS?: KV;
  CONTRIBUTION_FILES?: R2;
  FORMSPREE_ENDPOINT?: string;
}
interface Ctx { request: Request; env: Env }

export const MAX_PHOTO = 3.5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

export type Validated =
  | { ok: true; spam: boolean; lang: 'en' | 'pa'; message: string; contact: string; website?: string; photo?: File }
  | { ok: false; lang: 'en' | 'pa'; reason: string };

export function validate(form: FormData): Validated {
  const lang = form.get('lang') === 'pa' ? 'pa' : 'en';
  const str = (k: string) => String(form.get(k) ?? '').trim();
  if (str('company')) return { ok: true, spam: true, lang, message: '', contact: '' };
  const message = str('message');
  const contact = str('contact');
  const website = str('website');
  if (!message || message.length > 10_000) return { ok: false, lang, reason: 'message' };
  if (!contact || contact.length > 200) return { ok: false, lang, reason: 'contact' };
  if (website && (!/^https?:\/\/\S+$/i.test(website) || website.length > 300)) return { ok: false, lang, reason: 'website' };
  const p = form.get('photo');
  let photo: File | undefined;
  if (p && typeof p !== 'string' && p.size > 0) {
    if (p.size > MAX_PHOTO) return { ok: false, lang, reason: 'photo-size' };
    if (!PHOTO_TYPES.includes(p.type)) return { ok: false, lang, reason: 'photo-type' };
    photo = p;
  }
  return { ok: true, spam: false, lang, message, contact, website: website || undefined, photo };
}

const go = (request: Request, lang: 'en' | 'pa', page: 'thanks' | 'error', reason?: string) => {
  const url = new URL(`${lang === 'pa' ? '/pa' : ''}/contribute/${page}`, request.url);
  if (reason) url.searchParams.set('r', reason);
  return Response.redirect(url.toString(), 303);
};

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return go(request, 'en', 'error', 'form');
  }
  const v = validate(form);
  if (!v.ok) return go(request, v.lang, 'error', v.reason);
  if (v.spam) return go(request, v.lang, 'thanks');

  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  try {
    if (env.CONTRIBUTIONS) {
      let photoKey: string | undefined;
      if (v.photo) {
        photoKey = `photo/${at.slice(0, 10)}/${id}`;
        const bytes = await v.photo.arrayBuffer();
        if (env.CONTRIBUTION_FILES) await env.CONTRIBUTION_FILES.put(photoKey, bytes, { httpMetadata: { contentType: v.photo.type } });
        else await env.CONTRIBUTIONS.put(photoKey, bytes, { metadata: { type: v.photo.type, name: v.photo.name } });
      }
      const record = { id, at, lang: v.lang, message: v.message, contact: v.contact, website: v.website, photo: photoKey && { key: photoKey, name: v.photo!.name, type: v.photo!.type, size: v.photo!.size } };
      await env.CONTRIBUTIONS.put(`msg/${at}/${id}`, JSON.stringify(record));
    } else if (env.FORMSPREE_ENDPOINT) {
      const out = new FormData();
      out.set('message', v.message);
      out.set('contact', v.contact);
      out.set('_replyto', v.contact.includes('@') ? v.contact : '');
      if (v.website) out.set('website', v.website);
      out.set('lang', v.lang);
      if (v.photo) out.set('photo', v.photo, v.photo.name);
      const res = await fetch(env.FORMSPREE_ENDPOINT, { method: 'POST', body: out, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Formspree ${res.status}`);
    } else {
      return go(request, v.lang, 'error', 'not-configured');
    }
  } catch {
    return go(request, v.lang, 'error', 'store');
  }
  return go(request, v.lang, 'thanks');
}

export const onRequest = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });

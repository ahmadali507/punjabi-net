/** node --test tests/contribute.test.ts  (Node 22.6+ strips the types) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, MAX_PHOTO } from '../functions/api/contribute.ts';

const post = (fields: Record<string, string | Blob>, env = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v as string);
  return onRequestPost({ request: new Request('https://x.test/api/contribute', { method: 'POST', body: fd }), env });
};
const memKV = () => { const m = new Map<string, unknown>(); return { m, put: async (k: string, v: unknown) => void m.set(k, v) }; };

test('valid message is stored in KV and redirects to thanks', async () => {
  const kv = memKV();
  const r = await post({ message: 'Correction for Heer, p. 12', contact: 'a@b.c', lang: 'en' }, { CONTRIBUTIONS: kv });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), 'https://x.test/contribute/thanks');
  const [key, val] = [...kv.m][0];
  assert.match(key, /^msg\//);
  assert.equal(JSON.parse(val as string).message, 'Correction for Heer, p. 12');
});
test('Punjabi form redirects to /pa', async () => {
  const r = await post({ message: 'سلام', contact: '0300', lang: 'pa' }, { CONTRIBUTIONS: memKV() });
  assert.equal(r.headers.get('location'), 'https://x.test/pa/contribute/thanks');
});
test('empty message is rejected', async () => {
  const r = await post({ message: ' ', contact: 'a@b.c' }, { CONTRIBUTIONS: memKV() });
  assert.equal(r.headers.get('location'), 'https://x.test/contribute/error?r=message');
});
test('bad website is rejected', async () => {
  const r = await post({ message: 'x', contact: 'a', website: 'javascript:alert(1)' }, { CONTRIBUTIONS: memKV() });
  assert.match(r.headers.get('location')!, /r=website/);
});
test('photo over 3.5 MB is rejected', async () => {
  const big = new File([new Uint8Array(MAX_PHOTO + 1)], 'scan.jpg', { type: 'image/jpeg' });
  const r = await post({ message: 'x', contact: 'a', photo: big }, { CONTRIBUTIONS: memKV() });
  assert.match(r.headers.get('location')!, /r=photo-size/);
});
test('photo of 3.5 MB exactly is accepted and stored', async () => {
  const kv = memKV();
  const ok = new File([new Uint8Array(MAX_PHOTO)], 'scan.jpg', { type: 'image/jpeg' });
  const r = await post({ message: 'x', contact: 'a', photo: ok }, { CONTRIBUTIONS: kv });
  assert.match(r.headers.get('location')!, /thanks/);
  assert.ok([...kv.m.keys()].some((k) => k.startsWith('photo/')));
});
test('wrong file type is rejected', async () => {
  const f = new File(['x'], 'a.exe', { type: 'application/x-msdownload' });
  const r = await post({ message: 'x', contact: 'a', photo: f }, { CONTRIBUTIONS: memKV() });
  assert.match(r.headers.get('location')!, /r=photo-type/);
});
test('honeypot filled: silently thanked, nothing stored', async () => {
  const kv = memKV();
  const r = await post({ message: 'spam', contact: 'a', company: 'ACME' }, { CONTRIBUTIONS: kv });
  assert.match(r.headers.get('location')!, /thanks/);
  assert.equal(kv.m.size, 0);
});
test('no KV and no Formspree: error page says not configured', async () => {
  const r = await post({ message: 'x', contact: 'a' });
  assert.match(r.headers.get('location')!, /r=not-configured/);
});
test('Formspree fallback forwards the message', async () => {
  const calls: Request[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (u: string, init: RequestInit) => { calls.push(new Request(u, init)); return new Response('{}', { status: 200 }); }) as typeof fetch;
  try {
    const r = await post({ message: 'hello', contact: 'a@b.c' }, { FORMSPREE_ENDPOINT: 'https://formspree.io/f/test' });
    assert.match(r.headers.get('location')!, /thanks/);
    assert.equal(calls.length, 1);
    assert.equal((await calls[0].formData()).get('message'), 'hello');
  } finally { globalThis.fetch = orig; }
});

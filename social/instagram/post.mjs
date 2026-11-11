/**
 * Publish APPROVED posts from posts.json to Instagram, using the owner's browser session cookie.
 *
 * Safety rules (see social/instagram/README.md):
 *   - only posts with status "approved" are published; nothing else is touched;
 *   - one post per run by default (--max N to raise), with a pause between posts;
 *   - nothing is sent unless --publish is given (default is a dry run that only checks the login);
 *   - the cookie is read from a file outside the repo (IG_SESSION_FILE) and never printed or saved.
 *
 *   IG_SESSION_FILE=/path/to/sessionid node social/instagram/post.mjs            # check login, list what would post
 *   IG_SESSION_FILE=/path/to/sessionid node social/instagram/post.mjs --publish  # post the next approved one
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const QUEUE = join(HERE, 'posts.json');
const OUT = join(HERE, 'out');
const APP_ID = '936619743392459'; // Instagram web app id, sent by instagram.com itself
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const max = Number(args[args.indexOf('--max') + 1]) || 1;
const file = process.env.IG_SESSION_FILE;
if (!file) throw new Error('Set IG_SESSION_FILE to a file holding the sessionid cookie value');
const sessionid = readFileSync(file, 'utf8').trim().replace(/^sessionid=/, '');
const dsUserId = decodeURIComponent(sessionid).split(':')[0];

let csrftoken = '';
const cookie = () => `sessionid=${sessionid}; ds_user_id=${dsUserId}${csrftoken ? `; csrftoken=${csrftoken}` : ''}`;
const headers = (extra = {}) => ({
  'user-agent': UA, 'x-ig-app-id': APP_ID, 'x-requested-with': 'XMLHttpRequest', referer: 'https://www.instagram.com/',
  origin: 'https://www.instagram.com', cookie: cookie(), ...(csrftoken ? { 'x-csrftoken': csrftoken } : {}), ...extra,
});

// 1. A CSRF token for this session (instagram.com sets it on any page load).
{
  const r = await fetch('https://www.instagram.com/', { headers: headers({ accept: 'text/html' }) });
  csrftoken = (r.headers.getSetCookie?.() ?? []).map((c) => c.match(/^csrftoken=([^;]+)/)?.[1]).find(Boolean) ?? '';
  if (!csrftoken) throw new Error('Could not get a csrftoken: the session may have expired');
}

// 2. Who are we? Refuse to go on unless the session is valid.
const me = await fetch('https://www.instagram.com/api/v1/accounts/current_user/?edit=true', { headers: headers() });
if (!me.ok) throw new Error(`Login check failed (${me.status}): the session cookie is not valid`);
const username = (await me.json()).user?.username;
console.log(`Logged in as @${username}`);

const data = JSON.parse(readFileSync(QUEUE, 'utf8'));
const ready = data.posts.filter((p) => p.status === 'approved').slice(0, max);
if (!ready.length) { console.log('No approved posts waiting.'); process.exit(0); }
if (!publish) { console.log(`Dry run. Would post: ${ready.map((p) => p.id).join(', ')}. Add --publish to post.`); process.exit(0); }

for (const [n, post] of ready.entries()) {
  if (n > 0) await sleep(90_000 + Math.random() * 60_000); // never in quick succession
  const jpeg = readFileSync(join(OUT, `${post.id}.jpg`));
  const caption = readFileSync(join(OUT, `${post.id}.txt`), 'utf8').trim();
  const uploadId = String(Date.now());
  const name = `fb_uploader_${uploadId}`;

  const up = await fetch(`https://i.instagram.com/rupload_igphoto/${name}`, {
    method: 'POST',
    headers: headers({
      'content-type': 'image/jpeg', offset: '0', 'x-entity-name': name, 'x-entity-length': String(jpeg.length),
      'x-entity-type': 'image/jpeg',
      'x-instagram-rupload-params': JSON.stringify({ media_type: 1, upload_id: uploadId, upload_media_height: 1350, upload_media_width: 1080 }),
    }),
    body: jpeg,
  });
  if (!up.ok) throw new Error(`${post.id}: upload failed (${up.status}) ${await up.text()}`);

  const conf = await fetch('https://www.instagram.com/api/v1/media/configure/', {
    method: 'POST',
    headers: headers({ 'content-type': 'application/x-www-form-urlencoded' }),
    body: new URLSearchParams({ upload_id: uploadId, caption, source_type: 'library', disable_comments: '0', like_and_view_counts_disabled: '0' }),
  });
  const res = await conf.json().catch(() => ({}));
  if (!conf.ok || res.status !== 'ok') throw new Error(`${post.id}: publish failed (${conf.status}) ${JSON.stringify(res).slice(0, 300)}`);

  Object.assign(post, { status: 'posted', posted_at: new Date().toISOString(), account: username, media_id: res.media?.id, code: res.media?.code });
  writeFileSync(QUEUE, JSON.stringify(data, null, 2) + '\n');
  console.log(`Posted ${post.id}: https://www.instagram.com/p/${res.media?.code}/`);
}

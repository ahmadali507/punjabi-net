/**
 * Set @punjabidotnet's profile picture, name and bio through instagram.com's own web endpoints
 * (the same session type as the browser cookie). Reads the sessionid from IG_SESSION_FILE.
 *   IG_SESSION_FILE=… node social/instagram/profile/apply.mjs [--picture] [--text]
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const sid = readFileSync(process.env.IG_SESSION_FILE, 'utf8').trim().replace(/^sessionid=/, '');
const ds = decodeURIComponent(sid).split(':')[0];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
let csrf = '';
const H = (x = {}) => ({ 'user-agent': UA, 'x-ig-app-id': '936619743392459', 'x-requested-with': 'XMLHttpRequest', 'x-asbd-id': '129477',
  referer: 'https://www.instagram.com/accounts/edit/', origin: 'https://www.instagram.com',
  cookie: `sessionid=${sid}; ds_user_id=${ds}${csrf ? `; csrftoken=${csrf}` : ''}`, ...(csrf ? { 'x-csrftoken': csrf } : {}), ...x });

const home = await fetch('https://www.instagram.com/accounts/edit/', { headers: H({ accept: 'text/html' }) });
csrf = (home.headers.getSetCookie?.() ?? []).map((c) => c.match(/^csrftoken=([^;]+)/)?.[1]).find(Boolean) ?? '';
if (!csrf) throw new Error('no csrftoken');
const form = await (await fetch('https://www.instagram.com/api/v1/accounts/edit/web_form_data/', { headers: H() })).json();
const u = form.form_data;
if (!u || u.username !== 'punjabidotnet') throw new Error(`unexpected account: ${JSON.stringify(form).slice(0, 200)}`);
console.log(`@${u.username}: name=${JSON.stringify(u.first_name)} bio=${JSON.stringify(u.biography)}`);

if (process.argv.includes('--picture')) {
  await sleep(4000);
  const fd = new FormData();
  fd.append('profile_pic', new Blob([readFileSync(join(HERE, 'avatar.jpg'))], { type: 'image/jpeg' }), 'profilepic.jpg');
  const r = await fetch('https://www.instagram.com/accounts/web_change_profile_picture/', { method: 'POST', headers: H(), body: fd });
  console.log('picture:', r.status, (await r.text()).slice(0, 160));
}
if (process.argv.includes('--text')) {
  await sleep(6000);
  const p = JSON.parse(readFileSync(join(HERE, 'profile.json'), 'utf8'));
  const body = new URLSearchParams({ first_name: p.full_name, biography: p.biography, external_url: p.external_url ?? '',
    username: u.username, email: u.email ?? '', phone_number: u.phone_number ?? '', chaining_enabled: u.chaining_enabled ? 'on' : '' });
  const r = await fetch('https://www.instagram.com/api/v1/web/accounts/edit/', { method: 'POST', headers: H({ 'content-type': 'application/x-www-form-urlencoded' }), body });
  console.log('text:', r.status, (await r.text()).slice(0, 160));
}

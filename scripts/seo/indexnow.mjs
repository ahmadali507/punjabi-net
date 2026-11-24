/**
 * Tell IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search, Copilot and DuckDuckGo)
 * about the site's pages. The key file lives in public/<key>.txt and must already be live.
 *   node scripts/seo/indexnow.mjs            # every URL in the live sitemap
 *   node scripts/seo/indexnow.mjs <url> …    # just these URLs (after adding or editing a few pages)
 */
import { readdirSync } from 'node:fs';
const HOST = 'punjabii.net';
const key = readdirSync(new URL('../../public/', import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, -4);
if (!key) throw new Error('no IndexNow key file in public/');
let urls = process.argv.slice(2);
if (!urls.length) {
  const index = await (await fetch(`https://${HOST}/sitemap-index.xml`)).text();
  for (const sm of index.match(/<loc>[^<]+/g).map((s) => s.slice(5))) {
    urls.push(...(await (await fetch(sm)).text()).match(/<loc>[^<]+/g).map((s) => s.slice(5)));
  }
}
const live = await fetch(`https://${HOST}/${key}.txt`);
if (!live.ok || (await live.text()).trim() !== key) throw new Error(`key file not live at https://${HOST}/${key}.txt`);
for (let i = 0; i < urls.length; i += 10000) {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`${urls.slice(i, i + 10000).length} URLs → ${r.status} ${await r.text()}`);
}

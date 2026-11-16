# Scheduled posting for @punjabidotnet

Three posts a day, posted from T3's browser (Instagram website, logged in as punjabidotnet). No Python, no private API.

| Slot (UTC) | Pakistan time | What |
|---|---|---|
| 04:00 | 09:00 | Reel: next `approved` reel in `posts.json` |
| 09:00 | 14:00 | Carousel: next `approved` carousel in `carousels.json` |
| 15:00 | 20:00 | Reel: next `approved` reel in `posts.json` |

## Rules
- Post only items with `"status": "approved"`; take the first one in file order. Only ONE post per run.
- Reels follow the pushto.net structure (owner's decision, 2026-11-16): `"style": "lyric"` items, rendered with `node social/instagram/reel.mjs <id>`. A real singer's recording of the poem (`track`, cut by song.py to the sung lines, about 45–80 s), one line per screen in Shahmukhi with the couplet's earlier line faded above, a short English `gists` entry per verse, a `n / N` counter, and a closing card with the poet. The recording goes up inside the video as original audio, and the caption credits the singer. Post lyric reels with `post_reel.py --publish` (saved session); the web composer is fine too, since the audio is in the file. Never use a generated (AI) voice or a song longer than ~90 s.
- Lyric reel caption (built by reel.mjs): `<poem title> | <poet Shahmukhi> (<poet English>), sung by <singer>`, blank line, `Vocals: <singer>. Poetry: <poet>. All credit to the artist.`, blank line, `#punjabi #punjabipoetry #پنجابی #پنجابی_شاعری #poetry`. Add `Full poem: <link>` once punjabi.net is live.
- Older score-only reels (no `track`, music/compose.py) keep the video.mjs format.
- Verse text always comes from the poem files (`src/content/poems`). Never type or invent poem text.
- Captions are short, real and organic: one or two lines a person would actually write (a feeling or a plain hint of what the verse says), the poet's name, and 2–3 hashtags. No pasted verses, no translations, no "coming soon" or website pitch, no calls to share/save, no credits block. Audio credit: if a post ever uses a singer's voice or recording, name the singer in the caption (e.g. "🎵 Abida Parveen"); for our own score write "🎵 Original music". Never name a singer who isn't actually heard. Each item carries its caption in a `caption` field; the render scripts copy it to the caption file.
- If Instagram shows a checkpoint ("Confirm you're human", "Suspicious login", a code request, "Try again later" or any block), STOP: do not retry, set nothing to posted, and write the problem to `out/schedule.log`. The owner handles it.
- If not logged in, stop and log it (do not try to log in with a password).

## Steps for one run
1. Pick the item. Reel: `out/<id>.mp4` and caption `out/<id>-reel.txt` (render first if missing: `reel.mjs` for `style: lyric`, else `video.mjs`). Carousel: `out/<id>/slide-1..5.jpg` and `out/<id>/caption.txt` (render with `node social/instagram/carousel.mjs <id>` if missing). Env: `PLAYWRIGHT_CORE=/home/azureuser/.local/tools/node_modules/playwright-core/index.mjs`, PATH with `~/.local/node/bin` and `~/.local/tools/bin`.
2. Browser (T3 preview tools): open https://www.instagram.com/ in a background tab (`open=false`); check the left bar shows the punjabidotnet profile.
3. Click **Create** (New post) → upload the file(s) through `input[type=file]` (carousel: all 5 slides in order).
4. Crop: choose **4:5** for carousels (crop button bottom-left → 4:5); **9:16/Original** for reels. Next → Next.
5. Caption: focus the caption box (`[role=dialog] [contenteditable=true]`) and paste the caption text with a synthetic paste event (`DataTransfer` + `ClipboardEvent('paste')`). Check the counter equals the caption length. Click outside to close any hashtag suggestions.
6. Click **Share** (top right of the dialog). Wait for "Post shared" / "Reel shared".
7. Open https://www.instagram.com/punjabidotnet/ and get the new post's code from the first `/p/` or `/reel/` link.
8. Update the item: `status: posted`, `posted_at` (UTC ISO), `code`. Append a line to `out/schedule.log`. Commit as Ahmad Ali <ahmad.ali.000507@gmail.com> (no co-author line), e.g. `Instagram: posted <id>`.
9. Close the tab you opened.

## Keeping the queue full
When fewer than 2 approved reels or 1 approved carousel remain, prepare more (same run, after posting):
- Reels: new `posts.json` entries (`kind: reel`, `style: lyric`, a `track` found with find_tracks.py, `gists`, status `draft` until the owner approves), 2–4 sung lines from poems not yet posted; render with reel.mjs and check the line timing.
- Carousels: new `carousels.json` entries following c001–c003 (cover, 3 verse slides, closing slide), one theme or one poet, with a one-sentence English gist per verse (on the slides) and a short `caption`; render with carousel.mjs and look at the slides before approving.
- Never repeat a poem+verse that was already posted. Commit the new entries.

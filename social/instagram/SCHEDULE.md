# Scheduled posting for @punjabidotnet

Three posts a day, posted from T3's browser (Instagram website, logged in as punjabidotnet). No Python, no private API.

| Slot (UTC) | Pakistan time | What |
|---|---|---|
| 04:00 | 09:00 | Reel: next `approved` reel in `posts.json` |
| 09:00 | 14:00 | Carousel: next `approved` carousel in `carousels.json` |
| 15:00 | 20:00 | Reel: next `approved` reel in `posts.json` |

## Rules
- Post only items with `"status": "approved"`; take the first one in file order. Only ONE post per run.
- Reels posted from the web carry their own audio, so a reel must have NO `track` (original score from music/compose.py only). Never upload a commercial recording.
- Verse text always comes from the poem files (`src/content/poems`). Never type or invent poem text.
- If Instagram shows a checkpoint ("Confirm you're human", "Suspicious login", a code request, "Try again later" or any block), STOP: do not retry, set nothing to posted, and write the problem to `out/schedule.log`. The owner handles it.
- If not logged in, stop and log it (do not try to log in with a password).

## Steps for one run
1. Pick the item. Reel: `out/<id>.mp4` and caption `out/<id>-reel.txt` (render first with `node social/instagram/video.mjs <id>` if missing). Carousel: `out/<id>/slide-1..5.jpg` and `out/<id>/caption.txt` (render with `node social/instagram/carousel.mjs <id>` if missing). Env: `PLAYWRIGHT_CORE=/home/azureuser/.local/tools/node_modules/playwright-core/index.mjs`, PATH with `~/.local/node/bin` and `~/.local/tools/bin`.
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
- Reels: new `posts.json` entries (`kind: reel`, no `track`, `status: approved`, a new `seed`), short verses (2–4 lines) from poems not yet posted; render with video.mjs.
- Carousels: new `carousels.json` entries following c001–c003 (cover, 3 verse slides, closing slide), one theme or one poet, with a one-sentence English gist per verse; render with carousel.mjs and look at the slides before approving.
- Never repeat a poem+verse that was already posted. Commit the new entries.

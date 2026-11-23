# Scheduled posting for @punjabiidotnet

Two lyric reels a day (owner, 2026-11-16), posted with the Python script and the saved Instagram session (`~/.config/punjabi-net/ig-settings.json`, made from the owner's `sessionid`). Carousels are paused. Build every reel the way 005-shah-hussain was built (the reference).

| Slot (UTC) | Pakistan time | What |
|---|---|---|
| 13:00 | 18:00 (6 pm) | Reel: next `approved` lyric reel in `posts.json` |
| 19:00 | 00:00 (midnight) | Reel: next `approved` lyric reel in `posts.json` |

Post: `~/.local/tts-venv/bin/python social/instagram/post_reel.py` (dry run), then `… post_reel.py --publish`. It takes the first `approved` item with `"style": "lyric"`, uploads `out/<id>.mp4` with `out/<id>-reel.txt` and `out/<id>/cover.jpg`, and marks it posted (status, posted_at, code). Then append to `out/schedule.log` and commit `Instagram: posted <id>`.
If the script reports `login_required`, a challenge/checkpoint, or any block: stop, post nothing, log it, and ask the owner for a fresh `sessionid` with request_secret (delivery file). Load it with instagrapi `login_by_sessionid`, keeping the device settings, and save to the settings file; never print it.

## Rules
- Poets (owner, 2026-11-23): only FAMOUS kalams of Bulleh Shah, Sultan Bahu and Baba Farid. Skip queued items by other poets.
- Pictures (owner, 2026-11-23): every reel shows illustrated scenes of what the verses say: `"scenes"` (one per verse, or one per line with `"scene_per": "line"`) from `scenes.mjs`. If no scene fits a verse's image, draw a new one in `scenes.mjs` and check it on a preview before rendering. An approved reel without `scenes` gets them added and is re-rendered before it posts.
- Form (owner, 2026-11-23, after deleting 031 for "no flow"): reels are LONG, flowing pieces, like a symphony, not short cut-ups. Build them with `node social/instagram/longreel.mjs <id>` (`"form": "long"`, model: 032-bulleh-yaar-raazi): one or two long continuous passages of the recording (`segments`, the singer's repeats kept; one slow `xfade` between passages, never a chain of short cuts), 2–3 min (stay under 180 s), full-screen animated scenes from `scenes_v.mjs` (draw new ones when needed and check a still sheet with `--frames`), every sung line on screen in Shahmukhi with an English line, the singer's spoken asides shown in English. Check: Whisper on `out/<id>/music.wav`, stills/frames from the mp4, then post with `post_reel.py --id <id>` or as the next approved item.
- Recordings (owner, 2026-11-23): search beyond Instagram's music library too: YouTube (`~/.local/tools/bin/yt-dlp --flat-playlist --print "%(id)s | %(duration)s | %(title)s" "ytsearch12:<query>"`) and the web. A YouTube title often names the singer, whose track can then be found in IG's library with timed lyrics.
- Post only items with `"status": "approved"`; take the first one in file order. Only ONE post per run.
- Reels follow the pushto.net structure (owner's decision, 2026-11-16): `"style": "lyric"` items, rendered with `node social/instagram/reel.mjs <id>`. A real singer's recording of the poem (`track`, cut by song.py to the sung lines, about 45–80 s), one line per screen in Shahmukhi with the couplet's earlier line faded above, a short English `gists` entry per verse, a `n / N` counter, and a closing card with the poet. The recording goes up inside the video as original audio, and the caption credits the singer. Post lyric reels with `post_reel.py --publish` (saved session); the web composer is fine too, since the audio is in the file. Never use a generated (AI) voice or a song longer than ~90 s. Show the whole poem the singer sings (every couplet; if the recording also sings another poem, add it as a second `parts` entry), and each line sung ONCE: set `cuts` (pieces of the recording, track seconds, with each line's start; find them with `song.py <id> --show` plus Whisper/levels) so the singer's repeats are cut out, `end_at` where the last word ends, `pad` for a quiet tail. Check the spliced audio with Whisper before approving.
- Lyric reel caption (built by reel.mjs): `<poem title> | <poet Shahmukhi> (<poet English>), sung by <singer>`, blank line, `Vocals: <singer>. Poetry: <poet>. All credit to the artist.`, blank line, `#punjabi #punjabipoetry #پنجابی #پنجابی_شاعری #poetry`. Add `Full poem: <link>` once punjabi.net is live.
- Older score-only reels (no `track`, music/compose.py) keep the video.mjs format.
- Verse text always comes from the poem files (`src/content/poems`). Never type or invent poem text.
- Carousel captions (paused) stay short and organic: one or two human lines, the poet, 2–3 hashtags. Reel captions use the lyric format above.
- If Instagram shows a checkpoint ("Confirm you're human", "Suspicious login", a code request, "Try again later" or any block), STOP: do not retry, set nothing to posted, and write the problem to `out/schedule.log`. The owner handles it.
- If the session is logged out, stop and log it, then ask for a fresh sessionid (never log in with a password).

## Steps for one run
1. Env: `PLAYWRIGHT_CORE=/home/azureuser/.local/tools/node_modules/playwright-core/index.mjs`, PATH with `~/.local/node/bin` and `~/.local/tools/bin`. Python: `~/.local/tts-venv/bin/python`.
2. Pick the first `approved` lyric reel. If `out/<id>.mp4` or `out/<id>-reel.txt` is missing, render: `node social/instagram/reel.mjs <id>`.
3. Dry run `post_reel.py`; check it says `@punjabiidotnet`, the right id, `original audio`.
4. `post_reel.py --publish`. It prints the reel link and marks the item posted.
5. Append a line to `out/schedule.log`. Commit as Ahmad Ali <ahmad.ali.000507@gmail.com> (no co-author line): `Instagram: posted <id>`.

## Keeping the queue full
When fewer than 2 approved lyric reels remain, prepare more in the same run, after posting (aim for 2–4 ready). Model each one on 005-shah-hussain: every couplet the singer sings, each line once (repeats and half-line echoes cut at breaths), the closing card over a piece of instrumental music (e.g. the song's intro), long lines broken at the comma.
- Pick a poem from `src/content/poems` not yet posted, with a well-known sung recording. Find it in Instagram's music library: `find_tracks.py <poem-id> "<search>" …` (needs the session). Prefer a real Punjabi singer: classic qawwals, kafi and folk singers, and gurbani ragis for Farid's shaloks.
- Look at the lyrics/transcript with `song.py <id> --show` (needs a `track` in the item), plus Whisper word times and the level envelope, to choose `cuts`: every couplet the singer sings, each line once, cut at breaths. If the recording also sings verses from another poem in our files, add it as a second `parts` entry. A reel is 40–80 s.
- Write one short, accurate English `gists` line per verse.
- Render with reel.mjs, Whisper the spliced `out/<id>/music.wav` (each line once, nothing clipped), and look at a contact sheet of frames. Then set `status: approved`; the owner approved this format on 2026-11-16, so a reel that passes these checks needs no extra review.
- Never repeat a poem+verse that was already posted. Commit the new entries.

# Instagram

Posts are generated from the archive, approved by the owner, then published one at a time.

1. **Queue** — `posts.json`: each post names a poem and which verses (optionally which lines) to use. The text is
   always read from the poem file, never retyped. `status`: `draft` → `approved` (only the owner sets this) → `posted`.
2. **Render** — `node social/instagram/render.mjs [id…]` writes `out/<id>.png` (preview), `out/<id>.jpg` (upload,
   1080×1350) and `out/<id>.txt` (caption). Needs `playwright-core` (`PLAYWRIGHT_CORE=/path/to/index.mjs`).
3. **Reels** — `node social/instagram/video.mjs <id>` writes `out/<id>.mp4` (1080×1920, 30 fps) and
   `out/<id>-reel.txt` (caption with the "coming soon" hook). A title card, then the verse revealed word by word,
   each word entering on its own santoor note of an original score made for that post by `music/compose.py`
   (Raag Kafi: tanpura, strings, bass, santoor, chimes, all synthesised, so nothing to license; `seed` in
   posts.json changes the melody). Needs ffmpeg/ffprobe on PATH and a Python venv with numpy + scipy (PN_PY).
   `voice/` holds an earlier machine-recitation experiment (MMS-TTS), not used: its pronunciation wasn't good enough.
4. **Publish** — `IG_SESSION_FILE=<file with the sessionid cookie> node social/instagram/post.mjs` checks the login
   and lists what would be posted; add `--publish` to post the next approved post (one per run; `--max N` for more,
   with 1.5–2.5 minutes between posts). Posted items get `posted_at`, `account`, `media_id` and `code`.

The session cookie never goes into the repo, a commit, a log or chat. It is stored only on the server, in a file
readable by the owner's user, and can be revoked at any time by logging that session out on Instagram
(Settings → Accounts Centre → Password and security → Where you're logged in).

Automating posts with a browser session isn't an official Instagram API. Keep the volume low (a post a day or less):
fast or bulk posting can get the account rate-limited or asked to verify it.

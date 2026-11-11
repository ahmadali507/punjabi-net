# Posting the Reels from the phone

Instagram put @punjabidotnet behind a "Confirm you're human" check on 2026-11-11 after automated profile changes
from the server, so automated posting (post.mjs / post_reel.py) is paused. Post from the Instagram app instead.

For each Reel:
1. Copy `out/<id>.mp4` to the phone. Open Instagram → **+** → **Reel** → pick the video.
2. Tap **Audio** (music note) → search the song → choose the version by the artist below → set the start to the
   time below → turn the **original audio volume to 0** (the video already carries the same clip; this keeps only
   the licensed track, which Instagram credits on the Reel).
3. **Cover:** choose the frame where the whole verse is written out (near the end, before the end card).
4. **Caption:** paste `out/<id>-reel.txt`.
5. Post. One Reel a day is plenty for a new account.

| Reel | Song (artist) | Start | Length |
|---|---|---|---|
| 001-bulleh-shah | Bulla Ki Jana (Rabbi Shergill) | 1:19 | 32 s |
| 003-sultan-bahu | Alif Allah Chambey Di Booty (Arif Lohar, Meesha Shafi) | 0:17 | 45 s |
| 005-shah-hussain | Maye Ni Main Kinoo Akhaan (Hamid Ali Bela) | 1:27 | 25 s |
| 004-bulleh-shah-ishq | Teray Ishq Nachaya (Abida Parveen) | 2:58 | 18 s |
| 002-baba-farid | Farida Bure Da Bhala Kar (Bhai Mohinder Jeet Singh) | 1:35 | 68 s |

Profile (Edit profile in the app): photo `profile/avatar.jpg`; bio and name in `profile/profile.json`.

"""
Publish APPROVED Reels to @punjabidotnet with the session saved in ~/.config/punjabi-net/ig-settings.json.
The licensed song is attached as Instagram music (the track, its start time and length), the same way the
app does it, so Instagram credits the artist and handles the licence.

    ~/.local/tts-venv/bin/python social/instagram/post_reel.py            # dry run: login check + what would post
    ~/.local/tts-venv/bin/python social/instagram/post_reel.py --publish  # post the next approved Reel (one per run)
"""
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

logging.disable(logging.WARNING)
sys.path.insert(0, str(Path(__file__).parent))
from find_tracks import client  # noqa: E402
from instagrapi.types import Track  # noqa: E402

HERE = Path(__file__).resolve().parent
QUEUE = HERE / 'posts.json'


def main():
    data = json.loads(QUEUE.read_text())
    cl = client()
    me = cl.account_info()
    print(f'Logged in as @{me.username}')
    if me.username != 'punjabidotnet':
        raise SystemExit('Wrong account: refusing to post.')
    ready = [p for p in data['posts'] if p.get('status') == 'approved'][:1]
    if not ready:
        print('No approved posts waiting.')
        return
    post = ready[0]
    out = HERE / 'out'
    timing = json.loads((out / post['id'] / 'timing.json').read_text())
    caption = (out / f"{post['id']}-reel.txt").read_text().strip()
    if '--publish' not in sys.argv:
        print(f"Dry run. Would post {post['id']} ({timing['duration']:.0f}s)" + (f", music: {timing['track']['title']} — {timing['track']['artist']}" if timing.get('track') else ''))
        return

    extra = {}
    if timing.get('track'):
        track = Track(**json.loads((out / 'tracks' / f"{timing['track']['id']}.json").read_text()))
        extra = cl.clip_music_extra_data(track, audio_asset_start_time=timing['track']['start_ms'],
                                         overlap_duration=timing['track']['duration_ms'], original_volume=0.0)
    media = cl.clip_upload(out / f"{post['id']}.mp4", caption, thumbnail=out / post['id'] / 'cover.jpg', extra_data=extra)
    post.update({'status': 'posted', 'posted_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                 'account': me.username, 'media_id': media.id, 'code': media.code})
    QUEUE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f"Posted {post['id']}: https://www.instagram.com/reel/{media.code}/")
    time.sleep(2)


if __name__ == '__main__':
    main()

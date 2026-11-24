"""
Publish APPROVED Reels to @punjabiidotnet with the session saved in ~/.config/punjabi-net/ig-settings.json.
The licensed song is attached as Instagram music (the track, its start time and length), the same way the
app does it, so Instagram credits the artist and handles the licence.

    ~/.local/tts-venv/bin/python social/instagram/post_reel.py            # dry run: login check + what would post
    ~/.local/tts-venv/bin/python social/instagram/post_reel.py --publish  # post the next approved Reel (one per run)
    … post_reel.py --id <id> [--publish]                         # a specific Reel the owner asked for
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


SITE = 'punjabii.net'


def with_site_link(caption, post):
    """Point every reel at the full poem on the website: one line after the credit, before the hashtags.
    Instagram captions do not make links clickable, so it also says the link is in the bio."""
    if SITE in caption:
        return caption
    slug = post.get('poem') or next((p.get('poem') for p in post.get('parts', []) if p.get('poem')), None)
    line = f'Read the full poem in Shahmukhi: {SITE}/poems/{slug} (link in bio)' if slug else \
        f'More Punjabi poetry in Shahmukhi: {SITE} (link in bio)'
    blocks = caption.split('\n\n')
    at = len(blocks) - 1 if blocks[-1].lstrip().startswith('#') else len(blocks)
    return '\n\n'.join(blocks[:at] + [line] + blocks[at:])


def main():
    data = json.loads(QUEUE.read_text())
    cl = client()
    me = cl.account_info()
    print(f'Logged in as @{me.username}')
    if me.username != 'punjabiidotnet':
        raise SystemExit('Wrong account: refusing to post.')
    want = sys.argv[sys.argv.index('--id') + 1] if '--id' in sys.argv else None  # owner-requested post, by id
    ready = [p for p in data['posts'] if p['id'] == want and p.get('status') != 'posted'] if want else \
        [p for p in data['posts'] if p.get('status') == 'approved' and p.get('style') == 'lyric'][:1]  # scheduled: lyric reels only
    if not ready:
        print('No approved posts waiting.')
        return
    post = ready[0]
    out = HERE / 'out'
    timing = json.loads((out / post['id'] / 'timing.json').read_text())
    caption = with_site_link((out / f"{post['id']}-reel.txt").read_text().strip(), post)
    if '--publish' not in sys.argv:
        print(caption + '\n---')
        print(f"Dry run. Would post {post['id']} ({timing['duration']:.0f}s, {'original audio' if post.get('style') == 'lyric' else 'music sticker'})" + (f", music: {timing['track']['title']} — {timing['track']['artist']}" if timing.get('track') else ''))
        return

    extra = {}
    # lyric reels (pushto.net structure) carry the singer's recording in the video itself, as original audio
    if timing.get('track') and post.get('style') != 'lyric':
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

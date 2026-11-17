"""
Carousels for @punjabiidotnet (carousels.json, slides rendered by carousel.mjs), with calm background music
from Instagram's licensed music library attached the way the app does it (music in feed).

    python social/instagram/post_carousel.py c001-maan-boli --music "santoor instrumental" ["flute"…]
        list licensed tracks for the queries (saves previews to out/tracks/preview-<id>.m4a)
    python social/instagram/post_carousel.py c001-maan-boli            # dry run: login check + what would post
    python social/instagram/post_carousel.py c001-maan-boli --publish  # post it (status must be "approved")

The carousel's "music" is {"id": <track id>, "query": <search that finds it>, "start_ms": …, "duration_ms": …}.
"""
import json
import logging
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

logging.disable(logging.WARNING)
sys.path.insert(0, str(Path(__file__).parent))
from find_tracks import client  # noqa: E402

HERE = Path(__file__).resolve().parent
QUEUE = HERE / 'carousels.json'
TRACKS = HERE / 'out' / 'tracks'


def main():
    cid = sys.argv[1]
    data = json.loads(QUEUE.read_text())
    post = next(c for c in data['carousels'] if c['id'] == cid)
    cl = client()
    me = cl.account_info()
    print(f'Logged in as @{me.username}')
    if me.username != 'punjabiidotnet':
        raise SystemExit('Wrong account: refusing to continue.')

    if '--music' in sys.argv:
        TRACKS.mkdir(parents=True, exist_ok=True)
        for q in sys.argv[sys.argv.index('--music') + 1:]:
            print(f'\n# {q}')
            for t in cl.search_music(q)[:8]:
                hl = (t.highlight_start_times_in_ms or [0])[0]
                print(f'  {t.id}  {t.title[:44]} | {t.display_artist[:30]} | {t.duration_in_ms // 1000}s | highlight {hl // 1000}s')
                url = t.progressive_download_url or t.fast_start_progressive_download_url
                f = TRACKS / f'preview-{t.id}.m4a'
                if url and not f.exists():
                    urllib.request.urlretrieve(str(url), f)
                (TRACKS / f'{t.id}.json').write_text(json.dumps(t.model_dump(mode='json'), ensure_ascii=False))
        return

    slides = [HERE / 'out' / cid / f'slide-{i + 1}.jpg' for i in range(len(post['slides']))]
    caption = (HERE / 'out' / cid / 'caption.txt').read_text().strip()
    m = post.get('music')
    if '--publish' not in sys.argv or post.get('status') != 'approved':
        print(f"Dry run ({post.get('status')}): {len(slides)} slides, {len(caption)} caption chars, music: "
              + (f"{m['id']} from {m.get('start_ms', 0) // 1000}s" if m else 'none'))
        return

    if m:
        track = json.loads((TRACKS / f"{m['id']}.json").read_text())
        media = cl.album_upload_with_music(slides, caption, track, audio_asset_start_time=m.get('start_ms'),
                                           overlap_duration=m.get('duration_ms', 30000))
    else:
        media = cl.album_upload(slides, caption)
    post.update({'status': 'posted', 'posted_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                 'media_id': media.id, 'code': media.code})
    QUEUE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Posted {cid}: https://www.instagram.com/p/{media.code}/')


if __name__ == '__main__':
    main()

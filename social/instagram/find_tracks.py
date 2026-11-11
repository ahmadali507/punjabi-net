"""
Find sung recordings of our poems in Instagram's licensed music library and score how closely each one's
timed lyrics follow the poem text (0–1). Uses the saved session (~/.config/punjabi-net/ig-settings.json).

    ~/.local/tts-venv/bin/python social/instagram/find_tracks.py <poem-id> "<search query>" ["<query>"…]
Lyrics are cached in social/instagram/out/lyrics/<track-id>.json.
"""
import json
import logging
import os
import sys
import time
from pathlib import Path

logging.disable(logging.WARNING)
from instagrapi import Client  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
from sync import phrases_of, poem_words, score  # noqa: E402

HERE = Path(__file__).resolve().parent
CACHE = HERE / 'out' / 'lyrics'
SETTINGS = os.path.expanduser('~/.config/punjabi-net/ig-settings.json')


def client() -> Client:
    cl = Client()
    cl.load_settings(SETTINGS)
    cl.delay_range = [2, 4]
    return cl


def lyrics(cl: Client, track_id: str) -> dict:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f'{track_id}.json'
    if f.exists():
        return json.loads(f.read_text())
    time.sleep(1.5)
    data = cl.private_request(f'music/track/{track_id}/lyrics/')
    f.write_text(json.dumps(data, ensure_ascii=False))
    return data


def main():
    poem_id, queries = sys.argv[1], sys.argv[2:]
    _, lines = poem_words(poem_id)
    cl = client()
    seen = {}
    for q in queries:
        for t in cl.search_music(q)[:8]:
            if t.id in seen:
                continue
            s = None
            if t.has_lyrics:
                try:
                    s = score(lines, phrases_of(lyrics(cl, t.id)))
                except Exception as e:  # noqa: BLE001
                    s = f'err {type(e).__name__}'
            seen[t.id] = (s, t)
    rows = sorted(seen.values(), key=lambda x: -(x[0] if isinstance(x[0], float) else -1))
    for s, t in rows[:10]:
        sc = f'{s:.2f}' if isinstance(s, float) else ('no lyrics' if s is None else s)
        print(f'{sc:>9}  {t.id}  {t.title[:50]} | {t.display_artist[:35]} | {t.duration_in_ms // 1000}s')


if __name__ == '__main__':
    main()

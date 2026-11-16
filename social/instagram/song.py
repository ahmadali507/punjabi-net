"""
Timeline for a Reel set to a sung recording from Instagram's licensed music library.

For the post's track (posts.json: "track": {"id", "query"}), this
  1. finds the track (search by query, pick by id) and saves its metadata and audio;
  2. gets where each line is sung: Instagram's timed lyrics when the track has them, otherwise a local
     Whisper transcription of the singing (Urdu script, compared loosely with our Shahmukhi);
  3. lines up the post's lines in order and picks the song window (title card before the first line,
     the end card after the last), at most 90 s;
  4. writes out/<id>/timing.json (same shape video.mjs uses) and out/<id>/music.wav (that window).

    ~/.local/tts-venv/bin/python social/instagram/song.py 001-bulleh-shah [--show]
--show prints the transcription/lyrics with times, to check or to set "start"/"lines_at" by hand.
"""
import json
import logging
import os
import re
import subprocess
import sys
import urllib.request
import wave
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

logging.disable(logging.WARNING)
sys.path.insert(0, str(Path(__file__).parent))
from find_tracks import client, lyrics as get_lyrics  # noqa: E402
from sync import phrases_of, poem_words, sim as gsim  # noqa: E402

HERE = Path(__file__).resolve().parent
TRACKS = HERE / 'out' / 'tracks'
FFMPEG = os.environ.get('FFMPEG', os.path.expanduser('~/.local/tools/bin/ffmpeg'))
INTRO, HOLD, END, MAXLEN = 4.5, 3.0, 4.5, 90.0

# Loose Arabic-script comparison: vowel marks out, look-alike and sound-alike letters merged.
HARAKAT = re.compile(r'[ً-ٰٟۖ-ۭ]')
FOLD = str.maketrans({'ي': 'ی', 'ى': 'ی', 'ے': 'ی', 'ئ': 'ی', 'ك': 'ک', 'ۂ': 'ہ', 'ة': 'ہ', 'ھ': '', 'ح': 'ہ', 'ه': 'ہ',
                      'ں': 'ن', 'ݨ': 'ن', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ؤ': 'و', 'ڑ': 'ر', 'ٹ': 'ت', 'ڈ': 'د', 'ث': 'س',
                      'ص': 'س', 'ذ': 'ز', 'ض': 'ز', 'ظ': 'ز', 'ط': 'ت', 'ع': '', 'ق': 'ک', 'ء': ''})


def afold(s: str) -> str:
    return re.sub(r'[^؀-ۿ]', '', HARAKAT.sub('', s)).translate(FOLD)


def asim(a: str, b: str) -> float:
    return SequenceMatcher(None, afold(a), afold(b)).ratio()


# ---------- track ----------

def get_track(post: dict):
    TRACKS.mkdir(parents=True, exist_ok=True)
    meta = TRACKS / f"{post['track']['id']}.json"
    audio = TRACKS / f"{post['track']['id']}.m4a"
    cl = client()
    if not meta.exists():
        t = next(t for t in cl.search_music(post['track']['query'])[:10] if t.id == post['track']['id'])
        meta.write_text(json.dumps(t.model_dump(mode='json'), ensure_ascii=False))
        urllib.request.urlretrieve(str(t.progressive_download_url or t.fast_start_progressive_download_url), audio)
    return cl, json.loads(meta.read_text()), audio


def wav16(audio: Path, seconds: float) -> np.ndarray:
    tmp = audio.with_suffix('.16k.wav')
    if not tmp.exists():
        subprocess.run([FFMPEG, '-loglevel', 'error', '-y', '-i', str(audio), '-t', str(seconds), '-ac', '1', '-ar', '16000', str(tmp)], check=True)
    w = wave.open(str(tmp))
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def transcribe(audio: Path, seconds: float) -> list[dict]:
    """Whisper (small, CPU) in Urdu script, cached. Returns segments with word timings."""
    cache = audio.with_suffix(f'.whisper{int(seconds)}.json')
    if cache.exists():
        return json.loads(cache.read_text())
    from faster_whisper import WhisperModel
    m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=2)
    segs, _ = m.transcribe(wav16(audio, seconds), language='ur', vad_filter=False, word_timestamps=True, beam_size=2,
                           condition_on_previous_text=False, no_speech_threshold=0.9)
    out = [{'start': s.start, 'end': s.end, 'text': s.text.strip(),
            'words': [{'text': w.word.strip(), 'start': w.start, 'end': w.end} for w in (s.words or [])]} for s in segs]
    cache.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out


# ---------- alignment ----------

def match_line(line: dict, units: list[dict], after: float, gurmukhi: bool, until: float = 1e9):
    """Best window of sung words (start ≥ after) for one of our lines: (score, start, end, word starts)."""
    best = (0.0, None)
    ours = [w['gur'] if gurmukhi else w['text'] for w in line['words']]
    target = ' '.join(ours)
    sim = gsim if gurmukhi else asim
    for u in units:
        words = [w for w in u['words'] if w['start'] >= after - 0.01] or []
        n = len(words)
        for i in range(n):
            if words[i]['start'] > until:  # the line must begin near its hand-set time
                break
            for k in range(max(1, len(ours) - 3), len(ours) + 4):
                win = words[i:i + k]
                if not win:
                    continue
                s = sim(target, ' '.join(w['text'] if not gurmukhi else w['gur'] for w in win))
                if s > best[0]:
                    best = (s, win)
    if not best[1]:
        return 0.0, None
    s, win = best
    # our words spread over the sung window, anchored on its first and last word
    t0, t1 = win[0]['start'], win[-1]['end']
    span = max(0.6, t1 - t0)
    if len(win) == len(ours):  # one sung word per word of ours: use the singer's own timing
        starts = [round(w['start'], 3) for w in win]
    else:
        starts = [round(t0 + span * j / max(1, len(ours)), 3) for j in range(len(ours))]
    return s, {'start': t0, 'end': t1, 'words': starts}


def main():
    post_id = sys.argv[1]
    posts = json.loads((HERE / 'posts.json').read_text())['posts']
    post = next(p for p in posts if p['id'] == post_id)
    cl, meta, audio = get_track(post)
    _, all_lines = poem_words(post['poem'])

    # the post's lines, in order
    picked = []
    for vi in post['verses']:
        ls = [l for l in all_lines if l['verse'] == vi]
        if post.get('lines'):
            ls = ls[post['lines'][0]: post['lines'][1] + 1]
        for k, l in enumerate(ls):
            picked.append({**l, 'stanza_start': k == 0 and bool(picked)})

    if meta.get('has_lyrics'):
        units = [{**p, 'words': [{'text': w['gur'], 'gur': w['gur'], 'start': w['start'], 'end': w['end']} for w in p['words']]}
                 for p in phrases_of(get_lyrics(cl, meta['id']))]
        gurmukhi = True
    else:
        units = transcribe(audio, post['track'].get('listen', 240))
        gurmukhi = False
    if '--show' in sys.argv:
        for u in units:
            print(f"{u['start']:7.1f}-{u['end']:6.1f}  {u['text']}")
        return

    # "lines_at": optional rough time (s) for each line, by hand from --show, when the transcription is too garbled
    after, placed, at = post['track'].get('from', 0.0), [], post['track'].get('lines_at')
    for i, l in enumerate(picked):
        if at:
            after = at[i] - 1.5
        s, m = match_line(l, units, after, gurmukhi, at[i] + 2.0 if at else 1e9)
        print(f"{s:.2f}  {m['start'] if m else '-':>7}  {' '.join(w['text'] for w in l['words'])}")
        if not m or s < 0.35:
            raise SystemExit(f'Line not found in the recording (score {s:.2f}). Check with --show, or choose other lines.')
        placed.append({**l, **m})
        after = m['end']

    start = max(0.0, placed[0]['start'] - INTRO)
    end_card = placed[-1]['end'] + HOLD - start
    duration = min(MAXLEN, end_card + END)
    if end_card + 1 > MAXLEN:
        raise SystemExit(f'The lines span {end_card:.0f}s of the song: too long for one Reel. Use fewer lines.')
    timing = {
        'track': {'id': meta['id'], 'title': meta['title'], 'artist': meta['display_artist'], 'start_ms': int(start * 1000),
                  'duration_ms': int(duration * 1000), 'source': 'lyrics' if gurmukhi else 'whisper'},
        'intro': round(placed[0]['start'] - start, 3), 'end_card': round(end_card, 3), 'duration': round(duration, 3),
        'lines': [{'start': round(p['start'] - start, 3), 'end': round(p['end'] - start, 3),
                   'words': [round(t - start, 3) for t in p['words']]} for p in placed],
    }
    d = HERE / 'out' / post_id
    d.mkdir(parents=True, exist_ok=True)
    (d / 'timing.json').write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    subprocess.run([FFMPEG, '-loglevel', 'error', '-y', '-ss', str(start), '-t', str(duration), '-i', str(audio),
                    '-af', f'afade=t=in:d=0.8,afade=t=out:st={duration - 2.5}:d=2.5', '-ac', '2', '-ar', '44100', str(d / 'music.wav')], check=True)
    print(f"{meta['title']} — {meta['display_artist']}: {start:.1f}s + {duration:.1f}s")


if __name__ == '__main__':
    main()

"""
A sung track for a Reel, made with the open-source ACE-Step 1.5 song model (Apache-2.0) on a free
Hugging Face Space (ZeroGPU), so every couplet of the post is sung once, in our own (generated) voice.

posts.json item:  "voice": {"style": "<music caption>", "seed": "7", "lang": "ur", "duration": 150}
Lyrics are the post's verses straight from the poem file (refrains tagged [Chorus], stanzas [Verse]).
Each line's time comes from a local Whisper transcription of the song (the Space's own line stamps as a
fallback); that gives timing.json (same shape video.mjs uses) and music.wav.

    ~/.local/tts-venv/bin/python social/instagram/sing.py 004-bulleh-shah-ishq [--new]
--new generates a fresh song even if out/<id>/song.flac exists (each run costs ~3 min of the daily free GPU quota).
Token: ~/.config/punjabi-net/hf-token (a free Hugging Face account's read token).
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FFMPEG = os.environ.get('FFMPEG', os.path.expanduser('~/.local/tools/bin/ffmpeg'))
TOKEN = Path(os.path.expanduser('~/.config/punjabi-net/hf-token'))
# the official Space first; working community copies of it as fallbacks
SPACES = [s for s in os.environ.get('ACE_SPACES', 'ACE-Step/Ace-Step-v1.5,Blursed/Ace-Step-v1.5,Kansasfan/Ace-Step-v1.5').split(',') if s]
INTRO, HOLD, END = 4.5, 3.0, 4.5


def front(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding='utf8').split('\n---')[0].removeprefix('---'))


def lyric_blocks(post: dict) -> list[dict]:
    poem = front(ROOT / 'src/content/poems' / f"{post['poem']}.md")
    blocks, n = [], 0
    for vi in post['verses']:
        v = poem['verses'][vi]
        n += not v.get('refrain')
        lines = v['text'].split('\n')
        if post.get('lines'):
            lines = lines[post['lines'][0]: post['lines'][1] + 1]
        blocks.append({'tag': '[Chorus]' if v.get('refrain') else f'[Verse {n}]', 'lines': lines})
    return blocks


def sing_text(line: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[،؛!؟?]', ' ', line)).strip()


def generate(post: dict, lyrics: str, out: Path):
    from gradio_client import Client
    v = post['voice']
    err = None
    for space in SPACES:
        try:
            c = Client(space, verbose=False, token=TOKEN.read_text().strip())
            r = c.predict(selected_model='acestep-v15-turbo', generation_mode='custom', simple_query_input='',
                          simple_vocal_language=v.get('lang', 'ur'), param_4=v['style'], param_5=lyrics, param_6=0,
                          param_9=v.get('lang', 'ur'), param_12=False, param_13=str(v.get('seed', '7')), param_14=None,
                          param_15=float(v.get('duration', -1)), param_16=1, param_17=None, param_18='', param_19=0.0, param_20=-1, param_30='flac',
                          param_44=True, param_47='vocals', api_name='/generation_wrapper')
        except Exception as e:  # quota, a broken Space, a timeout: try the next one
            err = f'{space}: {e}'
            print(err)
            continue
        files = [x for x in list(r[:8]) + list(r[8] or []) if isinstance(x, str) and x.endswith(('.flac', '.mp3', '.wav'))]
        if not files or not isinstance(r[28], str) or '[' not in r[28]:
            err = f'{space}: {r[10]}'
            print(err)
            continue
        shutil.copy(files[0], out / 'song.flac')
        (out / 'song.lrc').write_text(r[28])
        (out / 'song.json').write_text(json.dumps({'space': space, 'seed': r[11], 'style': v['style']}, ensure_ascii=False, indent=1))
        print(f'{space}: {r[10]}')
        return
    raise SystemExit(f'No Space could sing it. Last error: {err}')


def parse_lrc(text: str) -> list[tuple[float, str]]:
    out = []
    for m in re.finditer(r'\[(\d+):(\d+(?:\.\d+)?)\](.*)', text):
        t, body = int(m[1]) * 60 + float(m[2]), m[3].strip()
        if body and not re.fullmatch(r'\[.*\]', body):
            out.append((t, body))
    return out


def song_length(path: Path) -> float:
    r = subprocess.run([FFMPEG, '-i', str(path)], capture_output=True, text=True)
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def main():
    post_id = sys.argv[1]
    post = next(p for p in json.loads((HERE / 'posts.json').read_text())['posts'] if p['id'] == post_id)
    out = HERE / 'out' / post_id
    out.mkdir(parents=True, exist_ok=True)
    blocks = lyric_blocks(post)
    lyrics = '\n\n'.join(b['tag'] + '\n' + '\n'.join(sing_text(l) for l in b['lines']) for b in blocks)
    if '--new' in sys.argv or not (out / 'song.flac').exists():
        generate(post, lyrics, out)

    sung = parse_lrc((out / 'song.lrc').read_text())
    ours = [l for b in blocks for l in b['lines']]
    if len(sung) != len(ours):
        raise SystemExit(f'The song has {len(sung)} timed lines, the post {len(ours)}. Generate again (--new).')
    for (t, s), l in zip(sung, ours):
        if sing_text(s) != sing_text(l):
            raise SystemExit(f'Line mismatch at {t:.1f}s: {s!r} vs {l!r}')

    length = song_length(out / 'song.flac')
    # Where each line is really sung: Whisper's word timings of the song (song.py's matcher), in order.
    # The model's own line stamps are only a fallback; they sometimes collapse several lines onto one time.
    from song import match_line, transcribe  # noqa: E402
    units = transcribe(out / 'song.flac', length)
    after, placed = 0.0, []
    for i, l in enumerate(ours):
        words = [{'text': w} for w in l.split()]
        lrc = sung[i][0]
        lrc_ok = lrc >= after - 0.5 and (i + 1 == len(sung) or sung[i + 1][0] - lrc > 1.0)
        # a sane stamp narrows the search to ±6 s around it (a refrain is sung many times; take the right one)
        score, m = match_line({'words': words}, units, max(after, lrc - 6) if lrc_ok else after, False,
                              lrc + 6 if lrc_ok else 1e9)
        if m and score >= 0.4:
            t0, t1, ws = m['start'], m['end'], m['words']
        elif lrc_ok:
            n = len(words)
            t0, t1 = lrc, lrc + 1.0 * n
            ws = [round(t0 + (t1 - t0) * 0.85 * j / n, 3) for j in range(n)]
        else:
            raise SystemExit(f'Line {i + 1} not found in the song (Whisper {score:.2f}, stamp {lrc:.1f}s): {l}\n'
                             'Listen to it; generate again with --new (another seed) if a line was skipped.')
        print(f"{score:.2f} {t0:6.1f}s {'whisper' if m and score >= 0.4 else 'stamp  '} {l}")
        placed.append((t0, t1, ws))
        after = t1
    start = placed[0][0] - INTRO  # negative: the song begins singing at once, so a short silence goes before it
    lines = [{'start': round(t0 - start, 3), 'end': round(t1 - start, 3), 'words': [round(w - start, 3) for w in ws]}
             for t0, t1, ws in placed]
    end_card = lines[-1]['end'] + HOLD
    duration = min(length - start, end_card + END)
    pad = max(0.0, -start)
    timing = {'voice': json.loads((out / 'song.json').read_text()), 'intro': round(placed[0][0] - start, 3),
              'end_card': round(end_card, 3), 'duration': round(duration, 3), 'lines': lines}
    (out / 'timing.json').write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    subprocess.run([FFMPEG, '-loglevel', 'error', '-y', '-ss', str(max(0.0, start)), '-i', str(out / 'song.flac'),
                    '-af', f'afade=t=in:d=0.5,adelay={int(pad * 1000)}:all=1,apad,atrim=0:{duration},afade=t=out:st={duration - 2.5}:d=2.5', '-ac', '2', '-ar', '44100', str(out / 'music.wav')], check=True)
    print(f'{post_id}: {len(ours)} lines sung, reel {duration:.1f}s')


if __name__ == '__main__':
    main()

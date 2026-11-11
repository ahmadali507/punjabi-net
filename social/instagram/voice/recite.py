"""
Machine recitation of a post's lines with Meta's open Punjabi voice (MMS-TTS, facebook/mms-tts-pan),
run locally. Writes out/<id>/line-<n>.wav and out/<id>/recitation.json (line text, Gurmukhi fed to the
model, duration). The Shahmukhi on screen is the poem file's text; the Gurmukhi is only for the voice.

    ~/.local/tts-venv/bin/python social/instagram/voice/recite.py 001-bulleh-shah [--rate 0.85]
"""
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np
import torch
import yaml
from transformers import AutoTokenizer, VitsModel

sys.path.insert(0, str(Path(__file__).parent))
from gurmukhi import roman_to_gurmukhi, shahmukhi_to_gurmukhi  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parents[1]
MODEL = 'facebook/mms-tts-pan'

# Same normalisation as src/lib/content.ts normalise(): drop punctuation and vowel marks.
PUNCT = re.compile(r'[\s.,;:!?،؛؟۔"\'“”‘’()\[\]{}«»\-–—…]+')
HARAKAT = re.compile(r'[ً-ٰٟۖ-ۭ]')
normalise = lambda t: HARAKAT.sub('', PUNCT.sub('', t))


def front(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding='utf8').split('\n---')[0].removeprefix('---'))


def post_lines(post: dict, poem: dict) -> list[dict]:
    out = []
    for n, vi in enumerate(post['verses']):
        v = poem['verses'][vi]
        lines = v['text'].split('\n')
        if post.get('lines'):
            lines = lines[post['lines'][0]: post['lines'][1] + 1]
        for k, l in enumerate(lines):
            out.append({'text': l, 'refrain': bool(v.get('refrain')), 'stanza_start': k == 0 and n > 0})
    return out


def to_gurmukhi(line: str, words: dict) -> tuple[str, list[str]]:
    out, missing = [], []
    for tok in line.split():
        key = normalise(tok)
        if not key:
            continue
        roman = (words.get(key) or {}).get('roman')
        if roman:
            out.append(roman_to_gurmukhi(roman))
        else:
            missing.append(key)
            out.append(shahmukhi_to_gurmukhi(key))
        if re.search(r'[،,]$', tok):
            out[-1] += ','
    return ' '.join(out), missing


def main():
    post_id = sys.argv[1]
    rate = float(sys.argv[sys.argv.index('--rate') + 1]) if '--rate' in sys.argv else 0.85
    post = next(p for p in json.loads((HERE / 'posts.json').read_text())['posts'] if p['id'] == post_id)
    poem = front(ROOT / 'src/content/poems' / f"{post['poem']}.md")
    words = json.loads((ROOT / 'src/content/glosses' / f"{post['poem']}.json").read_text())['words']

    torch.manual_seed(7)  # the model samples; a fixed seed makes renders repeatable
    tok = AutoTokenizer.from_pretrained(MODEL)
    model = VitsModel.from_pretrained(MODEL)
    model.speaking_rate = rate
    model.noise_scale = 0.5

    out_dir = HERE / 'out' / post_id
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for n, line in enumerate(post_lines(post, poem)):
        gur, missing = to_gurmukhi(line['text'], words)
        with torch.no_grad():
            audio = model(**tok(gur, return_tensors='pt')).waveform[0].numpy()
        audio = (audio / max(1e-6, np.abs(audio).max()) * 0.9 * 32767).astype(np.int16)
        path = out_dir / f'line-{n}.wav'
        with wave.open(str(path), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(model.config.sampling_rate); w.writeframes(audio.tobytes())
        dur = len(audio) / model.config.sampling_rate
        manifest.append({**line, 'gurmukhi': gur, 'missing_roman': missing, 'wav': path.name, 'duration': round(dur, 3)})
        print(f'{n}: {dur:.1f}s  {gur}' + (f'   (no romanisation: {missing})' if missing else ''))
    (out_dir / 'recitation.json').write_text(json.dumps({'post': post_id, 'poem': post['poem'], 'model': MODEL,
                                                         'rate': rate, 'lines': manifest}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

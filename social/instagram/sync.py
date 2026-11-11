"""
Line up a poem (Shahmukhi, from the poem file) with a sung recording's timed lyrics from Instagram's
music library (Gurmukhi, word offsets in ms). Each poem word gets the time the singer sings it.

Our words are turned into Gurmukhi through their romanisation (src/content/glosses, voice/gurmukhi.py) and
compared loosely (nasals, addak, nukta and short vowels ignored), so spelling differences don't matter.
"""
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / 'voice'))
from gurmukhi import roman_to_gurmukhi, shahmukhi_to_gurmukhi  # noqa: E402

PUNCT = re.compile(r'[\s.,;:!?،؛؟۔"\'“”‘’()\[\]{}«»\-–—…]+')
HARAKAT = re.compile(r'[ً-ٰٟۖ-ۭ]')
normalise = lambda t: HARAKAT.sub('', PUNCT.sub('', t))

LOOSE = str.maketrans({'ੱ': None, 'ਂ': None, 'ੰ': None, '਼': None, '੍': None, 'ਿ': None, 'ੁ': None,
                       'ਣ': 'ਨ', 'ਯ': 'ਇ', 'ੀ': 'ਈ', 'ੇ': 'ਏ', 'ੈ': 'ਏ', 'ੋ': 'ਓ', 'ੌ': 'ਓ', 'ੂ': 'ਊ', 'ਾ': 'ਆ'})


def loose(g: str) -> str:
    g = unicodedata.normalize('NFD', g)
    return re.sub(r'[^਀-੿]', '', g).translate(LOOSE)


def front(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding='utf8').split('\n---')[0].removeprefix('---'))


def poem_words(poem_id: str) -> tuple[dict, list[list[dict]]]:
    """All lines of the poem as lists of {text, gur}."""
    poem = front(ROOT / 'src/content/poems' / f'{poem_id}.md')
    gloss_file = ROOT / 'src/content/glosses' / f'{poem_id}.json'
    words = json.loads(gloss_file.read_text())['words'] if gloss_file.exists() else {}
    lines = []
    for vi, v in enumerate(poem['verses']):
        for li, line in enumerate(v['text'].split('\n')):
            ws = []
            for tok in line.split():
                k = normalise(tok)
                r = (words.get(k) or {}).get('roman')
                ws.append({'text': tok, 'gur': roman_to_gurmukhi(r) if r else shahmukhi_to_gurmukhi(k)})
            lines.append({'verse': vi, 'line': li, 'refrain': bool(v.get('refrain')), 'words': ws})
    return poem, lines


def sim(a: str, b: str) -> float:
    return SequenceMatcher(None, loose(a), loose(b)).ratio()


def phrases_of(lyrics: dict) -> list[dict]:
    out = []
    for p in lyrics.get('lyrics', {}).get('phrases', []):
        words = []
        for w in p.get('word_offsets', []):
            words.append({'gur': p['phrase'][w['start_index']:w['end_index']],
                          'start': (p['start_time_in_ms'] + w['start_offset_ms']) / 1000,
                          'end': (p['start_time_in_ms'] + w['end_offset_ms']) / 1000})
        out.append({'text': p['phrase'], 'start': p['start_time_in_ms'] / 1000, 'end': p['end_time_in_ms'] / 1000, 'words': words})
    return out


def best_phrase(line: dict, phrases: list[dict], after: float = -1) -> tuple[float, dict | None]:
    target = ' '.join(w['gur'] for w in line['words'])
    best = (0.0, None)
    for p in phrases:
        if p['start'] < after:
            continue
        s = sim(target, p['text'])
        if s > best[0]:
            best = (s, p)
    return best


def score(lines: list[dict], phrases: list[dict], n: int = 6) -> float:
    """How well the recording sings the poem: mean best match of the first n distinct lines."""
    seen, vals = set(), []
    for l in lines:
        key = ' '.join(w['text'] for w in l['words'])
        if key in seen:
            continue
        seen.add(key)
        vals.append(best_phrase(l, phrases)[0])
        if len(vals) >= n:
            break
    return sum(vals) / max(1, len(vals))


def align_words(line: dict, phrase: dict) -> list[float]:
    """Start time for each word of our line, from the phrase's word timings (matched by spelling, else spread)."""
    ours, theirs = line['words'], phrase['words']
    times = [None] * len(ours)
    j = 0
    for i, w in enumerate(ours):
        for k in range(j, min(len(theirs), j + 3)):
            if sim(w['gur'], theirs[k]['gur']) >= 0.5:
                times[i] = theirs[k]['start']
                j = k + 1
                break
    # unmatched words: spread evenly between the nearest matched neighbours (or the phrase edges)
    i = 0
    while i < len(times):
        if times[i] is not None:
            i += 1; continue
        k = i
        while k < len(times) and times[k] is None:
            k += 1
        lo = times[i - 1] if i > 0 else phrase['start']
        hi = times[k] if k < len(times) else max(lo + 0.3 * (k - i), phrase['end'] - 0.4)
        for m in range(i, k):
            times[m] = lo + (hi - lo) * (m - i + (1 if i > 0 else 0)) / (k - i + (1 if i > 0 else 0) + (1 if k < len(times) else 0) or 1)
        i = k
    for i in range(1, len(times)):  # keep order
        times[i] = max(times[i], times[i - 1] + 0.12)
    return [round(t, 3) for t in times]

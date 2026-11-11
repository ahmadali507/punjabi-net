"""
Romanised Punjabi (the archive's gloss scheme) -> Gurmukhi, for the speech model only.

The Punjabi voice we can run locally (Meta MMS, `pan`) reads Gurmukhi. Shahmukhi leaves most short
vowels unwritten, so instead of converting the Shahmukhi letters we convert each word's romanisation
from src/content/glosses (ā ī ū e o ai au, ṭ ḍ ṛ ṇ retroflex, ṅ nasal, kh/gh/… aspirates, x = خ, ġ = غ),
which spells the vowels out. The Gurmukhi is never shown to readers.
"""
import re
import unicodedata

CONS = {
    'chh': 'ਛ', 'kh': 'ਖ', 'gh': 'ਘ', 'ch': 'ਚ', 'jh': 'ਝ', 'ṭh': 'ਠ', 'ḍh': 'ਢ', 'th': 'ਥ', 'dh': 'ਧ',
    'ph': 'ਫ', 'bh': 'ਭ', 'sh': 'ਸ਼', 'ṛh': 'ੜ੍ਹ', 'rh': 'ਰ੍ਹ', 'lh': 'ਲ੍ਹ', 'nh': 'ਨ੍ਹ', 'mh': 'ਮ੍ਹ', 'ṇh': 'ਣ੍ਹ',
    'vh': 'ਵ੍ਹ',
    'k': 'ਕ', 'g': 'ਗ', 'c': 'ਚ', 'j': 'ਜ', 'ṭ': 'ਟ', 'ḍ': 'ਡ', 'ṇ': 'ਣ', 't': 'ਤ', 'd': 'ਦ', 'n': 'ਨ',
    'p': 'ਪ', 'b': 'ਬ', 'm': 'ਮ', 'y': 'ਯ', 'r': 'ਰ', 'ṛ': 'ੜ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ', 's': 'ਸ',
    'ṣ': 'ਸ਼', 'h': 'ਹ', 'x': 'ਖ਼', 'ġ': 'ਗ਼', 'z': 'ਜ਼', 'f': 'ਫ਼', 'q': 'ਕ', 'ñ': 'ਞ',
}
# vowel: (independent letter, sign after a consonant)
VOW = {
    'ai': ('ਐ', 'ੈ'), 'au': ('ਔ', 'ੌ'), 'ā': ('ਆ', 'ਾ'), 'ī': ('ਈ', 'ੀ'), 'ū': ('ਊ', 'ੂ'),
    'ē': ('ਏ', 'ੇ'), 'ō': ('ਓ', 'ੋ'), 'e': ('ਏ', 'ੇ'), 'o': ('ਓ', 'ੋ'),
    'a': ('ਅ', ''), 'i': ('ਇ', 'ਿ'), 'u': ('ਉ', 'ੁ'),
}
CONS_KEYS = sorted(CONS, key=len, reverse=True)
VOW_KEYS = sorted(VOW, key=len, reverse=True)


def roman_to_gurmukhi(word: str) -> str:
    w = unicodedata.normalize('NFC', word.lower()).replace('ʻ', '').replace("'", '').replace('-', ' ')
    out, i, prev = [], 0, 'start'  # prev: start | cons | vowel
    while i < len(w):
        ch = w[i]
        if ch == ' ':
            out.append(' '); prev = 'start'; i += 1; continue
        if ch == 'ṅ':  # nasal vowel: tippi after short vowels, bindi otherwise
            out.append('ੰ' if prev in ('a', 'i', 'u', 'ū') else 'ਂ'); i += 1; continue
        c = next((k for k in CONS_KEYS if w.startswith(k, i)), None)
        if c:
            # Doubled consonant (kk, ll, tt…) -> addak + consonant.
            if len(c) == 1 and w.startswith(c, i + 1):
                nxt = next(k for k in CONS_KEYS if w.startswith(k, i + 1))  # e.g. 'llh' -> addak + ਲ੍ਹ
                out.append('ੱ' + CONS[nxt]); i += 1 + len(nxt); prev = 'cons'; continue
            if len(c) > 1 and w.startswith(c, i + len(c)):  # doubled digraph: chch -> ੱਚ
                out.append('ੱ' + CONS[c]); i += 2 * len(c); prev = 'cons'; continue
            out.append(CONS[c]); i += len(c); prev = 'cons'; continue
        v = next((k for k in VOW_KEYS if w.startswith(k, i)), None)
        if v:
            ind, sign = VOW[v]
            out.append(sign if prev == 'cons' else ind)
            i += len(v); prev = v if v in ('a', 'i', 'u', 'ū') else 'vowel'; continue
        i += 1  # anything else (punctuation, digits) is dropped
    return ''.join(out)


# Fallback for a word with no romanisation: letter by letter from Shahmukhi (vowels mostly lost).
SHAHMUKHI = {
    'ا': 'ਅ', 'آ': 'ਆ', 'ب': 'ਬ', 'پ': 'ਪ', 'ت': 'ਤ', 'ٹ': 'ਟ', 'ث': 'ਸ', 'ج': 'ਜ', 'چ': 'ਚ', 'ح': 'ਹ',
    'خ': 'ਖ਼', 'د': 'ਦ', 'ڈ': 'ਡ', 'ذ': 'ਜ਼', 'ر': 'ਰ', 'ڑ': 'ੜ', 'ز': 'ਜ਼', 'ژ': 'ਜ਼', 'س': 'ਸ', 'ش': 'ਸ਼',
    'ص': 'ਸ', 'ض': 'ਜ਼', 'ط': 'ਤ', 'ظ': 'ਜ਼', 'ع': '', 'غ': 'ਗ਼', 'ف': 'ਫ਼', 'ق': 'ਕ', 'ک': 'ਕ', 'گ': 'ਗ',
    'ل': 'ਲ', 'م': 'ਮ', 'ن': 'ਨ', 'ں': 'ਂ', 'ݨ': 'ਣ', 'و': 'ੋ', 'ہ': 'ਹ', 'ھ': '੍ਹ', 'ی': 'ੀ', 'ے': 'ੇ', 'ء': '',
    'ئ': 'ਈ', 'ۓ': 'ਏ',
}


def shahmukhi_to_gurmukhi(word: str) -> str:
    return ''.join(SHAHMUKHI.get(ch, '') for ch in word)


if __name__ == '__main__':
    for r in ['Bullhā', 'kih', 'jāṇāṅ', 'maiṅ', 'kauṇ', 'masīt', 'āṅ', 'ishq', 'Punnūṅ', 'kītā', 'xarābāṅ', 'avval', 'ġamnākī']:
        print(r, roman_to_gurmukhi(r))

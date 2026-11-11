"""
Original instrumental score for a Reel, composed to the text: every word of a line enters on its own
santoor note, so the video can reveal the words in time with the music.

Raag Kafi (Dorian) on Sa = D: tanpura drone (Pa-Sa-Sa-Sa), string pad, soft bass, santoor melody
(Karplus-Strong), a chime at each new line, and a hall reverb. Everything is synthesised here,
so there is no third-party audio and nothing to license.

    ~/.local/tts-venv/bin/python social/instagram/music/compose.py <out_dir> <words-per-line JSON> [--seed N]
      e.g. compose.py out/001 '[[5],[6,6,6,5]]'   (lines grouped by stanza)
Writes <out_dir>/music.wav (44.1 kHz stereo) and <out_dir>/timing.json (seconds for every word and line).
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT
SA = 146.83  # D3

# Kafi thaat: Sa Re ga Ma Pa Dha ni (semitones from Sa)
KAFI = [0, 2, 3, 5, 7, 9, 10]
# Chord loop (Dorian): i - VII - IV - i  (Dm, C, G, Dm), as semitones from Sa
CHORDS = [[0, 3, 7], [-2, 2, 5], [5, 9, 12], [0, 3, 7]]


def hz(semi: float, base: float = SA) -> float:
    return base * 2 ** (semi / 12)


def env(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-3))
    return e * np.exp(-t / r)


def lowpass(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


# ---------- instruments ----------

def tanpura(dur: float, rng) -> np.ndarray:
    """Four strings plucked in turn (Pa, Sa', Sa', Sa,), long sustain, buzzing 'jawari' upper partials."""
    out = np.zeros(int(dur * SR) + SR * 4)
    strings = [hz(-5), hz(0), hz(0), hz(-12)]
    cycle = 2 * BEAT
    n = int(5.5 * SR)
    t = np.arange(n) / SR
    plucks = []
    for f in strings:  # one pluck per string, reused
        sig = np.zeros(n)
        for h in range(1, 28):
            # jawari: the upper partials swell a little after the pluck, then fade
            amp = (1 / h ** 0.9) * (1 + 0.8 * np.sin(np.pi * min(1, h / 14)) * (1 - np.exp(-t * 1.6)))
            sig += amp * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * rng.standard_normal()))
        plucks.append(sig * env(n, 0.01, 2.2))
    t0 = 0.0
    while t0 < dur:
        for k, sig in enumerate(plucks):
            start = max(0, int((t0 + k * cycle / 4 + rng.uniform(-0.01, 0.01)) * SR))
            end = min(len(out), start + n)
            out[start:end] += sig[: end - start]
        t0 += cycle
    return lowpass(out[: int(dur * SR)], 3800) * 0.022


def pad(dur: float, chords_at: list) -> np.ndarray:
    """Slow string pad: detuned saws, filtered, cross-fading chords."""
    n = int(dur * SR)
    out = np.zeros(n)
    t = np.arange(n) / SR
    for (start, length, chord) in chords_at:
        s, e = int(start * SR), min(n, int((start + length + 1.8) * SR))
        tt = t[s:e] - start
        a = np.clip(tt / 1.6, 0, 1) * np.clip((length + 1.8 - tt) / 1.8, 0, 1)
        for semi in chord:
            for d in (-0.08, 0, 0.07):
                f = hz(semi + 12 + d)
                saw = 2 * ((f * tt) % 1) - 1
                out[s:e] += saw * a * 0.018
    return lowpass(lowpass(out, 1700), 2400)


def bass(dur: float, chords_at: list) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros(n)
    for (start, length, chord) in chords_at:
        s = int(start * SR)
        m = min(n - s, int((length + 1.2) * SR))
        tt = np.arange(m) / SR
        f = hz(chord[0] - 12)
        out[s:s + m] += (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * env(m, 0.15, 2.4) * 0.11
    return out


def santoor(f: float, length: float, rng, vel=1.0) -> np.ndarray:
    """Karplus-Strong string, struck twice like a santoor mallet."""
    n = int(length * SR)
    p = int(SR / f)
    buf = rng.uniform(-1, 1, p) * vel
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.4985 * (buf[i % p] + buf[(i + 1) % p])
    out = lowpass(out, 5200)
    return out * 0.32


def chime(f: float, length: float) -> np.ndarray:
    n = int(length * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) for r, a in ((1, 1), (2.76, .5), (5.4, .25), (8.93, .12)))
    return s * env(n, 0.002, 1.6) * 0.06


def reverb(x: np.ndarray, rng, seconds=3.2, wet=0.38) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    chans = []
    for _ in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = lowpass(ir, 6000)
        ir /= np.sqrt(np.sum(ir ** 2))
        chans.append(fftconvolve(x, ir)[: len(x)])
    dry = np.stack([x, x])
    return (1 - wet) * dry + wet * np.stack(chans) * 0.9


# ---------- composition ----------

def compose(stanzas: list[list[int]], seed: int = 3):
    rng = np.random.default_rng(seed)
    STEP = BEAT / 2           # one word per eighth note
    INTRO = 2 * BAR           # title card
    events, line_times, word_times = [], [], []
    t = INTRO
    chord_i = 0
    chords_at = [(0.0, INTRO, CHORDS[0])]
    for si, stanza in enumerate(stanzas):
        if si > 0:
            t += 2 * BEAT     # breath between stanzas
        for nwords in stanza:
            length = max(6, int(np.ceil(nwords * 0.5 + 3.5))) * BEAT  # words, then time to read
            chord = CHORDS[chord_i % len(CHORDS)]
            chord_i += 1
            chords_at.append((t, length, chord))
            line_times.append({'start': round(t, 3), 'end': round(t + length, 3)})
            # melody: a phrase in Kafi that starts on a chord tone and steps, one note per word
            deg = KAFI.index(chord[0] % 12) if chord[0] % 12 in KAFI else 0
            words = []
            for w in range(nwords):
                deg = int(np.clip(deg + rng.choice([-1, 1, 1, 2, -2, 0], p=[.25, .25, .15, .1, .1, .15]), 0, 9))
                semi = KAFI[deg % 7] + 12 * (deg // 7) + 12
                if w == nwords - 1:  # land on a chord tone
                    semi = chord[np.argmin([abs((c + 12) - semi) for c in chord])] + 12
                at = t + w * STEP
                words.append(round(at, 3))
                events.append(('santoor', at, hz(semi), 0.9 if w == 0 else 0.7))
                if w == nwords - 1:
                    events.append(('santoor', at + STEP * 0.5, hz(semi), 0.35))  # santoor tremolo
            events.append(('chime', t, hz(chord[0] + 36), 1))
            word_times.append(words)
            t += length
    OUTRO = 3 * BAR
    chords_at.append((t, OUTRO, CHORDS[0]))
    end_card = t
    dur = t + OUTRO

    mono = tanpura(dur, rng) + pad(dur, chords_at) + bass(dur, chords_at)
    for kind, at, f, vel in events:
        s = int(at * SR)
        sig = santoor(f, 2.6, rng, vel) if kind == 'santoor' else chime(f, 2.5)
        e = min(len(mono), s + len(sig))
        mono[s:e] += sig[: e - s]
    # final santoor cadence on Sa under the end card
    for k, semi in enumerate([7, 5, 3, 0]):
        s = int((end_card + BEAT + k * BEAT) * SR)
        sig = santoor(hz(semi + 12), 3.0, rng, 0.7)
        mono[s:s + len(sig)] += sig[: len(mono) - s]

    stereo = reverb(mono, rng)
    fade_in, fade_out = int(1.2 * SR), int(2.5 * SR)
    stereo[:, :fade_in] *= np.linspace(0, 1, fade_in)
    stereo[:, -fade_out:] *= np.linspace(1, 0, fade_out)
    stereo = np.tanh(stereo / np.abs(stereo).max() * 1.4) / np.tanh(1.4) * 0.89  # gentle limiter
    timing = {'bpm': BPM, 'intro': INTRO, 'end_card': round(end_card, 3), 'duration': round(dur, 3),
              'lines': [{**lt, 'words': wt} for lt, wt in zip(line_times, word_times)]}
    return stereo, timing


def main():
    out = Path(sys.argv[1])
    stanzas = json.loads(sys.argv[2])
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 3
    out.mkdir(parents=True, exist_ok=True)
    audio, timing = compose(stanzas, seed)
    from scipy.io import wavfile
    wavfile.write(out / 'music.wav', SR, (audio.T * 32767).astype(np.int16))
    (out / 'timing.json').write_text(json.dumps(timing, indent=1))
    print(f"{timing['duration']:.1f}s, {sum(len(s) for s in stanzas)} lines")


if __name__ == '__main__':
    main()

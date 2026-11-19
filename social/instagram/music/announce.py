"""
Original orchestral score for the launch announcement reel (no third-party audio, nothing to license).

D minor, 75 BPM, 8 bars of 4 beats (3.2 s each) plus a ring-out: strings swell with a harp arpeggio (bars 1-2),
a horn theme enters (3-4), fuller strings and timpani (5-6), a timpani roll and cymbal swell over Bb -> A (7),
then a D major tutti (8). Scene changes in announce.mjs sit on the bar lines (0, 6.4, 12.8, 19.2, 22.4 s).

    ~/.local/tts-venv/bin/python social/instagram/music/announce.py <out.wav>
"""
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BEAT = 0.8
BAR = 4 * BEAT
LEN = 8 * BAR + 3.4  # 29 s with the ring-out
D3 = 146.83
rng = np.random.default_rng(7)


def hz(semi, base=D3):
    return base * 2 ** (semi / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def adsr(n, a, r, sustain=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * sustain
    rel = int(r * SR)
    if rel and n > rel:
        e[-rel:] *= np.linspace(1, 0, rel) ** 1.5
    return e


def saw(f, n, phase=0.0, vib=0.0, vib_rate=5.2):
    t = np.arange(n) / SR
    inst = f * (1 + vib * np.sin(2 * np.pi * vib_rate * t + rng.uniform(0, 6.28)))
    ph = (np.cumsum(inst) / SR + phase) % 1.0
    return 2 * ph - 1


def strings(f, dur, a=0.7, r=1.0, bright=2600, voices=6):
    n = int(dur * SR)
    x = sum(saw(f * 2 ** (rng.uniform(-9, 9) / 1200), n, rng.uniform(0, 1), vib=0.004) for _ in range(voices)) / voices
    return lp(x, bright, 2) * adsr(n, a, r)


def horn(f, dur, a=0.12, r=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = 0.6 * saw(f, n, vib=0.0035, vib_rate=4.8) + 0.4 * saw(f * 1.003, n, 0.3, vib=0.0035)
    # the tone brightens with the attack, like a breath into the bell
    b = np.minimum(1, t / 0.35)
    y = lp(x, 800) * (1 - b) + lp(x, 1900) * b
    y = lp(y, 2400) + 0.35 * np.sin(2 * np.pi * f * t)
    return y * adsr(n, a, r)


def harp(f, length=2.4, vel=1.0):
    n = int(length * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * vel
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return lp(out, 5000) * np.exp(-np.arange(n) / SR / 1.6)


def timpani(f, vel=1.0, length=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    pitch = f * (1 + 0.06 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR) + 0.35 * np.sin(2 * np.pi * np.cumsum(pitch * 1.5) / SR)
    hit = lp(rng.standard_normal(n), 900) * np.exp(-t * 40) * 0.6
    return (body * np.exp(-t / 0.9) + hit) * vel


def reverb(x, seconds=2.8, wet=0.32):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for _ in range(2):
        ir = lp(rng.standard_normal(n) * np.exp(-t * 6.9 / seconds), 5500)
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(fftconvolve(x, ir)[:len(x)])
    return (1 - wet) * np.stack([x, x]) + wet * np.stack(out)


def put(mix, x, at, gain=1.0):
    i = int(at * SR)
    j = min(len(mix), i + len(x))
    mix[i:j] += x[:j - i] * gain


def main(path):
    N = int(LEN * SR)
    pad, low, mel, perc, harps = (np.zeros(N) for _ in range(5))

    # chords as semitones from D3, one per bar (bar 7 splits Bb | A)
    chords = [(0, 2, [0, 3, 7]), (1, 2, [0, 3, 7]), (2, 1, [-4, 0, 3]), (3, 1, [-9, -5, -2]),
              (4, 1, [-2, 2, 5]), (5, 1, [0, 3, 7]), (6, 0.5, [-4, 0, 3]), (6.5, 0.5, [-5, -1, 2]), (7, 1, [0, 4, 7, 12])]
    roots = {0: 0, 1: 0, 2: -4, 3: -9, 4: -2, 5: 0, 6: -4, 6.5: -5, 7: 0}
    for bar, nbars, notes in chords:
        at, dur = bar * BAR, nbars * BAR + 0.6
        if bar == 7:
            dur = LEN - at
        level = 0.55 if bar < 2 else 0.8 if bar < 4 else 1.0
        for s in notes:
            put(pad, strings(hz(s), dur, a=1.4 if bar == 0 else 0.5, r=1.2 if bar < 7 else 3.0), at, level)
            if bar >= 4:  # violins an octave up for the second half
                put(pad, strings(hz(s + 12), dur, a=0.6, r=1.2 if bar < 7 else 3.0, bright=3600), at, 0.45 * level)
        put(low, strings(hz(roots[bar] - 12), dur, a=0.5, r=1.0 if bar < 7 else 3.0, bright=600, voices=4), at, 0.9 * (0.6 if bar < 2 else 1.0))

    # horn theme from bar 3; semitones from D4, (bar, beat, beats)
    theme = [(3, 2, 0, 2), (0, 2, 2, 1), (3, 2, 3, 1),
             (7, 3, 0, 3), (10, 3, 3, 1),
             (5, 4, 0, 2), (2, 4, 2, 1), (5, 4, 3, 1),
             (7, 5, 0, 4),
             (8, 6, 0, 2), (11, 6, 2, 2),
             (12, 7, 0, 5.5)]
    for s, bar, beat, beats in theme:
        at, dur = bar * BAR + beat * BEAT, beats * BEAT + 0.15
        put(mel, horn(hz(s + 12), dur, r=0.5 if bar < 7 else 2.6), at, 0.75)
        if bar >= 4:  # violins double the theme an octave up
            put(mel, strings(hz(s + 24), dur, a=0.15, r=0.4 if bar < 7 else 2.6, bright=4200, voices=4), at, 0.3)

    # harp arpeggios: rising D minor in bars 1-2, D major spread over the final chord
    arp = [0, 7, 12, 15, 19, 24, 27, 31]
    for k in range(16):
        put(harps, harp(hz(arp[k % 8])), k * BEAT / 2, 0.5)
    for k, s in enumerate([0, 7, 12, 16, 19, 24, 28, 31]):
        put(harps, harp(hz(s), 3.0), 7 * BAR + k * 0.07, 0.55)

    # timpani: downbeats of bars 5 and 6, a roll through bar 7, the big hit on bar 8
    put(perc, timpani(73.42, 0.9), 4 * BAR)
    put(perc, timpani(55.0, 0.8), 5 * BAR)
    put(perc, timpani(73.42, 0.6), 5 * BAR + 2 * BEAT)
    for k in range(32):
        put(perc, timpani(55.0 if k < 16 else 73.42, 0.12 + 0.55 * (k / 31) ** 2, 0.6), 6 * BAR + k * BEAT / 8)
    put(perc, timpani(73.42, 1.3, 3.2), 7 * BAR)
    # cymbal: swell into bar 8, then a long crash
    sw = int(BAR * SR)
    noise = hp(rng.standard_normal(sw), 4500)
    put(perc, lp(noise, 9000) * np.linspace(0, 1, sw) ** 4, 6 * BAR, 0.05)
    crash_n = int(4 * SR)
    put(perc, hp(rng.standard_normal(crash_n), 3500) * np.exp(-np.arange(crash_n) / SR / 1.0), 7 * BAR, 0.045)

    dry = 0.55 * pad + 0.5 * low + 0.6 * mel + 0.55 * harps + 0.7 * perc
    st = reverb(dry)
    # a little stereo width: harp a touch left, horn a touch right
    st[0] += 0.08 * harps
    st[1] += 0.08 * mel
    t = np.arange(N) / SR
    st *= np.minimum(1, t / 0.4) * np.clip((LEN - t) / 1.5, 0, 1)
    st = np.tanh(1.1 * st / np.max(np.abs(st))) / np.tanh(1.1) * 0.89
    w = wave.open(path, 'wb')
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st.T * 32767).astype(np.int16).tobytes())
    w.close()
    print(f'{path}  ({LEN:.1f}s)')


if __name__ == '__main__':
    main(sys.argv[1])

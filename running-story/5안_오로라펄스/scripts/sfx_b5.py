# 5안 aurora: very soft air sounds under the song (scene dissolves, a chime for 완주)
# usage: python3 sfx_b5a.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(9); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); DB = [b for b, d in g if d]
near = lambda x: min(DB, key=lambda b: abs(b - x))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def air(dur=.7, lo=2000, hi=9000, v=.3):
    n = int(dur * SR); t = np.arange(n) / n; return bp(rng.standard_normal(n), lo, hi) * np.sin(np.pi * t) ** 2 * v
def chime(f0=932.33, v=.25):   # B-flat, in the song's key
    n = int(2.2 * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f0 * m * t) * a for m, a in ((1, 1), (2.01, .4), (3.02, .15)))
    return x * np.exp(-t / .7) * np.minimum(1, t / .005) * v
for x in (4.39, 8.09, 11.78, 15.46, 19.14): ev(air(.6, 1500, 8000, .22), near(x) - .25)    # soft air as each scene dissolves in
ev(chime(932.33, .22), near(19.14) + .3); ev(chime(1396.9, .1), near(19.14) + .36, 1, .3)          # the 완주 tag (B-flat, the song's key)
pk = np.abs(out).max(); out *= 10 ** (-17 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -17 dBFS')

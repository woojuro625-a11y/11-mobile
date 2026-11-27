# 8안 night tunnel: a little foley under the song (a soft whoosh as each page rushes past into the tunnel, an electric buzz when the 완주 sign lights on the end hit)
# usage: python3 sfx_b8.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(8); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def whoosh(v=.3, d=.45):
    n = int(d * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); y = np.zeros(n); seg = n // 8
    for j in range(8):                                   # a band sweeping down as the page flies past
        f = 4000 * (1 - j / 9) + 300; a, b = j * seg, min(n, (j + 2) * seg); y[a:b] += bp(x[a:b], f * .6, min(f * 1.4, 20000)) * np.hanning(b - a)
    return y * np.sin(np.pi * t / d) ** 1.5 * v
def buzz(v=.25, d=.6):
    n = int(d * SR); t = np.arange(n) / SR; s = np.sign(np.sin(2 * np.pi * 120 * t)) * .3 + np.sin(2 * np.pi * 240 * t) * .5
    flick = np.where((t < .05) | ((t > .09) & (t < .12)) | (t > .16), 1, .1)
    return bp(s, 150, 3000) * flick * np.exp(-t / .35) * v
bar = lambda k: DB[k]
for k in (2, 4, 6, 9, 11): ev(whoosh(.35), bar(k) - .05, 1, 0)
ev(buzz(.4), bar(13), 1, .3)
pk = np.abs(out).max(); out *= 10 ** (-18 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -18 dBFS')

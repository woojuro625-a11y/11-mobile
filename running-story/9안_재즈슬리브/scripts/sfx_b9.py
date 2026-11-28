# 9안 jazz record sleeve: a little foley under the song (a paper-sleeve slide at each block cut, a soft pop when the 완주 sticker lands)
# usage: python3 sfx_b9.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(9); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = BT[1] - BT[0]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def slide(v=.3, d=.32):
    n = int(d * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 1200, 7000) * np.sin(np.pi * t / d) ** 2 * v
def pop(f=560, v=.4):
    n = int(.12 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t * (1 + 2 * np.exp(-t / .02))) * np.minimum(1, t / .001) * np.exp(-t / .03) * v
T1, T2, T3, T4, T5 = DB[1], DB[2], DB[3] + per * 2, DB[5], DB[6]
for i, t0 in enumerate((T1, T2, T3, T4, T5)): ev(slide(), t0 - .16, 1, -.4 + .2 * i)
ev(pop(), T5 + per * .5, 1, .3)
pk = np.abs(out).max(); out *= 10 ** (-18 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -18 dBFS')

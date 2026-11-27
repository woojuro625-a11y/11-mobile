# 7안 hip-hop alley: a little foley under the song (a spray-can hiss when the 완주 stamp lands, a tape-deck button click for the memo card)
# usage: python3 sfx_b7h.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(71); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = float(np.median(np.diff(BT))); near = lambda x: min(DB, key=lambda b: abs(b - x)); after = lambda t0, n: [b for b in BT if b >= t0 - .02][:n]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def spray(v=.35, d=.45):
    n = int(d * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 3000, 12000) * np.minimum(1, t / .02) * np.minimum(1, (d - t) / .12) * v
def click(v=.4):
    n = int(.06 * SR); t = np.arange(n) / SR; return (bp(rng.standard_normal(n), 900, 5000) * env(n, .0005, .006) + np.sin(2 * np.pi * 180 * t) * env(n, .001, .015) * .5) * v
T5 = near(21.0); lb = after(T5, 8)
ev(spray(), lb[1] + per / 2 - .05, 1, .4)
ev(click(), lb[6], 1, -.2)
pk = np.abs(out).max(); out *= 10 ** (-17 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -17 dBFS')

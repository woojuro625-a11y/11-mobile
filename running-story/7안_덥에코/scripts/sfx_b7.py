# 7안 dub echo: a little foley under the song, each with the song's own 8th-note tape echo (rimshot for 완주, tape click for the memo card)
# usage: python3 sfx_b7.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(7); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = float(np.median(np.diff(BT))); ECHO = per / 2; near = lambda x: min(DB, key=lambda b: abs(b - x)); after = lambda t0, n: [b for b in BT if b >= t0 - .02][:n]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def dub(sig, t0, g=1, n=3, fb=.5):          # repeats one delay apart, darker each time, ping-ponging
    for k in range(n + 1):
        s = sig if k == 0 else bp(sig, 300, 3500 / k)
        ev(s, t0 + k * ECHO, g * fb ** k, (-.5 if k % 2 else .5) if k else 0)
def rim(v=.4):
    n = int(.15 * SR); t = np.arange(n) / SR; return (bp(rng.standard_normal(n), 1500, 6000) * env(n, .0005, .012) + np.sin(2 * np.pi * 820 * t) * env(n, .0005, .03) * .6) * v
def click(v=.3):
    n = int(.08 * SR); return bp(rng.standard_normal(n), 800, 4000) * env(n, .0005, .008) * v
BT8 = [b for b in BT if abs(b - 5.457) < .1][0]; I1 = BT.index(BT8); T5 = near(21.0)
lb = after(T5, 8)
dub(rim(.5), lb[1] + per / 2)
dub(click(.35), lb[6], 1, 2)
pk = np.abs(out).max(); out *= 10 ** (-17 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -17 dBFS')

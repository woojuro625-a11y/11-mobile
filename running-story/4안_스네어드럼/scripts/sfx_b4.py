# 4안 snare drum stage: almost no foley (the song is the drums), two quiet tape sounds
# usage: python3 sfx_b4.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(11); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n '))
BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = float(np.median(np.diff(BT)))
near = lambda x: min(DB, key=lambda b: abs(b - x))
after = lambda t0, n: [b for b in BT if b >= t0 - .02][:n]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g
    out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def snip(v=.5):   # scissor: two short metallic clicks
    n = int(.06 * SR); x = bp(rng.standard_normal(n), 3000, 9000) * env(n, .0004, .006)
    y = np.zeros(int(.09 * SR)); y[:n] += x; y[int(.03 * SR):int(.03 * SR) + n] += x * .7; return y * v
def paper(v=.4, d=.05):  # paper slap
    n = int(.15 * SR); return bp(rng.standard_normal(n), 500, 5000) * env(n, .001, d) * v
def thump(v=.6):  # rubber stamp
    n = int(.25 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 95 * t) * env(n, .002, .05) + bp(rng.standard_normal(n), 300, 2500) * env(n, .001, .02) * .5) * v
def rip(v=.35, dur=.3):  # tape
    n = int(dur * SR); x = bp(rng.standard_normal(n), 1500, 7000) * (np.sin(np.pi * np.arange(n) / n) ** .7)
    x *= 1 + .8 * (rng.random(n) > .97); return x * v
T1, T2, T3, TJ, T4, T5 = near(3.2), near(7.4), near(11.65), near(13.8), near(15.9), near(20.1)
# the song is all drums: no extra hits, only two quiet tape sounds (capture taped down, setlist taped on the stage)
ev(rip(.3), T1 + .02, 1, -.2)
lb = after(T5, 8); ev(rip(.25, .4), lb[5], 1, .2)
pk = np.abs(out).max(); out *= 10 ** (-15 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -15 dBFS  cuts at', [round(x, 3) for x in (T1, T2, T3, T4, T5)])

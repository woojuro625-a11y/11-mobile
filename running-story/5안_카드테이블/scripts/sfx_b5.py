# 5안 card table: quiet foley under the song (card deals, flips, chips)
# usage: python3 sfx_b5.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(5); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = float(np.median(np.diff(BT))); near = lambda x: min(DB, key=lambda b: abs(b - x)); after = lambda t0, n: [b for b in BT if b >= t0 - .02][:n]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def flick(v=.4):   # a card sliding across felt and landing
    n = int(.16 * SR); x = bp(rng.standard_normal(n), 1500, 7000) * np.linspace(1, .2, n) * env(n, .01, .08); k = bp(rng.standard_normal(int(.03 * SR)), 800, 4000) * env(int(.03 * SR), .0005, .006)
    y = np.zeros(n + int(.03 * SR)); y[:n] += x * .6; y[n - int(.02 * SR):n - int(.02 * SR) + len(k)] += k; return y * v
def flip(v=.35): n = int(.06 * SR); return bp(rng.standard_normal(n), 2500, 9000) * env(n, .0008, .01) * v
def chip(v=.25):   # clay chip click
    n = int(.05 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 3200 * t) * .5 + bp(rng.standard_normal(n), 2000, 6000)) * env(n, .0005, .008) * v
T1, T2, T3, TJ, T4, T5, T6 = [near(x) for x in (3.67, 7.36, 11.05, 12.9, 14.75, 18.44, 20.25)]
for i in (1, 2): ev(flick(.45), BT[i] + .05, 1, (-.4, .4)[i - 1])                     # photo cards dealt
for b in [x for x in BT if x < T1 - .05][-3:]: ev(flip(.4), b)                          # 3 2 1
ev(flip(.5), T1)                                                                        # the capture card turns over on the drop
for k in range(8): ev(flick(.25), T2 + .05 + k * per / 2 + .05, 1, -.2 + .05 * k)       # split cards
ev(flick(.35), T3 + 2 * per + .05)
for i in range(6):                                                                      # chips stacking
    t0 = T4 + .1 + i * per / 2
    for j in range(5): ev(chip(.18), t0 + j * per / 5, 1, -.5 + .2 * i)
for b in after(T5, 4)[1:4]: ev(flip(.4), b)                                             # final 3 2 1
for i in range(6): ev(flick(.3), T6 + .1 + i * per / 2 + .05, 1, -.5 + .2 * i)         # the hand fans out
ev(flick(.35), after(T6, 6)[4] + .05)                                                   # the memo card
pk = np.abs(out).max(); out *= 10 ** (-15 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -15 dBFS')

# 3안 LP bar: quiet foley under the song (vinyl crackle, prints, sleeve, needle drop)
# usage: python3 sfx_b3.py <out_sfx.wav>
import sys, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; DUR = 30.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
out = np.zeros((N, 2))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def env(n, a=.005, d=.1):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = int(t0 * SR); s = sig[:max(0, N - i)] * g
    out[i:i + len(s), 0] += s * (1 - pan) / 2 * 2 ** .5 * .75
    out[i:i + len(s), 1] += s * (1 + pan) / 2 * 2 ** .5 * .75
def crackle(dur, dens=40, hiss=.02):
    n = int(dur * SR); x = bp(rng.standard_normal(n), 800, 8000) * hiss
    for _ in range(int(dur * dens)):
        i = rng.integers(0, n - 200); L = rng.integers(20, 160)
        x[i:i + L] += rng.choice([-1, 1]) * rng.uniform(.1, .6) * np.exp(-np.arange(L) / (L / 4))
    return bp(x, 300, 9000)
def swish(dur, lo=600, hi=5000, vol=.5):
    n = int(dur * SR); t = np.arange(n) / n
    x = bp(rng.standard_normal(n), lo, hi) * np.sin(np.pi * t) ** 1.5; return x * vol
def tap(vol=.6):
    n = int(.08 * SR); return bp(rng.standard_normal(n), 400, 3000) * env(n, .001, .015) * vol
def thud(f=70, vol=.8):
    n = int(.35 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t * (1 - .3 * t)) * env(n, .002, .08) * vol; k = tap(.3); x[:len(k)] += k; return x
def click(vol=.5):
    n = int(.03 * SR); return bp(rng.standard_normal(n), 2000, 8000) * env(n, .0005, .004) * vol

fade = lambda x, a, b: x * np.clip(np.minimum(np.arange(len(x)) / (a * SR), (len(x) - np.arange(len(x))) / (b * SR)), 0, 1)
ev(fade(crackle(7.6, 28, .015), .8, .5), 0.0, .55)              # room crackle under the ambient intro
for t0 in (1.0, 1.3): ev(tap(.5), t0, 1, -.3 if t0 < 1.2 else .3)   # prints land
ev(swish(.5, 500, 4000, .35), 2.3); ev(swish(.7, 900, 6000, .3), 2.75, 1, .1)   # sleeve up / card out
ev(swish(.45, 500, 3500, .25), 3.25, 1, -.1)                     # sleeve away
for t0 in (3.55, 4.2, 4.75): ev(click(.35), t0, 1, -.4)         # highlight marks
ev(swish(.4, 600, 5000, .3), 5.3)                                # card slides away
ev(swish(.5, 300, 2500, .3), 5.75, 1, .4); ev(thud(80, .45), 6.2) # record slides on and lands
ev(click(.45), 6.35, 1, .5); ev(swish(.5, 1500, 7000, .12), 6.4, 1, .4)   # tonearm lift and swing
ev(thud(60, .55), 7.08); ev(crackle(.25, 200, .05) * 1.2, 7.08)  # needle drop just before the drop
for t0 in (11.055, 15.536): ev(swish(.35, 1500, 8000, .12), t0 - .2)
ev(swish(.6, 400, 3000, .2), 19.85)
ev(fade(crackle(10.0, 22, .012), 1.5, 1.0) * np.linspace(.35, 1, int(10 * SR)), 20.0, .6)   # crackle rises as the song fades
pk = np.abs(out).max(); out *= 10 ** (-15 / 20) / pk                # stem peak -15 dBFS
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('peak dBFS', -15)

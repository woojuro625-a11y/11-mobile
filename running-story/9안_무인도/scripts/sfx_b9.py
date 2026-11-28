# 9안 castaway island: a little foley under the song (a wave washing in at each page change, a cork pop when the letter from the bottle opens, a soft wooden knock for the 완주 sign)
# usage: python3 sfx_b9i.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(91); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = BT[1] - BT[0]
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def wave(v=.35, d=.95):
    n = int(d * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (lp(x, 900) * .8 + bp(x, 2000, 7000) * .25 * env ** 2) * env * v
def cork(v=.45):
    n = int(.1 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * 420 * t * (1 + 1.5 * np.exp(-t / .01))) * np.exp(-t / .02) * v + bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t / .004) * v * .6
def knock(v=.4):
    n = int(.15 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 190 * t) + .5 * np.sin(2 * np.pi * 410 * t)) * np.exp(-t / .03) * v
T1, T2, T3, T4, T5 = DB[1], DB[2], DB[3] + per * 2, DB[5], DB[6]
for i, t0 in enumerate((T1, T2, T3, T4, T5)): ev(wave(), t0 - .42, 1, -.3 + .15 * i)
ev(knock(), T5 + per * .6, 1, .4)
ev(cork(), T5 + per * 1.8, 1, -.2)
pk = np.abs(out).max(); out *= 10 ** (-17 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -17 dBFS')

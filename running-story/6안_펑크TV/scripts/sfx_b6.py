# 6안 funk TV show: very little foley under the song (TV switch-on, a sticker pop for 완주, a soft pop for the memo card)
# usage: python3 sfx_b6.py <beat.js> <out_sfx.wav>
import sys, json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; N = 30 * SR; rng = np.random.default_rng(6); out = np.zeros((N, 2))
g = json.loads(open(sys.argv[1]).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]; DB = [b for b, d in g if d]
per = float(np.median(np.diff(BT))); near = lambda x: min(DB, key=lambda b: abs(b - x)); after = lambda t0, n: [b for b in BT if b >= t0 - .02][:n]
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def ev(sig, t0, g=1, pan=0):
    i = max(0, int(t0 * SR)); s = sig[:max(0, N - i)] * g; out[i:i + len(s), 0] += s * (1 - pan) * .7; out[i:i + len(s), 1] += s * (1 + pan) * .7
def pop(f=620, v=.4):
    n = int(.12 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t * (1 + 2.5 * np.exp(-t / .02))) * env(n, .001, .03) * v
def tvon(v=.35):
    n = int(.5 * SR); t = np.arange(n) / SR; click = bp(rng.standard_normal(n), 2000, 8000) * env(n, .0005, .006)
    hum = (np.sin(2 * np.pi * 60 * t) + .5 * np.sin(2 * np.pi * 120 * t)) * np.minimum(1, t / .05) * np.exp(-t / .25) * .25
    whine = np.sin(2 * np.pi * 15600 * t) * np.exp(-t / .2) * .05; return (click + hum + whine) * v
T1 = near(4.5); T5 = near(19.67)
ev(tvon(.4), T1)
lb = after(T5, 8); ev(pop(520, .45), lb[1], 1, .4); ev(pop(700, .3), T5 + per * 1.6, 1, -.2)
pk = np.abs(out).max(); out *= 10 ** (-17 / 20) / pk
wavfile.write(sys.argv[2], SR, (out * 32767).astype(np.int16)); print('sfx peak -17 dBFS')

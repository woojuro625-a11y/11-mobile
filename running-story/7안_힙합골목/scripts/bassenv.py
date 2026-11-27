# per-frame (60 fps) bass and overall energy of a 30 s song edit -> bass.js  (drives the groove line and how hard the dancer moves)
# usage: python3 -I bassenv.py <music30.wav> <out bass.js>
import sys, json, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050); hop = sr // 60
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop)); fr = librosa.fft_frequencies(sr=sr, n_fft=2048)
b = S[(fr >= 40) & (fr < 250)].sum(0); a = S.sum(0)
b = b / np.percentile(b, 98); a = a / np.percentile(a, 98)
n = 30 * 60; b = np.clip(b[:n], 0, 1.3); a = np.clip(a[:n], 0, 1.3)
sm = np.convolve(a, np.ones(30) / 30, 'same')            # half-second loudness, for "the song is still grooving"
open(sys.argv[2], 'w').write('const BASS=' + json.dumps([round(float(x), 3) for x in b]) + ';const LOUD=' + json.dumps([round(float(x), 3) for x in sm]) + ';')
print('frames', len(b), 'loud at 20/25/28/29.5 s', [round(float(sm[int(t * 60)]), 2) for t in (20, 25, 28, 29.5)])

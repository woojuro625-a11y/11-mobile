# per-beat drum strengths of a song edit (kick 35~130 Hz, snare 1.5~5 kHz) + silent cuts -> drums.js for the video
# usage: python3 -I drums.py <music30.wav> <beat.js> <out drums.js>
import sys, json, numpy as np, librosa
wav, bj, out = sys.argv[1:4]
g = json.loads(open(bj).read().split('=', 1)[1].rstrip(';\n ')); BT = [b for b, d in g]
y, sr = librosa.load(wav, sr=22050); hop = 128
Sx = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop)); fr = librosa.fft_frequencies(sr=sr, n_fft=1024); ft = np.arange(Sx.shape[1]) * hop / sr
def band(lo, hi): b = Sx[(fr >= lo) & (fr < hi)].sum(0); return b / np.percentile(b, 99)
kk, sn = band(35, 130), band(1500, 5000)
def pk(a, t): i0, i1 = np.searchsorted(ft, t - .02), np.searchsorted(ft, t + .06); return float(a[i0:i1].max()) if i1 > i0 else 0.
beats = [[round(t, 3), round(min(1.2, pk(kk, t)), 2), round(min(1.2, pk(sn, t)), 2)] for t in BT]
rms = 20 * np.log10(librosa.feature.rms(y=y, hop_length=441, frame_length=882)[0] + 1e-6); rt = np.arange(len(rms)) * 441 / sr
q = rms < np.percentile(rms, 50) - 14; cuts = []; i = 0
while i < len(q):
    if q[i]:
        j = i
        while j < len(q) and q[j]: j += 1
        if (j - i) * .02 >= .08 and rt[i] > .05: cuts.append([round(float(rt[i]), 3), round((j - i) * .02, 3)])
        i = j
    else: i += 1
open(out, 'w').write('const DRUMS=' + json.dumps({'beats': beats, 'cuts': cuts}) + ';')
print('beats', len(beats), 'snare hits >.6:', sum(b[2] > .6 for b in beats), 'kick >.5:', sum(b[1] > .5 for b in beats), 'cuts', cuts)

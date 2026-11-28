# the song from its very first sample, no cuts: the first 30 s with a 1 s fade-out at the end (and a 10 ms fade-in against a click),
# plus the beat grid the video follows
# usage: python3 -I music_full.py <song.wav> <out_music30.wav> <out_beat.js> [kick|onset|first] [bpm first_downbeat]
#   bpm + first_downbeat: write a fixed grid instead of detecting (for four-on-the-floor songs with a known tempo)
import sys, json, numpy as np, librosa, soundfile as sf
src, out_wav, out_js = sys.argv[1:4]; PHASE = sys.argv[4] if len(sys.argv) > 4 else 'kick'
y, sr = sf.read(src, dtype='float32', always_2d=True); y = y[:, :2] if y.shape[1] > 1 else np.repeat(y, 2, 1)
n = int(30 * sr); m = y[:n] if len(y) >= n else np.concatenate([y, np.zeros((n - len(y), 2), np.float32)])
m = m.copy(); fi = int(.01 * sr); m[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(1.0 * sr); m[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]          # 1 s cosine fade-out
sf.write(out_wav, np.clip(m, -1, 1), sr, subtype='PCM_16')
if len(sys.argv) > 6:
    bpm, d0 = float(sys.argv[5]), float(sys.argv[6]); b = 60 / bpm
    out = [[round(d0 + k * b, 4), k % 4 == 0] for k in range(int((30 - d0) / b) + 1)]
else:
    y2 = librosa.resample(librosa.to_mono(m.T), orig_sr=sr, target_sr=22050); hop = 512
    env = librosa.onset.onset_strength(y=y2, sr=22050, hop_length=hop)
    _, bt = librosa.beat.beat_track(onset_envelope=env, sr=22050, hop_length=hop, units='time')
    period = float(np.median(np.diff(bt)))
    # one steady grid fitted to the detected beats (least squares on the beat index)
    k = np.round((bt - bt[0]) / period); A = np.vstack([k, np.ones_like(k)]).T; per, off = np.linalg.lstsq(A, bt, rcond=None)[0]
    while off - per > 0: off -= per
    grid = [off + i * per for i in range(int((30 - off) / per) + 1) if off + i * per >= 0]
    Sx = np.abs(librosa.stft(y2, hop_length=hop)); fr = librosa.fft_frequencies(sr=22050); kick = Sx[(fr > 40) & (fr < 150)].sum(0)
    strength = (lambda b: env[min(len(env) - 1, int(b * 22050 / hop))]) if PHASE == 'onset' else lambda b: kick[min(len(kick) - 6, int(b * 22050 / hop)):min(len(kick), int(b * 22050 / hop) + 6)].max()
    ph = 0 if PHASE == 'first' else max(range(4), key=lambda q: np.mean([strength(b) for b in grid[q::4]]))
    out = [[round(float(b), 3), (i - ph) % 4 == 0] for i, b in enumerate(grid)]
open(out_js, 'w').write('const BEATS=' + json.dumps(out) + ';')
print('music 30 s from the start, 1 s fade-out  beats', len(out), ' period %.4f' % (out[1][0] - out[0][0]), ' downbeats', [b for b, d in out if d][:5])

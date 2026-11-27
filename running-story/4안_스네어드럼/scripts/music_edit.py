# 3안: cut a song to exactly 30 s on bar lines and write the beat grid the video follows
# usage: python3 -I music_edit.py <song.wav> <out_music30.wav> <out_beat.js> [drop a0 a1 b0 b1 [kick|onset]]
#   kick (default): a bar starts on the beat with the most kick energy  onset: on the strongest onset (used for 3안 Pocketed Bars)
#   first: the first beat of the edit is a downbeat (four-on-the-floor songs where every beat has a kick, e.g. 5안 Card Countdown)
# drop = time in the EDIT where the beat comes in (listen and set it; 7.154 for this song). The video's scenes follow the grid from there
# default cut for "Pocketed Bars": A = 1.391~21.409 s (ambient intro + drop) + B = 48.298~58.28 s (outro),
# joined with a 50 ms equal-power crossfade, padded to 30.000 s; the join lands near the 10 s loop start (about 20 s)
import sys, json, numpy as np, librosa, soundfile as sf
src, out_wav, out_js = sys.argv[1:4]
DROP = float(sys.argv[4]) if len(sys.argv) >= 5 else 7.154
a0, a1, b0, b1 = map(float, sys.argv[5:9]) if len(sys.argv) >= 9 else (1.391, 21.409, 48.298, 58.28)
y, sr = sf.read(src, dtype='float32', always_2d=True); y = y[:, :2] if y.shape[1] > 1 else np.repeat(y, 2, 1)
a = y[int(a0 * sr):int(a1 * sr)]; b = y[int(b0 * sr):int(b1 * sr)]
xf = int(.05 * sr)                                   # equal-power crossfade at the cut
fo = np.sin(np.linspace(np.pi / 2, 0, xf))[:, None]; fi = np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
m = np.concatenate([a[:-xf], a[-xf:] * fo + b[:xf] * fi, b[xf:]])
n = int(30 * sr); m = m[:n] if len(m) >= n else np.concatenate([m, np.zeros((n - len(m), 2), np.float32)])
m[:int(.3 * sr)] *= np.linspace(0, 1, int(.3 * sr))[:, None]; m[-int(.25 * sr):] *= np.linspace(1, 0, int(.25 * sr))[:, None]
m = m.T
sf.write(out_wav, np.clip(m.T, -1, 1), sr, subtype='PCM_16')
# beat grid of the edit: detected beats, regularised to one steady grid from the drop to the end
y2 = librosa.resample(librosa.to_mono(m), orig_sr=sr, target_sr=22050); hop = 512
env = librosa.onset.onset_strength(y=y2, sr=22050, hop_length=hop)
_, bt = librosa.beat.beat_track(onset_envelope=env, sr=22050, hop_length=hop, units='time')
drop_guess = DROP
period = float(np.median(np.diff(bt)))
grid = [b for b in bt if b >= DROP - period * .45]
while grid[0] - period > drop_guess - period * .6: grid.insert(0, grid[0] - period)    # fill back to the drop
while grid[-1] + period < 30: grid.append(grid[-1] + period)                         # and on to the end
grid = [g for g in grid if g >= drop_guess - period * .6]
# bar = starts on the kick: pick the beat phase with the most low-band (40~150 Hz) energy
Sx = np.abs(librosa.stft(y2, hop_length=hop)); fr = librosa.fft_frequencies(sr=22050); kick = Sx[(fr > 40) & (fr < 150)].sum(0)
PHASE = sys.argv[9] if len(sys.argv) >= 10 else 'kick'
strength = (lambda b: env[min(len(env) - 1, int(b * 22050 / hop))]) if PHASE == 'onset' else lambda b: kick[min(len(kick) - 6, int(b * 22050 / hop)):min(len(kick), int(b * 22050 / hop) + 6)].max()
ph = 0 if PHASE == 'first' else max(range(4), key=lambda k: np.mean([strength(b) for b in grid[k::4]]))
out = [[round(float(b), 3), (i - ph) % 4 == 0] for i, b in enumerate(grid)]
open(out_js, 'w').write('const BEATS=' + json.dumps(out) + ';')
print('music', m.shape[1] / sr, 's  drop', out[0][0], ' beats', len(out), ' downbeats', [b for b, d in out if d][:4])

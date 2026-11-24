"""음악 비트 · 구간 분석 → beats.json + 구간 제안

사용법:
    python analyze_music.py <song.mp3> <출력폴더>

출력:
    <출력폴더>/beats.json : 비트 시각 배열(초). 곡 끝까지 마지막 템포로 외삽해 채운다.
표준출력: BPM, 마디(4박) 시작 비트 인덱스와 시각, 마디별 에너지(RMS), 큰 에너지 변화(드롭/브레이크) 후보.
→ 이 표를 보고 scene.js의 장면 경계 비트 인덱스를 정한다.

필요: pip install librosa soundfile numpy
"""
import sys, os, json
import numpy as np
import librosa


def main(src, out):
    os.makedirs(out, exist_ok=True)
    y, sr = librosa.load(src, sr=22050, mono=True)
    dur = len(y) / sr
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
    beats = list(map(float, beats))
    P = float(np.median(np.diff(beats)))
    while beats[-1] + P < dur:
        beats.append(beats[-1] + P)
    json.dump([round(b, 3) for b in beats], open(os.path.join(out, 'beats.json'), 'w'))
    rms = librosa.feature.rms(y=y, hop_length=512)[0]
    rt = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
    print(f"길이 {dur:.2f}s · 템포 {60 / P:.1f} BPM (1박 {P:.3f}s) · 비트 {len(beats)}개")
    print("마디  비트idx  시각     에너지")
    bars = []
    for i in range(0, len(beats), 4):
        a = beats[i]; c = beats[i + 4] if i + 4 < len(beats) else dur
        e = float(rms[(rt >= a) & (rt < c)].mean()) if np.any((rt >= a) & (rt < c)) else 0
        bars.append((i, a, e))
    emax = max(e for _, _, e in bars) or 1
    prev = None
    for n, (i, a, e) in enumerate(bars):
        mark = ''
        if prev is not None:
            r = e / (prev + 1e-9)
            mark = '  ▲ 상승(드롭 후보)' if r > 1.35 else '  ▼ 하강(브레이크 후보)' if r < 0.7 else ''
        print(f"{n:3d}   b{i:<4d}  {a:6.2f}s  {'█' * int(e / emax * 30):30s}{mark}")
        prev = e
    # 첫 비트 이전 인트로, 마지막 강한 히트
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    ot = librosa.frames_to_time(np.arange(len(onset)), sr=sr)
    tail = ot > dur - 4
    if np.any(tail):
        k = np.argmax(onset * tail)
        print(f"끝부분 가장 강한 히트: {ot[k]:.2f}s (가장 가까운 비트 b{int(np.argmin(np.abs(np.array(beats) - ot[k])))})")
    print(f"→ {out}/beats.json 저장")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

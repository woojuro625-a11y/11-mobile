"""마지막 카드 5초 루프용 효과음 (배경음악 없음, 낮은 볼륨)
loop8.js 타임라인과 같은 시각에 소리를 놓는다. 버퍼를 원형으로 다뤄 끝에서 시작으로 넘어가는 소리도 끊기지 않는다.
출력: loop8_sfx.wav (48kHz 16bit 스테레오, 정확히 5.0초)
"""
import numpy as np, wave

SR, DUR = 48000, 5.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)


def place(sig, t0, gain=1.0, pan=0.0):
    """원형 배치: 버퍼 끝을 넘는 부분은 앞쪽으로 감긴다"""
    idx = (int(round(t0 * SR)) + np.arange(len(sig))) % N
    np.add.at(L, idx, sig * gain * np.sqrt(.5 * (1 - pan)))
    np.add.at(R, idx, sig * gain * np.sqrt(.5 * (1 + pan)))


def tt(d):
    return np.arange(int(d * SR)) / SR


def svf(x, fc, q=1.5):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    lo = bp = 0.0; out = np.empty_like(x)
    for i in range(len(x)):
        hi = x[i] - lo - bp / q; bp += f[i] * hi; lo += f[i] * bp; out[i] = bp
    return out


def whoosh(d, f0, f1, peak=.6):
    t = tt(d); u = t / d
    env = np.where(u < peak, (u / peak) ** 2, np.exp(-(u - peak) / (1 - peak) * 4))
    return svf(rng.standard_normal(len(t)), f0 * (f1 / f0) ** u, 1.4) * env


def tick(f, d=.05):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90)


def click():
    t = tt(.03)
    return np.diff(rng.standard_normal(len(t)), prepend=0) * np.exp(-t * 400) * .6


def pop(f=620):
    t = tt(.18)
    fr = f * (1 + .6 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 22)


def chime(fs=(1046.5, 1568.0), d=.6):
    t = tt(d)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (6 + k * 2)) for k, f in enumerate(fs)) / len(fs)


def blip():
    t = tt(.09)
    fr = 880 * 1.5 ** (t / .09)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * t / .09) ** 2


# 끝(퇴장)~처음(등장)을 잇는 하나의 휙 소리: 4.35초에 시작해 0.5초까지 이어짐
place(whoosh(1.15, 260, 2600, .5), 4.35, .55)
# 글자 6개 등장 틱 (0.05 + i*0.07 시작, 착지 ≈ +0.16)
for i in range(6):
    place(tick(1700 + i * 140), .21 + i * .07, .16, (i - 2.5) * .12)
# 유튜브 아이콘 맥동
place(blip(), .86, .12, -.1); place(blip(), 3.36, .12, -.1)
# 팔로우 탭 → 팔로잉
place(click(), 1.60, .5, .35)
place(pop(), 1.61, .28, .35)
place(chime(), 1.70, .16, .3)
# 글자 물결
for i in range(6):
    place(tick(1200 + i * 180, .04), 2.45 + i * .09 - .02, .09, (i - 2.5) * .12)
# 팔로우 복귀 (아주 작게)
place(tick(900, .06), 4.62, .06, .35)

mix = np.stack([L, R])
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.34          # 최고 약 -9dBFS (배경음악 없이 효과음만, 살짝 낮게)
pcm = (mix.T * 32767).astype('<i2')
with wave.open('loop8_sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('loop8_sfx.wav', pcm.shape, 'samples =', N)

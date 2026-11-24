"""파이프피터의 바이블 쇼릴 — 사운드 디자인 합성 (numpy만 사용)
120 BPM. scene.js 타임라인의 컷/액센트에 맞춰 이벤트를 배치한다.
출력: audio.wav (48kHz, 16bit, 스테레오)
"""
import numpy as np, wave

SR = 48000
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
send = np.zeros(N)  # 리버브 센드 (모노)


def place(sig, t0, gain=1.0, pan=0.0, rev=0.0):
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    if i0 < 0:
        sig = sig[-i0:]; i0 = 0
    n = min(len(sig), N - i0)
    s = sig[:n] * gain
    L[i0:i0 + n] += s * np.sqrt(0.5 * (1 - pan))
    R[i0:i0 + n] += s * np.sqrt(0.5 * (1 + pan))
    send[i0:i0 + n] += s * rev


def tt(d):
    return np.arange(int(d * SR)) / SR


def kick(gain=1.0):
    t = tt(0.5)
    f = 45 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5)
    s += 0.5 * rng.standard_normal(len(t)) * np.exp(-t * 300)  # 클릭
    return np.tanh(s * 1.6) * gain


def sub_boom(d=2.2, f0=58, f1=30):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    return np.tanh(s * 2.0)


def metal(f=420, d=1.6, bright=1.0):
    """파이프 타격음: 비조화 배음"""
    t = tt(d)
    ratios = [1, 2.76, 5.40, 8.93, 13.34, 17.8]
    amps = [1, .65, .45, .3 * bright, .2 * bright, .12 * bright]
    s = np.zeros(len(t))
    for k, (r, a) in enumerate(zip(ratios, amps)):
        dec = 2.2 + k * 1.8
        s += a * np.sin(2 * np.pi * f * r * t + rng.random() * 6) * np.exp(-t * dec) * (1 + .15 * np.sin(2 * np.pi * (3 + k) * t))
    s += 0.6 * hp(rng.standard_normal(len(t))) * np.exp(-t * 90)
    return s / 2.5


def hp(x, n=2):
    for _ in range(n):
        x = np.diff(x, prepend=0.0)
    return x


def svf(x, fc, q=2.0, mode='bp'):
    """시간가변 스테이트 베리어블 필터 (fc: 배열 또는 스칼라)"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    damp = 1.0 / q
    lo = bp = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        hi = x[i] - lo - damp * bp
        bp += f[i] * hi
        lo += f[i] * bp
        out[i] = bp if mode == 'bp' else lo if mode == 'lp' else hi
    return out


def whoosh(d=0.5, f0=300, f1=4000, peak=0.7, q=1.5):
    t = tt(d)
    u = t / d
    fc = f0 * (f1 / f0) ** u
    env = np.where(u < peak, (u / peak) ** 2, np.exp(-(u - peak) / (1 - peak) * 4))
    return svf(rng.standard_normal(len(t)), fc, q) * env * 0.9


def riser(d=0.5, f0=200, f1=6000):
    t = tt(d)
    u = t / d
    fc = f0 * (f1 / f0) ** (u ** 1.5)
    n = svf(rng.standard_normal(len(t)), fc, 3.0) * u ** 2
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (u * 3)) / SR) * u ** 3 * .35
    return n * .9 + tone


def tick(f=2400, d=0.025, g=1.0):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 220) * g


def hat(d=0.06):
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 3) * np.exp(-t * 70) * 0.18


def snap():
    t = tt(0.18)
    return (svf(rng.standard_normal(len(t)), 2200, 1.2) * np.exp(-t * 28) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .6)


def zap_down(d=0.25, f0=1800, f1=60):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - t / d) * .6


def pad_note(freqs, d, att=0.6, rel=1.0, bright=6):
    t = tt(d)
    s = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            for k in range(1, 12):
                s += (1 / k) * np.exp(-k / bright) * np.sin(2 * np.pi * f * 2 ** (det / 12) * k * t + rng.random() * 6)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    return s * env / (len(freqs) * 6)


def bass_pluck(f, d=0.24):
    t = tt(d)
    s = np.zeros(len(t))
    kc = 1.2 + 9 * np.exp(-t * 18)
    for k in range(1, 24):
        s += (1 / k) * np.exp(-k / kc) * np.sin(2 * np.pi * f * k * t)
    return np.tanh(s * 1.4 * np.exp(-t * 6)) * 0.55


# ----------------- 타임라인 -----------------
BEAT = 0.5
# 장면 1: 단면
place(tick(1800, .04), 0.05, .5)
place(whoosh(.35, 400, 6000, .8), 0.18, .5, -.3)
place(kick(1.0), 0.5); place(sub_boom(1.6), 0.5, .6)
for k in range(24):
    place(tick(3200 + k * 40, .012), 0.32 + 0.45 * (1 - (1 - k / 24) ** 3) , .18, (k % 2) * .6 - .3)
place(metal(420, 2.0), 0.62, .9, 0, .5)
for k in range(10):
    place(tick(2600, .015), 1.02 + k * 0.028, .2, .4)
place(riser(.2, 400, 8000), 1.3, .7)
# 장면 2: 키네틱 타이포
for t0 in (1.5, 2.0, 2.5):
    place(kick(.9), t0); place(snap(), t0, .45, 0, .3); place(sub_boom(.8, 70, 35), t0, .4)
place(whoosh(.18, 800, 5000, .5), 2.13, .45, .5)
place(whoosh(.35, 300, 3000, .3), 2.5, .4, -.4)
place(zap_down(.16, 2400, 80), 2.85, .6)
# 장면 3~4 음악 베드 (킥 / 하이햇 / 베이스)
for k in range(int((8.0 - 3.0) / BEAT)):
    place(kick(.95), 3.0 + k * BEAT)
for k in range(int((8.0 - 4.0) / (BEAT / 2))):
    t0 = 4.0 + k * BEAT / 2
    if k % 2 == 1:
        place(hat(), t0, 1.0, .35)
notes = {3: 55.0, 4: 55.0, 5: 55.0, 6: 43.65, 7: 49.0}
for k in range(int((8.0 - 3.0) / (BEAT / 2))):
    t0 = 3.0 + k * BEAT / 2
    place(bass_pluck(notes[int(t0)] * (2 if k % 4 == 3 else 1)), t0 + .01, .8)
place(metal(300, 2.5, .6), 3.0, .6, 0, .4)
# 용접 아크: 크래클 + 지글거림
t0, t1 = 3.15, 5.05
n = int((t1 - t0) * SR)
crack = np.zeros(n)
idx = rng.integers(0, n, 900)
crack[idx] = rng.standard_normal(900) * rng.random(900) ** 3
crack = hp(crack, 1) * 2.5
hiss = svf(rng.standard_normal(n), 5000, 2) * (0.4 + 0.6 * rng.random(n // 480 + 1).repeat(480)[:n]) * .25
env = np.minimum(1, np.arange(n) / (SR * .1)) * np.minimum(1, (n - np.arange(n)) / (SR * .15))
place((crack + hiss) * env, t0, .45, .15)
# 콜아웃 팝 (scene.js의 drawnAt 역함수와 동일하게 계산)
import math
segs = [520, math.hypot(200, 200), 480, 320, 360, 380]
cum = np.cumsum([0] + segs); Ltot = cum[-1]
def ioC(u): return 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2
def time_at(s):
    a, b = 3.12, 5.05
    for _ in range(30):
        m = (a + b) / 2
        if Ltot * ioC(min(1, max(0, (m - 3.12) / (5.05 - 3.12)))) < s: a = m
        else: b = m
    return b
for i, s in enumerate([(cum[1] + cum[2]) / 2, cum[2] + 240, cum[3], cum[3] + 160, Ltot - 1]):
    tc = time_at(s)
    place(tick(1500 + i * 180, .05), tc, .45, (i - 2) * .3)
    place(metal(900 + i * 70, .5, .4), tc, .18, (i - 2) * .3, .3)
for s in (200, cum[2] + 240, cum[3] + 160):
    place(metal(260, .6, .5), time_at(s), .3)
# 카메라 평면화
place(whoosh(.85, 150, 2500, .65, 1.2), 5.3, .7, 0, .3)
# 장면 4: 공식
place(metal(520, 1.6), 6.0, .5, 0, .5)
for k in range(9):
    place(tick(2000, .02), 6.5 + k * 0.03, .25, -.3)
for k in range(9):
    place(tick(2200, .02), 6.7 + k * 0.03, .25, -.3)
for k in range(30):
    u = k / 30
    place(tick(1800 + 1600 * u, .012), 7.0 + 0.8 * (1 - (1 - u) ** 2), .18, .4)
# 줌 인 라이저 → 몽타주 임팩트
place(riser(.5, 150, 9000), 8.0, 1.0)
for i, t0 in enumerate([8.5, 9.0, 9.5, 10.0, 10.5]):
    place(kick(1.0), t0); place(sub_boom(.9, 65, 32), t0, .55)
    place(metal([380, 520, 300, 640, 450][i], 1.0), t0, .55, (i % 2) * .6 - .3, .4)
    if i > 0: place(whoosh(.14, 600, 7000, .85), t0 - .12, .5, -(i % 2) * .6 + .3)
    for k in range(2):
        place(hat(), t0 + .25 + k * .125, 1.0, .3)
    place(snap(), t0 + .25, .25)
for k in range(8):
    place(bass_pluck(49.0 if k < 4 else 55.0), 8.5 + k * .25, .7)
place(bass_pluck(49.0), 10.5, .7)
# 압력 게이지 바늘 랫틀
for k in range(12):
    place(tick(900 + k * 60, .02), 10.62 + k * .02, .12)
place(riser(.5, 120, 10000), 10.5, 1.0)
# 장면 6: 표지 임팩트
place(kick(1.2), 11.0); place(sub_boom(3.0, 62, 28), 11.0, 1.0)
place(metal(210, 3.0, .7), 11.0, .9, 0, .9)
place(metal(315, 2.5, .5), 11.0, .4, .5, .6)
for i in range(10):
    place(whoosh(.3, 500 + i * 120, 5000, .9, 2.0), 11.0 + i * .028 - .25, .18, (i % 3 - 1) * .7)
place(pad_note([110, 164.8, 220, 261.6, 329.6], 3.6, .5, 1.0), 11.0, .55, 0, .4)
place(pad_note([55], 3.6, .3, 1.0, 3), 11.0, .5)
# 라이트 스윕 쉬머
t = tt(.7); place(svf(rng.standard_normal(len(t)), 7000 + 4000 * np.sin(np.pi * t / .7), 4) * np.sin(np.pi * t / .7) ** 2, 12.15, .25, .5, .4)
for i, t0 in enumerate([12.45, 12.6, 12.75]):
    place(tick(1600 + i * 200, .05), t0, .4, [-.5, .5, .5][i]); place(metal(1100 + i * 90, .4, .3), t0, .12, 0, .4)
for k in range(5):
    place(kick(.7), 11.0 + (k + 1) * 0.5)
# 장면 7: 엔딩
place(whoosh(.5, 300, 3000, .5), 13.45, .5, -.5)
place(kick(.9), 13.66); place(snap(), 13.66, .4, 0, .4)
place(kick(.9), 13.86); place(snap(), 13.86, .4, 0, .4)
place(pad_note([98, 146.8, 196, 293.7], 1.2, .2, .6), 13.6, .4, 0, .4)
place(zap_down(.32, 1200, 40), 14.45, .7)
place(kick(1.1), 14.75); place(sub_boom(.25, 50, 30), 14.75, .8)
place(tick(3500, .3) * .8, 14.9, .35, 0, .8)
place(metal(840, .6, .3), 14.9, .2, 0, .8)

# ----------------- 사이드체인 & 리버브 & 마스터 -----------------
ir_len = int(2.4 * SR)
tir = np.arange(ir_len) / SR
irL = rng.standard_normal(ir_len) * np.exp(-tir * 2.6)
irR = rng.standard_normal(ir_len) * np.exp(-tir * 2.6)
def conv(x, h):
    m = len(x) + len(h)
    nfft = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:len(x)]
wetL, wetR = conv(send, irL), conv(send, irR)
wet_gain = 0.25 / (np.max(np.abs(np.concatenate([wetL, wetR]))) + 1e-9) * np.max(np.abs(send) + 1e-9)
L += wetL * wet_gain; R += wetR * wet_gain

# 마스터: 부드러운 클리핑 → 정규화 → 페이드 아웃
mix = np.stack([L, R])
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 1.4
mix = np.tanh(mix)
mix = mix / np.max(np.abs(mix)) * 0.89
fade = np.ones(N); fn = int(0.05 * SR); fade[-fn:] = np.linspace(1, 0, fn)
mix *= fade
pcm = (mix.T * 32767).astype('<i2')
with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio.wav 저장 완료', pcm.shape)

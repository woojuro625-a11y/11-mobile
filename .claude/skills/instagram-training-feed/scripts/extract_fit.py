"""Garmin FIT(.fit 또는 .zip) → 훈련 피드 영상용 데이터 추출

사용법:
    python extract_fit.py <activity.fit|activity.zip> <출력폴더>

출력:
    <출력폴더>/run-data.json   : scene.js가 읽는 시계열 (series = [경과초, 속도 m/s, 심박, 누적거리 m])
    <출력폴더>/training.json   : 영상에 들어갈 모든 수치 (세션·본훈련·세트·회복·심박존·심박회복)
그리고 표준출력으로 scene.js 상단 데이터 블록에 붙여 넣을 값을 요약 출력한다.

필요: pip install fitparse numpy
"""
import sys, os, json, zipfile, tempfile, math, datetime
import numpy as np
import fitparse


def pace_str(sec_per_km):
    r = round(sec_per_km)
    return f"{r // 60}'{r % 60:02d}\""


def dur_str(s):
    s = round(s)
    return f"{s // 60}:{s % 60:02d}" if s < 3600 else f"{s // 3600}:{(s % 3600) // 60:02d}:{s % 60:02d}"


def load_fit(path):
    if path.lower().endswith('.zip'):
        d = tempfile.mkdtemp()
        with zipfile.ZipFile(path) as z:
            names = [n for n in z.namelist() if n.lower().endswith('.fit')]
            z.extract(names[0], d)
            path = os.path.join(d, names[0])
    return fitparse.FitFile(path)


def main(src, out):
    os.makedirs(out, exist_ok=True)
    f = load_fit(src)
    msgs = lambda n: [{d.name: d.value for d in m} for m in f.get_messages(n)]
    sess = msgs('session')[0]
    wkt = (msgs('workout') or [{}])[0]
    steps = msgs('workout_step')
    laps = msgs('lap')
    recs = msgs('record')
    zt = (msgs('zones_target') or [{}])[0]
    act = (msgs('activity') or [{}])[0]
    tz = (act['local_timestamp'] - act['timestamp']) if act.get('local_timestamp') and act.get('timestamp') else datetime.timedelta(0)
    local_start = sess['start_time'] + tz  # 날짜·요일은 현지 시각 기준

    # --- time_in_zone (mesg 216, fitparse에선 unknown_216) ---
    lap_z, sess_z, hr_bounds = {}, None, None
    for m in f.get_messages('unknown_216'):
        d = {x.name: x.value for x in m}
        ref, idx, z = d.get('unknown_0'), d.get('unknown_1'), d.get('unknown_2')
        if not z or z[0] is None:
            continue
        secs = [v / 1000 for v in z]
        if d.get('unknown_6') and d['unknown_6'][0] is not None:
            hr_bounds = list(d['unknown_6'])
        if ref == 19:
            lap_z[idx] = secs
        elif ref == 18:
            sess_z = secs
    if hr_bounds is None:  # 존 경계가 없으면 최대심박 비율로 추정 (60/70/80/90%)
        mx = zt.get('max_heart_rate') or sess.get('max_heart_rate')
        hr_bounds = [round(mx * p) for p in (.6, .7, .8, .9)] + [mx]
        hr_bounds = [round(mx * .5)] + hr_bounds

    def z5(secs):  # [Z0,Z1..Z5,above] → [Z1(+Z0), Z2, Z3, Z4, Z5(+above)]
        if secs is None:
            return None
        s = list(secs) + [0] * (7 - len(secs))
        return [round(s[0] + s[1]), round(s[2]), round(s[3]), round(s[4]), round(s[5] + s[6])]

    # --- 기록(시계열) ---
    t0 = recs[0]['timestamp'].timestamp()
    T = np.array([r['timestamp'].timestamp() - t0 for r in recs])
    HR = np.array([r.get('heart_rate') or 0 for r in recs], float)
    SPD = np.array([r.get('enhanced_speed') or r.get('speed') or 0 for r in recs], float)
    DST = np.array([r.get('distance') or 0 for r in recs], float)
    spd_s = np.convolve(SPD, np.ones(15) / 15, 'same')
    hr_s = np.convolve(HR, np.ones(5) / 5, 'same')
    step = 4
    series = [[round(float(a), 1), round(float(b), 3), round(float(c), 1), round(float(d), 1)]
              for a, b, c, d in zip(T[::step], spd_s[::step], hr_s[::step], DST[::step])]
    lat = [r.get('position_lat') for r in recs]
    route = []
    if any(v is not None for v in lat):  # 절대좌표가 아닌 상대 미터 좌표만 저장 (위치 노출 방지)
        la = np.array([r.get('position_lat') or np.nan for r in recs], float) * 180 / 2 ** 31
        lo = np.array([r.get('position_long') or np.nan for r in recs], float) * 180 / 2 ** 31
        y = (la - np.nanmean(la)) * 111320
        x = (lo - np.nanmean(lo)) * 111320 * math.cos(math.radians(np.nanmean(la)))
        route = [[round(float(a), 1), round(float(b), 1)] for a, b in zip(x[::step], y[::step]) if not np.isnan(a)]
        extent = (float(np.nanmax(x) - np.nanmin(x)), float(np.nanmax(y) - np.nanmin(y)))
    else:
        extent = None
    json.dump({'route': route, 'series': series}, open(os.path.join(out, 'run-data.json'), 'w'))

    # --- 랩 → 워크아웃 스텝 단위로 묶기 ---
    groups = {}
    for i, l in enumerate(laps):
        k = l.get('wkt_step_index')
        k = i if k is None else k
        groups.setdefault(k, []).append(i)
    blocks = []
    for k in sorted(groups):
        idx = groups[k]
        L = [laps[i] for i in idx]
        dist = sum(l['total_distance'] or 0 for l in L)
        tm = sum(l['total_timer_time'] or 0 for l in L)
        hr = sum((l.get('avg_heart_rate') or 0) * l['total_timer_time'] for l in L) / tm if tm else 0
        st = steps[k] if isinstance(k, int) and k < len(steps) else {}
        intensity = L[0].get('intensity')
        active = intensity == 'active' or intensity is None
        lo_spd, hi_spd = st.get('custom_target_speed_low'), st.get('custom_target_speed_high')
        zs = [z5(lap_z.get(i)) for i in idx]
        zsum = [sum(z[j] for z in zs if z) for j in range(5)] if any(zs) else None
        start = L[0]['start_time'].timestamp() - t0
        blocks.append(dict(step=k, active=active, dist=round(dist, 1), time=round(tm, 1),
                           pace=round(tm / dist * 1000, 1) if dist else None, hr=round(hr, 1),
                           maxhr=max((l.get('max_heart_rate') or 0) for l in L),
                           planned=st.get('duration_distance'),
                           target_lo=round(1000 / hi_spd, 1) if hi_spd else None,
                           target_hi=round(1000 / lo_spd, 1) if lo_spd else None,
                           zones=zsum, start=round(start, 1)))
    for i, bk in enumerate(blocks):  # 시계열 창 (다음 블록 시작까지)
        bk['win'] = [bk['start'], blocks[i + 1]['start'] if i + 1 < len(blocks) else round(float(T[-1]), 1)]
        if bk['active'] and bk['target_lo'] and bk['pace']:
            bk['hit'] = bk['pace'] <= bk['target_hi'] + 0.5  # 목표보다 느리지 않으면 적중
    reps = [b for b in blocks if b['active']]
    # 회복: 훈련 종료 후 눌린 짧은 랩(100m 미만)은 제외
    recs_b = [b for b in blocks if not b['active'] and b['dist'] >= 100]

    # --- 세트 후 1분 심박 회복 (회복 구간에 일시정지가 있으면 제외) ---
    for r in reps:
        end = r['win'][1]
        i = int(np.searchsorted(T, end)); j = int(np.searchsorted(T, end + 60))
        gap = np.any(np.diff(T[i:j + 1]) > 2.5) if j > i else True
        if 0 < i < len(T) and j < len(T) and not gap:
            r['hr_rec'] = [int(HR[i - 1]), int(HR[j]), int(HR[i - 1] - HR[j])]
        else:
            r['hr_rec'] = None

    main_t = sum(r['time'] for r in reps); main_d = sum(r['dist'] for r in reps)
    main_hr = sum(r['hr'] * r['time'] for r in reps) / main_t if main_t else 0
    mz = [sum((r['zones'] or [0] * 5)[j] for r in reps) for j in range(5)]
    rec_t = sum(r['time'] for r in recs_b); rec_d = sum(r['dist'] for r in recs_b)
    rec_hr = sum(r['hr'] * r['time'] for r in recs_b) / rec_t if rec_t else 0

    data = dict(
        workout_name=wkt.get('wkt_name'),
        date=local_start.strftime('%Y.%m.%d'),
        weekday='월화수목금토일'[local_start.weekday()] + '요일',
        session=dict(dist_km=round(sess['total_distance'] / 1000, 2), timer=round(sess['total_timer_time']),
                     elapsed=round(sess['total_elapsed_time']),
                     avg_pace=round(sess['total_timer_time'] / sess['total_distance'] * 1000, 1),
                     avg_hr=sess.get('avg_heart_rate'), max_hr=sess.get('max_heart_rate'), kcal=sess.get('total_calories'),
                     cadence_spm=(sess.get('avg_running_cadence') or 0) * 2 + round((sess.get('avg_fractional_cadence') or 0) * 2),
                     stride_m=round((sess.get('avg_step_length') or 0) / 1000, 2), gct_ms=sess.get('avg_stance_time'),
                     vo_cm=round((sess.get('avg_vertical_oscillation') or 0) / 10, 1), vratio=sess.get('avg_vertical_ratio'),
                     temp=sess.get('avg_temperature'), te_aer=sess.get('total_training_effect'),
                     te_ana=sess.get('total_anaerobic_training_effect'), max_kmh=round((sess.get('enhanced_max_speed') or float(SPD.max())) * 3.6, 1)),
        hr_zone_bounds=hr_bounds, session_zones=z5(sess_z),
        main=dict(dist=round(main_d), time=round(main_t), pace=round(main_t / main_d * 1000, 1) if main_d else None,
                  hr=round(main_hr), zones=mz),
        recovery=dict(count=len(recs_b), pace=round(rec_t / rec_d * 1000, 1) if rec_d else None, hr=round(rec_hr),
                      avg_dist=round(rec_d / len(recs_b)) if recs_b else None, paces=[b['pace'] for b in recs_b]),
        reps=reps, recoveries=recs_b, gps_extent_m=extent,
        pauses=[[int(T[i]), int(round(T[i + 1] - T[i]))] for i in np.where(np.diff(T) > 8)[0]],  # 급수·휴식(시계 정지)
    )
    json.dump(data, open(os.path.join(out, 'training.json'), 'w'), ensure_ascii=False, indent=1)

    # --- 사람이 읽는 요약 ---
    print(f"워크아웃: {data['workout_name']}  ({data['date']} {data['weekday']})")
    s = data['session']
    print(f"세션: {s['dist_km']}km · {dur_str(s['timer'])} · 평균 {pace_str(s['avg_pace'])} · 심박 {s['avg_hr']}/{s['max_hr']} · {s['kcal']}kcal")
    print(f"심박존 경계: {hr_bounds}  세션 존(초) Z1..Z5: {data['session_zones']}")
    tot = sum(mz) or 1
    print(f"본훈련: {main_d / 1000:.2f}km · {dur_str(main_t)} · 평균 {pace_str(main_t / main_d * 1000) if main_d else '-'} · 심박 {round(main_hr)} · "
          f"존% " + ' '.join(f"Z{j + 1} {round(mz[j] / tot * 100)}%" for j in range(5)))
    for n, r in enumerate(reps):
        z = r['zones'] or [0] * 5; zt_ = sum(z) or 1
        tgt = f"{pace_str(r['target_lo'])}–{pace_str(r['target_hi'])}" if r['target_lo'] else '목표 없음'
        print(f"  세트{n + 1}: {r['dist']:.0f}m (계획 {r['planned']}) {pace_str(r['pace'])} 목표 {tgt} "
              f"{'적중' if r.get('hit') else ''} 심박 {r['hr']:.0f}/{r['maxhr']} Z4+Z5 {round((z[3] + z[4]) / zt_ * 100)}% "
              f"회복 {r['hr_rec']} 창 {r['win']}")
    print(f"회복조깅 {len(recs_b)}회: 평균 거리 {data['recovery']['avg_dist']}m · 평균 {pace_str(data['recovery']['pace']) if data['recovery']['pace'] else '-'} · 심박 {round(rec_hr)}")
    print(f"급수·휴식(시계 정지): {data['pauses']}")
    if extent:
        print(f"GPS 범위 약 {extent[0]:.0f}m × {extent[1]:.0f}m (트랙이면 ~90×180m)")
    print(f"→ {out}/training.json, {out}/run-data.json 저장")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

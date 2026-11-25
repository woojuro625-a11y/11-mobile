#!/usr/bin/env bash
# 렌더된 out/raw.mp4 + 음원 → 최종 인스타그램 피드 영상 (1080x1350, 60fps)
# 사용법: ./finish.sh /path/to/Riverside_Stride.mp3
set -euo pipefail
cd "$(dirname "$0")"
MUSIC="$1"
# 곡 길이(초) — timeline.json의 dur, 없으면 음원 길이
DUR=$(python3 -c "import json;print(json.load(open('timeline.json'))['dur'])" 2>/dev/null || ffprobe -v error -show_entries format=duration -of csv=p=0 "$MUSIC")
FADE=$(python3 -c "print(round($DUR-0.25,3))")
ffmpeg -y -loglevel error -i out/raw.mp4 -i "$MUSIC" -filter_complex \
  "[0:v]format=gbrp,split[a][b];[b]scale=270:338,curves=all='0/0 0.6/0 1/1',gblur=sigma=7,scale=1080:1350[g];[a][g]blend=all_mode=screen:all_opacity=0.45,noise=alls=2:allf=t,format=yuv420p[v];[1:a]atrim=0:$DUR,volume=0.8,afade=t=out:st=$FADE:d=0.25[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -maxrate 20M -bufsize 40M -profile:v high -level 4.2 -r 60 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t $DUR out/run-review-feed.mp4
echo "완료: out/run-review-feed.mp4"

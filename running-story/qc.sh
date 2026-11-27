#!/bin/bash
# QC: every 0.2 s, 5 sheets of 30 frames (216x384 each) + full-resolution crops of a region every 0.5 s
# usage: qc.sh <video.mp4> <outdir> [crop w:h:x:y for the zoom sheet] [zoom start] [zoom end]
V=$1; O=$2; CR=${3:-1080:900:0:150}; ZS=${4:-20}; ZE=${5:-30}
mkdir -p $O; rm -f $O/*
for i in 0 1 2 3 4; do ffmpeg -v error -ss $((i*6)) -t 6 -i $V -vf "fps=5,scale=216:384,tile=10x3" -frames:v 1 $O/sheet$i.jpg; done
ffmpeg -v error -ss $ZS -t $(awk "BEGIN{print $ZE-$ZS}") -i $V -vf "fps=2,crop=$CR,scale=540:-1,tile=5x4" -frames:v 1 $O/zoom.jpg
ls $O

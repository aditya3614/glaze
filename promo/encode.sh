#!/bin/sh
# frames/ (60 fps x 3 subframes) + music.wav -> glaze-promo.mp4
cd "$(dirname "$0")"
ffmpeg -y -loglevel error -stats -framerate 180 -i frames/f_%05d.jpg -i music.wav \
  -filter_complex "[0:v]tmix=frames=3:weights='1 1 1',select='eq(mod(n\,3)\,2)',setpts=N/(60*TB),format=yuv420p[v]" \
  -map "[v]" -map 1:a -r 60 -c:v libx264 -preset slow -crf 15 -profile:v high -movflags +faststart \
  -c:a aac -b:a 320k -shortest glaze-promo.mp4

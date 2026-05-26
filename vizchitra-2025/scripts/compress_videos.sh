#!/bin/bash

# Bulk compress .MOV files to web-optimized MP4
# Output goes to ./compressed/

INPUT_DIR="${1:-.}"        # Default: current directory
OUTPUT_DIR="$INPUT_DIR/compressed"
CRF=23                     # Quality: 18 (best) → 28 (smallest). 23 is a great default.
SCALE="-2:720"             # 720p, aspect-ratio preserved. Portrait (1080×1920)→405×720, landscape (1920×1080)→1280×720

mkdir -p "$OUTPUT_DIR"

for f in "$INPUT_DIR"/*.MOV "$INPUT_DIR"/*.mov; do
    [ -f "$f" ] || continue   # Skip if no matches

    filename=$(basename "$f")
    name="${filename%.*}"
    output="$OUTPUT_DIR/${name}.mp4"

    echo "Compressing: $filename → $output"

    ffmpeg -i "$f" \
        -vf "scale=$SCALE" \
        -c:v libx264 \
        -crf $CRF \
        -preset slow \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -y \
        "$output"
done

echo "Done! Compressed files saved to: $OUTPUT_DIR"
# 36 shots of Mt. Fuji

Exploring photo galleries that are map-first, and tell engaging place-based stories.

## Steps

1. Copied 26 iPhone 15 photos (HEIC + JPG) from the trip
2. Extracted EXIF metadata (GPS, camera direction, focal length, etc.) using Python + Pillow + pillow-heif
3. Calculated bearing and distance to Fuji's summit for each photo location
4. Compressed photos to JPG for web use
5. Built a simple Mapbox map (`map-markers.html`) with one arrow marker per photo, each pointing toward Mt. Fuji
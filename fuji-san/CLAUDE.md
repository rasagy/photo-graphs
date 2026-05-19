# Fuji-san Scrollytelling Map

## Project Goal
Build a scrollytelling map showing 23 iPhone 15 photos of Mt Fuji, each pinned to where it was taken, with the direction to Fuji's summit shown per location.

## Final Output
A Mapbox GL JS scrollytelling page using the official starter template:
- Satellite + 3D terrain basemap
- One chapter per location group (photos taken at the same place)
- Each chapter: fly-to animation, photo, short description, bearing toward Fuji
- Compass rose or bearing indicator showing direction to Fuji vs. camera direction

## Data Pipeline

```
photos/ (HEIC + JPG)
  → extract_photo_metadata.py  →  metadata.csv
  → manual grouping + chapter writing  →  chapters.json
  → Mapbox scrollytelling template  →  index.html
```

## Step 1: Metadata Extraction (`extract_photo_metadata.py`)

Extracts EXIF data from all images in a folder into a CSV.

**CSV columns:** `filename`, `type`, `lat`, `lon`, `altitude_m`, `camera_direction_deg`, `bearing_to_fuji_deg`, `distance_to_fuji_km`, `date_taken`, `time_taken`, `make`, `model`, `lens_model`, `focal_length_mm`, `f_number`, `exposure_time_s`, `iso`, `width_px`, `height_px`

**Key computed fields:**
- `bearing_to_fuji_deg` — forward azimuth from photo location to Fuji summit (35.3606°N, 138.7274°E) using `atan2`
- `distance_to_fuji_km` — Haversine distance to Fuji summit
- `camera_direction_deg` — read directly from `GPSImgDirection` EXIF tag (iPhone 15 writes this natively)

**Libraries:** `Pillow` + `pillow-heif`

**GPS extraction approach:** `getexif()` returns only the main IFD. GPS and camera details live in sub-IFDs that must be read explicitly via `exif_data.get_ifd(tag)`:
- `0x8769` — Exif sub-IFD (DateTimeOriginal, FocalLength, ISO, LensModel, …)
- `0x8825` — GPS sub-IFD (GPSLatitude, GPSLongitude, GPSAltitude, GPSImgDirection, …)

This works for both JPEG and HEIC (via pillow-heif). The old approach of looking up `GPSInfo` as a key in the flat decoded dict did not work for either format.

**Manual GPS overrides:** One photo had no EXIF GPS data and was patched directly in the CSV:
- `IMG_7242.HEIC` — set to Narita Airport (35.7686°N, 140.3887°E); `camera_direction_deg` left blank as it cannot be derived without the original EXIF tag.

**Usage:**
```bash
python3 -m venv fuji_env && source fuji_env/bin/activate
pip install Pillow pillow-heif
python extract_photo_metadata.py ./assets/selected/
# outputs metadata.csv inside the photos folder
```

## Step 2: Chapter Grouping (manual + optional script)
- Group photos by proximity (< ~50m apart = same location)
- For each group: pick a hero photo, write a 1-line description, note the location name
- Output: `chapters.json` with one object per chapter

## Step 3: Mapbox Scrollytelling
- Template: https://github.com/mapbox/storytelling
- Config: `satellite-v9` style, `terrain` layer enabled, `exaggeration: 1.5`
- Each chapter sets `bearing` (toward Fuji) and `pitch` (45–60°) for cinematic feel
- Markers: circular photo thumbnails instead of default pins

## File Structure
```
/
├── photos/             # original HEIC + JPG images
├── extract_photo_metadata.py
├── metadata.csv        # output of step 1
├── chapters.json       # output of step 2
└── index.html          # Mapbox scrollytelling page
```
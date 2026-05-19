# Chasing Fuji

A scrollytelling map of 26 iPhone 15 photos of Mt. Fuji taken across 13 days in November 2023 — from the airplane window, Hakone ridgelines, lakeside towns, and the Shinkansen.

## Approach

Photos are pinned to where they were taken, grouped into chapters by location. Scrolling through the page flies the map to each spot on a satellite + 3D terrain basemap. Clicking any photo opens a full-size lightbox with a caption.

## Stack

- **Mapbox GL JS** — satellite basemap, 3D terrain, fly-to animations
- **Scrollama** — scroll-triggered chapter transitions
- **Python + Pillow** — EXIF metadata extraction (GPS, camera direction, focal length)

## How it works

1. `extract_photo_metadata.py` reads GPS and camera EXIF from all photos → `metadata.csv`
2. Photos are manually grouped into chapters → `chapters.json`
3. `assets/story.js` fetches both files and builds the scrollytelling page

## Running locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Main scrollytelling page |
| `assets/chapters.json` | Chapter data — titles, descriptions, photo groups, map locations |
| `assets/metadata.csv` | EXIF metadata + per-photo captions |
| `config.js` | Mapbox token and style settings |
| `map-markers.html` | Earlier prototype — all photos as arrows on a simple map |

# Fuji-san Scrollytelling Map

## Project Goal
A Mapbox GL JS scrollytelling page for 26 iPhone 15 photos of Mt. Fuji, each pinned to its GPS location. Photos are grouped into chapters by location/time; each chapter flies the map to that spot with satellite + 3D terrain.

## Current Status
- **Step 0 (done):** Simple marker map — `map-markers.html`
- **Step 1 (done):** EXIF metadata extracted — `metadata.csv`
- **Step 2 (done):** Scrollytelling infrastructure built — `index.html`, `config.js`, `assets/story.js`, `assets/style.css`
- **Step 3 (in progress):** Fill in chapter titles/descriptions in `chapters.json` and per-photo captions in `metadata.csv`

## Visual Design (current)

### Hero section (`#header`)
- Sits above `#map` in the DOM; `min-height: 50vh`, blue-grey gradient background, bottom shadow
- The fixed map is already visible in the lower half of the viewport on load
- Contains a `#hero-stack`: 3 static thumbnail photos as stacked polaroid-style cards
  - Cards start flat/stacked on load, then animate: back two spread left/right (1.2s ease-out), front card rises slightly (1s ease-out)
  - Current photos: `IMG_3472.jpg` (back-left), `IMG_3660.jpg` (mid-right), `IMG_7278.jpg` (front)
  - To change photos: edit the `<figure>` elements in `index.html` `#header`

### Chapter step cards (`.step`)
- Dark glassmorphism: `rgba(0,0,0,0.22)` background, `blur(20px) saturate(160%)` backdrop filter
- Border: `1px solid rgba(100,100,100,0.45)` + `inset 0 1px 0 rgba(100,100,100,0.80)` top highlight for glass shine
- Box shadow: `0 8px 28px rgba(0,0,0,0.22)` (soft)
- White text (`color: #f8f8f8`), `border-radius: 14px`
- Active card adds a blue focus ring: `0 0 0 2px rgba(0,68,158,0.22)`
- All card properties driven by CSS custom properties in `:root` (`--card-bg`, `--card-backdrop`, `--card-border-color`, `--card-text`, `--card-shadow`, `--card-inset`) for easy future tweaking

### Typefaces
- **h1, h3** — Quintessential (Google Fonts, display weight)
- **h2, h4–h6, body, captions** — Alegreya (Google Fonts, serif)
- Spectral is loaded but not currently applied (kept for future reference)

### Gallery thumbnails (`.chapter-gallery`)
- Horizontal drag-to-scroll strip, 200px fixed height, snap-to-item
- Each thumbnail has a `4px solid rgba(255,255,255,0.90)` white border frame
- On hover: lifts `translateY(-7px)` with `box-shadow: 0 12px 28px rgba(0,0,0,0.40)`
- Each `.chapter-gallery-item` gets a random `--thumb-tilt` of ±3° applied in `story.js` at render time
- Gallery has `padding: 30px 20px; margin: -30px -20px` so tilted/hovered thumbnails have breathing room before the overflow clip boundary

## File Structure
```
/
├── index.html              # scrollytelling page (Mapbox + Scrollama)
├── config.js               # Mapbox token, style URL, terrain settings
├── map-markers.html        # original simple marker map (backup/reference)
├── extract_photo_metadata.py
└── assets/
    ├── chapters.json       # chapter data — edit this to update the story
    ├── metadata.csv        # EXIF data + description column for per-photo captions
    ├── story.js            # scrollytelling engine (async, fetches chapters.json + metadata.csv)
    ├── style.css           # layout, gallery, modal styles
    └── jpg/                # 26 compressed JPGs used by the web page
```

## Architecture

`index.html` loads `config.js` (globals) then `assets/story.js`. On init, `story.js` fetches `chapters.json` and `metadata.csv` in parallel:
- `chapters.json` → title, subtitle, byline, chapters array
- `metadata.csv` → filename → description lookup (used as lightbox caption)

Images in `chapters.json` are bare filenames (e.g. `"IMG_3460.jpg"`). `story.js` prepends `assets/jpg/` for the `src` and pulls the `description` field from `metadata.csv` as the lightbox note.

## To Edit the Story
1. **Chapter structure** → edit `chapters.json`
   - Each chapter: `id`, `title`, `description`, `alignment` ("left"/"right"/"centered"), `images` (array of filenames), `location` (`center`, `zoom`, `pitch`, `bearing`), `mapAnimation` ("flyTo")
   - Images can be bare filename strings or `{ "src": "IMG_xxx.jpg", "note": "override caption" }`
2. **Per-photo captions** → fill in the `description` column in `metadata.csv` (shown in lightbox when clicking a photo)
3. **Map style / token** → edit `config.js`

## Running Locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
Cannot open `index.html` directly via `file://` — the fetch() calls require a server.

## Data Pipeline
```
assets/selected/ (HEIC + JPG)
  → extract_photo_metadata.py  →  assets/metadata.csv  (+ manual description column)
  → manual grouping             →  assets/chapters.json
  → index.html (story.js)       →  scrollytelling page
```

## Step 1: Metadata Extraction (`extract_photo_metadata.py`)

Extracts EXIF from all images in a folder into a CSV.

**Key computed fields:**
- `bearing_to_fuji_deg` — forward azimuth to Fuji summit (35.3606°N, 138.7274°E) via `atan2`
- `distance_to_fuji_km` — Haversine distance
- `camera_direction_deg` — from `GPSImgDirection` EXIF tag (iPhone 15 native)

**GPS sub-IFD approach:** `getexif()` only returns the main IFD. GPS and Exif sub-IFDs must be read via `exif_data.get_ifd(tag)`:
- `0x8769` — Exif sub-IFD (DateTimeOriginal, FocalLength, ISO, LensModel, …)
- `0x8825` — GPS sub-IFD (lat, lon, altitude, camera direction, …)

Works for both JPEG and HEIC (via `pillow-heif`). Looking up `GPSInfo` as a flat dict key does not work for either format.

**Manual GPS override:** `IMG_7242.HEIC` had no EXIF GPS — patched to Narita Airport (35.7686°N, 140.3887°E); `camera_direction_deg` left blank.

**Usage:**
```bash
python3 -m venv fuji_env && source fuji_env/bin/activate
pip install Pillow pillow-heif
python extract_photo_metadata.py ./assets/selected/
```

## Step 0: Simple Marker Map (reference)
`map-markers.html` — Mapbox GL JS (`light-v11`), one arrow marker per photo rotated by `bearing_to_fuji_deg`, lightbox on click. All data embedded inline. Fuji summit marked with an inlined SVG mountain icon (36×36px, `#00449E`, CSS drop-shadow). Kept as a backup; not connected to `chapters.json`.

## Multi-Image Gallery + Lightbox (adapted from kochi-highlight-map-2026)
- Gallery: horizontal drag-to-scroll, snap-to-item, 200px fixed height, white border frame, ±3° random tilt per photo, lift-on-hover
- Lightbox: click any image → full-size modal with random polaroid tilt (±5°), caption + location/date/time metadata below, click-anywhere or Escape to close
- Reference implementation: `/Users/rasagy/Documents/GitHub/kochi-highlight-map-2026`

# VizChitra 2025 - v3

A single-day photo/video timeline visualization using D3.js v7.

## Project Structure

- `index.html` — entry point; loads D3 from CDN and `script.js`
- `script.js` — all visualization logic
- `metadata.csv` — media metadata (see schema below)
- `assets/` — media files (thumbnails + videos)
- `backup/` — older script versions, ignore

## Assets

- Photos: `IMG_####_thumb.JPG` (uppercase `.JPG`)
- Videos: `IMG_####.MOV` in CSV but stored as `IMG_####.mp4` in `assets/` (compressed for web); thumbnails are `IMG_####_thumb.jpg` (lowercase `.jpg`)
- One camera file uses a different naming pattern: `CDAU5332_thumb.JPG`
- Thumbnail actual pixel size: **100×56px**

## metadata.csv Schema

```
filename, name, extension, date_created, time_created, size, dimensions, duration, hour, minute, sec, orientation
```

- `extension`: `JPG`, `HEIC`, or `MOV`
- `filename`: full filename including extension (e.g. `IMG_0086.MOV`)
- `name`: basename without extension (e.g. `IMG_0086`) — use this to build asset paths
- `duration`: seconds (empty for photos)
- `orientation`: `horizontal` or `vertical`
- All media is from a single day (2025-06-27)

## Visualization Logic (script.js)

**Radial layout:**
- Angle maps hour 6–18 (6AM–6PM) to 0.5π–2.5π (clockwise from bottom)
- Radius maps minute 0–59 to inner–outer plot radius
- Straight radial hour lines: dotted (`stroke-dasharray: 1,4`, round caps, stroke-width 1)
- Spiral gridlines drawn per hour: dashed (`stroke-dasharray: 4,4`)
- Concentric rings at minutes 0, 15, 30, 45, 60: filled circles drawn outer→inner, `rgba(0,0,0,0.02)` fill (stacks to create subtle gradient); minute=0 ring filled white to clear the center

**Shapes:**
- All media: thumbnail `<image>` elements centered at the radial position
- `thumbW(d)`: base width — 25px horizontal, 20px vertical
- `HOVER_SCALE = 4`: multiplier applied on mouseover
- Photos use uppercase `.JPG` thumbnail ext; videos use lowercase `.jpg`
- Video playback: click toggles inline `<video>` via `foreignObject`; uses `assets/${d.name}.mp4`
- Each thumbnail clipped to rounded corners via per-element `<clipPath>` in `<defs>` (rx=5); clip rect is resized on hover alongside the image
- Thumbnails have a 2px white border (`stroke`) + 5px border radius via an overlaid `<rect class="thumb-border">` with `pointer-events: none`

**Hover behavior:**
- `activeNode` tracks the currently expanded thumbnail; entering a new thumbnail collapses the previous one immediately (prevents stuck-expanded state on fast mouse movement)
- `g.raise()` brings hovered element to front (SVG DOM order)
- Opacity goes to 1 on hover, restores to 0.5 on leave
- Info label (time only, white pill background) shown below expanded thumbnail

**Title:**
- SVG text element top-left (`-width/2 + 20, -height/2 + 30`), 16px bold, fill `#333`
- Text: "Visualizing a day of VizChitra 2025"

**Time label:**
- `formatTime(t)` converts `"HH:MM:SS"` → `"H:MM AM/PM"`

**Load animation:**
- Shapes start at `translate(0,0)`, opacity 0
- Transition: 900ms duration, delay 0–2500ms mapped from `hour*60+minute` (earlier = sooner)
- Both position and opacity animate together

**Default opacity:** 0.5

**Filters (top-right panel):**
- Two independent toggle groups: TYPE (Photos / Videos) and ORIENTATION (Horizontal / Vertical)
- "Photos" toggles JPG + HEIC together; "Videos" toggles MOV
- Active = dark fill (#333) + white text; inactive = light fill (#eee) + grey text
- `targetOpacity(d)` returns 0.5 if item passes both filters, 0 if not — used by `updateVisibility()` and mouseleave handlers
- Hidden items get `pointer-events: none` so they don't intercept hover

## Notes

- SVG is appended directly to `body`, not into `#chart` div
- No legend (removed)
- Hour labels offset at `plotRadius + 25` from centre

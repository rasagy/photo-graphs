#!/usr/bin/env python3
"""
extract_photo_metadata.py
─────────────────────────
Extracts GPS and camera metadata from iPhone photos in a folder
and writes the results to a CSV file.

Usage:
    python extract_photo_metadata.py <photo_folder> [output.csv]

Examples:
    python extract_photo_metadata.py ~/Desktop/fuji_photos
    python extract_photo_metadata.py ~/Desktop/fuji_photos fuji_metadata.csv

Requirements:
    pip install Pillow
"""

import csv
import math
import os
import sys
from datetime import datetime
from pathlib import Path

# ── Optional: pip install Pillow ──────────────────────────────────────────────
try:
    from PIL import Image
    from PIL.ExifTags import GPSTAGS, TAGS
except ImportError:
    print("ERROR: Pillow is not installed. Run:  pip install Pillow")
    sys.exit(1)

# ── Optional: pip install pillow-heif (required for HEIC files) ───────────────
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    print("WARNING: pillow-heif not installed — HEIC files will be skipped.")
    print("         Fix: pip install pillow-heif\n")

# ── Mt Fuji summit coordinates ────────────────────────────────────────────────
FUJI_LAT = 35.3606
FUJI_LON = 138.7274

# ── Supported extensions ──────────────────────────────────────────────────────
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".heic", ".png", ".tiff", ".tif"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def dms_to_decimal(dms, ref):
    """Convert degrees/minutes/seconds tuple + hemisphere ref to decimal degrees."""
    degrees, minutes, seconds = dms
    # IFDRational → float
    d = float(degrees)
    m = float(minutes)
    s = float(seconds)
    decimal = d + m / 60 + s / 3600
    if ref in ("S", "W"):
        decimal = -decimal
    return round(decimal, 7)


def bearing_to_fuji(lat, lon):
    """
    Calculate the compass bearing (0–360°) from a point to Mt Fuji's summit.
    Uses the forward azimuth formula.
    """
    lat1 = math.radians(lat)
    lat2 = math.radians(FUJI_LAT)
    diff_lon = math.radians(FUJI_LON - lon)

    x = math.sin(diff_lon) * math.cos(lat2)
    y = (math.cos(lat1) * math.sin(lat2)
         - math.sin(lat1) * math.cos(lat2) * math.cos(diff_lon))
    bearing = math.degrees(math.atan2(x, y))
    return round((bearing + 360) % 360, 2)


def distance_to_fuji_km(lat, lon):
    """Haversine distance in km from a point to Mt Fuji's summit."""
    R = 6371.0
    lat1, lon1 = math.radians(lat), math.radians(lon)
    lat2, lon2 = math.radians(FUJI_LAT), math.radians(FUJI_LON)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 2)


_EXIF_IFD_TAG = 0x8769  # Exif sub-IFD (focal length, ISO, etc.)
_GPS_IFD_TAG  = 0x8825  # GPS sub-IFD


def parse_exif(img):
    """Return a flat dict of decoded EXIF tags, merging main IFD + Exif sub-IFD."""
    try:
        exif_data = img.getexif()
    except Exception:
        return {}
    if not exif_data:
        return {}
    flat = {TAGS.get(k, str(k)): v for k, v in exif_data.items()}
    # Merge Exif sub-IFD (DateTimeOriginal, FocalLength, ISO, LensModel, …)
    try:
        exif_ifd = exif_data.get_ifd(_EXIF_IFD_TAG)
        flat.update({TAGS.get(k, str(k)): v for k, v in exif_ifd.items()})
    except Exception:
        pass
    return flat


def parse_gps_info(img):
    """Return a flat GPS dict from the GPS sub-IFD of the image."""
    try:
        exif_data = img.getexif()
        gps_ifd = exif_data.get_ifd(_GPS_IFD_TAG)
        return {GPSTAGS.get(k, str(k)): v for k, v in gps_ifd.items()}
    except Exception:
        return {}


def extract_metadata(filepath):
    """
    Open one image and pull every field we care about.
    Returns a dict ready to write as a CSV row, or None on failure.
    """
    path = Path(filepath)
    result = {
        "filename":            path.name,
        "type":                path.suffix.lstrip(".").upper(),
        "lat":                 None,
        "lon":                 None,
        "altitude_m":          None,
        "camera_direction_deg": None,   # GPSImgDirection – where camera pointed
        "bearing_to_fuji_deg": None,    # calculated
        "distance_to_fuji_km": None,    # calculated
        "date_taken":          None,
        "time_taken":          None,
        "make":                None,
        "model":               None,
        "lens_model":          None,
        "focal_length_mm":     None,
        "f_number":            None,
        "exposure_time_s":     None,
        "iso":                 None,
        "width_px":            None,
        "height_px":           None,
    }

    try:
        with Image.open(filepath) as img:
            result["width_px"]  = img.width
            result["height_px"] = img.height

            exif = parse_exif(img)
            if not exif:
                print(f"  ⚠  No EXIF data: {path.name}")
                return result

            # ── Camera info ───────────────────────────────────────────────
            result["make"]       = exif.get("Make", "").strip() or None
            result["model"]      = exif.get("Model", "").strip() or None
            result["lens_model"] = exif.get("LensModel", "").strip() or None

            fl = exif.get("FocalLength")
            result["focal_length_mm"] = round(float(fl), 1) if fl else None

            fn = exif.get("FNumber")
            result["f_number"] = round(float(fn), 1) if fn else None

            et = exif.get("ExposureTime")
            if et:
                et_f = float(et)
                # Show as fraction for fast shutter speeds, decimal otherwise
                result["exposure_time_s"] = (f"1/{round(1/et_f)}" if et_f < 1
                                             else round(et_f, 4))

            result["iso"] = exif.get("ISOSpeedRatings")

            # ── Date / time ───────────────────────────────────────────────
            dt_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
            if dt_str:
                try:
                    dt = datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
                    result["date_taken"] = dt.strftime("%Y-%m-%d")
                    result["time_taken"] = dt.strftime("%H:%M:%S")
                except ValueError:
                    result["date_taken"] = dt_str

            # ── GPS ───────────────────────────────────────────────────────
            gps = parse_gps_info(img)
            if not gps:
                print(f"  ⚠  No GPS data:  {path.name}")
                return result

            lat_dms = gps.get("GPSLatitude")
            lat_ref = gps.get("GPSLatitudeRef")
            lon_dms = gps.get("GPSLongitude")
            lon_ref = gps.get("GPSLongitudeRef")

            if lat_dms and lat_ref and lon_dms and lon_ref:
                lat = dms_to_decimal(lat_dms, lat_ref)
                lon = dms_to_decimal(lon_dms, lon_ref)
                result["lat"] = lat
                result["lon"] = lon
                result["bearing_to_fuji_deg"] = bearing_to_fuji(lat, lon)
                result["distance_to_fuji_km"] = distance_to_fuji_km(lat, lon)

            alt = gps.get("GPSAltitude")
            alt_ref = gps.get("GPSAltitudeRef", 0)  # 0 = above sea level
            if alt is not None:
                alt_val = float(alt)
                if alt_ref == 1:   # below sea level
                    alt_val = -alt_val
                result["altitude_m"] = round(alt_val, 1)

            img_dir = gps.get("GPSImgDirection")
            if img_dir is not None:
                result["camera_direction_deg"] = round(float(img_dir), 2)

    except Exception as e:
        print(f"  ✗  Failed to read {path.name}: {e}")
        return None

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    folder   = Path(sys.argv[1]).expanduser().resolve()
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else folder / "metadata.csv"

    if not folder.is_dir():
        print(f"ERROR: '{folder}' is not a directory.")
        sys.exit(1)

    # Collect image files (sorted for reproducibility)
    images = sorted(
        p for p in folder.iterdir()
        if p.suffix.lower() in IMAGE_EXTENSIONS
    )

    if not images:
        print(f"No image files found in {folder}")
        sys.exit(0)

    print(f"\n📁  Folder : {folder}")
    print(f"🖼   Images : {len(images)} found")
    print(f"📄  Output : {out_path}\n")

    fieldnames = [
        "filename", "type",
        "lat", "lon", "altitude_m",
        "camera_direction_deg",
        "bearing_to_fuji_deg",
        "distance_to_fuji_km",
        "date_taken", "time_taken",
        "make", "model", "lens_model",
        "focal_length_mm", "f_number", "exposure_time_s", "iso",
        "width_px", "height_px",
    ]

    rows = []
    for img_path in images:
        print(f"  Processing: {img_path.name}")
        row = extract_metadata(img_path)
        if row:
            rows.append(row)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # ── Summary ───────────────────────────────────────────────────────────────
    with_gps = sum(1 for r in rows if r["lat"] is not None)
    with_dir = sum(1 for r in rows if r["camera_direction_deg"] is not None)

    print(f"\n✅  Done — {len(rows)} rows written to {out_path}")
    print(f"   GPS data     : {with_gps}/{len(rows)} photos")
    print(f"   Camera direction: {with_dir}/{len(rows)} photos")

    if with_gps > 0:
        dists = [r["distance_to_fuji_km"] for r in rows if r["distance_to_fuji_km"]]
        print(f"   Distance to Fuji: {min(dists)} – {max(dists)} km\n")


if __name__ == "__main__":
    main()
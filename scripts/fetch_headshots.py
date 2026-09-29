"""Download and normalize candidate headshots into images/headshots/<slug>.jpg.

Sources, in priority order:
  1. A hand-picked URL in scripts/manual_photos.json (keyed by slug). Used for
     candidates the automatic sources miss or get wrong, e.g. first-time candidates.
  2. Official congressional portraits (public domain) via the
     unitedstates/images project, for sitting members of Congress.
  3. The lead image of the candidate's Wikipedia article (Wikimedia Commons).

Every image is cropped to a 4:5 head-and-shoulders portrait (framed around the
detected face when OpenCV is installed) and saved at 480x600.
A record of where each photo came from is written to images/headshots/SOURCES.csv.

Usage:
  python scripts/fetch_headshots.py            # fetch only missing photos
  python scripts/fetch_headshots.py --force    # re-fetch everything
  python scripts/fetch_headshots.py --only "Rebecca Cooke"
"""
import argparse
import csv
import io
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "endorsements.csv"
OUT_DIR = ROOT / "images" / "headshots"
SOURCES = OUT_DIR / "SOURCES.csv"
MANUAL = ROOT / "scripts" / "manual_photos.json"
LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
CONGRESS_IMG = "https://unitedstates.github.io/images/congress/{}/{}.jpg"
WIKI_API = "https://en.wikipedia.org/w/api.php"

SIZE = (480, 600)
UA = {"User-Agent": "NewDemocracyEndorsementsPage/1.0 (https://newdemocracy.net)"}

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee",
    "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

BAD_IMAGE = re.compile(r"(?i)(\.svg|logo|seal|flag|map|signature|coat_of_arms|district)")


def slugify(name):
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def plain(s):
    return slugify(s).replace("-", " ")


def last_name(name):
    parts = [p for p in plain(name).split() if p not in {"dr", "jr", "sr", "ii", "iii"} and len(p) > 1]
    return parts[-1]


def get(url, **kw):
    for attempt in range(4):
        r = requests.get(url, headers=UA, timeout=30, **kw)
        if r.status_code == 429:
            time.sleep(5 * (attempt + 1))
            continue
        r.raise_for_status()
        return r
    r.raise_for_status()


def find_face(img):
    """Return the largest detected face as (x, y, w, h), or None."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return None
    gray = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    min_side = max(40, min(img.size) // 8)  # ignore small false positives (ears, background)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_side, min_side))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


def crop_portrait(data):
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, "white")
        img = Image.alpha_composite(bg, img)
    img = img.convert("RGB")
    w, h = img.size
    target = SIZE[0] / SIZE[1]

    face = find_face(img)
    if face is not None:
        # Frame head-and-shoulders: face ~36% of crop height, eyes a bit above center.
        fx, fy, fw, fh = face
        ch = min(h, fh / 0.36)
        cw = ch * target
        if cw > w:
            cw = w
            ch = cw / target
        cx, cy = fx + fw / 2, fy + fh / 2
        x0 = min(max(0, cx - cw / 2), w - cw)
        y0 = min(max(0, cy - ch * 0.40), h - ch)
        box = tuple(round(v) for v in (x0, y0, x0 + cw, y0 + ch))
    elif w / h > target:
        # Too wide: keep full height, crop the sides around the center.
        nw = round(h * target)
        x0 = (w - nw) // 2
        box = (x0, 0, x0 + nw, h)
    else:
        # Too tall: keep full width, bias the crop toward the top where the face is.
        nh = round(w / target)
        y0 = round((h - nh) * 0.2)
        box = (0, y0, w, y0 + nh)
    return img.crop(box).resize(SIZE, Image.LANCZOS)


def first_name(name):
    return [p for p in plain(name).split() if p != "dr"][0]


def congress_lookup(legislators, name, seat, incumbent):
    """Match a sitting member by state + last name. The first name must match too,
    unless the sheet marks the candidate as the incumbent (covers Bill/William etc.)."""
    st = seat[:2].upper()
    ln, fn = last_name(name), first_name(name)
    for leg in legislators:
        term = leg["terms"][-1]
        if term["state"] != st:
            continue
        names = " ".join(plain(leg["name"].get(k, "")) for k in ("first", "last", "official_full", "nickname"))
        if ln in names.split() and (incumbent or fn in names.split()):
            return leg["id"]["bioguide"]
    return None


def wiki_lookup(name, seat):
    st = STATES.get(seat[:2].upper(), "")
    ln = last_name(name)
    params = {
        "action": "query", "format": "json", "formatversion": 2,
        "generator": "search", "gsrsearch": f"{name} {st} politician", "gsrlimit": 6,
        "prop": "pageimages|extracts", "piprop": "thumbnail|name", "pithumbsize": 900,
        "exintro": 1, "explaintext": 1, "exsentences": 3,
    }
    pages = get(WIKI_API, params=params).json().get("query", {}).get("pages", [])
    pages.sort(key=lambda p: p.get("index", 99))
    for p in pages:
        title = plain(p["title"])
        extract = p.get("extract", "")
        if ln not in title.split() or first_name(name) not in title.split():
            continue
        if not re.search(r"(?i)politician|democrat|candidate|governor|senator|representative|mayor", extract):
            continue
        thumb = p.get("thumbnail", {}).get("source")
        img_name = p.get("pageimage", "")
        if not thumb or BAD_IMAGE.search(img_name):
            return None, p["title"]
        return thumb, p["title"]
    return None, None


def load_sources():
    if not SOURCES.exists():
        return {}
    return {r["slug"]: r for r in csv.DictReader(SOURCES.open(encoding="utf-8"))}


def save_sources(sources):
    with SOURCES.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["slug", "name", "source", "url", "page"])
        w.writeheader()
        for k in sorted(sources):
            if (OUT_DIR / f"{k}.jpg").exists():
                w.writerow(sources[k])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", action="append")
    ap.add_argument("--no-wiki", action="store_true")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader(DATA.open(encoding="utf-8")))
    manual = json.loads(MANUAL.read_text(encoding="utf-8")) if MANUAL.exists() else {}
    legislators = get(LEGISLATORS_URL).json()
    sources = load_sources()
    missing = []

    for r in rows:
        name, seat = r["Name"], r["Seat"]
        if args.only and name not in args.only:
            continue
        slug = slugify(name)
        dest = OUT_DIR / f"{slug}.jpg"
        if dest.exists() and not args.force and slug in sources:
            continue

        url = page = src = None
        if slug in manual:
            url, src = manual[slug]["url"], "manual"
            page = manual[slug].get("page", "")
        if not url:
            bioguide = congress_lookup(legislators, name, seat, r["Status"] == "Incumbent")
            if bioguide:
                src, page = "congress", bioguide
                for size in ("original", "450x550"):
                    candidate = CONGRESS_IMG.format(size, bioguide)
                    if requests.head(candidate, headers=UA, timeout=15).ok:
                        url = candidate
                        break
        if not url and not args.no_wiki:
            url, page = wiki_lookup(name, seat)
            src = "wikipedia" if url else None
            time.sleep(0.3)

        if not url:
            missing.append((name, seat, page))
            print(f"MISSING  {name:28} {seat:8} wiki page: {page}")
            continue
        try:
            img = crop_portrait(get(url).content)
            img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
            sources[slug] = {"slug": slug, "name": name, "source": src, "url": url, "page": page or ""}
            print(f"ok       {name:28} {seat:8} {src}")
        except Exception as e:  # noqa: BLE001 - report and keep going
            missing.append((name, seat, f"error: {e}"))
            print(f"ERROR    {name:28} {seat:8} {e}")
        save_sources(sources)

    save_sources(sources)
    print(f"\n{len(missing)} missing", file=sys.stderr)
    for m in missing:
        print("  ", *m, file=sys.stderr)


if __name__ == "__main__":
    main()

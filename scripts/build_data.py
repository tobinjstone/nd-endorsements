"""Build data/endorsements.csv (the public website feed) from the internal tracker export.

Only public-facing columns are written, because a Google Sheet tab that is
"published to the web" can be read by anyone. Internal columns (PAC donations,
caucus, chapter, notes) stay in the tracker and never reach the website.

Usage: python scripts/build_data.py
"""
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "2026 Midterm Endorsements Tracker - CLEANED.csv"
OUT = ROOT / "data" / "endorsements.csv"

FIELDS = ["Name", "Seat", "Status", "Party", "Show", "Result", "Photo URL", "Website"]


def main():
    rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
    out = []
    for r in rows:
        name = r["Candidate Name"].strip()
        if not name:
            continue
        notes = (r.get("Notes") or "").strip()
        result = (r.get("Election Results?") or "").strip()
        show = "No" if re.match(r"(?i)lost", result) else "Yes"
        out.append({
            "Name": name,
            "Seat": r["Seat"].strip(),
            "Status": r["Incumbent?"].strip(),
            "Party": "Independent" if "independent" in notes.lower() else "",
            "Show": show,
            "Result": "",
            "Photo URL": "",
            "Website": "",
        })
    # utf-8-sig adds a BOM so Google Sheets imports accented names (Luján) correctly.
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out)
    hidden = [o["Name"] for o in out if o["Show"] == "No"]
    print(f"wrote {len(out)} rows to {OUT.relative_to(ROOT)}; hidden: {hidden}", file=sys.stderr)


if __name__ == "__main__":
    main()

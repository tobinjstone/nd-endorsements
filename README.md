# New Democracy — 2026 Endorsements page

A filterable endorsements directory for newdemocracy.net, embedded in Squarespace with a Code Block.
The candidate list comes from a Google Sheet, so adding or removing someone needs no code changes.
Headshots and the script are hosted free on GitHub Pages from this repo.

```
Google Sheet ("Website" tab, published as CSV) ──┐
                                                  ├──> embed/nd-endorsements.js ──> Squarespace Code Block
GitHub Pages: images/headshots/<name>.jpg ────────┘
```

Visitors can filter by race (U.S. Senate / U.S. House / Governor), by state, and search by name or district.
Filtered views have shareable links, e.g. `newdemocracy.net/endorsements#race=house&state=CO`.

## Project layout

| Path | What it is |
|---|---|
| `embed/nd-endorsements.js` | The whole widget: styles, data loading, filters. No dependencies. |
| `images/headshots/` | 207 headshots, 480×600 JPG, named by slug (`ben-ray-lujan.jpg`). `SOURCES.csv` records where each came from. |
| `data/endorsements.csv` | Public data feed. Import it into the Google Sheet. Also used as the fallback if the sheet can't be reached. |
| `squarespace-code-block.html` | The snippet to paste into Squarespace. |
| `index.html` | Preview page that mimics the site. Also served on GitHub Pages for testing. |
| `scripts/` | `fetch_headshots.py` downloads and crops photos. `build_data.py` built the CSV from the tracker export. |

## One-time setup

### 1. Publish this repo on GitHub Pages
1. Create a **public** GitHub repo named `nd-endorsements` and push this folder to it (GitHub Desktop works).
2. In the repo, go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, then `main` / `root`.
3. After a minute, `https://<account>.github.io/nd-endorsements/` shows the preview page.

### 2. Add a "Website" tab to the tracker sheet
Anyone can read a tab that's published to the web. Keep internal columns (PAC donations, caucus, chapter, notes) **off** this tab.

1. In the 2026 Midterm Endorsements Tracker, add a tab called **Website**.
2. Import `data/endorsements.csv` into it (**File → Import → Upload → Replace current sheet**).
3. Go to **File → Share → Publish to web**. Pick the **Website** tab (not "Entire document") and **Comma-separated values (.csv)**, then click **Publish**.
4. Copy the link. It looks like `https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?gid=…&single=true&output=csv`.

Columns on the Website tab:

| Column | Required | Notes |
|---|---|---|
| Name | yes | Display name. It also sets the photo filename (see below). |
| Seat | yes | `CO-08`, `AK-AL` (at-large), `IA-SEN`, or `OH Gov`. The race type and state come from this column. |
| Status | | `Incumbent` shows an "Incumbent" tag. `Open` and `Challenger` show nothing. |
| Party | | Leave blank for Democrats. `Independent` shows a tag. |
| Show | | `No` hides the row without deleting it. Blank or `Yes` shows it. |
| Result | | After Election Day, `Won` shows a red badge. |
| Photo URL | | Optional override. Any direct image URL. |
| Website | | Optional. Adds a "Learn More" button that links to the campaign site. |

Column order doesn't matter and extra columns are ignored.

### 3. Add the Code Block in Squarespace
1. Open `squarespace-code-block.html`. Replace `GOOGLE_SHEET_CSV_URL` with the link from step 2 and `YOUR-GITHUB-USERNAME` with the GitHub account.
2. On the Endorsements page, add a **Code** block and paste the snippet in. Keep "Display Source" off.
3. Use regular Squarespace blocks for the page title and intro above it.

JavaScript in Code Blocks requires a Squarespace Core plan or higher. The code block won't run in the editor preview, so check the live page.

## Day-to-day maintenance

**Add a candidate:** add a row to the Website tab. The site updates within about 5 minutes (Google's publish cache).

**Add their photo:** do one of the following.
- Upload a JPG to `images/headshots/` in GitHub. Name it after the candidate: lowercase, accents dropped, anything that isn't a letter or number becomes `-`. For example, "Ben Ray Luján" becomes `ben-ray-lujan.jpg`. Aim for a 4:5 portrait of at least 480×600.
- Or paste a direct image URL into the **Photo URL** column.
- Or run the script (below). It finds and crops the photo automatically.

If there's no photo, the card shows the candidate's initials.

**Remove someone:** delete the row or set **Show** to `No`.

### Fetching photos automatically
```bash
pip install -r scripts/requirements.txt
python scripts/fetch_headshots.py            # only candidates without a photo yet
python scripts/fetch_headshots.py --only "Jane Doe" --force
```
The script reads `data/endorsements.csv`, so first download the Website tab as CSV and save it over that file. It tries these sources in order:
1. `scripts/manual_photos.json`, a hand-picked URL per slug
2. The official congressional portrait (sitting members of Congress)
3. The lead image from the candidate's Wikipedia article

Faces are detected and cropped to a consistent head-and-shoulders frame. Commit the new files in `images/headshots/` to publish them.

## Photo sources and rights
`images/headshots/SOURCES.csv` records the source of every photo.
- **115 official congressional portraits** (unitedstates.github.io). U.S. government works, public domain.
- **65 hand-picked photos** listed in `scripts/manual_photos.json`. Most come from campaign media kits and press pages; the rest are official government portraits (governor offices, NGA, state legislatures), Wikimedia Commons, or candidate-supplied Ballotpedia headshots.
- **27 Wikipedia/Wikimedia Commons lead images.** Most are public domain official portraits or CC-licensed. Check the Commons page if you need exact attribution.

Campaigns publish these photos for press use, but for anyone featured prominently it's worth confirming with the campaign.

### Fixing a bad crop
Entries in `scripts/manual_photos.json` accept optional framing settings:

| Key | Effect |
|---|---|
| `face_share` | How much of the frame height the face fills (default `0.36`). Raise it to zoom in, e.g. `0.45`. |
| `box` | `[x, y, width, height]` in source pixels. Use it when face detection misses (very large or unusual photos). Keep it 4:5. |
| `inset` | Pixels to shave off every edge first, for sources with a baked-in border. |

After editing, run `python scripts/fetch_headshots.py --force --only "Name"` and commit the new JPG.

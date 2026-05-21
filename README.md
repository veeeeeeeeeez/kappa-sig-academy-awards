# Kappa Sig Academy Awardzzorz

A dramatic, fullscreen slideshow that reveals the top 3 (bronze → silver → gold) for each award category, podium-style.

## Run it

```bash
python3 tally.py        # rebuilds results.json from the CSV (optional)
python3 -m http.server 8000
open http://localhost:8000/
```

## Controls

- `→` / `Space` / click — reveal next (🥉 bronze → 🥈 silver → 🥇 gold → next award)
- `←` — go back one reveal/slide
- `F` — fullscreen
- `Home` / `End` — jump to first/last slide

## Files

- `tally.py` — parses the responses CSV, splits `;`-separated multi-picks (e.g. Best couple), writes `results.json`
- `results.json` — tallied top-N for every award
- `index.html` / `styles.css` / `app.js` — the slideshow (vanilla JS, WebAudio fanfare, canvas confetti)

The CSV path is hardcoded in `tally.py`; update it if you rerun against a new export.

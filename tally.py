#!/usr/bin/env python3
"""Tally Academy Awards CSV responses and emit JSON for the slideshow."""
import csv
import json
import re
from collections import Counter
from pathlib import Path

CSV_PATH = Path("/Users/vincentzhou/Downloads/academy_awards_extracted/Academy Awardzzorz.csv")
OUT_PATH = Path("/Users/vincentzhou/academy_awards/results.json")

# Manual overrides applied AFTER tallying. Map award title -> ordered list of
# (name, votes) tuples for the desired top positions. Any name already in the
# tally has its vote count replaced; anyone else in the tally is re-ranked
# below the overrides by their original vote count.
OVERRIDES: dict[str, list[tuple[str, int]]] = {
    "Most fucked search history": [
        ("Wiley Kendall", 10),
        ("Sam Samani", 8),
        ("David John", 7),
    ],
}


def normalize(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def split_votes(cell: str) -> list[str]:
    cell = cell.strip()
    if not cell:
        return []
    # Some cells (e.g. "Best couple") have semicolon-separated multi-pick answers.
    parts = [normalize(p) for p in cell.split(";")]
    return [p for p in parts if p]


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    awards = []
    # Skip the Timestamp column (index 0).
    for col_idx in range(1, len(header)):
        title = header[col_idx]
        counter: Counter[str] = Counter()
        for row in rows:
            if col_idx >= len(row):
                continue
            for vote in split_votes(row[col_idx]):
                counter[vote] += 1
        ranked = counter.most_common()
        if not ranked:
            continue

        if title in OVERRIDES:
            forced = OVERRIDES[title]
            forced_names = {name for name, _ in forced}
            remainder = [(n, v) for n, v in ranked if n not in forced_names]
            ranked = list(forced) + remainder

        awards.append({
            "title": title,
            "results": [
                {"name": name, "votes": votes} for name, votes in ranked
            ],
        })

    OUT_PATH.write_text(json.dumps({"awards": awards}, indent=2))
    print(f"Wrote {len(awards)} awards -> {OUT_PATH}")


if __name__ == "__main__":
    main()

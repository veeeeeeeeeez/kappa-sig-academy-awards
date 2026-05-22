#!/usr/bin/env python3
"""Read the curated results CSV and emit results.json for the slideshow.

The curated CSV is hand-finalized podium output, not raw responses:

    Timestamp, <Award 1>, <Award 2>, ...
    1ST,       <name>,    <name>,    ...
    2ND,       <name>,    <name>,    ...
    3RD,       <name>,    <name>,    ...
    Count 1,   <int>,     <int>,     ...
    Count 2,   <int>,     <int>,     ...
    Count 3,   <int>,     <int>,     ...

A previous version of this script tallied raw responses; that lives in
git history if anyone needs to redo the math from scratch.
"""
import csv
import json
import re
from pathlib import Path

CSV_PATH = Path("/Users/vincentzhou/academy_awards/curated_results.csv")
OUT_PATH = Path("/Users/vincentzhou/academy_awards/results.json")


def clean(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def parse_int(s: str) -> int:
    s = s.strip()
    if not s:
        return 0
    try:
        return int(s)
    except ValueError:
        return 0


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    header = rows[0]
    by_label = {row[0].strip().lower(): row for row in rows[1:]}
    first = by_label.get("1st")
    second = by_label.get("2nd")
    third = by_label.get("3rd")
    c1 = by_label.get("count 1")
    c2 = by_label.get("count 2")
    c3 = by_label.get("count 3")

    awards = []
    for col_idx in range(1, len(header)):
        title = header[col_idx].strip()
        if not title:
            continue
        results = []
        for name_row, count_row in [(first, c1), (second, c2), (third, c3)]:
            name = clean(name_row[col_idx]) if name_row else ""
            votes = parse_int(count_row[col_idx]) if count_row else 0
            if not name:
                continue
            results.append({"name": name, "votes": votes})
        if not results:
            continue
        awards.append({"title": title, "results": results})

    OUT_PATH.write_text(json.dumps({"awards": awards}, indent=2))
    print(f"Wrote {len(awards)} awards -> {OUT_PATH}")


if __name__ == "__main__":
    main()

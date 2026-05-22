#!/usr/bin/env python3
"""Print the expected image filename slug for every name appearing on a slide.

Drop a matching file into images/ (jpg/jpeg/png/webp) and the slideshow will
swap it in for that person's avatar automatically.
"""
import json
import re
import unicodedata
from pathlib import Path

RESULTS = Path("/Users/vincentzhou/academy_awards/results.json")
IMG_DIR = Path("/Users/vincentzhou/academy_awards/images")


def slugify(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_only = decomposed.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower())
    return slug.strip("-")


def main() -> None:
    data = json.loads(RESULTS.read_text())
    names: set[str] = set()
    for award in data["awards"]:
        for r in award["results"][:4]:
            if r["name"] and r["name"] != "—":
                names.add(r["name"])

    existing = {p.stem for p in IMG_DIR.glob("*.*")} if IMG_DIR.exists() else set()

    print(f"{'NAME':<32} -> images/<slug>.{{jpg,png,webp}}    status")
    print("-" * 80)
    for name in sorted(names):
        slug = slugify(name)
        status = "✓ have image" if slug in existing else "(needs image)"
        print(f"{name:<32} -> images/{slug:<28} {status}")

    missing = sum(1 for n in names if slugify(n) not in existing)
    print()
    print(f"{len(names)} total names · {len(names) - missing} with images · {missing} missing")


if __name__ == "__main__":
    main()

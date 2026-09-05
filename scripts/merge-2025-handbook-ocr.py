"""Merge legacy monolithic OCR and resumable page files deterministically."""

from __future__ import annotations

import argparse
import re
from collections import Counter
from pathlib import Path


PAGE_MARKER = re.compile(r"^=== PAGE (\d+) ===\s*$", re.MULTILINE)


def read_monolith(path: Path) -> tuple[dict[int, str], Counter[int]]:
    raw = path.read_text(encoding="utf-8")
    matches = list(PAGE_MARKER.finditer(raw))
    pages: dict[int, str] = {}
    counts: Counter[int] = Counter()
    for index, match in enumerate(matches):
        page = int(match.group(1))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        text = raw[match.end() : end].strip()
        counts[page] += 1
        pages.setdefault(page, text)
    return pages, counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("legacy_ocr", type=Path)
    parser.add_argument("page_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--total-pages", type=int, required=True)
    args = parser.parse_args()

    pages, counts = read_monolith(args.legacy_ocr)
    for page_path in sorted(args.page_dir.glob("page-*.txt")):
        page = int(page_path.stem.split("-")[-1])
        pages[page] = page_path.read_text(encoding="utf-8").strip()

    expected = set(range(1, args.total_pages + 1))
    missing = sorted(expected - pages.keys())
    errors = sorted(page for page, text in pages.items() if "OCR_ERROR:" in text)
    empty = sorted(page for page, text in pages.items() if not text)
    duplicates = sorted(page for page, count in counts.items() if count > 1)
    if missing or errors or empty:
        raise SystemExit(
            f"OCR incomplete: missing={missing}, errors={errors}, empty={empty}"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as stream:
        for page in range(1, args.total_pages + 1):
            stream.write(f"=== PAGE {page} ===\n{pages[page]}\n\n")

    print(f"pages={len(pages)} duplicates_removed={duplicates}")


if __name__ == "__main__":
    main()

"""Extract a reviewable vocabulary intermediate from the local 2025 handbook.

The handbook contains an imperfect embedded font map: English text is mostly
extractable, while some Chinese glyphs may need later OCR/manual review. This
script deliberately preserves raw page text and confidence flags instead of
silently publishing uncertain data into the runtime wordset.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader


WORD_LINE = re.compile(
    r"^\s*([A-Za-z][A-Za-z'/-]*(?:\s+[A-Za-z][A-Za-z'/-]*)?)\s+"
    r"\[([^\]]+)\]\s+([^\n]+)$"
)
# The PDF's embedded font occasionally turns ``adv.`` into ``adu.`` or
# replaces punctuation. Keep those records and mark them for normalization.
POS = re.compile(
    r"\b(art\.|adj\.?|adv\.?|adu\.?|conj\.?|det\.?|n\.?|prep\.?|"
    r"pron\.?|v\.?|vt\.?|vi\.?|num\.?|aux\.?)\b",
    re.IGNORECASE,
)
ENGLISH_SENTENCE = re.compile(r"^[A-Z][A-Za-z0-9 ,.'!?;:/()\-]+[.!?]$")
COLLOCATION = re.compile(r"^(?:搭配|短语|用法).{0,2}[：:](.*)$")


def clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line.replace("\u00a0", " ")).strip()


def parse_pdf(path: Path) -> dict:
    reader = PdfReader(str(path))
    entries: list[dict] = []
    current: dict | None = None

    for page_number, page in enumerate(reader.pages, start=1):
        raw = page.extract_text() or ""
        lines = [clean_line(line) for line in raw.splitlines() if clean_line(line)]
        for line in lines:
            match = WORD_LINE.match(line)
            if match and POS.search(match.group(3)):
                if current:
                    entries.append(current)
                pos_match = POS.search(match.group(3))
                current = {
                    "word": match.group(1),
                    "phonetic_raw": match.group(2),
                    "definition_raw": match.group(3),
                    "pos_raw": pos_match.group(1) if pos_match else "",
                    "collocations_raw": [],
                    "examples_raw": [],
                    "page": page_number,
                    "needs_review": any(ch == "�" for ch in line),
                }
                continue
            if not current:
                continue
            collocation = COLLOCATION.match(line)
            if collocation:
                current["collocations_raw"].append(collocation.group(1))
            elif ENGLISH_SENTENCE.match(line):
                current["examples_raw"].append(line)
            elif any(ch == "�" for ch in line):
                current["needs_review"] = True

    if current:
        entries.append(current)

    words = {}
    for entry in entries:
        key = entry["word"].lower()
        words.setdefault(key, []).append(entry)

    return {
        "source": {
            "filename": path.name,
            "pages": len(reader.pages),
            "encrypted": reader.is_encrypted,
            "metadata": {str(k): str(v) for k, v in (reader.metadata or {}).items()},
        },
        "summary": {
            "entry_records": len(entries),
            "unique_normalized_words": len(words),
            "duplicate_normalized_words": sum(1 for value in words.values() if len(value) > 1),
            "needs_review_records": sum(1 for entry in entries if entry["needs_review"]),
            "records_with_examples": sum(1 for entry in entries if entry["examples_raw"]),
            "records_with_collocations": sum(1 for entry in entries if entry["collocations_raw"]),
        },
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    result = parse_pdf(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()

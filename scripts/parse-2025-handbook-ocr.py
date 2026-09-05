"""Parse the complete OCR text into handbook vocabulary families.

The parser keeps source text and review flags.  It treats entries following
``变形：`` as forms of the preceding headword until a collocation or example
starts, preventing a form from stealing its headword's usage data.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


PAGE = re.compile(r"^=== PAGE (\d+) ===\s*$", re.MULTILINE)
POS = re.compile(
    r"(?<![A-Za-z])(art|adj|adv|adu|conj|det|n|prep|pron|v|vt|ut|vi|ui|num|aux)\s*\.",
    re.IGNORECASE,
)
ENTRY = re.compile(
    r"^([A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2})"
    r"\s*[\[【‘']([^\]］】\n]{1,60})[\]］】](.+)$"
)
ENTRY_WITHOUT_OPEN_BRACKET = re.compile(
    r"^([A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2})"
    r"([A-Za-z:'’.əɪʊɔæɑʌɒɜː,]{2,60})[\]］】](.+)$"
)
SOURCE_NOTE = re.compile(r"[（(](?:19|20)\d{2}[^）)]*[）)]")
FOOTER = re.compile(r"^(?:[—-]?\s*\d+\s*[—-]?|海量资源.*|上海市中考英语考纲.*|第一章.*)$")


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line.replace("\u00a0", " ")).strip()


def normalize_pos(value: str) -> str:
    return {"adu": "adv", "ut": "vt", "ui": "vi"}.get(value.lower(), value.lower()) + "."


def split_pages(raw: str) -> dict[int, list[str]]:
    matches = list(PAGE.finditer(raw))
    result = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        result[int(match.group(1))] = [
            clean(line) for line in raw[match.end() : end].splitlines() if clean(line)
        ]
    return result


def parse_entry(line: str) -> dict | None:
    match = ENTRY.match(line) or ENTRY_WITHOUT_OPEN_BRACKET.match(line)
    if not match:
        return None
    tail = match.group(3).strip()
    pos_match = POS.search(tail)
    if not pos_match:
        return None
    definition = tail[pos_match.start() :].strip()
    return {
        "word": match.group(1).replace("’", "'").strip(),
        "phonetic": match.group(2).strip(),
        "pos": normalize_pos(pos_match.group(1)),
        "meaning_cn": definition[pos_match.end() - pos_match.start() :].strip(),
        "definition_raw": definition,
    }


def looks_english(line: str) -> bool:
    letters = sum(character.isascii() and character.isalpha() for character in line)
    chinese = sum("\u4e00" <= character <= "\u9fff" for character in line)
    return letters >= 8 and letters > chinese * 3 and not POS.search(line)


def parse_ocr(path: Path, start_page: int, end_page: int) -> dict:
    pages = split_pages(path.read_text(encoding="utf-8"))
    entries: list[dict] = []
    current: dict | None = None
    variant_mode = False
    collecting_collocation = False
    english_parts: list[str] = []
    chinese_parts: list[str] = []

    def flush_example() -> None:
        nonlocal english_parts, chinese_parts
        if current and english_parts:
            current["examples"].append(
                {
                    "sentence": " ".join(english_parts),
                    "sentence_cn": "".join(chinese_parts),
                }
            )
        english_parts = []
        chinese_parts = []

    def flush_entry() -> None:
        nonlocal current
        flush_example()
        if current:
            current["needs_review"] = (
                not current["meaning_cn"]
                or not current["examples"]
                or any(token in current["definition_raw"] for token in ("海量资源", "ylyh_"))
            )
            entries.append(current)
        current = None

    for page_number in range(start_page, end_page + 1):
        for raw_line in pages.get(page_number, []):
            if FOOTER.search(raw_line):
                continue
            line = raw_line
            starts_variant = line.startswith("变形：")
            if starts_variant:
                line = line.removeprefix("变形：").strip()
                variant_mode = True
            parsed = parse_entry(line)
            if parsed:
                if variant_mode and current:
                    current["word_forms"].append(parsed)
                    continue
                flush_entry()
                current = {
                    **parsed,
                    "page": page_number,
                    "word_forms": [],
                    "collocations": [],
                    "examples": [],
                    "source_lines": [raw_line],
                }
                variant_mode = False
                collecting_collocation = False
                continue
            if not current:
                continue
            if line.startswith(("搭配：", "搭配:", "用法：", "用法:")):
                flush_example()
                variant_mode = False
                collecting_collocation = True
                current["collocations"].append(line.split("：", 1)[-1].split(":", 1)[-1].strip())
                continue
            if line.startswith(("比较：", "比较:", "注意：", "注意:", "[注]", "【注】")):
                flush_example()
                variant_mode = False
                collecting_collocation = True
                current["collocations"].append(line)
                continue
            if collecting_collocation and not re.match(r"^[A-Z][A-Za-z]", line):
                current["collocations"].append(line)
                continue
            if looks_english(line):
                if chinese_parts:
                    flush_example()
                variant_mode = False
                collecting_collocation = False
                english_parts.append(line)
                continue
            if english_parts:
                chinese_parts.append(line)
            elif collecting_collocation:
                current["collocations"].append(line)
            current["source_lines"].append(raw_line)
        # Entries and examples may cross a page; only flush dangling examples.
        if chinese_parts:
            flush_example()

    flush_entry()
    by_word: dict[str, list[dict]] = {}
    for entry in entries:
        by_word.setdefault(entry["word"].casefold(), []).append(entry)
    return {
        "source": {
            "document": "2025-shanghai-handbook",
            "ocr_file": path.name,
            "page_range": [start_page, end_page],
        },
        "summary": {
            "entry_records": len(entries),
            "unique_normalized_words": len(by_word),
            "duplicate_normalized_words": sum(len(value) - 1 for value in by_word.values()),
            "records_with_examples": sum(bool(entry["examples"]) for entry in entries),
            "records_with_collocations": sum(bool(entry["collocations"]) for entry in entries),
            "word_forms": sum(len(entry["word_forms"]) for entry in entries),
            "needs_review_records": sum(bool(entry["needs_review"]) for entry in entries),
        },
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ocr", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--start-page", type=int, default=8)
    parser.add_argument("--end-page", type=int, default=284)
    args = parser.parse_args()
    result = parse_ocr(args.ocr, args.start_page, args.end_page)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()

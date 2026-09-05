"""Normalize OCR vocabulary while retaining page-level handbook provenance."""

from __future__ import annotations

import argparse
import json
import re
from difflib import SequenceMatcher
from pathlib import Path


WATERMARK = re.compile(r"(?:海量资源请加|V:)\s*ylyh_897.*", re.IGNORECASE)
WORD_CORRECTIONS = {
    "afteraf": "after",
    "icecream": "ice cream",
    "mice": "nice",
    "oughtto": "ought to",
    "theAtlantic": "the Atlantic",
    "thePacific": "the Pacific",
    "whenw": "when",
}


def compact_key(value: str) -> str:
    return "".join(character.lower() for character in value if character.isascii() and character.isalnum())


def clean(value: str) -> str:
    value = WATERMARK.sub("", value)
    return re.sub(r"\s+", " ", value).strip()


def best_text_layer_sentence(sentence: str, candidates: list[str]) -> str:
    # RapidOCR is generally more accurate than the embedded text layer.  Use
    # the latter only to restore spacing in visibly collapsed OCR sentences.
    if sentence.count(" ") >= max(3, len(sentence) // 24):
        return clean(sentence)
    source_key = compact_key(sentence)
    if not source_key:
        return sentence
    scored = [
        (SequenceMatcher(None, source_key, compact_key(candidate)).ratio(), candidate)
        for candidate in candidates
    ]
    score, candidate = max(scored, default=(0.0, sentence))
    return clean(candidate) if score >= 0.72 else clean(sentence)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ocr_json", type=Path)
    parser.add_argument("text_layer_json", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    ocr = json.loads(args.ocr_json.read_text(encoding="utf-8"))
    text_layer = json.loads(args.text_layer_json.read_text(encoding="utf-8"))
    examples_by_page: dict[int, list[str]] = {}
    for entry in text_layer["entries"]:
        examples_by_page.setdefault(entry["page"], []).extend(entry.get("examples_raw", []))

    result: list[dict] = []
    exact_index: dict[str, int] = {}
    for raw in ocr["entries"]:
        word = WORD_CORRECTIONS.get(clean(raw["word"]), clean(raw["word"]))
        entry = {
            "word": word,
            "phonetic_raw": clean(raw["phonetic"]),
            "pos": raw["pos"],
            "meaning_cn": clean(raw["meaning_cn"]),
            "page": raw["page"],
            "word_forms": raw["word_forms"],
            "collocations": [clean(item) for item in raw["collocations"] if clean(item)],
            "examples": [],
            "needs_review": bool(raw["needs_review"]),
        }
        for example in raw["examples"]:
            sentence = best_text_layer_sentence(
                clean(example["sentence"]), examples_by_page.get(raw["page"], [])
            )
            entry["examples"].append(
                {"sentence": sentence, "sentence_cn": clean(example["sentence_cn"])}
            )
        key = word.casefold() if word.casefold() == word else word
        if key in exact_index and result[exact_index[key]]["word"] == word:
            existing = result[exact_index[key]]
            existing["collocations"] = list(dict.fromkeys(existing["collocations"] + entry["collocations"]))
            existing["examples"] = existing["examples"] + entry["examples"]
            existing["word_forms"] = existing["word_forms"] + entry["word_forms"]
            existing["needs_review"] = existing["needs_review"] or entry["needs_review"]
        else:
            exact_index[key] = len(result)
            result.append(entry)

    for entry in result:
        entry["collocations"] = list(dict.fromkeys(entry["collocations"]))
        entry["word_forms"] = list(
            {form["word"].casefold(): form for form in entry["word_forms"]}.values()
        )
        entry["needs_review"] = (
            entry["needs_review"]
            or "�" in entry["meaning_cn"]
            or not entry["meaning_cn"]
            or not entry["examples"]
        )

    output = {
        "source": {
            "document": "2025-shanghai-handbook",
            "source_pdf_committed": False,
            "chapter_pages": [7, 284],
            "ocr_pages_verified": 359,
        },
        "summary": {
            "entries": len(result),
            "unique_case_sensitive_words": len({entry["word"] for entry in result}),
            "case_distinct_homographs": ["May/may", "Miss/miss"],
            "with_examples": sum(bool(entry["examples"]) for entry in result),
            "with_collocations": sum(bool(entry["collocations"]) for entry in result),
            "word_forms": sum(len(entry["word_forms"]) for entry in result),
            "needs_review": sum(bool(entry["needs_review"]) for entry in result),
        },
        "entries": result,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()

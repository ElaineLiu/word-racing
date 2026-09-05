"""Build the single runtime wordset from normalized 2025 handbook entries."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def key(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def clean_meaning(value: str) -> str:
    value = re.sub(r"^(?:&?n\.|&?adj\.|&?adv\.)\s*", "", value).strip()
    value = re.sub(r"(?:海量资源请加|V:)\s*ylyh_897.*", "", value).strip()
    return value


def category_for(pos: str) -> str:
    if pos.startswith("n"):
        return "things"
    if pos.startswith("v"):
        return "verbs"
    if pos.startswith("adj"):
        return "adjectives"
    if pos.startswith("adv"):
        return "adverbs"
    return "grammar"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("handbook", type=Path)
    parser.add_argument("legacy", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    handbook = json.loads(args.handbook.read_text(encoding="utf-8"))
    legacy = json.loads(args.legacy.read_text(encoding="utf-8"))
    exact: dict[str, list[dict]] = {}
    folded: dict[str, list[dict]] = {}
    for word in legacy["words"]:
        exact.setdefault(word["word"], []).append(word)
        folded.setdefault(key(word["word"]), []).append(word)
    used_ids: set[int] = set()
    next_id = max(word["id"] for word in legacy["words"]) + 1
    words = []

    for source in handbook["entries"]:
        candidates = exact.get(source["word"], []) or folded.get(key(source["word"]), [])
        old = next((item for item in candidates if item["id"] not in used_ids), None)
        if old:
            word_id = old["id"]
            used_ids.add(word_id)
        else:
            word_id = next_id
            next_id += 1

        examples = source.get("examples", [])
        example = examples[0] if examples else {}
        meaning_cn = clean_meaning(source.get("meaning_cn", ""))
        if not meaning_cn or "�" in meaning_cn:
            meaning_cn = (old or {}).get("meaning_cn", "待复核")
        sentence = example.get("sentence") or (old or {}).get("sentence", "")
        sentence_cn = example.get("sentence_cn") or (old or {}).get("sentence_cn", "")
        meaning_en = (old or {}).get("meaning_en", "")
        phonetic = (old or {}).get("phonetic") or f"/{source.get('phonetic_raw', '').strip('/')}/"
        pos = (old or {}).get("pos") or source.get("pos", "")
        level = (old or {}).get("level", 3)
        category = (old or {}).get("category") or category_for(pos)

        words.append(
            {
                "id": word_id,
                "word": source["word"],
                "phonetic": phonetic,
                "meaning_cn": meaning_cn,
                "meaning_en": meaning_en,
                "sentence": sentence,
                "sentence_cn": sentence_cn,
                "level": level,
                "category": category,
                "pos": pos,
                "word_forms": source.get("word_forms", []),
                "collocations": source.get("collocations", []),
                "examples": examples,
                "source2025": {
                    "document": "2025-shanghai-handbook",
                    "page": source["page"],
                    "needs_review": bool(source.get("needs_review")),
                },
                "question_eligibility": {
                    "meaning": bool(meaning_cn),
                    "english_definition": bool(meaning_en),
                    "sentence": bool(sentence),
                    "collocation": bool(source.get("collocations")),
                },
            }
        )

    output = {
        "meta": {
            "version": "3.0",
            "description": "上海中考英语考纲词汇（2025 手册版）",
            "total_words": len(words),
            "source": "2025年上海市中考英语考纲词汇用法手册",
            "source_chapter_pages": [7, 284],
            "legacy_ids_reused": len(used_ids),
        },
        "words": words,
    }
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "words": len(words),
                "legacy_ids_reused": len(used_ids),
                "new_ids": len(words) - len(used_ids),
                "with_sentences": sum(bool(word["sentence"]) for word in words),
                "with_english_definitions": sum(bool(word["meaning_en"]) for word in words),
                "with_collocations": sum(bool(word["collocations"]) for word in words),
                "needs_review": sum(word["source2025"]["needs_review"] for word in words),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

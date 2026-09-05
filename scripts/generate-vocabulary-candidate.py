"""Generate a backward-compatible 2025 handbook enrichment candidate.

Only high-confidence structural fields are added here. Existing meanings and
sentences are retained when the PDF text layer has font-mapping corruption.
"""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from pathlib import Path


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("current", type=Path)
    parser.add_argument("extracted", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    current = json.loads(args.current.read_text(encoding="utf-8"))
    extracted = json.loads(args.extracted.read_text(encoding="utf-8"))
    by_word: dict[str, list[dict]] = {}
    for entry in extracted["entries"]:
        by_word.setdefault(norm(entry["word"]), []).append(entry)

    result = deepcopy(current)
    enriched = 0
    collocation_count = 0
    example_count = 0
    for word in result["words"]:
        matches = by_word.get(norm(word["word"]), [])
        if not matches:
            continue
        entry = matches[0]
        source = {
            "document": "2025-shanghai-handbook",
            "page": entry["page"],
            "needs_review": bool(entry.get("needs_review")),
        }
        collocations = sorted({item for match in matches for item in match["collocations_raw"] if item})
        examples = [item for match in matches for item in match["examples_raw"] if item]
        word["source2025"] = source
        if collocations:
            word["collocations"] = collocations
            collocation_count += 1
        if not word.get("sentence") and len(examples) == 1:
            word["sentence"] = examples[0]
            word["sentenceSource"] = "2025-shanghai-handbook"
            example_count += 1
        enriched += 1

    result["metadata"] = {
        **(result.get("metadata") or {}),
        "contentSource": "2025-shanghai-handbook-enrichment-candidate",
        "candidateStatus": "review-required",
        "sourceNote": "Preserves legacy meanings and IDs; handbook structural fields require review before runtime replacement.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"words": len(result["words"]), "enriched": enriched, "with_collocations": collocation_count, "new_examples": example_count}, ensure_ascii=False))


if __name__ == "__main__":
    main()

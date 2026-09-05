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

COMMON_PHRASE_TOKENS = set(
    "a an the be am is are was were been being to of in on at for from with without by as "
    "about above after before into over under up down out off away back all one ones oneself "
    "someone somebody something anyone anybody anything everyone everybody everything no nobody "
    "nothing sb sth do does did doing done have has had having make makes made making take takes "
    "took taken taking get gets got getting go goes went gone going come comes came coming keep "
    "keeps kept keeping give gives gave given giving put puts putting set sets setting turn turns "
    "turned turning look looks looked looking work works worked working use uses used using let lets "
    "help helps helped helping ask asks asked asking tell tells told telling say says said saying "
    "call calls called calling find finds found finding know knows knew known knowing see sees saw "
    "seen seeing hear hears heard hearing feel feels felt feeling become becomes became becoming "
    "good better best bad worse worst more most less least much many little few very too enough so "
    "and or but nor not than that this these those it its itself my your his her our their own each "
    "other another such what which who whom whose where when why how ever never always often usually "
    "sometimes together apart across along around through against between among near far inside outside "
    "front end beginning middle top bottom side place time way order fact case common sure afraid able "
    "ready interested famous late full proud pleased satisfied different similar same responsible "
    "because instead according due thanks rather well stuck advantage attention care part charge "
    "control danger difficulty fun hurry need trouble surprise purpose point mind hand foot heart "
    "school home bed hospital class public private once twice first second last next again still just "
    "also only even almost already yet soon now then today tomorrow yesterday week month year day hour "
    "minute money life world English Chinese China Shanghai people person friend family name number "
    "concerted disabled arrivals departures corners cycling "
    "kind type lot lots plenty pair piece group bit some any every either neither both several enough"
    .split()
)
CJK = re.compile(r"[\u3400-\u9fff]")
NUMBERED_PREFIX = re.compile(r"^\s*\(\d+\)\s*")


def compact_key(value: str) -> str:
    return "".join(character.lower() for character in value if character.isascii() and character.isalnum())


def clean(value: str) -> str:
    value = WATERMARK.sub("", value)
    return re.sub(r"\s+", " ", value).strip()


def english_prefix(value: str) -> tuple[str, str]:
    """Split an English collocation from its Chinese gloss without changing the gloss."""
    match = CJK.search(value)
    if not match:
        return value.strip(), ""
    return value[: match.start()].strip(), value[match.start() :].strip()


def phrase_key(value: str) -> str:
    value = NUMBERED_PREFIX.sub("", value)
    prefix, _ = english_prefix(value)
    return compact_key(prefix.replace("sb.", "sb").replace("sth.", "sth"))


def phrase_tokens(entries: list[dict], text_entries: list[dict]) -> set[str]:
    tokens = set(COMMON_PHRASE_TOKENS)
    values = [entry.get("word", "") for entry in entries]
    values.extend(form.get("word", "") for entry in entries for form in entry.get("word_forms", []))
    for value in values:
        prefix, _ = english_prefix(value)
        tokens.update(re.findall(r"[A-Za-z]+", prefix.casefold()))
    for token in list(tokens):
        if len(token) < 4:
            continue
        tokens.update({f"{token}s", f"{token}es", f"{token}ed", f"{token}ing"})
        if token.endswith("e"):
            tokens.update({f"{token}d", f"{token[:-1]}ing"})
        if token.endswith("y") and len(token) > 3:
            tokens.add(f"{token[:-1]}ies")
    # The embedded text layer is useful as a vocabulary source, but it also
    # contains a few collapsed OCR tokens. Do not teach those bad tokens back
    # to the segmenter when they already have a complete multiword parse.
    for entry in text_entries:
        for value in entry.get("collocations_raw", []) + entry.get("examples_raw", []):
            prefix, _ = english_prefix(value)
            for token in re.findall(r"[A-Za-z]+", prefix.casefold()):
                if (len(token) >= 3 or token in {"a", "i"}) and " " not in segment_run(token, tokens):
                    tokens.add(token)
    return {token for token in tokens if token}


def segment_run(run: str, tokens: set[str]) -> str:
    """Split a collapsed alphabetic run only when the whole run has a known parse."""
    lowered = run.casefold()
    if lowered in tokens:
        return run
    best: list[tuple[int, int, list[str]] | None] = [None] * (len(run) + 1)
    best[0] = (0, 0, [])
    for end in range(1, len(run) + 1):
        choices = []
        for start in range(end):
            if best[start] is None:
                continue
            token = lowered[start:end]
            if token not in tokens:
                continue
            previous = best[start]
            choices.append((previous[0] + 1, previous[1] - len(token) ** 2, previous[2] + [run[start:end]]))
        if choices:
            best[end] = min(choices, key=lambda item: (item[0], item[1]))
    parsed = best[-1]
    return " ".join(parsed[2]) if parsed and len(parsed[2]) > 1 else run


def segment_collocation(prefix: str, tokens: set[str]) -> str:
    # Preserve punctuation, apostrophes and placeholders while repairing each
    # uninterrupted letter run (for example, getstuckin -> get stuck in).
    prefix = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", prefix)
    prefix = re.sub(r"'(t|re|ve|ll|d|m)(?=[A-Za-z])", r"'\1 ", prefix, flags=re.IGNORECASE)
    prefix = re.sub(
        r"([A-Za-z]{2,})'s([A-Za-z]{2,})",
        lambda match: f"{segment_run(match.group(1), tokens)}'s {segment_run(match.group(2), tokens)}",
        prefix,
    )
    return re.sub(r"[A-Za-z]{4,}", lambda match: segment_run(match.group(0), tokens), prefix)


def restore_collocation_spacing(value: str, candidates: list[str], tokens: set[str]) -> str:
    value = clean(value)
    numbered = NUMBERED_PREFIX.match(value)
    number = numbered.group(0).strip() if numbered else ""
    body = NUMBERED_PREFIX.sub("", value)
    prefix, gloss = english_prefix(body)
    source_key = phrase_key(prefix)

    matches = []
    for candidate in candidates:
        candidate_prefix, _ = english_prefix(NUMBERED_PREFIX.sub("", clean(candidate)))
        candidate_key = phrase_key(candidate_prefix)
        if source_key and candidate_key:
            score = SequenceMatcher(None, source_key, candidate_key).ratio()
            if source_key == candidate_key or score >= 0.9:
                matches.append((score, candidate_prefix))
    if matches:
        prefix = max(matches, key=lambda item: item[0])[1]
    prefix = segment_collocation(prefix, tokens)

    parts = [part for part in (number, clean(prefix), gloss) if part]
    return segment_collocation(" ".join(parts), tokens)


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
    collocations_by_page_word: dict[tuple[int, str], list[str]] = {}
    for entry in text_layer["entries"]:
        examples_by_page.setdefault(entry["page"], []).extend(entry.get("examples_raw", []))
        collocations_by_page_word.setdefault(
            (entry["page"], compact_key(entry.get("word", ""))), []
        ).extend(entry.get("collocations_raw", []))

    tokens = phrase_tokens(ocr["entries"], text_layer["entries"])

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
            "collocations": [
                restore_collocation_spacing(
                    item,
                    collocations_by_page_word.get((raw["page"], compact_key(word)), []),
                    tokens,
                )
                for item in raw["collocations"]
                if clean(item)
            ],
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

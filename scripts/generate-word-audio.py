"""Generate deterministic offline pronunciation assets for the active wordset."""

import argparse
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
WORDSET = ROOT / "data" / "words-shanghai-zhongkao.json"
VOICE = "en-GB-RyanNeural"
RATE = "-10%"
OUTPUT = ROOT / "assets" / "audio" / "words" / VOICE


def filename(word_id: int) -> str:
    return f"{word_id:04d}.mp3"


async def generate_one(word: dict, semaphore: asyncio.Semaphore, force: bool) -> tuple[dict, str]:
    target = OUTPUT / filename(word["id"])
    entry = {
        "id": word["id"],
        "word": word["word"],
        "file": target.name,
        "voice": VOICE,
        "rate": RATE,
        "sourceText": word["word"],
    }
    if not force and target.exists() and target.stat().st_size > 1000:
        return entry, "skipped"
    async with semaphore:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(word["word"], VOICE, rate=RATE).save(str(target))
                if target.stat().st_size <= 1000:
                    raise RuntimeError("generated file is unexpectedly small")
                return entry, "generated"
            except Exception:
                target.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                await asyncio.sleep(1 + attempt)
    raise RuntimeError("unreachable")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--concurrency", type=int, default=6)
    args = parser.parse_args()
    words = json.loads(WORDSET.read_text(encoding="utf-8"))["words"]
    if args.limit:
        words = words[: args.limit]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(max(1, args.concurrency))
    results = await asyncio.gather(*(generate_one(word, semaphore, args.force) for word in words))
    entries = [entry for entry, _ in results]
    manifest = {
        "schemaVersion": 1,
        "wordset": "shanghai-zhongkao",
        "voice": VOICE,
        "rate": RATE,
        "total": len(entries),
        "entries": entries,
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    generated = sum(status == "generated" for _, status in results)
    print(f"Pronunciation assets ready: {len(entries)} total, {generated} generated, {len(entries) - generated} reused")


if __name__ == "__main__":
    asyncio.run(main())

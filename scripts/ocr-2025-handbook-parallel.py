"""Parallel continuation for handbook OCR after a long batch timeout."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def ocr_page(args: tuple[str, int]) -> tuple[int, str]:
    image, page = args
    from rapidocr_onnxruntime import RapidOCR

    try:
        result, _ = RapidOCR()(image)
        text = "\n".join(item[1] for item in (result or []))
    except Exception as error:
        text = f"OCR_ERROR: {type(error).__name__}: {error}"
    return page, text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("render_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--start-page", type=int, required=True)
    parser.add_argument("--end-page", type=int, required=True)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    images = []
    for page in range(args.start_page, args.end_page + 1):
        image = args.render_dir / f"page-{page:03d}.jpg"
        if image.exists():
            images.append((str(image), page))
    results: dict[int, str] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(ocr_page, item) for item in images]
        for index, future in enumerate(as_completed(futures), start=1):
            page, text = future.result()
            results[page] = text
            if index % 10 == 0 or index == len(futures):
                print(f"OCR {index}/{len(futures)}")
    with args.output.open("a", encoding="utf-8") as stream:
        for page in sorted(results):
            stream.write(f"\n=== PAGE {page} ===\n{results[page]}\n")


if __name__ == "__main__":
    main()

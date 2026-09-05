"""Batch OCR the local handbook into page-delimited UTF-8 text.

This is an intermediate artifact only. The source PDF and OCR output are
ignored by Git; later normalization turns reviewed records into JSON.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from rapidocr_onnxruntime import RapidOCR


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--pdftoppm", required=True, type=Path)
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int, default=0)
    parser.add_argument("--append", action="store_true")
    parser.add_argument(
        "--page-output-dir",
        type=Path,
        help="Write one resumable UTF-8 text file per page instead of one stream",
    )
    args = parser.parse_args()

    render_dir = args.output.parent / "rendered-pages"
    render_dir.mkdir(parents=True, exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    prefix = render_dir / "page"
    if not list(render_dir.glob("page-*.jpg")):
        subprocess.run(
            [str(args.pdftoppm), "-jpeg", "-r", str(args.dpi), str(args.pdf), str(prefix)],
            check=True,
        )

    images = sorted(render_dir.glob("page-*.jpg"))
    images = [image for image in images if args.start_page <= int(image.stem.split("-")[-1])]
    if args.end_page:
        images = [image for image in images if int(image.stem.split("-")[-1]) <= args.end_page]
    ocr = RapidOCR()
    if args.page_output_dir:
        args.page_output_dir.mkdir(parents=True, exist_ok=True)
        pending = []
        for image in images:
            page_number = int(image.stem.split("-")[-1])
            page_output = args.page_output_dir / f"page-{page_number:03d}.txt"
            if not page_output.exists():
                pending.append((image, page_number, page_output))
        for index, (image, page_number, page_output) in enumerate(pending, start=1):
            try:
                result, _ = ocr(str(image))
                text = "\n".join(item[1] for item in (result or []))
            except Exception as error:  # keep the batch resumable
                text = f"OCR_ERROR: {type(error).__name__}: {error}"
            page_output.write_text(text + "\n", encoding="utf-8")
            print(f"OCR page {page_number} ({index}/{len(pending)})", flush=True)
        return

    with args.output.open("a" if args.append else "w", encoding="utf-8") as stream:
        for index, image in enumerate(images, start=1):
            page_number = int(image.stem.split("-")[-1])
            stream.write(f"\n=== PAGE {page_number} ===\n")
            try:
                result, _ = ocr(str(image))
                stream.write("\n".join(item[1] for item in (result or [])))
            except Exception as error:  # keep the batch resumable
                stream.write(f"OCR_ERROR: {type(error).__name__}: {error}")
            stream.write("\n")
            if index % 25 == 0 or index == len(images):
                print(f"OCR page {page_number} ({index}/{len(images)})")


if __name__ == "__main__":
    main()

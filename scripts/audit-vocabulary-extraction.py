"""Create a compact audit report for the handbook extraction."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("extracted", type=Path)
    parser.add_argument("current", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    extracted = json.loads(args.extracted.read_text(encoding="utf-8"))
    current = json.loads(args.current.read_text(encoding="utf-8"))
    extracted_words = {norm(item["word"]): item for item in extracted["entries"]}
    current_words = {norm(item["word"]): item for item in current["words"]}
    handbook_only = sorted(set(extracted_words) - set(current_words))
    current_only = sorted(set(current_words) - set(extracted_words))
    review = [item for item in extracted["entries"] if item.get("needs_review")]

    lines = [
        "# 2025 手册结构化抽取审计报告",
        "",
        "> 本报告用于 ID 迁移和人工校正，不是两个运行时词库版本的比较。",
        "",
        "## 输入摘要",
        "",
        f"- 文档：`{extracted['source']['document']}`（PDF 不提交）",
        f"- OCR 校验页数：{extracted['source']['ocr_pages_verified']}",
        f"- 词汇正文页：{extracted['source']['chapter_pages']}",
        f"- 主词条：{extracted['summary']['entries']}",
        f"- 带例句记录：{extracted['summary']['with_examples']}",
        f"- 带搭配记录：{extracted['summary']['with_collocations']}",
        f"- 归属词形：{extracted['summary']['word_forms']}",
        f"- 待人工复核记录：{extracted['summary']['needs_review']}",
        "",
        "## ID 迁移信号",
        "",
        f"- 运行时与结构化手册交集：{len(set(extracted_words) & set(current_words))}",
        f"- 结构化手册未进入运行时：{len(handbook_only)}",
        f"- 运行时非手册词条：{len(current_only)}",
        f"- 复用旧 ID：{current['meta'].get('legacy_ids_reused', '未知')}",
        "",
        "## 当前限制",
        "",
        "- `needs_review` 主要标识无直接例句、异常音标或水印干扰记录。",
        "- 无英文释义时基础题回退中文释义；无例句时不得生成句子填空题。",
        "- 例句和搭配进入题目生成前仍需做目标词、答案唯一性和题干泄漏校验。",
        "",
        "## 待复核样本",
        "",
    ]
    lines.extend(
        f"- 第{item['page']}页 `{item['word']}`：{item['meaning_cn']}"
        for item in review[:50]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"handbook_only": len(handbook_only), "current_only": len(current_only), "review": len(review)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

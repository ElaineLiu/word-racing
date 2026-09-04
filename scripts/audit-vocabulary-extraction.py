"""Create a compact audit report for the handbook extraction."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


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
        f"- 文档：`{extracted['source']['filename']}`",
        f"- 页数：{extracted['source']['pages']}",
        f"- 抽取词条记录：{extracted['summary']['entry_records']}",
        f"- 规范化单词数：{extracted['summary']['unique_normalized_words']}",
        f"- 带例句记录：{extracted['summary']['records_with_examples']}",
        f"- 带搭配记录：{extracted['summary']['records_with_collocations']}",
        f"- 待人工复核记录：{extracted['summary']['needs_review_records']}",
        "",
        "## ID 迁移信号",
        "",
        f"- 可按英文词复用现有 ID：{len(set(extracted_words) & set(current_words))}",
        f"- 手册中新增候选：{len(handbook_only)}",
        f"- 现有词库未在手册抽取结果中识别：{len(current_only)}（需复核，不自动删除）",
        "",
        "## 当前限制",
        "",
        "- PDF 嵌入字体会造成少量音标和中文字符错译。",
        "- 词形变化与主词条需要在规范化阶段重新归属。",
        "- 待复核条目不得进入默认题目集合。",
        "- 例句和搭配将在题目生成阶段做目标词、答案唯一性和题干泄漏校验。",
        "",
        "## 待复核样本",
        "",
    ]
    lines.extend(
        f"- 第{item['page']}页 `{item['word']}`：{item['definition_raw']}"
        for item in review[:50]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"handbook_only": len(handbook_only), "current_only": len(current_only), "review": len(review)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

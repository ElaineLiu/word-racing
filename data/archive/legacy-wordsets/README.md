# Legacy wordsets

本目录只保存阶段 A1 之前的历史词库，供版本追溯和数据核对。

- `words-shanghai-g6.json`：旧沪教六年级词库。
- `words.json`：旧版默认词库副本。

这些文件不得被运行时加载，不得作为加载失败时的 fallback，也不得进入构建或发布包。当前唯一运行时词库是 `data/words-shanghai-zhongkao.json`（上海中考考纲，1,982 词）。

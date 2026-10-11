# v2.2.0 发布验收

- 完整测试：`npx vitest run`，63文件854测试通过。
- 词库：`npm run validate:data:strict`，1639词及唯一ID通过。
- 构建：`npm run build`，仅包含运行时中考词库，Three.js和数据内联，移除importmap和module入口。
- 打包：`npm run pack:zip`，输出版本化ZIP及SHA256文件，包含离线说明和Windows启动脚本。
- 解压验证：实际ZIP解压至隔离tmp目录，浏览器通过file://直接打开index.html。1639词加载，页面完成10个学习词获20燃油；刷新仍为10词/20燃油；真实Game启动1圈赛车进入COUNTDOWN，无页面错误。测试浏览器与孩子的localhost存档隔离。
- 原每日45词验收：页面实际完成5轮、45词获得100燃油；真实Game两场5圈100→50→0。
- 旧资产、归档、跨日、重复提交和多用户验证见自适应学习与45词专项验收文档。
- 本地私人备份、截图和未纳入本次实现的旧设计修改不进入提交或发布包。

运行发布版无需Node.js、Python、服务器或下载Three.js。升级时先从旧页面导出存档，再在新版导入；localhost与file://不会自动共享浏览器存储。

## Epic 8: 性能优化

### 🎬 Vision

**目标**: 优化3D赛道性能，确保主流设备60fps、低端设备30fps流畅运行。提供画质选项让用户根据设备选择。

**功能**:
- LOD（Level of Detail）
- InstancedMesh批量渲染
- 画质选项（低/中/高）
- FPS监控

**依赖**: Epic 7

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 8.1: 实现LOD系统
- [ ] 创建 `3d/utils/lod-manager.js`
- [ ] 树木/建筑使用 THREE.LOD
- [ ] 远距离低细节
**状态**: ⏸️ 未开始

#### UC 8.2: 批量渲染优化
- [ ] InstancedMesh渲染树木（100+）
- [ ] InstancedMesh渲染单词泡泡
- [ ] Draw call < 20
**状态**: ⏸️ 未开始

#### UC 8.3: 画质选项
- [ ] 创建 `config/graphics-config.js`
- [ ] 低/中/高三档预设
- [ ] 设置页面选择
- [ ] 保存到 localStorage
**状态**: ⏸️ 未开始

#### UC 8.4: FPS监控
- [ ] 集成 stats.js
- [ ] 开发模式显示
- [ ] 生产模式隐藏
**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

- [ ] FPS ≥ 60（主流设备）
- [ ] FPS ≥ 30（低端设备）
- [ ] Draw call < 20
- [ ] 画质切换工作正常
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-8): performance optimization`

---

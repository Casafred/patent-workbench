# 项目架构规范 - Steering提醒

**版本**: 2.0  
**更新日期**: 2026-02-07  
**优先级**: HIGH  

---

## ⚠️ 重要提醒

在进行任何代码修改或添加新功能前，**必须**查看以下文档：

### 📚 核心架构文档

1. **项目架构详细说明**
   - 📄 文件: `docs/DIRECTORY_STRUCTURE.md`
   - 📋 内容: 完整的目录结构、文件职责、模块依赖关系
   - 🔍 查看时机: 添加新文件、重构代码、不确定文件应该放在哪里时

2. **重构状态和计划**
   - 📄 文件: `.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md`
   - 📋 内容: 当前重构进度、待重构文件清单、优先级
   - 🔍 查看时机: 开始重构工作前、检查文件是否需要拆分时

3. **大文件拆分计划**
   - 📄 文件: `.kiro/specs/html-js-refactoring/LARGE_FILES_REFACTORING_PLAN.md`
   - 📋 内容: 超大文件的拆分方案、时间表、验证标准
   - 🔍 查看时机: 拆分超过500行的文件时

4. **重构任务清单**
   - 📄 文件: `.kiro/specs/html-js-refactoring/tasks.md`
   - 📋 内容: 详细的任务列表、完成状态、验收标准
   - 🔍 查看时机: 开始新任务前、更新任务状态时

---

## 🚨 关键规则提醒

### 文件大小限制
- JavaScript/Python: **< 500行**
- HTML: **< 1000行**
- CSS: **< 500行**

### 当前违规文件（必须重构）
- `largeBatch.js` (1153行) - **P0优先级**
- 其他6个文件超过1000行 - **P1优先级**

### 模块组织
- 核心工具 → `js/core/`
- 功能模块 → `js/modules/功能名/`
- HTML组件 → `frontend/components/`
- 样式文件 → `frontend/css/`

---

## ✅ 工作流程

### 添加新功能时
1. ✅ 查看 `docs/DIRECTORY_STRUCTURE.md` 确定文件位置
2. ✅ 确保文件大小 < 500行
3. ✅ 更新 `docs/DIRECTORY_STRUCTURE.md`（如有架构变更）
4. ✅ 更新 `.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md`

### 重构现有代码时
1. ✅ 查看 `.kiro/specs/html-js-refactoring/LARGE_FILES_REFACTORING_PLAN.md`
2. ✅ 按照拆分方案执行
3. ✅ 更新所有相关文档
4. ✅ 标记任务完成状态

---

## 📝 文档更新责任

**重要**: 不要创建新的总结文档！应该更新现有文档：

### 必须更新的文档
- `docs/DIRECTORY_STRUCTURE.md` - 架构变更时
- `.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md` - 完成重构任务时
- `.kiro/specs/html-js-refactoring/tasks.md` - 任务状态变更时
- `README.md` - 重大功能变更时（见tasks.md中的Task 9）

### 禁止行为
- ❌ 不要创建新的 `SUMMARY_*.md` 文件
- ❌ 不要重复记录已有的信息
- ❌ 不要创建临时的说明文档

---

**提醒**: 本文档只是提醒，详细内容请查看上述文档！

---

**文档创建**: 2026-02-07  
**最后更新**: 2026-02-07

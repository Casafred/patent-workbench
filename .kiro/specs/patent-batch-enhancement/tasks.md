# 功能六批量专利解读增强 - 任务清单

## Phase 1: 核心功能实现

### Task 1.1: 模板数据结构和存储
- [ ] 在 `js/state.js` 中添加 `patentBatch` 状态
- [ ] 定义模板数据结构
- [ ] 实现模板的 localStorage 存储和读取
- [ ] 创建预设模板数据

**文件**: `js/state.js`

### Task 1.2: 模板管理UI - HTML结构
- [ ] 在 `frontend/index.html` 功能六区域添加模板管理区
- [ ] 添加模板选择器
- [ ] 添加模板编辑器（可折叠）
- [ ] 添加字段配置列表容器
- [ ] 添加模板操作按钮组

**文件**: `frontend/index.html`

### Task 1.3: 模板管理UI - 样式
- [ ] 创建 `frontend/css/components/patent-template.css`
- [ ] 实现模板管理区样式
- [ ] 实现字段配置项样式
- [ ] 实现响应式布局
- [ ] 在 `frontend/index.html` 中引入CSS

**文件**: `frontend/css/components/patent-template.css`

### Task 1.4: 模板管理逻辑 - JavaScript
- [ ] 创建 `js/patentTemplate.js`
- [ ] 实现 `initPatentTemplate()` 初始化函数
- [ ] 实现模板加载和显示
- [ ] 实现字段添加/删除
- [ ] 实现模板保存/删除
- [ ] 实现模板切换
- [ ] 在 `js/main.js` 中集成

**文件**: `js/patentTemplate.js`, `js/main.js`

### Task 1.5: 解读API适配模板 - 前端
- [ ] 修改 `js/main.js` 中的 `analyzeAllBtn` 事件处理
- [ ] 根据当前模板构建解读提示词
- [ ] 动态生成JSON输出格式要求
- [ ] 适配解读结果显示（动态表格）
- [ ] 适配Excel导出（动态列）

**文件**: `js/main.js`

### Task 1.6: 解读API适配模板 - 后端
- [ ] 修改 `backend/routes/patent.py` 中的 `/patent/analyze` 路由
- [ ] 接收模板字段参数
- [ ] 动态构建系统提示词
- [ ] 动态构建输出格式要求
- [ ] 返回结构化结果

**文件**: `backend/routes/patent.py`

### Task 1.7: 专利卡片添加"问一问"按钮
- [ ] 修改 `js/main.js` 中的 `displayPatentResults()` 函数
- [ ] 在专利卡片标题栏添加"问一问"按钮
- [ ] 添加按钮点击事件处理
- [ ] 传递专利数据到对话函数

**文件**: `js/main.js`

### Task 1.8: 对话弹窗UI - HTML结构
- [ ] 在 `frontend/index.html` 底部添加对话弹窗模态框
- [ ] 添加弹窗头部（专利信息）
- [ ] 添加对话历史区域
- [ ] 添加输入框和发送按钮
- [ ] 添加关闭按钮

**文件**: `frontend/index.html`

### Task 1.9: 对话弹窗UI - 样式
- [ ] 创建 `frontend/css/components/patent-chat.css`
- [ ] 实现弹窗样式
- [ ] 实现对话历史样式
- [ ] 实现输入区样式
- [ ] 实现响应式布局
- [ ] 在 `frontend/index.html` 中引入CSS

**文件**: `frontend/css/components/patent-chat.css`

### Task 1.10: 对话功能逻辑 - JavaScript
- [ ] 创建 `js/patentChat.js`
- [ ] 实现 `openPatentChat()` 打开对话
- [ ] 实现 `closePatentChat()` 关闭对话
- [ ] 实现 `sendPatentChatMessage()` 发送消息
- [ ] 实现对话历史显示
- [ ] 实现加载状态显示
- [ ] 在 `js/main.js` 中集成

**文件**: `js/patentChat.js`, `js/main.js`

### Task 1.11: 对话API - 后端
- [ ] 在 `backend/routes/patent.py` 中添加 `/patent/chat` 路由
- [ ] 接收专利数据和对话消息
- [ ] 构建专利上下文
- [ ] 调用AI API
- [ ] 返回对话结果

**文件**: `backend/routes/patent.py`

### Task 1.12: 集成测试
- [ ] 测试模板创建和切换
- [ ] 测试自定义字段解读
- [ ] 测试解读结果显示
- [ ] 测试Excel导出
- [ ] 测试专利对话功能
- [ ] 测试多轮对话
- [ ] 修复发现的问题

## Phase 2: 增强功能

### Task 2.1: 模板导入/导出
- [ ] 实现模板导出为JSON文件
- [ ] 实现从JSON文件导入模板
- [ ] 添加导入验证
- [ ] 处理模板名称冲突

**文件**: `js/patentTemplate.js`

### Task 2.2: 预设模板库扩展
- [ ] 创建"技术分析模板"
- [ ] 创建"商业价值模板"
- [ ] 创建"法律分析模板"
- [ ] 创建"竞品分析模板"
- [ ] 添加模板说明文档

**文件**: `js/patentTemplate.js`

### Task 2.3: 多轮对话历史
- [ ] 实现对话历史持久化（sessionStorage）
- [ ] 实现对话历史恢复
- [ ] 添加清空对话按钮
- [ ] 添加对话导出功能

**文件**: `js/patentChat.js`

### Task 2.4: 对话内容操作
- [ ] 添加复制对话内容按钮
- [ ] 添加导出对话为文本
- [ ] 添加对话搜索功能

**文件**: `js/patentChat.js`

## Phase 3: 优化功能

### Task 3.1: 模板验证
- [ ] 添加字段名称验证（不能为空）
- [ ] 添加字段描述验证
- [ ] 添加模板名称唯一性验证
- [ ] 添加友好的错误提示

**文件**: `js/patentTemplate.js`

### Task 3.2: 对话快捷操作
- [ ] 添加常见问题快捷按钮
- [ ] 实现问题模板
- [ ] 添加快捷回复

**文件**: `js/patentChat.js`

### Task 3.3: 移动端优化
- [ ] 优化模板管理区移动端布局
- [ ] 优化对话弹窗移动端显示
- [ ] 测试移动端交互

**文件**: `frontend/css/components/patent-template.css`, `frontend/css/components/patent-chat.css`

### Task 3.4: 性能优化
- [ ] 优化模板加载性能
- [ ] 优化对话历史渲染
- [ ] 添加加载状态指示
- [ ] 优化大量专利显示性能

**文件**: `js/patentTemplate.js`, `js/patentChat.js`, `js/main.js`

## 文档任务

### Task D.1: 用户文档
- [ ] 更新 `frontend/help.html` 功能六部分
- [ ] 添加模板管理使用说明
- [ ] 添加专利对话使用说明
- [ ] 添加常见问题解答

**文件**: `frontend/help.html`

### Task D.2: 开发文档
- [ ] 创建功能说明文档
- [ ] 创建API文档
- [ ] 创建部署指南

**文件**: `docs/features/功能六增强说明.md`

## 测试任务

### Task T.1: 单元测试
- [ ] 测试模板CRUD操作
- [ ] 测试字段配置
- [ ] 测试解读API
- [ ] 测试对话API

### Task T.2: 集成测试
- [ ] 测试完整解读流程
- [ ] 测试完整对话流程
- [ ] 测试模板切换
- [ ] 测试Excel导出

### Task T.3: 用户测试
- [ ] 准备测试用例
- [ ] 执行用户测试
- [ ] 收集反馈
- [ ] 优化改进

## 部署任务

### Task P.1: 部署准备
- [ ] 更新 `requirements.txt`（如有新依赖）
- [ ] 更新部署脚本
- [ ] 准备部署文档

### Task P.2: 部署执行
- [ ] 部署到测试环境
- [ ] 验证功能
- [ ] 部署到生产环境
- [ ] 监控运行状态

## 估时

- Phase 1: 8-10小时
- Phase 2: 4-6小时
- Phase 3: 3-4小时
- 文档: 2-3小时
- 测试: 3-4小时
- 部署: 1-2小时

**总计**: 21-29小时

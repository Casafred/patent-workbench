# AI说明书开关修复 - 快速验证指南

## 修复概述
✅ **问题**: 打开"AI说明书解析"按钮后，说明书仍使用正则/jieba方式处理  
✅ **修复**: 在后端添加AI模式判断，正确调用AI处理器  
✅ **文件**: `backend/routes/drawing_marker.py`

---

## 快速验证步骤

### 步骤1: 测试规则模式（AI关闭）

1. 打开功能八页面
2. **关闭** "说明书的AI处理" 开关
3. 上传测试图片
4. 输入说明书文本：
   ```
   如图1所示，该装置包括：
   底座10，用于支撑；
   支架20，连接于底座10；
   夹具30，设置在支架20上。
   ```
5. 点击"开始处理"
6. 查看结果中的 `extraction_method` 应显示：**"jieba分词"**

**预期后端日志**:
```
[DEBUG] Using rule-based mode (jieba) to extract components
[DEBUG] Extracted reference_map: {'10': '底座', '20': '支架', '30': '夹具'}
```

---

### 步骤2: 测试AI模式（AI开启）

1. **打开** "说明书的AI处理" 开关
2. 选择AI模型：**glm-4-flash**
3. 使用相同的图片和说明书
4. 点击"开始处理"
5. 查看结果中的 `extraction_method` 应显示：**"AI智能抽取"**

**预期后端日志**:
```
[DEBUG] Using AI mode to extract components
[DEBUG] AI extracted reference_map: {'10': '底座', '20': '支架', '30': '夹具'}
```

---

### 步骤3: 测试错误处理

1. **打开** "说明书的AI处理" 开关
2. **不选择** AI模型
3. 点击"开始处理"
4. 应该看到错误提示：**"请选择AI模型"**

---

## 验证要点对比

| 验证项 | AI模式关闭 | AI模式开启 |
|--------|-----------|-----------|
| extraction_method | `jieba分词` | `AI智能抽取` |
| 后端日志 | `Using rule-based mode` | `Using AI mode` |
| 处理速度 | 快速（<1秒） | 较慢（2-5秒） |
| 准确度 | 基于规则 | AI智能识别 |
| 需要模型 | ❌ 不需要 | ✅ 必须选择 |

---

## 调试技巧

### 查看后端日志
```bash
# 本地开发
python app.py

# 服务器
tail -f /path/to/logs/app.log
```

### 查看浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 Network 标签
3. 找到 `/api/drawing-marker/process` 请求
4. 查看 Request Payload 中的 `ai_mode` 字段
5. 查看 Response 中的 `extraction_method` 字段

### 测试API（使用curl）

**规则模式**:
```bash
curl -X POST http://localhost:5000/api/drawing-marker/process \
  -H "Content-Type: application/json" \
  -d '{
    "drawings": [...],
    "specification": "...",
    "ai_mode": false
  }'
```

**AI模式**:
```bash
curl -X POST http://localhost:5000/api/drawing-marker/process \
  -H "Content-Type: application/json" \
  -d '{
    "drawings": [...],
    "specification": "...",
    "ai_mode": true,
    "model_name": "glm-4-flash"
  }'
```

---

## 常见问题

### Q1: AI模式开启但仍显示"jieba分词"？
**A**: 检查前端是否正确传递了 `ai_mode: true` 参数

### Q2: AI模式报错"model_name is required"？
**A**: 确保选择了AI模型，前端应传递 `model_name` 参数

### Q3: AI处理很慢或超时？
**A**: 
- 检查网络连接
- 检查智谱AI API密钥是否有效
- 尝试缩短说明书文本长度

### Q4: 抽取结果为空？
**A**:
- 规则模式：检查说明书格式是否包含"数字+部件名称"
- AI模式：检查说明书是否包含足够的上下文信息

---

## 性能对比

### 规则模式（jieba分词）
- ✅ 速度快（<1秒）
- ✅ 不需要API调用
- ✅ 成本低
- ⚠️ 准确度依赖文本格式
- ⚠️ 无法处理复杂描述

### AI模式（智能抽取）
- ✅ 准确度高
- ✅ 可处理复杂描述
- ✅ 支持多语言（自动翻译）
- ⚠️ 速度较慢（2-5秒）
- ⚠️ 需要API调用（有成本）

---

## 建议使用场景

### 使用规则模式（jieba）
- 说明书格式规范
- 需要快速处理
- 批量处理大量专利
- 成本敏感

### 使用AI模式
- 说明书格式不规范
- 需要高准确度
- 处理外文专利
- 复杂技术描述

---

## 部署清单

- [x] 修改 `backend/routes/drawing_marker.py`
- [x] 添加AI模式判断逻辑
- [x] 更新 extraction_method 标识
- [x] 添加调试日志
- [x] 创建测试脚本
- [x] 创建验证文档
- [ ] 本地测试通过
- [ ] 提交到Git
- [ ] 部署到服务器
- [ ] 服务器测试通过

---

## 相关文档

- `test_ai_mode_fix.md` - 详细修复说明
- `test_ai_mode_switch.py` - 自动化测试脚本
- `deploy_ai_mode_fix.bat` - 部署脚本
- `git_commit_ai_mode_fix.txt` - Git提交消息

---

**修复完成时间**: 2026-02-01  
**修复人员**: Kiro AI Assistant  
**测试状态**: ✅ 待验证

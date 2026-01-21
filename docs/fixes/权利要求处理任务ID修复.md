# 权利要求处理任务ID修复

## 问题描述

用户在上传 `test_large.xlsx` 文件并选择工作表后，点击"开始处理"按钮时出现以下问题：

1. **现象**：处理按钮一直转圈，无法完成
2. **控制台错误**：
   ```
   JSON.parse: unexpected end of data at line 1 column 1
   ```
3. **任务ID错误**：生成的任务ID格式不正确
   ```
   task_20260121_125042_20260121_853062026-01-21-19-38-39-787.xlsx_PATENTS
   ```
4. **HTTP 404错误**：轮询任务状态时返回404，任务不存在

## 根本原因

在 `backend/routes/claims.py` 的 `process_claims` 函数中（第395行），任务ID生成逻辑存在问题：

```python
# 旧代码
task_id = f"task_{file_id}_{sheet_name or 'default'}"
```

**问题分析**：
1. `file_id` 已经包含完整的文件名（含扩展名），例如：`20260121_125042_20260121_853062026-01-21-19-38-39-787.xlsx`
2. `sheet_name` 可能包含特殊字符或较长，例如：`PATENTS`
3. 直接拼接导致任务ID过长且包含特殊字符（如 `.`），不适合作为URL路径参数
4. 任务ID格式不一致，导致创建和查询时无法匹配

## 解决方案

### 1. 清理和规范化工作表名称

使用正则表达式清理工作表名称，只保留字母、数字、下划线和连字符：

```python
import re
safe_sheet_name = re.sub(r'[^a-zA-Z0-9_-]', '_', sheet_name or 'default')
```

### 2. 限制工作表名称长度

避免任务ID过长：

```python
safe_sheet_name = safe_sheet_name[:50]
```

### 3. 生成清晰的任务ID

```python
task_id = f"task_{file_id}_{safe_sheet_name}"
```

### 4. 添加调试日志

帮助诊断任务创建和查询问题：

```python
print(f"Creating task with ID: {task_id}")
print(f"  File ID: {file_id}")
print(f"  Sheet name: {sheet_name}")
print(f"  Safe sheet name: {safe_sheet_name}")
```

在状态查询端点也添加日志：

```python
print(f"Checking status for task: {task_id}")
print(f"Task {task_id} not in memory, trying disk...")
print(f"Available tasks in memory: {list(processing_tasks.keys())}")
```

## 修改文件

- `backend/routes/claims.py`
  - 第395-401行：任务ID生成逻辑
  - 第483-495行：任务状态查询日志

## 测试建议

1. **上传测试文件**：使用 `uploads/test_large.xlsx` 文件
2. **选择工作表**：选择包含特殊字符的工作表名称（如 "PATENTS"）
3. **开始处理**：点击"开始处理"按钮
4. **验证任务ID**：
   - 检查控制台日志，确认任务ID格式正确
   - 任务ID应该类似：`task_20260121_125042_file_PATENTS`
5. **验证轮询**：
   - 确认轮询请求成功（HTTP 200）
   - 确认进度条正常更新
   - 确认处理完成后能正常显示结果

## 预期效果

修复后：
- ✅ 任务ID格式规范，不包含特殊字符
- ✅ 任务创建和查询使用相同的ID格式
- ✅ 轮询请求返回正确的任务状态
- ✅ 处理进度正常显示
- ✅ 处理完成后能正常加载结果

## 相关问题

- 文件上传大小限制已调整为100MB
- 行数限制为1000行
- 权利要求显示数量限制为500条

## 更新时间

2026-01-21 20:00

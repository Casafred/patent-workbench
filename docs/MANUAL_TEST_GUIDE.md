# 专利权利要求处理器 - 手动测试指南

## 快速开始

### 方式1：命令行演示（推荐新手）

最简单的测试方式，运行演示脚本：

```bash
python demo.py
```

这个脚本会：
- 自动创建测试数据
- 演示各个组件的功能
- 展示完整的处理流程
- 显示处理结果

---

## 方式2：Web界面测试（推荐日常使用）

### 步骤1：启动Flask服务器

```bash
python app.py
```

服务器会在 `http://localhost:5000` 启动

### 步骤2：打开浏览器

访问以下任一页面：

1. **主页面**: `http://localhost:5000/`
2. **权利要求处理页面**: `http://localhost:5000/claims_processor.html`

### 步骤3：上传Excel文件

1. 点击"选择文件"按钮
2. 选择包含专利权利要求的Excel文件
3. 选择工作表和列
4. 点击"开始处理"

### 步骤4：查看结果

- 实时查看处理进度
- 查看提取的权利要求
- 下载处理结果（Excel或JSON格式）
- 查看处理报告

---

## 方式3：Python脚本测试（适合开发者）

### 创建测试脚本

创建一个新文件 `my_test.py`：

```python
from patent_claims_processor import ProcessingService
from patent_claims_processor.services import ExportService
import pandas as pd

# 1. 准备测试数据
data = {
    'Claims': [
        """1. 一种计算机系统，其特征在于包括处理器和存储器。
2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。
3. 根据权利要求1或2所述的计算机系统，其特征在于还包括网络接口。

1. A computer system comprising a processor and memory.
2. The computer system of claim 1, wherein the processor is a multi-core processor.
3. The computer system of claim 1 or 2, further comprising a network interface."""
    ]
}

# 2. 创建Excel文件
df = pd.DataFrame(data)
df.to_excel('my_test.xlsx', index=False)

# 3. 处理文件
service = ProcessingService()
result = service.process_excel_file(
    file_path='my_test.xlsx',
    column_name='Claims'
)

# 4. 查看结果
print(f"处理了 {result.total_cells_processed} 个单元格")
print(f"提取了 {result.total_claims_extracted} 个权利要求")
print(f"独立权利要求: {result.independent_claims_count}")
print(f"从属权利要求: {result.dependent_claims_count}")
print(f"语言分布: {result.language_distribution}")

# 5. 导出结果
export_service = ExportService()
export_service.export_to_excel(result, 'output.xlsx')
export_service.export_to_json(result, 'output.json')

print("\n结果已导出到 output.xlsx 和 output.json")
```

运行测试：

```bash
python my_test.py
```

---

## 方式4：使用现有的演示脚本

### demo.py - 基础功能演示

```bash
python demo.py
```

展示：
- 语言检测
- 权利要求解析
- 权利要求分类
- 完整处理流程

### demo_export.py - 导出功能演示

```bash
python demo_export.py
```

展示：
- JSON导出
- Excel导出
- 报告生成
- 输出摘要

### demo_recovery.py - 中断恢复演示

```bash
python demo_recovery.py
```

展示：
- 处理进度保存
- 中断后恢复
- 恢复状态验证

---

## 测试数据准备

### 创建测试Excel文件

你可以创建一个Excel文件，包含以下格式的数据：

**示例1：中文权利要求**
```
1. 一种计算机系统，其特征在于包括处理器和存储器。
2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。
3. 根据权利要求1或2所述的计算机系统，其特征在于还包括网络接口。
```

**示例2：英文权利要求**
```
1. A computer system comprising a processor and memory.
2. The computer system of claim 1, wherein the processor is a multi-core processor.
3. The computer system of claim 1 or 2, further comprising a network interface.
```

**示例3：中英文混合**
```
1. 一种计算机系统，其特征在于包括处理器和存储器。
2. 根据权利要求1所述的计算机系统，其特征在于所述处理器为多核处理器。

1. A computer system comprising a processor and memory.
2. The computer system of claim 1, wherein the processor is a multi-core processor.
```

### 使用Python创建测试文件

```python
import pandas as pd

data = {
    'Patent_Claims': [
        "1. 一种计算机系统...\n2. 根据权利要求1...",
        "1. A computer system...\n2. The computer system of claim 1...",
    ]
}

df = pd.DataFrame(data)
df.to_excel('test_claims.xlsx', index=False)
print("测试文件已创建: test_claims.xlsx")
```

---

## API测试（高级）

### 使用curl测试API

#### 1. 上传文件

```bash
curl -X POST http://localhost:5000/api/claims/upload \
  -F "file=@test_claims.xlsx"
```

#### 2. 开始处理

```bash
curl -X POST http://localhost:5000/api/claims/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "uploads/test_claims.xlsx",
    "column_name": "Patent_Claims"
  }'
```

#### 3. 查询状态

```bash
curl http://localhost:5000/api/claims/status/<task_id>
```

#### 4. 获取结果

```bash
curl http://localhost:5000/api/claims/result/<task_id>
```

#### 5. 导出结果

```bash
curl http://localhost:5000/api/claims/export/<task_id>?format=excel
```

---

## 验证测试结果

### 检查点1：处理统计

确认以下信息正确：
- ✅ 处理的单元格数量
- ✅ 提取的权利要求总数
- ✅ 独立权利要求数量
- ✅ 从属权利要求数量
- ✅ 语言分布（中文/英文）

### 检查点2：权利要求信息

对于每个权利要求，确认：
- ✅ 序号正确
- ✅ 类型正确（独立/从属）
- ✅ 语言识别正确
- ✅ 引用关系正确
- ✅ 文本内容完整

### 检查点3：导出文件

检查导出的文件：
- ✅ Excel文件可以正常打开
- ✅ JSON文件格式正确
- ✅ 包含所有必需字段
- ✅ 数据完整无误

---

## 常见问题

### Q1: 如何处理大文件？

系统支持中断恢复功能：

```python
service = ProcessingService()
result = service.process_excel_file(
    file_path='large_file.xlsx',
    column_name='Claims',
    enable_recovery=True  # 启用恢复功能
)
```

### Q2: 如何处理特殊格式？

系统会自动适应不同的序号格式，但如果遇到问题，可以查看错误报告：

```python
if result.processing_errors:
    for error in result.processing_errors:
        print(f"错误: {error}")
```

### Q3: 如何自定义语言优先级？

当前优先级：英文 > 中文 > 其他语言

如需修改，可以在 `LanguageDetector` 类中调整。

---

## 性能测试

### 测试处理速度

```python
import time

start_time = time.time()
result = service.process_excel_file('test.xlsx', 'Claims')
end_time = time.time()

print(f"处理时间: {end_time - start_time:.2f}秒")
print(f"处理速度: {result.total_claims_extracted / (end_time - start_time):.2f} 个权利要求/秒")
```

---

## 下一步

- 📖 查看 [README.md](README.md) 了解更多功能
- 📖 查看 [CLAIMS_PROCESSOR_API.md](CLAIMS_PROCESSOR_API.md) 了解API详情
- 📖 查看 [RECOVERY_FEATURE.md](RECOVERY_FEATURE.md) 了解恢复功能
- 🐛 遇到问题？运行 `pytest` 检查系统状态

---

## 快速测试命令总结

```bash
# 1. 运行演示脚本（最简单）
python demo.py

# 2. 启动Web服务器
python app.py
# 然后访问 http://localhost:5000

# 3. 运行所有测试
pytest -v

# 4. 运行特定测试
pytest tests/test_processing_service.py -v
```

祝测试顺利！🎉

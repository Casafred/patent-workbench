# 中断恢复功能文档

## 概述

专利权利要求处理系统实现了完整的中断恢复功能，允许在处理大型Excel文件时保存进度，并在程序中断后恢复处理。这个功能对于处理大量数据或在不稳定环境中运行特别有用。

## 功能特性

### 1. 自动状态保存
- 每处理10个单元格自动保存一次处理状态
- 保存内容包括：
  - 已处理的权利要求数据
  - 处理错误记录
  - 语言分布统计
  - 当前处理位置
  - 文件路径和列名信息

### 2. 智能恢复机制
- 自动检测恢复文件是否存在
- 验证恢复文件与当前处理请求是否匹配
- 支持手动触发恢复或自动恢复
- 恢复失败时自动降级为正常处理

### 3. 容错处理
- 恢复文件损坏时自动忽略并重新处理
- 参数不匹配时拒绝恢复，避免数据混乱
- 保存状态失败不影响主处理流程

### 4. 自动清理
- 处理成功完成后自动删除恢复文件
- 恢复成功后自动清理恢复文件
- 避免磁盘空间浪费

## 使用方法

### 基本使用

```python
from patent_claims_processor.services.processing_service import ProcessingService

# 创建启用恢复功能的服务
service = ProcessingService(
    enable_recovery=True,           # 启用恢复功能
    recovery_file="my_recovery.json"  # 可选：指定恢复文件路径
)

# 处理Excel文件
result = service.process_excel_file(
    file_path="patents.xlsx",
    column_name="Claims",
    sheet_name="Sheet1",
    resume=False  # 是否尝试从中断点恢复
)
```

### 启用自动恢复

```python
# 第一次处理（可能被中断）
service1 = ProcessingService(enable_recovery=True)
result1 = service1.process_excel_file("large_file.xlsx", "Claims")

# 程序重启后，尝试恢复
service2 = ProcessingService(enable_recovery=True)
result2 = service2.process_excel_file(
    "large_file.xlsx", 
    "Claims",
    resume=True  # 启用恢复
)
```

### 手动控制恢复

```python
service = ProcessingService(enable_recovery=True, recovery_file="custom_recovery.json")

# 手动尝试恢复
recovered_result = service._try_resume_processing(
    file_path="patents.xlsx",
    column_name="Claims",
    sheet_name="Sheet1"
)

if recovered_result:
    print("成功恢复处理状态")
    print(f"已恢复 {recovered_result.total_claims_extracted} 个权利要求")
else:
    print("无法恢复，将重新处理")
    result = service.process_excel_file("patents.xlsx", "Claims")
```

### 获取处理统计信息

```python
service = ProcessingService(enable_recovery=True)

# 获取当前处理状态
stats = service.get_processing_statistics()

print(f"当前处理位置: {stats['current_cell_index']}")
print(f"处理文件: {stats['file_path']}")
print(f"恢复功能状态: {stats['recovery_enabled']}")
print(f"恢复文件存在: {stats['recovery_file_exists']}")
```

### 禁用恢复功能

```python
# 如果不需要恢复功能，可以禁用以提高性能
service = ProcessingService(enable_recovery=False)
result = service.process_excel_file("patents.xlsx", "Claims")
```

## 恢复文件格式

恢复文件采用JSON格式，包含以下信息：

```json
{
  "processing_state": {
    "file_path": "patents.xlsx",
    "column_name": "Claims",
    "sheet_name": "Sheet1",
    "current_cell_index": 50,
    "start_time": 1234567890.0,
    "processed_cells": []
  },
  "claims": [
    {
      "claim_number": 1,
      "claim_type": "independent",
      "claim_text": "一种计算机系统...",
      "language": "zh",
      "referenced_claims": [],
      "original_text": "1. 一种计算机系统...",
      "confidence_score": 0.9
    }
  ],
  "errors": [
    {
      "error_type": "parsing_warning",
      "cell_index": 10,
      "error_message": "格式不规范",
      "suggested_action": "检查文本格式",
      "severity": "warning"
    }
  ],
  "language_distribution": {
    "zh": 45,
    "en": 30
  },
  "timestamp": "2024-01-15T10:30:00"
}
```

## 工作流程

### 正常处理流程

```
开始处理
    ↓
验证输入文件
    ↓
读取Excel数据
    ↓
处理每个单元格
    ↓ (每10个单元格)
保存处理状态 → 写入恢复文件
    ↓
继续处理
    ↓
处理完成
    ↓
清理恢复文件
    ↓
返回结果
```

### 中断恢复流程

```
开始处理 (resume=True)
    ↓
检查恢复文件是否存在
    ↓
    是 → 读取恢复文件
         ↓
         验证参数是否匹配
         ↓
         是 → 恢复处理状态
              ↓
              清理恢复文件
              ↓
              返回恢复的结果
         ↓
         否 → 重新开始处理
    ↓
    否 → 重新开始处理
```

## 最佳实践

### 1. 处理大文件时启用恢复

```python
# 推荐：处理大型Excel文件时启用恢复
service = ProcessingService(enable_recovery=True)
result = service.process_excel_file("large_patents.xlsx", "Claims")
```

### 2. 使用自定义恢复文件路径

```python
# 为不同的处理任务使用不同的恢复文件
service = ProcessingService(
    enable_recovery=True,
    recovery_file=f"recovery_{task_id}.json"
)
```

### 3. 定期检查处理进度

```python
import time
import threading

def monitor_progress(service):
    while True:
        stats = service.get_processing_statistics()
        print(f"当前进度: {stats['current_cell_index']}")
        time.sleep(5)

# 在后台线程中监控进度
service = ProcessingService(enable_recovery=True)
monitor_thread = threading.Thread(target=monitor_progress, args=(service,))
monitor_thread.daemon = True
monitor_thread.start()

result = service.process_excel_file("patents.xlsx", "Claims")
```

### 4. 错误处理

```python
service = ProcessingService(enable_recovery=True)

try:
    result = service.process_excel_file(
        "patents.xlsx", 
        "Claims",
        resume=True
    )
    
    if result.processing_errors:
        print(f"处理完成，但有 {len(result.processing_errors)} 个错误")
        for error in result.processing_errors:
            if error.severity == "critical":
                print(f"严重错误: {error.error_message}")
    
except Exception as e:
    print(f"处理失败: {str(e)}")
    
    # 检查是否有恢复文件
    stats = service.get_processing_statistics()
    if stats['recovery_file_exists']:
        print("检测到恢复文件，可以尝试恢复处理")
```

## 性能考虑

### 保存频率

默认每10个单元格保存一次状态。可以通过修改代码调整保存频率：

```python
# 在 process_excel_file 方法中
if self.enable_recovery and i % 10 == 0:  # 修改这个数字
    self._save_processing_state(all_claims, processing_errors, language_distribution)
```

- 保存频率越高，恢复时丢失的数据越少，但性能开销越大
- 保存频率越低，性能越好，但中断时可能丢失更多数据
- 建议根据单元格处理时间和数据重要性调整

### 恢复文件大小

恢复文件大小取决于已处理的权利要求数量：
- 每个权利要求约 0.5-2 KB
- 1000个权利要求约 0.5-2 MB
- 建议定期清理旧的恢复文件

## 限制和注意事项

### 1. 参数匹配要求

恢复功能要求以下参数完全匹配：
- 文件路径 (file_path)
- 列名 (column_name)
- 工作表名称 (sheet_name)

如果参数不匹配，恢复将被拒绝。

### 2. 文件修改检测

当前版本不检测Excel文件是否被修改。如果在中断后修改了Excel文件，恢复的数据可能不一致。

### 3. 并发处理

恢复功能不支持并发处理同一个文件。如果需要并发处理，请为每个任务使用不同的恢复文件。

### 4. 恢复文件位置

默认恢复文件保存在当前工作目录。在生产环境中，建议指定专门的目录：

```python
service = ProcessingService(
    enable_recovery=True,
    recovery_file="/var/app/recovery/task_123.json"
)
```

## 故障排除

### 问题1: 恢复失败

**症状**: 调用 `resume=True` 但仍然重新处理

**可能原因**:
- 恢复文件不存在
- 恢复文件损坏
- 参数不匹配

**解决方法**:
```python
# 检查恢复文件状态
stats = service.get_processing_statistics()
print(f"恢复文件存在: {stats['recovery_file_exists']}")

# 手动尝试恢复并检查返回值
recovered = service._try_resume_processing(file_path, column_name, sheet_name)
if recovered is None:
    print("恢复失败，检查参数是否匹配")
```

### 问题2: 恢复文件未清理

**症状**: 处理完成后恢复文件仍然存在

**可能原因**:
- 处理过程中发生异常
- 手动中断了处理

**解决方法**:
```python
# 手动清理恢复文件
service._cleanup_recovery_file()

# 或直接删除
import os
if os.path.exists("processing_recovery.json"):
    os.remove("processing_recovery.json")
```

### 问题3: 恢复文件过大

**症状**: 恢复文件占用大量磁盘空间

**可能原因**:
- 处理了大量权利要求
- 保存频率过高

**解决方法**:
- 降低保存频率
- 定期清理旧的恢复文件
- 使用压缩存储（需要修改代码）

## 测试

运行恢复功能测试：

```bash
# 运行所有恢复相关测试
python -m pytest tests/test_processing_service.py -k recovery -v

# 运行演示脚本
python demo_recovery.py
```

## 相关需求

本功能实现了以下需求：

- **需求 7.4**: 当处理过程被中断时，系统应当保存已处理的结果并允许恢复处理

## 技术实现

### 核心方法

1. `_save_processing_state()`: 保存处理状态到JSON文件
2. `_try_resume_processing()`: 尝试从恢复文件恢复处理
3. `_cleanup_recovery_file()`: 清理恢复文件
4. `get_processing_statistics()`: 获取处理统计信息

### 数据序列化

使用自定义的序列化方法确保数据类型正确转换：
- `_claim_to_dict()`: ClaimInfo → Dict
- `_dict_to_claim()`: Dict → ClaimInfo
- `_error_to_dict()`: ProcessingError → Dict
- `_dict_to_error()`: Dict → ProcessingError

## 未来改进

可能的改进方向：

1. **增量恢复**: 只恢复未处理的部分，继续处理剩余单元格
2. **文件变更检测**: 检测Excel文件是否在中断后被修改
3. **压缩存储**: 使用压缩格式减小恢复文件大小
4. **多版本恢复**: 保留多个恢复点，支持回滚到任意位置
5. **分布式恢复**: 支持分布式处理环境中的恢复
6. **恢复文件加密**: 保护敏感数据

## 总结

中断恢复功能为专利权利要求处理系统提供了可靠的容错机制，确保在处理大型文件或不稳定环境中不会丢失处理进度。通过合理配置和使用，可以显著提高系统的可靠性和用户体验。

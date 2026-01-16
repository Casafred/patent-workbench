# 中断恢复功能快速入门

## 5分钟快速上手

### 1. 基本使用（推荐）

```python
from patent_claims_processor.services.processing_service import ProcessingService

# 创建服务（默认启用恢复）
service = ProcessingService(enable_recovery=True)

# 处理文件
result = service.process_excel_file("patents.xlsx", "Claims")

print(f"✓ 处理完成: {result.total_claims_extracted} 个权利要求")
```

### 2. 恢复中断的处理

```python
# 程序重启后
service = ProcessingService(enable_recovery=True)

# 尝试恢复
result = service.process_excel_file(
    "patents.xlsx",
    "Claims",
    resume=True  # 关键：设置为True
)
```

### 3. 禁用恢复（提高性能）

```python
# 处理小文件时可以禁用
service = ProcessingService(enable_recovery=False)
result = service.process_excel_file("small_file.xlsx", "Claims")
```

## 常见问题

### Q: 恢复文件保存在哪里？
A: 默认保存在当前目录的 `processing_recovery.json`

### Q: 多久保存一次？
A: 每处理10个单元格自动保存一次

### Q: 恢复文件会自动删除吗？
A: 是的，处理完成后自动删除

### Q: 如何检查是否有恢复文件？
```python
stats = service.get_processing_statistics()
print(stats['recovery_file_exists'])  # True/False
```

### Q: 恢复失败怎么办？
A: 系统会自动重新处理，不会影响结果

## 运行演示

```bash
# 查看完整演示
python demo_recovery.py

# 运行测试
python -m pytest tests/test_processing_service.py -k recovery -v
```

## 更多信息

详细文档请参考：`RECOVERY_FEATURE.md`

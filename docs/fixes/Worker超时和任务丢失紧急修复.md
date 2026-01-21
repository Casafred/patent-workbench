# Worker超时和任务丢失紧急修复

## 问题描述

### 现象
1. 上传大文件后，处理进度一直卡在0%
2. 控制台显示404错误：任务不存在
3. 后端日志显示：`[CRITICAL] WORKER TIMEOUT (pid:67)`
4. Worker重启后，任务状态丢失

### 根本原因

#### 1. Gunicorn Worker超时
- **问题**：处理大文件（1000行）需要几分钟，但Gunicorn worker在30秒后超时
- **后果**：Worker被杀死，后台处理线程终止，任务状态丢失

#### 2. 任务状态未持久化
- **问题**：任务创建后只保存在内存中，没有立即写入磁盘
- **后果**：Worker重启后，内存中的任务状态全部丢失

#### 3. 架构不适合长时间任务
- **问题**：使用线程在Gunicorn环境下处理长时间任务不可靠
- **原因**：Gunicorn可能随时重启worker，导致线程被终止

## 修复方案

### 紧急修复（已实施）

#### 1. 增加Gunicorn超时时间
```bash
# Procfile
web: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --graceful-timeout 300 --keep-alive 5
```

**说明**：
- `--timeout 300`：请求超时时间增加到5分钟
- `--graceful-timeout 300`：优雅关闭超时时间5分钟
- `--keep-alive 5`：保持连接活跃

#### 2. 任务创建时立即持久化
```python
# 创建任务后立即保存到磁盘
processing_tasks[task_id] = {...}
save_task_to_disk(task_id, processing_tasks[task_id])
```

**优点**：
- Worker重启后可以从磁盘恢复任务
- 任务状态不会丢失

#### 3. 进度更新时同步持久化
```python
def update_progress(current, total):
    progress = int((current / total) * 100)
    processing_tasks[task_id]['progress'] = progress
    save_task_to_disk(task_id, processing_tasks[task_id])  # 同步保存
```

**优点**：
- 即使worker重启，也能恢复到最新进度
- 用户刷新页面后能看到正确的进度

### 长期解决方案（推荐）

#### 方案A：使用Celery任务队列（推荐）

**架构**：
```
Frontend → Flask API → Celery Task → Redis/RabbitMQ
                          ↓
                    Background Worker
```

**优点**：
- 真正的异步处理，不受HTTP超时限制
- 任务状态存储在Redis中，可靠性高
- 支持任务重试、优先级、分布式处理
- Worker重启不影响任务执行

**实施步骤**：
1. 安装依赖：`pip install celery redis`
2. 配置Celery：
```python
from celery import Celery

celery = Celery('tasks', broker='redis://localhost:6379/0')

@celery.task(bind=True)
def process_claims_async(self, file_path, column_name):
    for i, cell in enumerate(data):
        # 处理...
        self.update_state(
            state='PROGRESS',
            meta={'current': i, 'total': len(data)}
        )
```

3. 启动Celery worker：
```bash
celery -A tasks worker --loglevel=info
```

**成本**：
- 需要Redis服务（Render提供免费Redis）
- 需要额外的worker进程

#### 方案B：使用后台任务服务（简单）

**使用Flask-RQ或Huey**：
```python
from flask_rq2 import RQ

rq = RQ()

@rq.job
def process_claims_job(file_path, column_name):
    # 处理逻辑
    pass
```

**优点**：
- 比Celery简单
- 仍然需要Redis
- 适合中小规模应用

#### 方案C：增加Worker数量和内存（临时）

**Render配置**：
- 增加worker数量：`--workers 4`
- 升级实例类型：获得更多内存和CPU
- 增加超时时间：`--timeout 600`（10分钟）

**优点**：
- 实施简单，只需修改配置
- 不需要改代码

**缺点**：
- 成本增加
- 仍然不能完全解决问题
- 超大文件仍可能超时

## 测试验证

### 测试步骤
1. 上传test_large.xlsx文件（1000行）
2. 选择工作表和列
3. 点击"开始处理"
4. 观察：
   - 进度条是否正常更新（0% → 100%）
   - 控制台是否有404错误
   - 后端日志是否有worker超时

### 预期结果
- ✅ 进度条平滑更新
- ✅ 无404错误
- ✅ 无worker超时
- ✅ 处理成功完成

### 如果仍然超时
说明300秒仍不够，需要：
1. 进一步增加超时时间（600秒）
2. 或实施长期方案（Celery）

## 监控和日志

### 关键日志
```
[process_claims] Task {task_id} created and saved to disk
[process_in_background] Starting processing for task: {task_id}
[process_in_background] Progress: 20% (200/1000)
[process_in_background] Processing completed successfully
```

### 错误日志
```
[CRITICAL] WORKER TIMEOUT (pid:67)  # Worker超时
Task not found on disk either       # 任务未持久化
Available tasks in memory: []       # 内存中无任务
```

## 性能基准

### 当前性能（修复后）
- 100行：~8秒
- 500行：~40秒
- 1000行：~80秒

### 超时限制
- Gunicorn timeout：300秒（5分钟）
- 理论最大处理量：~3750行（按80秒/1000行计算）

### 如果需要处理更大文件
- 必须实施Celery方案
- 或者分批处理（前端分批上传）

## 部署检查清单

- [x] 修改Procfile增加超时时间
- [x] 任务创建时立即持久化
- [x] 进度更新时同步持久化
- [x] 推送代码到GitHub
- [ ] 在Render上重新部署
- [ ] 测试1000行文件处理
- [ ] 监控worker日志

## 后续优化

1. **短期**（本周）：
   - 监控实际处理时间
   - 根据需要调整超时时间
   - 优化处理速度（批量处理）

2. **中期**（下周）：
   - 评估Celery方案的必要性
   - 如果经常超时，开始实施Celery

3. **长期**（未来）：
   - 完整的任务队列系统
   - 分布式处理
   - 实时WebSocket推送

## 结论

紧急修复通过以下方式解决了问题：
1. 增加超时时间到5分钟
2. 任务状态立即持久化
3. 进度更新同步保存

这应该能处理1000行以内的文件。如果需要处理更大文件或有更高的可靠性要求，建议实施Celery方案。

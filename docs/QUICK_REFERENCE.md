# 重构快速参考卡片

## 🚀 快速开始

### 当前状态
- ✅ 基础架构完成
- ✅ 认证路由完成
- 🔄 其他路由待创建

### 下一个任务
创建 `backend/routes/chat.py`

---

## 📝 创建新路由模块的标准流程

### 1. 创建文件
```bash
# 创建新的路由文件
touch backend/routes/chat.py
```

### 2. 基本模板
```python
"""
[模块名称] routes.

[模块描述]
"""

from flask import Blueprint, request, jsonify, Response
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client
from backend.utils import create_response

# 创建Blueprint
[name]_bp = Blueprint('[name]', __name__)


@[name]_bp.route('/endpoint', methods=['POST'])
def function_name():
    """
    [功能描述]
    """
    # 验证认证
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    # 获取API客户端
    client, error_response = get_zhipu_client()
    if error_response:
        return error_response
    
    # 业务逻辑
    # ...
    
    return create_response(data=result)
```

### 3. 测试导入
```bash
python -c "from backend.routes.chat import chat_bp; print('✓ OK')"
```

### 4. 更新路由注册
编辑 `backend/routes/__init__.py`:
```python
from .chat import chat_bp

def register_blueprints(app):
    # ...
    app.register_blueprint(chat_bp, url_prefix='/api')
```

### 5. 提交
```bash
git add backend/routes/chat.py
git commit -m "feat: add chat routes module"
```

---

## 🔍 从原app.py提取代码

### 查找路由
```python
# 原代码格式
@app.route('/api/chat', methods=['POST'])
def simple_chat():
    # ...
```

### 转换步骤

1. **改装饰器**
   ```python
   # 从
   @app.route('/api/chat', methods=['POST'])
   
   # 到
   @chat_bp.route('/chat', methods=['POST'])
   # 注意：去掉 /api 前缀，因为注册时会加上
   ```

2. **更新导入**
   ```python
   # 添加
   from backend.middleware import validate_api_request
   from backend.services import get_zhipu_client
   from backend.utils import create_response
   ```

3. **替换函数调用**
   ```python
   # 从
   get_client_from_header()
   
   # 到
   get_zhipu_client()
   ```

---

## 📋 待创建的路由清单

### 优先级 1 (核心功能)
- [ ] `chat.py` - 聊天功能
  - `/stream_chat` - 流式聊天
  - `/chat` - 同步聊天

### 优先级 2 (批处理)
- [ ] `async_batch.py` - 异步批处理
  - `/async_submit`
  - `/async_retrieve`
  - `/upload`
  - `/create_batch`
  - `/check_status`
  - `/download_result`

### 优先级 3 (文件管理)
- [ ] `files.py` - 文件管理
  - `/files/upload`
  - `/files`
  - `/files/<file_id>`
  - `/files/<file_id>/content`

### 优先级 4 (专利功能)
- [ ] `patent.py` - 专利查询
  - `/patent/search`
  - `/patent/analyze`

### 优先级 5 (权利要求)
- [ ] `claims.py` - 权利要求处理
  - `/claims/upload`
  - `/claims/columns`
  - `/claims/process`
  - `/claims/status/<task_id>`
  - `/claims/result/<task_id>`
  - `/claims/export/<task_id>`
  - `/claims/report/<task_id>`

---

## 🧪 测试命令

### 测试单个模块
```bash
python -c "from backend.routes.chat import chat_bp; print('OK')"
```

### 测试所有模块
```bash
python test_refactoring.py
```

### 运行应用（测试用）
```bash
# 暂时还不能运行，需要完成所有路由后
python backend/app.py
```

---

## 🔧 常见问题

### Q: 导入错误怎么办？
```bash
# 检查Python路径
python -c "import sys; print(sys.path)"

# 确保在项目根目录
pwd

# 重新测试
python test_refactoring.py
```

### Q: Blueprint注册失败？
检查 `backend/routes/__init__.py` 中的导入和注册代码

### Q: 路由不工作？
检查URL前缀设置：
```python
app.register_blueprint(chat_bp, url_prefix='/api')
# 这样 @chat_bp.route('/chat') 实际是 /api/chat
```

---

## 📊 进度追踪

### 完成度
- 基础架构: 100% ✅
- 路由拆分: 16% (1/6) 🔄
- 主应用: 0% ⏳
- 前端重构: 0% ⏳
- 文件迁移: 0% ⏳
- 测试验证: 0% ⏳

### 预计时间
- 剩余路由: 4-6小时
- 主应用重构: 2小时
- 测试验证: 4-6小时
- **总计**: 10-14小时

---

## 📞 需要帮助？

### 参考文档
1. `REFACTORING_NEXT_STEPS.md` - 详细步骤
2. `backend/routes/auth.py` - 参考实现
3. `PROJECT_REFACTORING_PLAN.md` - 完整方案

### 检查清单
- [ ] 文件创建在正确位置
- [ ] Blueprint正确创建
- [ ] 导入语句正确
- [ ] 路由装饰器正确
- [ ] 测试通过
- [ ] Git提交

---

## 🎯 今日目标

建议完成：
1. ✅ chat.py
2. ✅ async_batch.py
3. ⏳ files.py

---

**最后更新**: 2026-01-14  
**版本**: v1.0

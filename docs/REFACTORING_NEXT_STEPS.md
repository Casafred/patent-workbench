# 重构下一步指南

## 🎉 当前进度

### 已完成的工作

1. ✅ **目录结构创建完成**
   - backend/, frontend/, docs/, config/, tools/, test_data/
   - 所有子目录已创建

2. ✅ **核心基础模块完成**
   - `backend/config.py` - 配置管理
   - `backend/extensions.py` - Flask扩展初始化
   - `backend/utils/` - 工具函数
   - `backend/services/` - 业务逻辑服务
   - `backend/middleware/` - 认证中间件

3. ✅ **第一个路由模块完成**
   - `backend/routes/auth.py` - 认证路由（登录/登出/应用服务）
   - 所有模块导入测试通过

### 验证结果

```
✓ Config loaded: SECRET_KEY exists = True
✓ Extensions loaded: init_extensions exists = True
✓ Utils loaded: create_response exists = True
✓ Services loaded: AuthService exists = True
✓ Middleware loaded: login_required exists = True
✓ Auth routes loaded: blueprint name = auth
```

---

## 📋 下一步任务清单

### 阶段 2: 继续拆分路由模块

#### 任务 2.1: 创建聊天路由 (chat.py)

**文件**: `backend/routes/chat.py`

**需要提取的路由**:
- `/api/stream_chat` (POST) - 流式聊天
- `/api/chat` (POST) - 同步聊天

**依赖**:
- `backend.middleware.auth_middleware.validate_api_request`
- `backend.services.api_service.get_zhipu_client`

**代码模板**:
```python
"""Chat routes for AI conversation."""

from flask import Blueprint, request, Response, jsonify
import json
from backend.middleware import validate_api_request
from backend.services import get_zhipu_client

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/stream_chat', methods=['POST'])
def stream_chat():
    """Handle streaming chat requests."""
    # 从原app.py的stream_chat函数复制代码
    pass

@chat_bp.route('/chat', methods=['POST'])
def simple_chat():
    """Handle synchronous chat requests."""
    # 从原app.py的simple_chat函数复制代码
    pass
```

#### 任务 2.2: 创建异步批处理路由 (async_batch.py)

**文件**: `backend/routes/async_batch.py`

**需要提取的路由**:
- `/api/async_submit` (POST)
- `/api/async_retrieve` (POST)
- `/api/upload` (POST)
- `/api/create_batch` (POST)
- `/api/check_status` (POST)
- `/api/download_result` (POST)

#### 任务 2.3: 创建文件管理路由 (files.py)

**文件**: `backend/routes/files.py`

**需要提取的路由**:
- `/api/files/upload` (POST)
- `/api/files` (GET)
- `/api/files/<file_id>` (DELETE)
- `/api/files/<file_id>/content` (GET)

#### 任务 2.4: 创建专利查询路由 (patent.py)

**文件**: `backend/routes/patent.py`

**需要提取的路由**:
- `/api/patent/search` (POST)
- `/api/patent/analyze` (POST)

**需要提取的辅助函数**:
- `get_patent_data_reliable()`

#### 任务 2.5: 创建权利要求处理路由 (claims.py)

**文件**: `backend/routes/claims.py`

**需要提取的路由**:
- `/api/claims/upload` (POST)
- `/api/claims/columns` (POST)
- `/api/claims/process` (POST)
- `/api/claims/status/<task_id>` (GET)
- `/api/claims/result/<task_id>` (GET)
- `/api/claims/export/<task_id>` (POST)
- `/api/claims/report/<task_id>` (GET)

**需要提取的全局变量**:
- `processing_tasks` 字典

---

### 阶段 3: 创建新的主应用文件

#### 任务 3.1: 创建 backend/app.py

**目标**: 创建一个简洁的主应用文件，整合所有模块

**代码结构**:
```python
"""
Main Flask application.

This is the new, refactored entry point for the application.
"""

from flask import Flask
from backend.config import Config
from backend.extensions import init_extensions
from backend.routes import register_blueprints
from backend.services.auth_service import AuthService

def create_app(config_class=Config):
    """
    Application factory pattern.
    
    Args:
        config_class: Configuration class to use
    
    Returns:
        Flask application instance
    """
    app = Flask(__name__, 
                static_folder=Config.STATIC_FOLDER,
                static_url_path=Config.STATIC_URL_PATH)
    
    # Load configuration
    app.config.from_object(config_class)
    config_class.init_app(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Initialize database
    AuthService.init_database()
    
    return app


# For development/testing
if __name__ == '__main__':
    app = create_app()
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
```

#### 任务 3.2: 更新根目录的 app.py

**选项 A**: 完全替换（推荐在所有测试通过后）
```python
"""
Application entry point.

This file imports the refactored application.
"""

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    from backend.config import Config
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
```

**选项 B**: 保留原文件，创建 app_new.py 用于测试
- 先创建 `app_new.py` 导入新的应用
- 测试通过后再替换原 `app.py`

---

### 阶段 4: 测试与验证

#### 任务 4.1: 单元测试

为每个新模块创建测试：
```bash
tests/
├── test_config.py
├── test_auth_service.py
├── test_auth_routes.py
├── test_chat_routes.py
└── ...
```

#### 任务 4.2: 集成测试

测试完整的请求流程：
1. 登录流程
2. API调用流程
3. 文件上传流程
4. 专利查询流程

#### 任务 4.3: 手动测试清单

- [ ] 登录功能
- [ ] 登出功能
- [ ] 聊天功能（流式和同步）
- [ ] 异步批处理
- [ ] 文件管理
- [ ] 专利查询
- [ ] 权利要求处理

---

## 🔧 实施建议

### 1. 逐个路由模块创建

**步骤**:
1. 从原 `app.py` 复制相关路由代码
2. 调整导入语句
3. 创建 Blueprint
4. 测试导入
5. 提交 Git

**示例工作流**:
```bash
# 1. 创建chat.py
# 2. 测试
python -c "from backend.routes.chat import chat_bp; print('OK')"
# 3. 提交
git add backend/routes/chat.py
git commit -m "feat: add chat routes module"
```

### 2. 保持原app.py不变

在所有新模块创建并测试通过前，**不要修改原 app.py**。这样可以：
- 随时回滚
- 对比新旧代码
- 确保系统始终可运行

### 3. 渐进式测试

每完成一个模块：
1. 运行导入测试
2. 运行单元测试
3. 手动测试相关功能

### 4. 文档同步更新

每完成一个阶段，更新：
- `REFACTORING_PROGRESS.md`
- `REFACTORING_NEXT_STEPS.md`（本文档）

---

## 📝 代码提取技巧

### 从原app.py提取路由的步骤

1. **定位路由代码**
   ```python
   # 原代码
   @app.route('/api/chat', methods=['POST'])
   def simple_chat():
       # ...
   ```

2. **转换为Blueprint**
   ```python
   # 新代码
   @chat_bp.route('/chat', methods=['POST'])
   def simple_chat():
       # ...
   ```

3. **更新导入**
   ```python
   # 原导入
   from flask import Flask, request, jsonify
   
   # 新导入
   from flask import Blueprint, request, jsonify
   from backend.middleware import validate_api_request
   from backend.services import get_zhipu_client
   ```

4. **替换全局变量引用**
   ```python
   # 原代码
   is_valid, error_response = validate_api_request()
   client, error_response = get_client_from_header()
   
   # 新代码（函数名已在services中定义）
   is_valid, error_response = validate_api_request()
   client, error_response = get_zhipu_client()
   ```

---

## ⚠️ 注意事项

### 1. URL前缀

注册Blueprint时注意URL前缀：
```python
# routes/__init__.py
app.register_blueprint(chat_bp, url_prefix='/api')
```

这样 `@chat_bp.route('/chat')` 实际路径是 `/api/chat`

### 2. 函数名冲突

如果多个Blueprint有同名函数，使用 `endpoint` 参数：
```python
@chat_bp.route('/status', endpoint='chat_status')
def get_status():
    pass

@batch_bp.route('/status', endpoint='batch_status')
def get_status():
    pass
```

### 3. 全局变量

如 `processing_tasks` 这样的全局状态，考虑：
- 移到服务类中
- 使用数据库存储
- 使用Redis等缓存

### 4. 循环导入

避免循环导入：
```python
# ❌ 错误
# config.py imports extensions.py
# extensions.py imports config.py

# ✅ 正确
# config.py 不导入其他模块
# extensions.py 导入 config.py
```

---

## 🎯 成功标准

### 阶段完成标准

**阶段2完成**:
- [ ] 所有路由模块创建完成
- [ ] 所有模块导入测试通过
- [ ] 代码审查通过

**阶段3完成**:
- [ ] 新的 backend/app.py 创建完成
- [ ] 所有Blueprint正确注册
- [ ] 应用可以启动

**阶段4完成**:
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 手动测试清单全部通过
- [ ] 性能测试通过（响应时间不增加）

### 最终验收标准

1. ✅ 所有现有功能正常工作
2. ✅ 所有测试用例通过
3. ✅ 代码结构清晰，易于维护
4. ✅ 文档完整，易于理解
5. ✅ 性能不下降

---

## 📞 需要帮助？

如果在重构过程中遇到问题：

1. **检查导入错误**: 运行 `python test_refactoring.py`
2. **查看原代码**: 对比原 `app.py` 中的实现
3. **参考已完成模块**: 查看 `backend/routes/auth.py` 的实现
4. **查阅文档**: 参考 `PROJECT_REFACTORING_PLAN.md`

---

**最后更新**: 2026-01-14
**当前阶段**: 阶段2 - 路由拆分进行中
**下一个任务**: 创建 `backend/routes/chat.py`

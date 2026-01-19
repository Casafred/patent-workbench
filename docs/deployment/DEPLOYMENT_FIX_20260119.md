# 部署路径修复 - 2026-01-19 (最终版本)

## 问题描述

部署到 Render 时失败，错误信息：
```
python: can't open file '/opt/render/project/src/init_users.py': [Errno 2] No such file or directory
```

## 根本原因

1. Render Web 控制台中的构建命令配置与 render.yaml 不一致
2. 旧的构建命令指向了错误的路径 `/opt/render/project/src/init_users.py`
3. 实际文件位置是 `backend/user_management/init_users.py`

## 最终解决方案

**将用户初始化从构建阶段移到应用启动阶段**，这样可以：
- 避免构建命令路径问题
- 确保每次应用启动时都会检查并初始化用户
- 简化部署配置

## 修复内容

### 1. render.yaml
移除构建命令中的 init_users.py 调用：
```yaml
buildCommand: pip install -r requirements.txt
```

### 2. wsgi.py
在应用启动时自动初始化用户：
```python
from backend.user_management.init_users import init_users

# Initialize users before creating the app
init_users()

# Create the application instance
app = create_app()
```

### 3. backend/user_management/init_users.py
- 使用绝对路径：`SCRIPT_DIR = Path(__file__).parent.absolute()`
- 使用 `USERS_FILE = SCRIPT_DIR / 'users.json'`

### 4. backend/config.py
- 修正 `USERS_FILE` 路径：
  ```python
  USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')
  ```

### 5. backend/user_management/generate_user.py
- 使用绝对路径：`SCRIPT_DIR = Path(__file__).parent.absolute()`

## 验证

本地测试通过：
```bash
# 测试 WSGI 加载
python -c "from wsgi import app; print('Success')"
# ✅ 用户初始化成功
# ✅ 应用启动成功
```

## 部署配置

render.yaml 最终配置：
```yaml
buildCommand: pip install -r requirements.txt
startCommand: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

## 优势

1. **简化构建**：不需要在构建时运行 Python 脚本
2. **自动初始化**：每次应用启动都会检查并初始化用户
3. **避免路径问题**：不依赖构建环境的工作目录
4. **向后兼容**：如果 users.json 已存在，会跳过初始化

## 下一步

1. 提交代码到 Git 仓库
2. 推送到 GitHub
3. Render 会自动触发重新部署
4. 验证部署成功

## 相关文件

- `wsgi.py` - WSGI 入口点（添加用户初始化）
- `backend/user_management/init_users.py` - 用户初始化脚本
- `backend/config.py` - 应用配置
- `render.yaml` - Render 部署配置（简化构建命令）

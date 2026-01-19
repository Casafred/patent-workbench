# 部署路径修复 - 2026-01-19

## 问题描述

部署到 Render 时失败，错误信息：
```
python: can't open file '/opt/render/project/src/init_users.py': [Errno 2] No such file or directory
```

## 根本原因

1. `init_users.py` 使用相对路径 `users.json`，在不同工作目录下会失败
2. `backend/config.py` 中的 `USERS_FILE` 路径指向错误位置
3. `generate_user.py` 也存在相同的路径问题

## 修复内容

### 1. backend/user_management/init_users.py
- 添加 `from pathlib import Path`
- 使用绝对路径：`SCRIPT_DIR = Path(__file__).parent.absolute()`
- 更新 `USERS_FILE = SCRIPT_DIR / 'users.json'`
- 使用 `USERS_FILE.exists()` 替代 `os.path.exists()`

### 2. backend/config.py
- 修复 `USERS_FILE` 路径：
  ```python
  USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')
  ```

### 3. backend/user_management/generate_user.py
- 添加 `from pathlib import Path`
- 使用绝对路径：`SCRIPT_DIR = Path(__file__).parent.absolute()`
- 更新 `USERS_FILE = SCRIPT_DIR / 'users.json'`

## 验证

本地测试通过：
```bash
# 测试 init_users.py
python backend/user_management/init_users.py
# ✅ 成功

# 测试配置加载
python -c "from backend.config import USERS_FILE; print(USERS_FILE)"
# ✅ 路径正确

# 测试应用启动
python -c "from backend.app import create_app; app = create_app(); print('Success')"
# ✅ 应用启动成功
```

## 部署配置

render.yaml 配置正确，无需修改：
```yaml
buildCommand: pip install -r requirements.txt && python backend/user_management/init_users.py
startCommand: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

## 下一步

1. 提交代码到 Git 仓库
2. 推送到 GitHub
3. Render 会自动触发重新部署
4. 验证部署成功

## 相关文件

- `backend/user_management/init_users.py` - 用户初始化脚本
- `backend/user_management/generate_user.py` - 用户管理工具
- `backend/config.py` - 应用配置
- `render.yaml` - Render 部署配置

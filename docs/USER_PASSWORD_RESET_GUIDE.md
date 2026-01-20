# 用户密码重置指南

## 问题诊断

### 为什么密码验证失败？

**根本原因**：`users.json` 文件被添加到了 `.gitignore`，因此不会被提交到 Git 仓库。

```gitignore
# User data
users.json
backend/user_management/users.json
```

这意味着：
1. ✅ **本地开发**：`users.json` 存在，可以正常登录
2. ❌ **部署环境**：`users.json` 不存在或为空，无法登录
3. ❌ **其他开发者**：克隆仓库后没有 `users.json`，无法登录

### 为什么要把 users.json 加入 .gitignore？

这是**安全最佳实践**：
- 防止密码哈希值泄露到公开仓库
- 避免敏感用户信息被提交到版本控制
- 每个环境应该有独立的用户配置

## 解决方案

### 方案 1：使用密码重置脚本（推荐）

我已经创建了一个密码重置脚本，可以快速重置所有用户密码：

```bash
python reset_user_passwords.py
```

**重置后的账号信息**：

| 用户名 | 密码 | 说明 |
|--------|------|------|
| alfred777 | alfred777 | 主账号 |
| fredmate001 | fredmate001 | 测试账号1 |
| fredmate002 | fredmate002 | 测试账号2 |
| test | test123 | 测试账号 |
| test2026 | test2026 | 2026测试账号 |
| admin | admin123 | 管理员账号 |
| demo | demo123 | 演示账号 |

### 方案 2：使用初始化脚本

运行用户初始化脚本：

```bash
python backend/user_management/init_users.py
```

这会创建默认账号：
- 用户名: `admin` / 密码: `admin123`
- 用户名: `demo` / 密码: `demo123`

### 方案 3：手动创建用户

使用 Python 交互式环境：

```python
from werkzeug.security import generate_password_hash
import json

# 创建用户
users = {
    'myuser': generate_password_hash('mypassword')
}

# 保存到文件
with open('backend/user_management/users.json', 'w') as f:
    json.dump(users, f, indent=4)
```

## 部署环境配置

### Render 部署

在 Render 上部署时，需要通过 **Secret Files** 功能上传 `users.json`：

1. 进入 Render Dashboard
2. 选择你的服务
3. 进入 "Environment" 标签
4. 找到 "Secret Files" 部分
5. 添加文件：
   - **Filename**: `backend/user_management/users.json`
   - **Contents**: 粘贴 users.json 的内容

### Vercel 部署

Vercel 不支持文件系统写入，需要改用环境变量或数据库：

**选项 1：使用环境变量**
```bash
# 在 Vercel 环境变量中设置
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt:32768:8:1$...
```

**选项 2：使用数据库**
- 将用户信息存储到 PostgreSQL 或其他数据库
- 修改 `auth_service.py` 从数据库读取用户

### 其他云平台

大多数云平台都支持以下方式之一：
1. **Secret Files** - 上传敏感文件
2. **Environment Variables** - 设置环境变量
3. **Volume Mounts** - 挂载配置文件

## 安全建议

### 开发环境

1. ✅ 使用简单密码方便测试
2. ✅ 保持 `users.json` 在 `.gitignore` 中
3. ✅ 定期运行重置脚本

### 生产环境

1. ⚠️ **立即修改默认密码**
2. ⚠️ **使用强密码**（至少12位，包含大小写字母、数字、特殊字符）
3. ⚠️ **通过 Secret Files 或环境变量管理**
4. ⚠️ **定期更换密码**（每3-6个月）
5. ⚠️ **限制管理员账号数量**

### 密码强度建议

```python
# 生成强密码示例
import secrets
import string

def generate_strong_password(length=16):
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password

# 使用
strong_password = generate_strong_password(20)
print(f"强密码: {strong_password}")
```

## 验证密码是否正确

运行测试脚本验证：

```bash
python test_password_verification.py
```

输出示例：
```
测试密码验证：
  alfred777 / alfred777: ✓ 验证成功
  admin / admin123: ✓ 验证成功
```

## 常见问题

### Q1: 为什么 test2026 可以登录，其他用户不行？

因为 `test2026` 的密码恰好就是 `test2026`，而其他用户的原始密码未知。

### Q2: 如何查看当前有哪些用户？

```bash
python -c "import json; print('\n'.join(json.load(open('backend/user_management/users.json')).keys()))"
```

### Q3: 部署后无法登录怎么办？

1. 检查 `users.json` 是否存在
2. 检查文件路径是否正确
3. 查看应用日志中的警告信息
4. 使用 Secret Files 上传 `users.json`

### Q4: 如何在不同环境使用不同的用户？

**方法 1**：为每个环境创建独立的 `users.json`
```bash
# 开发环境
cp users.dev.json backend/user_management/users.json

# 生产环境
cp users.prod.json backend/user_management/users.json
```

**方法 2**：使用环境变量控制
```python
import os
USERS_FILE = os.environ.get('USERS_FILE', 'backend/user_management/users.json')
```

## 相关文件

- `backend/user_management/users.json` - 用户数据文件
- `backend/services/auth_service.py` - 认证服务
- `backend/routes/auth.py` - 登录路由
- `reset_user_passwords.py` - 密码重置脚本
- `test_password_verification.py` - 密码验证测试

## 总结

**核心要点**：
1. `users.json` 不在 Git 仓库中（安全考虑）
2. 每个环境需要独立配置用户
3. 使用重置脚本快速恢复测试账号
4. 生产环境必须使用强密码
5. 通过 Secret Files 或环境变量管理敏感信息

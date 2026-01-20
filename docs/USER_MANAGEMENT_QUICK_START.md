# 用户名及密码管理系统 - 快速入门指南

## 📋 目录
1. [系统概述](#系统概述)
2. [用户数据存储](#用户数据存储)
3. [管理方式](#管理方式)
4. [在HTML中配置用户信息](#在html中配置用户信息)
5. [常见操作](#常见操作)

---

## 系统概述

当前系统使用基于文件的用户管理方式，用户信息存储在 JSON 文件中，密码使用 Werkzeug 的安全哈希算法加密存储。

### 核心特性
- ✅ 密码加密存储（pbkdf2:sha256 或 scrypt 算法）
- ✅ 可视化用户管理界面
- ✅ 支持多用户管理
- ✅ IP 地址绑定（可选，需要数据库支持）
- ✅ Session 会话管理

---

## 用户数据存储

### 存储位置
```
backend/user_management/users.json
```

### 数据格式
```json
{
    "用户名": "加密后的密码哈希值",
    "alfred777": "pbkdf2:sha256:260000$fdnUdPMZ66ZtD9MY$023f716ea92033d924c7655b12decb78c8cdeec7871529cc0c17d047deafdba5",
    "test": "scrypt:32768:8:1$GQeDlHzYhX3HFqic$e1a2b8c880a99fef41ea9488d7b705f084da697c465dcba2d2cc8ee0498d82929eb76f9485172a8df95a162929a8a2bbe5c3c434c69511f286459219a9ef9ee7"
}
```

### 当前已有用户
根据 `users.json` 文件，系统中已有以下用户：
- `alfred777`
- `fredmate001`
- `fredmate002`
- `test`
- `test2026`

---

## 管理方式

### 方式一：可视化管理界面（推荐）⭐

这是最简单、最直观的管理方式。

#### 访问地址
```
http://localhost:5000/user-management
```

#### 功能特性
1. **查看用户列表** - 实时显示所有用户及其密码哈希值
2. **添加新用户** - 通过表单输入用户名和密码
3. **删除用户** - 点击删除按钮即可移除用户
4. **自动刷新** - 操作完成后自动更新列表

#### 使用步骤
1. 启动应用后，访问 `/user-management` 路径
2. 在"添加新用户"区域填写：
   - 用户名：输入新用户的用户名
   - 密码：输入新用户的密码（明文，系统会自动加密）
3. 点击"添加用户"按钮
4. 系统会自动加密密码并保存到 `users.json`
5. 用户列表会自动刷新显示新用户

#### 界面截图说明
```
┌─────────────────────────────────────────┐
│         用户管理系统                     │
│   实时可视化管理系统用户                 │
├─────────────────────────────────────────┤
│ 用户列表                                 │
│ ┌─────────────────────────────────────┐ │
│ │ alfred777  [删除]                   │ │
│ │ test       [删除]                   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 添加新用户                               │
│ 用户名: [__________]                    │
│ 密码:   [__________]                    │
│ [添加用户] [重置]                        │
└─────────────────────────────────────────┘
```

---

### 方式二：使用 Python 脚本

#### 初始化默认用户
```bash
python backend/user_management/init_users.py
```

这会创建默认用户：
- 用户名: `admin` / 密码: `admin123`
- 用户名: `demo` / 密码: `demo123`

#### 生成新用户
```bash
python backend/user_management/generate_user.py
```

按提示输入用户名和密码，脚本会自动生成加密哈希值。

---

### 方式三：直接编辑 JSON 文件（不推荐）

⚠️ **注意**：直接编辑需要手动生成密码哈希值，容易出错。

#### 生成密码哈希值
```python
from werkzeug.security import generate_password_hash

# 生成密码哈希
password = "your_password"
hash_value = generate_password_hash(password)
print(hash_value)
```

#### 手动编辑 users.json
```json
{
    "新用户名": "生成的哈希值",
    "existing_user": "existing_hash..."
}
```

---

## 在HTML中配置用户信息

### 登录页面配置

登录页面是内嵌在后端代码中的，位于：
```
backend/routes/auth.py
```

#### 登录页面 HTML 模板
登录页面使用 Flask 的 `render_template_string` 渲染，模板定义在 `LOGIN_PAGE_HTML` 变量中。

#### 关键配置点

##### 1. 表单提交地址
```html
<form id="login-form" method="post">
    <input type="text" name="username" placeholder="用户名" required>
    <input type="password" name="password" placeholder="密码" required>
    <button type="submit">登 录</button>
</form>
```

表单会提交到 `/login` 路由（POST 方法）。

##### 2. 认证流程
```python
# backend/routes/auth.py
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # 验证用户名和密码
        if AuthService.verify_credentials(username, password):
            # 设置 session
            session['user'] = username
            return redirect(url_for('auth.serve_app'))
        else:
            return render_template_string(
                LOGIN_PAGE_HTML,
                error="用户名或密码不正确，请重试。"
            )
```

##### 3. 密码验证逻辑
```python
# backend/services/auth_service.py
@staticmethod
def verify_credentials(username, password):
    """验证用户凭据"""
    users = AuthService.load_users()  # 从 users.json 加载
    return username in users and check_password_hash(users.get(username, ""), password)
```

##### 4. 用户信息加载
```python
# backend/services/auth_service.py
@staticmethod
def load_users():
    """从 JSON 文件加载用户"""
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
```

`USERS_FILE` 配置在 `backend/config.py` 中：
```python
USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')
```

---

### 主应用页面用户信息显示

#### 用户信息注入
当用户登录后访问主应用页面 `/app`，系统会自动注入用户信息：

```python
# backend/routes/auth.py
@auth_bp.route('/app')
@login_required
def serve_app():
    """提供主应用页面"""
    # 读取 frontend/index.html
    with open(index_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 获取当前登录用户
    username = session.get('user', '用户')
    
    # 生成用户操作区域 HTML
    user_actions_html = f"""
    <div class="user-actions">
        <span class="user-display">当前用户: <strong>{username}</strong></span>
        <a href="{url_for('auth.logout')}" class="logout-btn">登出</a>
    </div>
    """
    
    # 注入到 <body> 标签后
    html_content = html_content.replace('<body>', f'<body>{user_actions_html}', 1)
    
    return Response(html_content, mimetype='text/html')
```

#### 前端显示效果
用户登录后，页面顶部会显示：
```
当前用户: alfred777  [登出]
```

---

## 常见操作

### 1. 添加新用户

#### 使用可视化界面（推荐）
1. 访问 `http://localhost:5000/user-management`
2. 在"添加新用户"表单中填写：
   - 用户名: `newuser`
   - 密码: `password123`
3. 点击"添加用户"
4. 系统自动保存并刷新列表

#### 使用 Python 代码
```python
from werkzeug.security import generate_password_hash
import json

# 读取现有用户
with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)

# 添加新用户
users['newuser'] = generate_password_hash('password123')

# 保存
with open('backend/user_management/users.json', 'w') as f:
    json.dump(users, f, indent=4)
```

---

### 2. 删除用户

#### 使用可视化界面（推荐）
1. 访问 `http://localhost:5000/user-management`
2. 在用户列表中找到要删除的用户
3. 点击该用户右侧的"删除"按钮
4. 确认删除操作
5. 系统自动更新列表

#### 手动编辑 JSON
直接从 `users.json` 中删除对应的用户条目。

---

### 3. 修改密码

#### 方法一：删除后重新添加
1. 在可视化界面删除旧用户
2. 使用新密码重新添加同名用户

#### 方法二：使用 Python 脚本
```python
from werkzeug.security import generate_password_hash
import json

# 读取用户
with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)

# 修改密码
users['username'] = generate_password_hash('new_password')

# 保存
with open('backend/user_management/users.json', 'w') as f:
    json.dump(users, f, indent=4)
```

---

### 4. 查看所有用户

#### 使用可视化界面
访问 `http://localhost:5000/user-management`，所有用户会自动列出。

#### 使用 Python
```python
import json

with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)
    
for username in users.keys():
    print(f"用户名: {username}")
```

---

### 5. 测试登录

#### 使用浏览器
1. 访问 `http://localhost:5000/login`
2. 输入用户名和密码
3. 点击"登录"
4. 成功后会跳转到主应用页面

#### 使用 curl 测试
```bash
curl -X POST http://localhost:5000/login \
  -d "username=test&password=test123" \
  -c cookies.txt

curl -b cookies.txt http://localhost:5000/app
```

---

## 配置文件说明

### backend/config.py
```python
# 用户文件路径
USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')

# 每个用户最多绑定的 IP 数量
MAX_IPS_PER_USER = 5
```

### backend/user_management/init_users.py
```python
# 默认用户配置
DEFAULT_USERS = {
    'admin': 'admin123',
    'demo': 'demo123'
}
```

修改此文件可以自定义默认用户。

---

## API 接口说明

### 获取用户列表
```
GET /api/users
```

响应：
```json
{
    "success": true,
    "data": {
        "users": [
            {
                "username": "alfred777",
                "password_hash": "pbkdf2:sha256:260000$fdnUdP..."
            }
        ]
    }
}
```

### 添加用户
```
POST /api/users
Content-Type: application/json

{
    "username": "newuser",
    "password": "password123"
}
```

响应：
```json
{
    "success": true,
    "data": {
        "message": "用户 newuser 添加成功"
    }
}
```

### 删除用户
```
DELETE /api/users/{username}
```

响应：
```json
{
    "success": true,
    "data": {
        "message": "用户 username 删除成功"
    }
}
```

---

## 安全建议

1. ✅ **不要在代码中硬编码密码** - 始终使用加密哈希
2. ✅ **定期更换密码** - 特别是默认账户
3. ✅ **限制管理界面访问** - 可以添加额外的认证层
4. ✅ **备份 users.json** - 防止数据丢失
5. ✅ **使用强密码** - 至少 8 位，包含字母、数字和特殊字符

---

## 故障排查

### 问题：无法登录
**检查项**：
1. 确认 `users.json` 文件存在
2. 确认用户名拼写正确
3. 确认密码正确
4. 查看后端日志是否有错误信息

### 问题：用户管理界面无法访问
**检查项**：
1. 确认应用已启动
2. 确认路由已注册（检查 `backend/app.py`）
3. 检查浏览器控制台是否有 JavaScript 错误

### 问题：添加用户失败
**检查项**：
1. 确认 `users.json` 文件有写入权限
2. 确认用户名不重复
3. 查看后端日志错误信息

---

## 总结

当前系统提供了三种用户管理方式：

1. **可视化界面**（推荐）- 最简单直观
2. **Python 脚本** - 适合批量操作
3. **手动编辑** - 不推荐，容易出错

用户信息存储在 `backend/user_management/users.json` 文件中，密码经过安全加密。登录页面内嵌在后端代码中，通过 Flask 路由提供服务。

如需更多帮助，请参考：
- `docs/USER_MANAGEMENT_GUIDE.md` - 详细指南
- `backend/user_management/` - 用户管理模块源码

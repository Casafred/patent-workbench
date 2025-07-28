# 专利分析智能工作台 - 用户认证系统

## 功能概述

此版本增加了完整的用户访问控制功能，包括：
- 用户登录/登出系统
- 6小时会话有效期
- 管理员用户注册和管理
- 完全后端验证，前端不暴露敏感信息
- Render部署兼容

## 🚀 快速开始

### 📖 完整部署指南
详细步骤请参考 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### ⚡ 30秒本地启动
```bash
python start_local.py
```
访问 http://localhost:5000

### 🔑 管理员账户
首次启动时自动创建：
- **用户名**：`admin`
- **密码**：`admin123`（登录后请立即修改）

### 🎯 用户管理方式
**预配置账户模式**（无注册功能）：

#### 推荐方式：管理员后台
1. 管理员登录 http://localhost:5000/admin
2. 批量创建用户账户
3. 线下分发账户信息

#### 命令行工具
```bash
# 批量创建用户
python create_users.py --file users_example.txt

# 创建单个用户
python create_users.py zhangsan user123 false
```

### 🌐 部署到生产环境

#### GitHub + Render一键部署
1. **上传GitHub**（使用Git或GitHub Desktop）
2. **连接Render**（自动部署）
3. **设置环境变量**（详见部署指南）

#### 环境变量模板
复制 `.env.example` 为 `.env`：
```bash
SECRET_KEY=your-secure-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
RENDER=true  # 部署到Render时设置
```

## 使用指南

### 用户登录

1. 访问应用首页会自动跳转到登录页面
2. 使用管理员账户登录
3. 登录后6小时内无需再次登录

### 管理员功能

#### 注册用户
登录后，管理员可以通过API注册新用户：

```bash
curl -X POST https://your-app.com/api/admin/register \
  -H "X-User-Auth: your-session-token" \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "password123", "is_admin": false}'
```

#### 管理用户
- 获取用户列表：`GET /api/admin/users`
- 删除用户：`DELETE /api/admin/users/{user_id}`

### API认证

所有API请求都需要两个认证头：
1. `Authorization: Bearer {zhipuai-api-key}` - 智谱AI API密钥
2. `X-User-Auth: {session-token}` - 用户会话令牌

## 技术架构

### 安全特性
- **密码加密**：使用bcrypt哈希存储
- **会话管理**：6小时有效期，支持滑动过期
- **CSRF保护**：所有请求需要有效会话令牌
- **输入验证**：严格的输入数据清洗和验证
- **访问日志**：记录所有用户访问行为

### 数据库结构
- **用户表**：存储用户名（哈希密码）
- **会话表**：存储会话令牌和过期时间
- **SQLite**：轻量级数据库，适合小用户量

### 文件结构
```
├── app.py              # 主应用文件
├── auth.py             # 认证核心逻辑
├── config.py           # 配置文件
├── login.html          # 登录页面
├── .env.example        # 环境变量示例
├── users.db            # 用户数据库（自动生成）
└── README.md           # 本文档
```

## 注意事项

1. **首次部署**：必须设置 `ADMIN_PASSWORD` 环境变量
2. **安全建议**：
   - 使用强密码
   - 定期更换 `SECRET_KEY`
   - 限制管理员账户使用
3. **用户管理**：建议管理员定期清理不活跃用户
4. **会话清理**：系统会自动清理过期会话

## 故障排除

### 登录问题
- 检查浏览器控制台是否有JavaScript错误
- 确认网络连接正常
- 检查管理员密码是否正确设置

### API访问失败
- 确认两个认证头都已正确设置
- 检查会话是否过期（6小时）
- 验证智谱AI API密钥有效性

### 数据库问题
- 删除 `users.db` 文件可重置用户系统
- 检查文件权限（Linux/macOS）

## 支持

如有问题，请检查浏览器开发者工具的网络标签页，查看具体的错误信息。
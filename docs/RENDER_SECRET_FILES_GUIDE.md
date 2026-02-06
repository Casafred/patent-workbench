# Render Secret Files 配置指南

## ❌ 常见错误：Duplicate keys are not allowed

这个错误通常**不是**因为 JSON 文件内容有问题，而是因为：

### 原因 1：重复添加了 Secret File

在 Render 的 Secret Files 中，**同一个文件路径只能添加一次**。

**检查方法**：
1. 进入 Render Dashboard
2. 选择你的服务
3. Environment → Secret Files
4. 查看是否有多个 `backend/user_management/users.json`

**解决方法**：
- 删除所有重复的条目
- 只保留一个 `backend/user_management/users.json`

### 原因 2：文件路径格式错误

**错误示例**：
```
❌ /backend/user_management/users.json  (开头不要加 /)
❌ ./backend/user_management/users.json (开头不要加 ./)
❌ backend\user_management\users.json   (Windows 路径分隔符)
```

**正确格式**：
```
✅ backend/user_management/users.json
```

## ✅ 正确的配置步骤

### 步骤 1：准备文件内容

```bash
# 方法 A：使用重置脚本
python reset_user_passwords.py

# 方法 B：使用管理界面
# 打开 用户管理.html，点击"下载部署版 users.json"
```

### 步骤 2：验证文件格式

```bash
python validate_users_json.py backend/user_management/users.json
```

应该看到：
```
✅ 文件格式正确，可以上传到 Render
```

### 步骤 3：复制文件内容

**Windows**：
```bash
type backend\user_management\users.json | clip
```

**Linux/Mac**：
```bash
cat backend/user_management/users.json | pbcopy  # Mac
cat backend/user_management/users.json | xclip   # Linux
```

或者直接打开文件复制内容。

### 步骤 4：在 Render 中配置

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. 选择你的服务
3. 点击 **Environment** 标签
4. 滚动到 **Secret Files** 部分

#### 如果是第一次添加：

5. 点击 **Add Secret File**
6. 填写：
   - **Filename**: `backend/user_management/users.json`
   - **Contents**: 粘贴文件内容
7. 点击 **Save Changes**

#### 如果已经存在：

5. 找到现有的 `backend/user_management/users.json`
6. 点击 **Edit** 或 **Delete**
7. 如果删除了，重新添加（参考上面的步骤）
8. 如果编辑，更新内容后保存

### 步骤 5：验证部署

1. 等待服务重新部署（自动触发）
2. 访问你的应用：`https://your-app.onrender.com/login`
3. 使用测试账号登录：
   - 用户名: `admin`
   - 密码: `admin123`

## 📋 完整的 Secret Files 配置示例

### Filename（文件路径）
```
backend/user_management/users.json
```

### Contents（文件内容）
```json
{
    "alfred777": "scrypt:32768:8:1$...",
    "admin": "scrypt:32768:8:1$...",
    "demo": "scrypt:32768:8:1$..."
}
```

**注意**：
- ✅ 使用部署版格式（纯净格式）
- ✅ 确保 JSON 格式正确
- ✅ 不要有重复的用户名
- ✅ 文件路径使用正斜杠 `/`

## 🔍 故障排查

### 问题 1：仍然提示 "Duplicate keys"

**检查清单**：
- [ ] 删除所有旧的 Secret Files
- [ ] 确认只有一个 `backend/user_management/users.json`
- [ ] 文件路径没有前导 `/` 或 `./`
- [ ] 使用正斜杠 `/` 而不是反斜杠 `\`

**解决步骤**：
1. 删除所有 Secret Files
2. 保存更改（触发重新部署）
3. 等待部署完成
4. 重新添加 Secret File
5. 再次保存

### 问题 2：文件上传后无法登录

**可能原因**：
- 文件路径不正确
- 文件内容格式错误
- 密码哈希值损坏

**检查方法**：
1. 查看 Render 日志
2. 搜索 "警告：'users.json' 文件未找到"
3. 如果找到，说明路径不对

**解决方法**：
```bash
# 重新生成文件
python reset_user_passwords.py

# 验证格式
python validate_users_json.py backend/user_management/users.json

# 重新上传
```

### 问题 3：部署后密码不对

**原因**：使用了旧的密码

**解决方法**：
```bash
# 查看当前密码
python reset_user_passwords.py

# 输出会显示所有用户的密码
```

## 📊 Secret Files 最佳实践

### 1. 使用版本注释

在 Render 的 Secret File 描述中添加版本信息：
```
users.json - v3.0 - 更新于 2026-01-20
```

### 2. 本地备份

每次更新前备份：
```bash
cp backend/user_management/users.json backend/user_management/users.json.backup
```

### 3. 测试后再部署

```bash
# 本地测试
python validate_users_json.py backend/user_management/users.json

# 确认无误后再上传
```

### 4. 使用强密码

生产环境不要使用测试密码：
```bash
# 使用管理界面生成强密码
用户管理.html
```

## 🎯 快速修复流程

如果遇到 "Duplicate keys" 错误：

```
1. 进入 Render Dashboard
   ↓
2. Environment → Secret Files
   ↓
3. 删除所有 backend/user_management/users.json
   ↓
4. Save Changes（等待部署）
   ↓
5. Add Secret File
   ↓
6. Filename: backend/user_management/users.json
   ↓
7. Contents: 粘贴文件内容
   ↓
8. Save Changes
   ↓
9. 等待部署完成
   ↓
10. 测试登录
```

## 📞 仍然有问题？

1. **检查 Render 日志**
   - Dashboard → Logs
   - 搜索 "users.json" 或 "警告"

2. **验证本地文件**
   ```bash
   python validate_users_json.py backend/user_management/users.json
   ```

3. **重新生成文件**
   ```bash
   python reset_user_passwords.py
   ```

4. **联系支持**
   - 查看 Render 文档
   - 检查 Render 状态页面

## 相关文档

- [部署配置指南](DEPLOY_WITH_USERS.md)
- [用户管理指南](docs/USER_MANAGEMENT_GUIDE.md)
- [双版本说明](用户管理_双版本说明.md)

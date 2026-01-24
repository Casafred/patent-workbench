# 阿里云用户管理完整指南

> 在阿里云上管理用户账号，比Render更简单更安全

## 📋 用户管理方式对比

### Render方式（复杂）

```
1. 创建users.json
2. 上传到Render Secret Files
3. 通过网页界面配置
4. 重新部署应用
5. 每次修改都要重新上传
```

### 阿里云方式（简单）⭐⭐⭐⭐⭐

```
1. 直接编辑users.json文件
2. 重启应用
3. 完成！
```

---

## 🚀 方式一：使用代码仓库（最推荐）

### 优点

- ✅ 最简单：Git clone自动包含
- ✅ 版本控制：可以追踪修改历史
- ✅ 团队协作：多人可以管理
- ✅ 自动部署：更新代码自动更新用户

### 步骤

**1. 在本地创建users.json**

```bash
# 在你的项目根目录
cd backend/user_management

# 创建users.json
nano users.json
```

**2. 添加用户（两种格式）**

**格式A：简单格式（推荐）**
```json
{
    "admin": "scrypt:32768:8:1$...",
    "user1": "scrypt:32768:8:1$...",
    "user2": "scrypt:32768:8:1$..."
}
```

**格式B：完整格式**
```json
{
    "users": {
        "admin": "scrypt:32768:8:1$...",
        "user1": "scrypt:32768:8:1$...",
        "user2": "scrypt:32768:8:1$..."
    },
    "metadata": {
        "created": "2026-01-24",
        "version": "1.0"
    }
}
```

**3. 生成密码哈希**

```bash
# 方法1：使用Python
python3 << 'EOF'
from werkzeug.security import generate_password_hash
password = input("输入密码: ")
print(generate_password_hash(password))
EOF

# 方法2：使用在线工具
# 访问：https://bcrypt-generator.com/
# 或者使用项目提供的工具
```

**4. 提交到Git**

```bash
# 添加到Git
git add backend/user_management/users.json
git commit -m "添加用户配置"
git push
```

**5. 在服务器上更新**

```bash
# SSH登录服务器
ssh root@你的服务器IP

# 切换到应用用户
su - appuser
cd ~/patent-app

# 拉取最新代码
git pull

# 退出appuser
exit

# 重启应用
systemctl restart patent-app
```

**完成！** ✅

---

## 🔧 方式二：直接在服务器编辑（最快速）

### 优点

- ✅ 最快速：直接修改，立即生效
- ✅ 无需Git：不需要提交代码
- ✅ 适合临时修改

### 步骤

**1. SSH登录服务器**

```bash
ssh root@你的服务器IP
```

**2. 编辑users.json**

```bash
# 切换到应用用户
su - appuser
cd ~/patent-app/backend/user_management

# 编辑文件
nano users.json
```

**3. 添加或修改用户**

```json
{
    "admin": "scrypt:32768:8:1$现有哈希",
    "newuser": "scrypt:32768:8:1$新用户哈希"
}
```

**4. 生成密码哈希**

```bash
# 在服务器上生成
cd ~/patent-app
source venv/bin/activate

python3 << 'EOF'
from werkzeug.security import generate_password_hash
password = input("输入密码: ")
print(generate_password_hash(password))
EOF

# 复制输出的哈希值
# 粘贴到users.json中
```

**5. 保存并重启**

```bash
# 保存文件：Ctrl+X, Y, Enter

# 退出appuser
exit

# 重启应用
systemctl restart patent-app
```

**完成！** ✅

---

## 🔐 方式三：使用环境变量（最安全）

### 优点

- ✅ 最安全：密码不在代码中
- ✅ 灵活：可以随时修改
- ✅ 适合生产环境

### 步骤

**1. 设置环境变量**

```bash
# 编辑.env文件
su - appuser
cd ~/patent-app
nano .env

# 添加
DEFAULT_ADMIN_PASSWORD=你的强密码
DEFAULT_DEMO_PASSWORD=你的强密码

# 保存
```

**2. 删除旧的users.json**

```bash
# 让应用重新生成
rm backend/user_management/users.json
```

**3. 重启应用**

```bash
exit
systemctl restart patent-app
```

**4. 查看生成的密码**

```bash
# 查看日志
journalctl -u patent-app -n 50

# 应该看到：
# "使用环境变量中的密码"
# 或者显示随机生成的密码
```

---

## 👥 用户管理操作

### 添加新用户

**方法1：编辑users.json**

```bash
su - appuser
cd ~/patent-app/backend/user_management
nano users.json

# 添加新用户
{
    "admin": "现有哈希",
    "newuser": "新哈希"  # 添加这行
}

# 保存后重启
exit
systemctl restart patent-app
```

**方法2：使用脚本**

```bash
# 创建添加用户脚本
cat > /root/add_user.sh << 'EOF'
#!/bin/bash
echo "添加新用户"
read -p "用户名: " username
read -sp "密码: " password
echo ""

# 生成哈希
hash=$(python3 -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('$password'))")

# 添加到users.json
su - appuser -c "cd ~/patent-app && python3 << PYEOF
import json
with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)
if isinstance(users, dict) and 'users' in users:
    users['users']['$username'] = '$hash'
else:
    users['$username'] = '$hash'
with open('backend/user_management/users.json', 'w') as f:
    json.dump(users, f, indent=4)
print('用户 $username 已添加')
PYEOF
"

# 重启应用
systemctl restart patent-app
echo "完成！"
EOF

chmod +x /root/add_user.sh

# 使用
/root/add_user.sh
```

### 删除用户

```bash
su - appuser
cd ~/patent-app/backend/user_management
nano users.json

# 删除用户行
{
    "admin": "哈希",
    "olduser": "哈希"  # 删除这行
}

# 保存后重启
exit
systemctl restart patent-app
```

### 修改密码

```bash
# 生成新密码哈希
su - appuser
cd ~/patent-app
source venv/bin/activate

python3 << 'EOF'
from werkzeug.security import generate_password_hash
password = input("输入新密码: ")
print(generate_password_hash(password))
EOF

# 复制哈希值

# 编辑users.json
nano backend/user_management/users.json

# 替换对应用户的哈希值

# 保存后重启
exit
systemctl restart patent-app
```

### 重置所有用户

```bash
# 删除users.json
su - appuser
cd ~/patent-app
rm backend/user_management/users.json

# 重新初始化
python backend/user_management/init_users.py

# 查看新密码
# 会显示在输出中

# 重启应用
exit
systemctl restart patent-app
```

---

## 🔒 安全最佳实践

### 1. 使用强密码

```
✅ 至少12位
✅ 包含大小写字母
✅ 包含数字
✅ 包含特殊字符

❌ 不要使用：
- admin123
- password
- 123456
- 生日、姓名
```

### 2. 定期修改密码

```bash
# 建议每3-6个月修改一次
# 创建提醒
crontab -e
# 添加：
0 9 1 */3 * echo "提醒：该修改密码了" | mail -s "密码提醒" your@email.com
```

### 3. 限制用户数量

```
只创建必要的用户
不要创建测试账号
及时删除离职人员账号
```

### 4. 监控登录活动

```bash
# 查看登录IP
sudo -u postgres psql -d patent_db -c "SELECT * FROM user_ips;"

# 查看异常IP
sudo -u postgres psql -d patent_db -c "
SELECT username, COUNT(*) as ip_count 
FROM user_ips 
GROUP BY username 
HAVING COUNT(*) > 5;
"
```

### 5. 备份用户数据

```bash
# 备份users.json
cp /home/appuser/patent-app/backend/user_management/users.json \
   /home/appuser/backups/users_$(date +%Y%m%d).json

# 备份IP数据
sudo -u postgres pg_dump -d patent_db -t user_ips > \
   /home/appuser/backups/user_ips_$(date +%Y%m%d).sql
```

---

## 🎯 常见场景

### 场景1：首次部署

```bash
# 1. 部署应用（自动创建默认用户）
bash aliyun_auto_deploy.sh

# 2. 查看默认密码
journalctl -u patent-app -n 100 | grep "密码"

# 3. 登录并修改密码
# 访问 http://你的IP
# 使用默认账号登录
# 立即修改密码
```

### 场景2：添加团队成员

```bash
# 1. 为每个成员创建账号
/root/add_user.sh

# 2. 将账号信息发送给成员
# 用户名：xxx
# 密码：xxx
# 访问地址：http://你的IP

# 3. 要求首次登录后修改密码
```

### 场景3：员工离职

```bash
# 1. 删除用户账号
su - appuser
cd ~/patent-app/backend/user_management
nano users.json
# 删除对应用户

# 2. 删除IP记录
sudo -u postgres psql -d patent_db
DELETE FROM user_ips WHERE username = '离职员工';
\q

# 3. 重启应用
exit
systemctl restart patent-app
```

### 场景4：忘记密码

```bash
# 1. 生成新密码
su - appuser
cd ~/patent-app
source venv/bin/activate
python3 -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('新密码'))"

# 2. 更新users.json
nano backend/user_management/users.json
# 替换密码哈希

# 3. 重启应用
exit
systemctl restart patent-app

# 4. 通知用户新密码
```

### 场景5：批量导入用户

```bash
# 创建批量导入脚本
cat > /root/import_users.sh << 'EOF'
#!/bin/bash
# 从CSV文件导入用户
# CSV格式：username,password

CSV_FILE=$1
if [ -z "$CSV_FILE" ]; then
    echo "用法: $0 users.csv"
    exit 1
fi

su - appuser -c "cd ~/patent-app && python3 << PYEOF
import json
import csv
from werkzeug.security import generate_password_hash

# 读取现有用户
with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)

# 读取CSV
with open('$CSV_FILE', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        username, password = row
        users[username] = generate_password_hash(password)
        print(f'添加用户: {username}')

# 保存
with open('backend/user_management/users.json', 'w') as f:
    json.dump(users, f, indent=4)

print('导入完成')
PYEOF
"

systemctl restart patent-app
EOF

chmod +x /root/import_users.sh

# 使用
# 1. 创建users.csv
cat > users.csv << 'EOF'
user1,password1
user2,password2
user3,password3
EOF

# 2. 导入
/root/import_users.sh users.csv
```

---

## 📊 用户管理工具

### 查看所有用户

```bash
su - appuser
cd ~/patent-app
python3 << 'EOF'
import json
with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)
if isinstance(users, dict) and 'users' in users:
    users = users['users']
print("当前用户列表：")
for username in users.keys():
    print(f"  - {username}")
EOF
```

### 统计用户数量

```bash
su - appuser
cd ~/patent-app
python3 -c "import json; users = json.load(open('backend/user_management/users.json')); print(f'用户数量: {len(users) if not isinstance(users, dict) or \"users\" not in users else len(users[\"users\"])}')"
```

### 验证密码

```bash
su - appuser
cd ~/patent-app
source venv/bin/activate

python3 << 'EOF'
import json
from werkzeug.security import check_password_hash

username = input("用户名: ")
password = input("密码: ")

with open('backend/user_management/users.json', 'r') as f:
    users = json.load(f)
if isinstance(users, dict) and 'users' in users:
    users = users['users']

if username in users:
    if check_password_hash(users[username], password):
        print("✅ 密码正确")
    else:
        print("❌ 密码错误")
else:
    print("❌ 用户不存在")
EOF
```

---

## 🆘 故障排查

### 问题1：无法登录

**检查用户是否存在**
```bash
su - appuser
cd ~/patent-app
cat backend/user_management/users.json | grep "用户名"
```

**检查密码哈希格式**
```bash
# 哈希应该以 scrypt: 或 pbkdf2: 开头
# 长度应该很长（100+字符）
```

**重新生成密码**
```bash
# 见上面"修改密码"部分
```

### 问题2：users.json不存在

```bash
# 重新初始化
su - appuser
cd ~/patent-app
python backend/user_management/init_users.py
exit
systemctl restart patent-app
```

### 问题3：修改后不生效

```bash
# 确保重启了应用
systemctl restart patent-app

# 检查日志
tail -f /home/appuser/patent-app/logs/error.log
```

### 问题4：JSON格式错误

```bash
# 验证JSON格式
su - appuser
cd ~/patent-app
python3 -m json.tool backend/user_management/users.json

# 如果有错误，会显示具体位置
# 修复后重启
```

---

## 📝 总结

### 阿里云 vs Render

| 操作 | Render | 阿里云 |
|------|--------|--------|
| 添加用户 | 上传Secret File | 编辑文件 |
| 修改密码 | 重新上传 | 编辑文件 |
| 删除用户 | 重新上传 | 编辑文件 |
| 生效时间 | 需要重新部署 | 重启应用 |
| 难度 | 复杂 | 简单 |

### 推荐方式

1. **开发阶段**：使用方式二（直接编辑）
2. **生产环境**：使用方式一（Git管理）
3. **高安全需求**：使用方式三（环境变量）

### 常用命令

```bash
# 编辑用户
nano /home/appuser/patent-app/backend/user_management/users.json

# 重启应用
systemctl restart patent-app

# 查看用户
cat /home/appuser/patent-app/backend/user_management/users.json

# 生成密码哈希
python3 -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('密码'))"
```

---

**在阿里云上管理用户，比Render简单10倍！** 🎉

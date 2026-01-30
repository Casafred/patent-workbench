# 从GitHub拉取并部署指南

## 方法对比

### 方法1：Git Pull（推荐）✅
**优点**：
- 简单快速，一条命令搞定
- 保持Git历史完整
- 可以轻松回滚
- 适合团队协作

**缺点**：
- 需要先推送到GitHub
- 如果有本地修改会冲突

### 方法2：SCP上传
**优点**：
- 不需要Git
- 可以选择性上传文件

**缺点**：
- 需要多次上传
- 容易遗漏文件
- 不保留Git历史

## 使用Git Pull部署

### 前提条件

1. **本地代码已推送到GitHub**
   ```bash
   git add .
   git commit -m "修复OCR和添加交互式标注"
   git push origin main
   ```

2. **服务器已配置Git远程仓库**
   ```bash
   # 在服务器上检查
   cd /home/appuser/patent-app
   git remote -v
   # 应该看到 origin 指向你的GitHub仓库
   ```

### 快速部署（推荐）

#### Windows上运行：
```batch
从GitHub拉取并部署.bat
```

#### 或者手动执行：
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"
```

### 详细步骤

#### 1. 推送本地代码到GitHub
```bash
# 在本地项目目录
git status
git add .
git commit -m "修复OCR和添加交互式标注"
git push origin main
```

#### 2. 在服务器上拉取代码
```bash
# SSH连接到服务器
ssh root@43.99.101.195

# 进入项目目录
cd /home/appuser/patent-app

# 拉取最新代码
git pull origin main
```

#### 3. 修复权限
```bash
chown -R appuser:appuser /home/appuser/patent-app
```

#### 4. 清除缓存
```bash
find /home/appuser/patent-app -type f -name '*.pyc' -delete
find /home/appuser/patent-app -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null
```

#### 5. 重启服务
```bash
systemctl stop patent-app
pkill -9 -f 'gunicorn.*patent'
systemctl start patent-app
```

#### 6. 验证
```bash
systemctl status patent-app
journalctl -u patent-app -n 50
```

## 常见问题

### Q1: git pull 提示有冲突怎么办？

**情况1：服务器有未提交的修改**
```bash
# 查看修改
cd /home/appuser/patent-app
git status

# 方案A：保存修改到stash
git stash
git pull origin main
git stash pop

# 方案B：放弃服务器修改
git reset --hard HEAD
git pull origin main
```

**情况2：服务器和GitHub都有修改**
```bash
# 强制使用GitHub版本
git fetch origin
git reset --hard origin/main
```

### Q2: 提示权限错误？

```bash
# 修复权限
chown -R appuser:appuser /home/appuser/patent-app

# 或者切换到appuser用户
su - appuser
cd ~/patent-app
git pull origin main
```

### Q3: 提示没有配置远程仓库？

```bash
cd /home/appuser/patent-app

# 查看当前远程仓库
git remote -v

# 如果没有，添加远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 或者修改远程仓库地址
git remote set-url origin https://github.com/你的用户名/你的仓库名.git
```

### Q4: 拉取后服务无法启动？

```bash
# 1. 查看错误日志
journalctl -u patent-app -n 50

# 2. 检查Python环境
ps aux | grep gunicorn
# 应该看到 python3.11

# 3. 检查依赖
cd /home/appuser/patent-app
source venv311/bin/activate
pip list | grep rapidocr

# 4. 手动启动测试
cd /home/appuser/patent-app
source venv311/bin/activate
python app.py
```

## 完整的部署流程

### 本地操作（Windows）

```bash
# 1. 确保代码已保存
git status

# 2. 提交所有修改
git add .
git commit -m "修复OCR和添加交互式标注功能"

# 3. 推送到GitHub
git push origin main

# 4. 运行部署脚本
从GitHub拉取并部署.bat
```

### 服务器操作（如果需要手动）

```bash
# 1. SSH连接
ssh root@43.99.101.195

# 2. 进入项目目录
cd /home/appuser/patent-app

# 3. 拉取代码
git pull origin main

# 4. 修复权限
chown -R appuser:appuser /home/appuser/patent-app

# 5. 清除缓存
find . -type f -name '*.pyc' -delete
find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null

# 6. 重启服务
systemctl restart patent-app

# 7. 查看状态
systemctl status patent-app
```

## 一键命令

### 从本地推送并部署
```bash
git add . && git commit -m "更新" && git push origin main && ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"
```

### 只在服务器上拉取并部署
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && find /home/appuser/patent-app -type f -name '*.pyc' -delete && systemctl stop patent-app && pkill -9 -f 'gunicorn.*patent' && systemctl start patent-app"
```

## 验证部署

```bash
# 1. 查看服务状态
ssh root@43.99.101.195 "systemctl status patent-app"

# 2. 查看最新commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log -1"

# 3. 测试网站
curl http://43.99.101.195

# 4. 查看日志
ssh root@43.99.101.195 "journalctl -u patent-app -n 50"
```

## 最佳实践

1. **每次修改都提交到Git**
   - 便于追踪变更
   - 方便回滚
   - 团队协作

2. **使用有意义的commit信息**
   ```bash
   git commit -m "修复OCR elapse格式化错误"
   git commit -m "添加交互式标注功能"
   ```

3. **部署前先在本地测试**
   - 确保代码无语法错误
   - 测试关键功能

4. **部署后立即验证**
   - 查看服务状态
   - 测试网站功能
   - 查看错误日志

5. **保持服务器代码干净**
   - 不在服务器上直接修改代码
   - 所有修改都通过Git管理

## 回滚方法

如果部署后发现问题，快速回滚：

```bash
# 方法1：回滚到上一个版本
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard HEAD~1 && systemctl restart patent-app"

# 方法2：回滚到指定版本
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard [commit_hash] && systemctl restart patent-app"

# 方法3：使用备份分支
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard backup-ocr-fix-20260130 && systemctl restart patent-app"
```

# 替换 GitHub 仓库代码 - 详细步骤

## 📋 目标

将当前项目代码替换到你的 GitHub 仓库：
`https://github.com/Casafred/patent-workbench`

---

## ⚠️ 重要提示

在开始之前，请确保：
1. 你已经登录 GitHub 账号
2. 你有该仓库的写入权限
3. 已经安装 Git（运行 `git --version` 检查）

---

## 🚀 方法一：直接替换（推荐，最简单）

### 步骤 1：检查当前项目是否已初始化 Git

在当前项目文件夹中打开命令行，运行：

```cmd
git status
```

**如果显示错误（不是 Git 仓库）：**
```cmd
git init
```

**如果已经是 Git 仓库：**
继续下一步。

---

### 步骤 2：连接到你的 GitHub 仓库

```cmd
# 查看当前远程仓库
git remote -v

# 如果没有远程仓库，添加你的 GitHub 仓库
git remote add origin https://github.com/Casafred/patent-workbench.git

# 如果已经有远程仓库但地址不对，更新它
git remote set-url origin https://github.com/Casafred/patent-workbench.git

# 再次确认
git remote -v
```

应该看到：
```
origin  https://github.com/Casafred/patent-workbench.git (fetch)
origin  https://github.com/Casafred/patent-workbench.git (push)
```

---

### 步骤 3：添加所有文件

```cmd
# 添加所有文件到 Git
git add .

# 查看将要提交的文件
git status
```

---

### 步骤 4：提交更改

```cmd
git commit -m "Replace with Patent Analysis Workbench - Complete refactored version"
```

---

### 步骤 5：推送到 GitHub（强制替换）

```cmd
# 强制推送到 main 分支（会完全替换远程仓库的内容）
git push origin main -f
```

**如果提示需要登录：**
- 输入你的 GitHub 用户名
- 输入你的 GitHub Personal Access Token（不是密码）

**如果没有 Personal Access Token：**
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 token
5. 在命令行中使用 token 作为密码

---

### 步骤 6：验证

访问你的 GitHub 仓库：
https://github.com/Casafred/patent-workbench

应该看到所有新文件已经上传。

---

## 🔄 方法二：保留旧代码历史（备份后替换）

如果你想保留旧代码的历史记录：

### 步骤 1：克隆现有仓库到临时文件夹

```cmd
# 在另一个位置克隆你的仓库
cd C:\temp
git clone https://github.com/Casafred/patent-workbench.git patent-workbench-backup
cd patent-workbench-backup
```

---

### 步骤 2：创建备份分支

```cmd
# 创建备份分支
git checkout -b backup-old-version

# 推送备份分支到 GitHub
git push origin backup-old-version
```

现在旧代码已经安全备份在 `backup-old-version` 分支。

---

### 步骤 3：删除所有文件（保留 .git）

```cmd
# 回到 main 分支
git checkout main

# 删除所有文件（Windows）
del /s /q * 2>nul
for /d %x in (*) do @rd /s /q "%x" 2>nul

# 但保留 .git 文件夹（不要删除）
```

---

### 步骤 4：复制新项目文件

将当前项目的所有文件（除了 .git 文件夹）复制到 `patent-workbench-backup` 文件夹。

---

### 步骤 5：提交并推送

```cmd
git add .
git commit -m "Replace with new Patent Analysis Workbench"
git push origin main
```

---

## 🎯 方法三：使用部署脚本（最自动化）

### 步骤 1：配置 Git 远程仓库

在当前项目文件夹中：

```cmd
# 初始化 Git（如果还没有）
git init

# 添加远程仓库
git remote add origin https://github.com/Casafred/patent-workbench.git
```

---

### 步骤 2：运行部署脚本

```cmd
deploy.bat
```

脚本会自动：
- ✅ 检查必需文件
- ✅ 添加所有文件
- ✅ 提交更改
- ✅ 推送到 GitHub

---

## 📝 详细命令流程（完整版）

如果你想一步步手动操作，这是完整的命令序列：

```cmd
# 1. 进入项目文件夹
cd C:\path\to\your\project

# 2. 初始化 Git（如果需要）
git init

# 3. 配置用户信息（如果是第一次使用 Git）
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 4. 添加远程仓库
git remote add origin https://github.com/Casafred/patent-workbench.git

# 5. 查看当前状态
git status

# 6. 添加所有文件
git add .

# 7. 提交
git commit -m "Deploy Patent Analysis Workbench to Render"

# 8. 推送到 GitHub（强制替换）
git push origin main -f

# 如果 main 分支不存在，可能需要先创建
git branch -M main
git push -u origin main -f
```

---

## ❓ 常见问题

### 问题 1：`git push` 提示 "failed to push"

**原因：** 远程仓库有你本地没有的提交

**解决方案 A（推荐）：** 强制推送
```cmd
git push origin main -f
```

**解决方案 B：** 先拉取再推送
```cmd
git pull origin main --allow-unrelated-histories
git push origin main
```

---

### 问题 2：提示需要身份验证

**解决方案：** 使用 Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 生成新 token（勾选 `repo` 权限）
3. 复制 token
4. 在命令行中：
   - 用户名：你的 GitHub 用户名
   - 密码：粘贴 token（不是你的 GitHub 密码）

---

### 问题 3：`git` 命令不存在

**解决方案：** 安装 Git

1. 下载：https://git-scm.com/download/win
2. 安装（使用默认选项）
3. 重新打开命令行
4. 运行 `git --version` 验证

---

### 问题 4：不小心删除了 .git 文件夹

**解决方案：** 重新初始化

```cmd
git init
git remote add origin https://github.com/Casafred/patent-workbench.git
git add .
git commit -m "Initial commit"
git push origin main -f
```

---

### 问题 5：推送后 Render 没有自动部署

**解决方案：**

1. 登录 Render Dashboard
2. 找到你的 Web Service
3. 点击 "Manual Deploy" → "Deploy latest commit"
4. 或者检查 "Settings" → "Build & Deploy" 中的自动部署设置

---

## ✅ 验证步骤

### 1. 检查 GitHub 仓库

访问：https://github.com/Casafred/patent-workbench

应该看到：
- ✅ 所有新文件已上传
- ✅ `wsgi.py` 文件存在
- ✅ `Procfile` 文件存在
- ✅ `render.yaml` 文件存在
- ✅ `backend/` 文件夹存在
- ✅ `frontend/` 文件夹存在

---

### 2. 检查 Render 部署状态

1. 登录 Render Dashboard
2. 找到你的 Web Service
3. 查看 "Events" 标签，应该看到新的部署事件
4. 查看 "Logs" 标签，确认部署成功

---

### 3. 测试应用

访问你的 Render URL，例如：
```
https://patent-workbench.onrender.com
```

应该看到登录页面。

---

## 🎯 推荐操作流程（最简单）

```cmd
# 1. 在当前项目文件夹打开命令行

# 2. 运行以下命令
git init
git remote add origin https://github.com/Casafred/patent-workbench.git
git add .
git commit -m "Deploy Patent Analysis Workbench"
git branch -M main
git push -u origin main -f

# 3. 输入 GitHub 用户名和 Personal Access Token

# 4. 等待推送完成

# 5. 访问 GitHub 仓库验证
```

---

## 📞 需要帮助？

如果遇到问题：

1. **检查错误信息**：仔细阅读命令行的错误提示
2. **查看 Git 状态**：运行 `git status` 了解当前状态
3. **查看远程仓库**：运行 `git remote -v` 确认仓库地址
4. **重新开始**：如果搞乱了，可以删除 `.git` 文件夹重新开始

---

## 🎉 完成！

代码推送成功后：

1. ✅ GitHub 仓库已更新
2. ✅ Render 会自动检测更新并重新部署
3. ✅ 等待 3-5 分钟部署完成
4. ✅ 访问你的 Render URL 测试

**下一步：** 访问你的 Render URL，登录后在页面中配置 API Key

---

**祝操作顺利！** 🚀

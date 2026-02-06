# 阿里云服务器同步到GitHub指南

## 📋 使用场景

当你的阿里云服务器运行正常，但GitHub代码没有同步时，使用此方法将服务器代码同步到GitHub。

## 🎯 目标

- ✅ 保持阿里云服务器的所有配置和代码
- ✅ 将GitHub仓库更新为与服务器完全一致
- ✅ 避免任何代码冲突
- ✅ 确保未来可以从GitHub部署到其他环境

## 🚀 快速开始

### 方法一：安全同步（推荐）⭐⭐⭐⭐⭐

**特点：** 先查看差异，再决定是否推送

**步骤：**
1. 双击运行 `安全同步阿里云到GitHub.bat`
2. 输入服务器密码
3. 查看文件差异
4. 确认后覆盖本地文件
5. 推送到GitHub

**优点：**
- 可以先查看有哪些不同
- 自动备份本地文件
- 更加安全可控

### 方法二：强制同步

**特点：** 直接覆盖，不询问差异

**步骤：**
1. 双击运行 `强制同步阿里云到GitHub.bat`
2. 输入 `YES` 确认
3. 输入服务器密码
4. 等待完成

**优点：**
- 速度快
- 适合确定要完全覆盖的情况

## 📝 详细步骤说明

### 准备工作

1. **确认服务器运行正常**
   ```bash
   # SSH登录服务器
   ssh root@43.99.101.195
   
   # 检查服务状态
   systemctl status patent-app
   
   # 测试访问
   curl http://localhost:5001
   ```

2. **确认本地Git状态**
   ```bash
   # 查看当前分支
   git branch
   
   # 查看未提交的更改
   git status
   ```

3. **备份重要数据**（可选）
   - 脚本会自动备份，但你也可以手动备份重要文件

### 执行同步

#### 使用安全同步脚本

```batch
# 1. 运行脚本
安全同步阿里云到GitHub.bat

# 2. 测试连接
# 脚本会自动测试SSH连接

# 3. 下载文件
# 从服务器下载所有代码文件

# 4. 查看差异
# 对比本地和服务器的关键文件
# 可选：查看详细差异报告

# 5. 覆盖文件
# 输入 YES 确认覆盖

# 6. 推送到GitHub
# 输入 YES 确认推送
```

#### 使用强制同步脚本

```batch
# 1. 运行脚本
强制同步阿里云到GitHub.bat

# 2. 确认操作
# 输入 YES 确认

# 3. 等待完成
# 脚本自动完成所有步骤
```

### 验证同步结果

1. **检查GitHub**
   - 访问你的GitHub仓库
   - 查看最新提交时间
   - 确认提交信息

2. **检查本地文件**
   ```bash
   # 查看Git状态
   git status
   
   # 查看最新提交
   git log -1
   
   # 查看远程状态
   git remote -v
   ```

3. **测试功能**
   - 如果有测试环境，从GitHub重新部署
   - 验证所有功能正常

## 🔧 脚本功能说明

### 安全同步脚本功能

1. **连接测试**
   - 测试SSH连接是否正常
   - 验证服务器可访问性

2. **文件下载**
   - 从服务器打包所有代码
   - 排除不必要的文件（.git, venv, logs等）
   - 下载到本地

3. **差异对比**
   - 对比关键文件
   - 生成差异报告
   - 让你决定是否继续

4. **本地备份**
   - 自动备份当前文件
   - 备份目录：`backup_YYYYMMDD_HHMMSS`

5. **文件覆盖**
   - 用服务器文件覆盖本地
   - 保持目录结构

6. **Git提交**
   - 添加所有更改
   - 生成详细提交信息
   - 推送到GitHub

### 强制同步脚本功能

与安全同步类似，但：
- 跳过差异对比
- 直接覆盖
- 使用 `--force` 推送

## ⚠️ 注意事项

### 重要提醒

1. **确认服务器状态**
   - 确保阿里云服务器运行正常
   - 确认所有功能都已验证
   - 不要同步有问题的代码

2. **备份重要数据**
   - 脚本会自动备份
   - 但建议手动备份重要配置

3. **检查.env文件**
   - .env文件不会被同步（已排除）
   - 需要手动管理环境变量

4. **大文件处理**
   - uploads目录不会被同步
   - logs目录不会被同步
   - 这些是运行时数据

### 排除的文件和目录

脚本会自动排除以下内容：
- `.git` - Git仓库数据
- `venv` - Python虚拟环境
- `__pycache__` - Python缓存
- `*.pyc` - Python编译文件
- `node_modules` - Node.js依赖
- `uploads/*` - 上传的文件
- `logs/*` - 日志文件
- `.env` - 环境变量（包含密钥）
- `*.log` - 日志文件

## 🆘 故障排查

### 问题1：SSH连接失败

**错误信息：** `Connection refused` 或 `Connection timeout`

**解决方案：**
```bash
# 1. 检查服务器IP
ping 43.99.101.195

# 2. 检查SSH服务
ssh -v root@43.99.101.195

# 3. 检查防火墙
# 确保22端口开放
```

### 问题2：文件下载失败

**错误信息：** `scp: command not found` 或下载中断

**解决方案：**
1. 确保安装了Git Bash或OpenSSH
2. 检查网络连接
3. 尝试手动下载：
   ```bash
   scp root@43.99.101.195:/tmp/patent-sync.tar.gz ./
   ```

### 问题3：Git推送失败

**错误信息：** `rejected` 或 `non-fast-forward`

**解决方案：**
```bash
# 方法1：强制推送（覆盖远程）
git push origin main --force

# 方法2：先拉取再推送
git pull origin main --rebase
git push origin main
```

### 问题4：文件权限问题

**错误信息：** `Permission denied`

**解决方案：**
```bash
# 在服务器上检查文件权限
ssh root@43.99.101.195 "ls -la /home/appuser/patent-app"

# 修复权限
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app"
```

## 📊 同步内容清单

### 会被同步的内容

- ✅ 所有Python代码（backend/）
- ✅ 所有前端代码（frontend/）
- ✅ JavaScript文件（js/）
- ✅ 配置文件（config/）
- ✅ 依赖列表（requirements.txt）
- ✅ 文档文件（docs/）
- ✅ 脚本文件（scripts/）
- ✅ 测试文件（tests/）

### 不会被同步的内容

- ❌ Git历史（.git/）
- ❌ 虚拟环境（venv/）
- ❌ Python缓存（__pycache__/）
- ❌ 上传文件（uploads/）
- ❌ 日志文件（logs/）
- ❌ 环境变量（.env）
- ❌ Node模块（node_modules/）

## 🔄 定期同步建议

### 何时需要同步

1. **重大功能更新后**
   - 在服务器上测试通过
   - 准备部署到其他环境

2. **修复重要Bug后**
   - 确认修复有效
   - 需要记录到版本历史

3. **配置文件更改后**
   - 更新了依赖包
   - 修改了配置文件

4. **定期备份**
   - 建议每周同步一次
   - 作为代码备份

### 同步流程建议

```
1. 在服务器上开发/修复
   ↓
2. 在服务器上测试验证
   ↓
3. 确认功能正常
   ↓
4. 运行同步脚本
   ↓
5. 推送到GitHub
   ↓
6. 在GitHub上查看确认
```

## 📞 获取帮助

### 相关文档

- [阿里云部署指南](ALIYUN_DEPLOYMENT_README.md)
- [阿里云更新指南](阿里云更新指南.md)
- [故障排查手册](docs/deployment/TROUBLESHOOTING_GUIDE.md)

### 手动同步方法

如果脚本无法使用，可以手动同步：

```bash
# 1. SSH登录服务器
ssh root@43.99.101.195

# 2. 打包代码
cd /home/appuser/patent-app
tar czf ~/patent-backup.tar.gz --exclude='.git' --exclude='venv' .

# 3. 退出SSH
exit

# 4. 下载到本地
scp root@43.99.101.195:~/patent-backup.tar.gz ./

# 5. 解压覆盖
tar -xzf patent-backup.tar.gz

# 6. 提交推送
git add -A
git commit -m "从阿里云同步"
git push origin main
```

## ✅ 检查清单

同步前检查：
- [ ] 阿里云服务器运行正常
- [ ] 所有功能已测试通过
- [ ] 本地Git状态干净
- [ ] 已备份重要数据

同步后检查：
- [ ] GitHub显示最新提交
- [ ] 提交时间正确
- [ ] 文件内容正确
- [ ] 可以从GitHub克隆部署

---

**准备好了吗？选择一个脚本开始同步吧！** 🚀

**推荐：** 首次使用建议选择"安全同步"，熟悉后可以使用"强制同步"。

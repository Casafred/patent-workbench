# 阿里云服务器回退指南

**服务器**: 43.99.101.195  
**项目路径**: /home/appuser/patent-app  
**服务名称**: patent-app

---

## 🚀 快速回退（推荐）

### 方法1: 使用自动化脚本

#### Windows用户:
```cmd
scripts\aliyun_rollback.bat
```

#### Linux/Mac用户:
```bash
bash scripts/aliyun_rollback.sh
```

**功能**:
- ✅ 自动创建紧急备份分支
- ✅ 回退到上一个版本
- ✅ 自动重启服务
- ✅ 验证服务状态

---

### 方法2: 回退到指定版本

#### 先查看提交历史
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --oneline -10"
```

输出示例:
```
6f1a40a (HEAD -> main) refactor: 完成模块化
adcfb8a chore: 整理项目结构
23bada0 refactor: 提取API模块
906fa67 feat(功能八): 智能重新处理
988a968 fix(功能八): 优化重新处理
```

#### 回退到指定commit

**Windows**:
```cmd
scripts\aliyun_rollback.bat adcfb8a
```

**Linux/Mac**:
```bash
bash scripts/aliyun_rollback.sh adcfb8a
```

---

## 🔧 手动回退（高级）

### 一键回退命令

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git branch emergency-backup-$(date +%Y%m%d-%H%M%S) && git reset --hard HEAD~1 && systemctl restart patent-app && systemctl status patent-app"
```

### 分步回退

#### 步骤1: SSH登录
```bash
ssh root@43.99.101.195
```

#### 步骤2: 进入项目目录
```bash
cd /home/appuser/patent-app
```

#### 步骤3: 查看当前状态
```bash
# 查看当前commit
git log -1

# 查看最近10个commit
git log --oneline -10

# 查看当前分支
git branch
```

#### 步骤4: 创建备份分支（重要！）
```bash
# 创建带时间戳的备份分支
git branch emergency-backup-$(date +%Y%m%d-%H%M%S)

# 验证备份分支已创建
git branch | grep emergency-backup
```

#### 步骤5: 执行回退

**回退到上一个版本**:
```bash
git reset --hard HEAD~1
```

**回退到指定版本**:
```bash
# 替换 adcfb8a 为你想回退到的commit hash
git reset --hard adcfb8a
```

**回退到特定日期**:
```bash
# 回退到2天前
git reset --hard @{2.days.ago}

# 回退到指定日期
git reset --hard 'master@{2026-02-06 12:00:00}'
```

#### 步骤6: 重启服务
```bash
systemctl restart patent-app
```

#### 步骤7: 验证服务状态
```bash
# 查看服务状态
systemctl status patent-app

# 查看错误日志
tail -f /home/appuser/patent-app/logs/error.log

# 测试服务响应
curl http://localhost:5001
```

---

## 🔍 查找回退点

### 查看提交历史

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --oneline -20"
```

### 查看详细提交信息

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log -5"
```

### 查看特定文件的修改历史

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --follow -- frontend/index.html"
```

### 查看reflog（找回"丢失"的commit）

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reflog"
```

---

## 🎯 常见回退场景

### 场景1: 刚部署完发现问题

**问题**: 刚拉取了新代码，服务无法启动

**解决**:
```bash
# 立即回退到上一个版本
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard HEAD~1 && systemctl restart patent-app"
```

---

### 场景2: 回退到昨天的版本

**问题**: 今天的更新有问题，想回到昨天

**解决**:
```bash
# 查看昨天的commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --since='yesterday' --until='today' --oneline"

# 回退到昨天最后一个commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard @{yesterday} && systemctl restart patent-app"
```

---

### 场景3: 回退到特定功能之前

**问题**: 某个功能引入了bug，想回到该功能之前

**解决**:
```bash
# 1. 查找该功能的commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --grep='功能八' --oneline"

# 2. 找到该功能之前的commit hash（例如: abc1234）

# 3. 回退到该commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard abc1234 && systemctl restart patent-app"
```

---

### 场景4: 回退到特定标签

**问题**: 想回退到某个发布版本

**解决**:
```bash
# 1. 查看所有标签
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git tag"

# 2. 回退到指定标签（例如: v1.0.0）
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard v1.0.0 && systemctl restart patent-app"
```

---

## 🔄 撤销回退（恢复）

### 场景: 回退错了，想恢复

#### 方法1: 使用备份分支

```bash
# 1. SSH登录
ssh root@43.99.101.195

# 2. 进入项目目录
cd /home/appuser/patent-app

# 3. 查看所有备份分支
git branch | grep emergency-backup

# 4. 切换到备份分支
git checkout emergency-backup-20260207-143022

# 5. 重启服务
systemctl restart patent-app
```

#### 方法2: 使用reflog

```bash
# 1. SSH登录
ssh root@43.99.101.195

# 2. 进入项目目录
cd /home/appuser/patent-app

# 3. 查看reflog
git reflog

# 输出示例:
# 6f1a40a HEAD@{0}: reset: moving to HEAD~1
# adcfb8a HEAD@{1}: pull: Fast-forward
# 23bada0 HEAD@{2}: commit: refactor: 提取API模块

# 4. 恢复到回退前的状态（例如: adcfb8a）
git reset --hard adcfb8a

# 5. 重启服务
systemctl restart patent-app
```

---

## 📊 回退前检查清单

在执行回退前，请确认：

- [ ] 已确认当前版本有问题
- [ ] 已知道要回退到哪个版本
- [ ] 已创建备份分支或记录当前commit hash
- [ ] 已通知团队成员（如果是团队项目）
- [ ] 已准备好验证回退后的功能

---

## 🛡️ 安全回退最佳实践

### 1. 始终创建备份分支

```bash
# 在回退前执行
git branch emergency-backup-$(date +%Y%m%d-%H%M%S)
```

### 2. 记录当前commit hash

```bash
# 保存当前commit到文件
git log -1 --format="%H" > /tmp/last-commit-before-rollback.txt
```

### 3. 验证回退结果

```bash
# 回退后立即验证
systemctl status patent-app
tail -f /home/appuser/patent-app/logs/error.log
curl http://localhost:5001
```

### 4. 通知相关人员

回退后应该：
- 通知团队成员
- 记录回退原因
- 更新部署文档

---

## 🚨 紧急回退（一键命令）

### 回退到上一个版本（最快）

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard HEAD~1 && systemctl restart patent-app"
```

### 回退到rollback-point-20260207（如果存在）

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git checkout rollback-point-20260207 && systemctl restart patent-app"
```

### 回退到最近的稳定标签

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git describe --tags --abbrev=0 | xargs git reset --hard && systemctl restart patent-app"
```

---

## 📝 回退后验证步骤

### 1. 检查服务状态

```bash
ssh root@43.99.101.195 "systemctl status patent-app"
```

### 2. 检查错误日志

```bash
ssh root@43.99.101.195 "tail -50 /home/appuser/patent-app/logs/error.log"
```

### 3. 测试网站访问

```bash
# 测试本地访问
ssh root@43.99.101.195 "curl -I http://localhost:5001"

# 在浏览器访问
# https://ipx.asia
```

### 4. 测试核心功能

- [ ] 登录功能
- [ ] 文件上传
- [ ] 专利查询
- [ ] 聊天功能
- [ ] 各个标签页切换

---

## 💡 故障排查

### 问题1: 回退后服务无法启动

**可能原因**:
- 依赖包版本不匹配
- 数据库结构变化
- 配置文件缺失

**解决方案**:
```bash
# 1. 重新安装依赖
ssh root@43.99.101.195 "cd /home/appuser/patent-app && pip install -r requirements.txt"

# 2. 检查配置文件
ssh root@43.99.101.195 "cd /home/appuser/patent-app && ls -la .env"

# 3. 查看详细错误
ssh root@43.99.101.195 "journalctl -u patent-app -n 100"
```

---

### 问题2: 回退后功能异常

**可能原因**:
- 数据库数据与代码不匹配
- 缓存问题
- 静态文件未更新

**解决方案**:
```bash
# 1. 清除缓存
ssh root@43.99.101.195 "cd /home/appuser/patent-app && find . -type d -name '__pycache__' -exec rm -rf {} +"

# 2. 重启Nginx
ssh root@43.99.101.195 "systemctl restart nginx"

# 3. 清除浏览器缓存
# Ctrl+Shift+Delete
```

---

### 问题3: 找不到要回退的版本

**解决方案**:
```bash
# 使用reflog查找所有历史
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reflog --all"

# 查找特定日期的commit
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git log --since='2026-02-01' --until='2026-02-07' --oneline"
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志**:
   ```bash
   ssh root@43.99.101.195 "tail -100 /home/appuser/patent-app/logs/error.log"
   ```

2. **查看系统日志**:
   ```bash
   ssh root@43.99.101.195 "journalctl -u patent-app -n 100"
   ```

3. **检查Git状态**:
   ```bash
   ssh root@43.99.101.195 "cd /home/appuser/patent-app && git status && git log -5"
   ```

---

## 📚 相关文档

- `docs/deployment/DEPLOYMENT_SAFETY_GUIDE_20260207.md` - 部署安全指南
- `docs/deployment/EMERGENCY_PATH_FIX_20260207.md` - 紧急路径修复
- `docs/阿里云回滚指南.md` - 原始回滚指南

---

**文档版本**: 2.0  
**最后更新**: 2026-02-07  
**维护者**: 项目团队


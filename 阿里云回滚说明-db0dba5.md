# 阿里云回滚说明 - 回滚到 db0dba5 之前

## 当前状态

- 最新commit: `db0dba5 修复OCR识别问题 - RapidOCR返回格式处理`
- 这个commit包含了OCR的重要修复
- 你想回滚到这个commit之前的版本

## 安全回滚步骤

### 方法1：使用自动脚本（推荐）

在Windows上运行：
```batch
执行阿里云回滚.bat
```

这个脚本会：
1. 自动创建备份分支 `backup-ocr-fix-20260130`
2. 回滚到 `db0dba5` 之前的版本
3. 修复文件权限
4. 重启服务

### 方法2：手动执行（更安全）

在服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd /home/appuser/patent-app

# 2. 创建备份分支（保存OCR修复）
git branch backup-ocr-fix-20260130

# 3. 查看更多提交历史
git log --oneline -20

# 4. 回滚到上一个版本
git reset --hard HEAD~1

# 5. 查看当前版本
git log -1

# 6. 修复权限
chown -R appuser:appuser /home/appuser/patent-app

# 7. 重启服务
systemctl restart patent-app

# 8. 查看服务状态
systemctl status patent-app
```

## 回滚后的影响

### 会丢失的功能
- ❌ OCR的elapse格式化修复
- ❌ OCR的置信度转换修复
- ❌ 交互式标注功能（如果在这个commit中）

### 不会丢失的内容
- ✅ Python 3.11 虚拟环境（venv311）
- ✅ systemd服务配置
- ✅ 用户数据（users.json）
- ✅ 上传的文件

## 如果回滚错了，如何恢复

### 方法1：恢复到备份分支
```bash
cd /home/appuser/patent-app
git reset --hard backup-ocr-fix-20260130
systemctl restart patent-app
```

### 方法2：使用reflog恢复
```bash
cd /home/appuser/patent-app
git reflog
# 找到 db0dba5 对应的记录
git reset --hard db0dba5
systemctl restart patent-app
```

## 验证回滚是否成功

```bash
# 1. 查看当前commit（应该不是 db0dba5）
cd /home/appuser/patent-app
git log -1

# 2. 查看服务状态
systemctl status patent-app

# 3. 测试网站
curl http://localhost:5000

# 4. 查看日志
journalctl -u patent-app -n 50
```

## 重要提示

1. **备份分支已创建**：`backup-ocr-fix-20260130` 保存了OCR修复
2. **随时可以恢复**：如果发现回滚错了，立即执行恢复命令
3. **Python 3.11环境保留**：虚拟环境不受Git影响
4. **数据不会丢失**：用户数据和上传文件都安全

## 快速命令参考

```bash
# 查看当前版本
cd /home/appuser/patent-app && git log -1

# 查看所有分支
git branch -a

# 恢复到OCR修复版本
git reset --hard backup-ocr-fix-20260130 && systemctl restart patent-app

# 查看服务日志
journalctl -u patent-app -f
```

## 下一步

回滚后，如果发现某些功能不正常：
1. 先确认是否是OCR相关功能
2. 如果是，可以选择性恢复OCR修复的文件
3. 或者直接恢复到备份分支

## 选择性恢复文件

如果只想恢复OCR修复，不要其他修改：

```bash
cd /home/appuser/patent-app

# 只恢复OCR相关文件
git checkout backup-ocr-fix-20260130 -- backend/utils/ocr_utils.py
git checkout backup-ocr-fix-20260130 -- js/drawingMarkerInteractive.js
git checkout backup-ocr-fix-20260130 -- frontend/index.html

# 重启服务
systemctl restart patent-app
```

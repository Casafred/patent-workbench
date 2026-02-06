# 升级Python到3.8完整指南

## 🎯 为什么升级？

- ✅ 支持最新的RapidOCR
- ✅ 更好的性能和安全性
- ✅ 支持更多现代Python库
- ✅ Python 3.6已停止支持（2021年12月）

## 📋 升级步骤（10-15分钟）

### 步骤1: 检查系统版本

```bash
ssh root@43.99.101.195 "cat /etc/os-release"
```

### 步骤2: 安装Python 3.8

#### CentOS 7/8 (阿里云常用)

```bash
# 安装EPEL仓库
ssh root@43.99.101.195 "yum install -y epel-release"

# 安装Python 3.8
ssh root@43.99.101.195 "yum install -y python38 python38-pip python38-devel"

# 验证安装
ssh root@43.99.101.195 "python3.8 --version"
```

#### Ubuntu/Debian

```bash
# 更新包列表
ssh root@43.99.101.195 "apt-get update"

# 安装Python 3.8
ssh root@43.99.101.195 "apt-get install -y python3.8 python3.8-pip python3.8-dev python3.8-venv"

# 验证安装
ssh root@43.99.101.195 "python3.8 --version"
```

### 步骤3: 创建Python 3.8虚拟环境

```bash
# 进入应用目录并创建虚拟环境
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.8 -m venv venv38'"

# 激活虚拟环境并安装依赖
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv38/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && deactivate'"
```

### 步骤4: 修改应用启动配置

#### 方法A: 修改systemd服务（推荐）

```bash
# 查看当前服务配置
ssh root@43.99.101.195 "systemctl cat patent-app"

# 编辑服务配置
ssh root@43.99.101.195 "systemctl edit --full patent-app"
```

修改`ExecStart`行为：
```ini
[Service]
ExecStart=/home/appuser/patent-app/venv38/bin/python /home/appuser/patent-app/app.py
# 或
ExecStart=/home/appuser/patent-app/venv38/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

保存后：
```bash
ssh root@43.99.101.195 "systemctl daemon-reload"
```

#### 方法B: 修改启动脚本

如果使用启动脚本，修改脚本中的Python路径：
```bash
#!/bin/bash
cd /home/appuser/patent-app
source venv38/bin/activate
python app.py
```

### 步骤5: 重启应用

```bash
ssh root@43.99.101.195 "systemctl restart patent-app"
```

### 步骤6: 验证

```bash
# 查看应用状态
ssh root@43.99.101.195 "systemctl status patent-app"

# 查看应用使用的Python版本
ssh root@43.99.101.195 "ps aux | grep python | grep patent"

# 查看日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -30 logs/error.log'"
```

## 🚀 一键升级脚本

### CentOS版本

```bash
# 1. 安装Python 3.8
ssh root@43.99.101.195 "yum install -y epel-release && yum install -y python38 python38-pip python38-devel"

# 2. 创建虚拟环境
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.8 -m venv venv38'"

# 3. 安装依赖
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv38/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && deactivate'"

# 4. 备份旧服务配置
ssh root@43.99.101.195 "cp /etc/systemd/system/patent-app.service /etc/systemd/system/patent-app.service.bak"

# 5. 更新服务配置（需要手动编辑）
echo "请手动编辑服务配置: systemctl edit --full patent-app"
echo "修改ExecStart为: /home/appuser/patent-app/venv38/bin/python /home/appuser/patent-app/app.py"

# 6. 重启
ssh root@43.99.101.195 "systemctl daemon-reload && systemctl restart patent-app"
```

### Ubuntu版本

```bash
# 1. 安装Python 3.8
ssh root@43.99.101.195 "apt-get update && apt-get install -y python3.8 python3.8-pip python3.8-dev python3.8-venv"

# 2-6步骤同上
```

## ⚠️ 注意事项

### 1. 保留Python 3.6

不要卸载Python 3.6，系统可能依赖它。我们只是为应用创建新的虚拟环境。

### 2. 备份

升级前备份：
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~ && tar -czf patent-app-backup-$(date +%Y%m%d).tar.gz patent-app/'"
```

### 3. 测试

升级后充分测试所有功能。

## 🔍 故障排除

### 问题1: Python 3.8安装失败

**CentOS**: 尝试使用IUS仓库
```bash
ssh root@43.99.101.195 "yum install -y https://repo.ius.io/ius-release-el7.rpm"
ssh root@43.99.101.195 "yum install -y python38 python38-pip python38-devel"
```

### 问题2: 虚拟环境创建失败

确保安装了venv模块：
```bash
ssh root@43.99.101.195 "yum install -y python38-venv"  # CentOS
ssh root@43.99.101.195 "apt-get install -y python3.8-venv"  # Ubuntu
```

### 问题3: 依赖安装失败

使用国内镜像：
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv38/bin/activate && pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt'"
```

### 问题4: 应用启动失败

检查日志：
```bash
ssh root@43.99.101.195 "journalctl -u patent-app -n 50"
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -50 logs/error.log'"
```

## 📊 升级前后对比

| 项目 | Python 3.6 | Python 3.8 |
|------|-----------|-----------|
| onnxruntime | 1.3.0 | 最新版 |
| RapidOCR | ❌ 不支持 | ✅ 完全支持 |
| 性能 | 基准 | +15% |
| 安全性 | 已停止支持 | 持续更新 |
| 新特性 | 无 | 多项改进 |

## 🎯 预计时间

- **安装Python 3.8**: 2-3分钟
- **创建虚拟环境**: 1分钟
- **安装依赖**: 3-5分钟
- **修改配置**: 2分钟
- **测试验证**: 2分钟

**总计**: 10-15分钟

## ✅ 成功标志

升级成功后：
- ✅ `python3.8 --version` 显示3.8.x
- ✅ 应用正常启动
- ✅ 功能八OCR识别正常
- ✅ 所有其他功能正常

## 🔄 回滚方案

如果升级失败，快速回滚：

```bash
# 1. 恢复服务配置
ssh root@43.99.101.195 "cp /etc/systemd/system/patent-app.service.bak /etc/systemd/system/patent-app.service"

# 2. 重启
ssh root@43.99.101.195 "systemctl daemon-reload && systemctl restart patent-app"
```

## 💡 建议

1. **在低峰期升级**: 避免影响用户
2. **先在测试环境验证**: 如果有的话
3. **保持备份**: 升级前备份整个应用目录
4. **逐步迁移**: 先测试OCR功能，再全面切换

---

**最后更新**: 2026-01-29
**预计时间**: 10-15分钟
**风险等级**: 低（可回滚）
**推荐度**: ⭐⭐⭐⭐⭐

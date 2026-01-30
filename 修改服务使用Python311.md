# 修改服务使用Python 3.11

## ✅ 当前状态

- ✅ Python 3.11虚拟环境已创建: `/home/appuser/patent-app/venv311`
- ✅ RapidOCR 1.4.4已安装
- ⚠️ 应用仍在使用Python 3.6

## 🎯 目标

让patent-app服务使用Python 3.11虚拟环境

## 📋 步骤

### 1. 查看当前服务配置

```bash
ssh root@43.99.101.195 "systemctl cat patent-app"
```

找到`ExecStart=`这一行，记下当前的启动命令。

### 2. 编辑服务配置

```bash
ssh root@43.99.101.195 "systemctl edit --full patent-app"
```

这会打开一个编辑器（通常是vi或nano）。

### 3. 修改ExecStart行

#### 如果当前是这样：
```ini
ExecStart=/usr/bin/python3 /home/appuser/patent-app/app.py
```

#### 改为：
```ini
ExecStart=/home/appuser/patent-app/venv311/bin/python /home/appuser/patent-app/app.py
```

---

#### 如果当前是这样（使用gunicorn）：
```ini
ExecStart=/usr/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### 改为：
```ini
ExecStart=/home/appuser/patent-app/venv311/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

#### 如果当前是这样（带完整路径）：
```ini
ExecStart=/usr/bin/python3 /home/appuser/patent-app/run_app.py
```

#### 改为：
```ini
ExecStart=/home/appuser/patent-app/venv311/bin/python /home/appuser/patent-app/run_app.py
```

### 4. 保存并退出

- **vi编辑器**: 按`Esc`，输入`:wq`，按`Enter`
- **nano编辑器**: 按`Ctrl+X`，按`Y`，按`Enter`

### 5. 重新加载并重启服务

```bash
ssh root@43.99.101.195 "systemctl daemon-reload"
ssh root@43.99.101.195 "systemctl restart patent-app"
```

### 6. 验证服务状态

```bash
ssh root@43.99.101.195 "systemctl status patent-app"
```

应该看到`active (running)`。

### 7. 验证Python版本

```bash
ssh root@43.99.101.195 "ps aux | grep python | grep patent"
```

应该看到路径包含`venv311`。

### 8. 查看日志

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -30 logs/error.log'"
```

应该没有错误。

### 9. 测试功能八

1. 访问: http://43.99.101.195
2. 进入功能八（专利附图标记识别）
3. 上传图片并测试

**期望结果**:
- ✅ 识别出 > 0 个数字序号
- ✅ 匹配率 > 0%
- ✅ Canvas显示标注

## 🔧 vi编辑器快速指南

如果不熟悉vi，按照这个步骤：

1. **进入编辑模式**: 按`i`键
2. **移动光标**: 使用方向键
3. **找到ExecStart行**: 向下滚动找到
4. **修改路径**: 
   - 删除旧路径: 按`Backspace`或`Delete`
   - 输入新路径: `/home/appuser/patent-app/venv311/bin/python`
5. **保存退出**:
   - 按`Esc`键退出编辑模式
   - 输入`:wq`
   - 按`Enter`

## 🔄 如果编辑失败

可以直接创建新的服务文件：

```bash
# 1. 备份当前配置
ssh root@43.99.101.195 "cp /etc/systemd/system/patent-app.service /etc/systemd/system/patent-app.service.bak"

# 2. 创建新配置（需要先查看当前配置，然后修改）
```

## 📞 需要帮助？

把以下命令的输出发给我：

```bash
ssh root@43.99.101.195 "systemctl cat patent-app"
```

我会告诉你具体怎么改。

---

**关键点**: 只需要把`ExecStart=`行中的Python路径改为`/home/appuser/patent-app/venv311/bin/python`

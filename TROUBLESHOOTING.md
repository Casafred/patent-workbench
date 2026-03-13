# 登录错误排查指南

## 第一步：运行诊断脚本

在服务器上运行：

```bash
cd /path/to/patent-workbench
python diagnose_login.py
```

## 第二步：查看详细错误日志

### 方法 1：查看 Gunicorn 实时日志

```bash
# 查看标准输出日志
tail -f nohup.out

# 或者如果使用 systemd
journalctl -u patent-workbench -f
```

### 方法 2：查看错误日志

```bash
# 查看最近的错误日志
tail -n 200 nohup.out | grep -i error

# 或者查看完整的错误堆栈
tail -n 500 nohup.out | grep -A 20 "Traceback"
```

### 方法 3：在浏览器中查看

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 点击登录按钮
4. 查看登录请求（POST /login）
5. 点击请求，查看 **Response** 标签
6. 应该能看到详细的 500 错误信息

## 第三步：常见错误及解决方案

### 错误 1: Session Cookie 未正确设置

**症状**: 登录后重定向，但 session 丢失

**检查**:
```bash
# 在浏览器控制台运行
document.cookie
```

**解决**: 确保 `backend/app.py` 中的配置正确

### 错误 2: DATABASE_URL 未配置导致 IP 管理失败

**症状**: 登录时数据库错误

**检查诊断脚本输出**:
```
💾 数据库配置:
  ⚠️  DATABASE_URL 未配置 (IP 管理功能将不可用)
```

**解决**: 
```bash
# 在 .env 文件中添加
DATABASE_URL=postgresql://user:password@host:port/dbname

# 或者设置环境变量
export DATABASE_URL="postgresql://user:password@host:port/dbname"
```

### 错误 3: HTTPS 配置错误

**症状**: Cookie 无法设置

**检查**: 如果使用 HTTPS，确保：
```python
app.config['SESSION_COOKIE_SECURE'] = True  # 必须为 True
```

### 错误 4: Gunicorn 工作进程问题

**症状**: 间歇性登录失败

**解决**: 修改 `Procfile`:
```
web: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 1 --threads 4
```

减少 workers 数量为 1，避免多进程 session 不同步

## 第四步：启用调试模式查看详细错误

**临时方案**（仅开发环境）:

编辑 `backend/config.py`:
```python
DEBUG = True
```

重启服务后，错误页面会显示详细堆栈信息。

**⚠️ 警告**: 生产环境不要启用 DEBUG！

## 第五步：手动测试 Session

创建测试脚本 `test_session.py`:

```python
from backend.app import create_app
from flask import session

app = create_app()

with app.test_client() as client:
    # 测试 Session
    with client.session_transaction() as sess:
        sess['test'] = 'value'
    
    # 验证 Session
    with client.session_transaction() as sess:
        print(f"Session 测试：{sess.get('test')}")
```

运行：
```bash
python test_session.py
```

## 第六步：检查浏览器 Cookie 设置

### Chrome/Edge:
1. F12 打开开发者工具
2. Application → Cookies → 选择你的域名
3. 查看 `session` Cookie:
   - **Name**: session
   - **Value**: (加密的字符串)
   - **Path**: /
   - **SameSite**: Lax
   - **Secure**: (如果是 HTTPS 则勾选)

### Firefox:
1. F12 打开开发者工具
2. Storage → Cookies → 选择你的域名
3. 查看 `session` Cookie 属性

## 第七步：收集错误信息

如果以上步骤都无法定位问题，请收集以下信息：

1. **诊断脚本输出**:
   ```bash
   python diagnose_login.py > diagnosis.txt
   ```

2. **服务器日志** (最近 200 行):
   ```bash
   tail -n 200 nohup.out > server_log.txt
   ```

3. **浏览器 Network 截图**:
   - 登录请求的完整信息
   - Response Headers
   - Response Body

4. **浏览器 Cookie 截图**:
   - Application → Cookies → session Cookie

## 快速修复方案

如果急需解决，可以尝试这个**临时方案**：

### 方案 A: 移除 IP 管理（跳过数据库依赖）

编辑 `backend/routes/auth.py`，在登录成功后**注释掉** IP 管理代码：

```python
# 注释掉这两行
# client_ip = AuthService.get_client_ip()
# ip_result = AuthService.manage_user_ip(username, client_ip)
```

### 方案 B: 直接渲染页面（避免重定向）

编辑 `backend/routes/auth.py`，登录成功后：

```python
# 不使用重定向
# return redirect(url_for('auth.serve_app'))

# 直接导入并调用
from backend.routes.auth import render_app_page
return render_app_page()
```

## 联系支持

如果问题仍未解决，请提供：
1. 诊断脚本输出
2. 服务器错误日志
3. 浏览器 Network 截图
4. 浏览器 Cookie 截图

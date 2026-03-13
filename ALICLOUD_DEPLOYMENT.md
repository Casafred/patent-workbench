# 阿里云服务器部署配置说明

## 登录问题根本原因

登录时显示 500 错误，但点击后退就能成功登录，这个问题的根本原因是：

### 1. Session Cookie 配置缺失
在阿里云服务器环境下（特别是使用 HTTPS、负载均衡 SLB 或 Nginx 反向代理时），**必须正确配置 Session Cookie**，否则会导致：
- Cookie 无法在浏览器和服务器之间正确传递
- 重定向时 Session 数据丢失
- 需要多次尝试才能登录成功

### 2. 解决方案

#### ✅ 已修复：Session Cookie 配置
在 `backend/app.py` 中添加了以下关键配置：

```python
# 配置 Session Cookie - 关键！
# 在阿里云/生产环境下，必须正确配置这些参数
app.config['SESSION_COOKIE_SECURE'] = False  # 如果是 HTTPS 则设为 True
app.config['SESSION_COOKIE_HTTPONLY'] = True  # 防止 XSS 攻击
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # 允许跨域携带 Cookie
app.config['SESSION_COOKIE_PATH'] = '/'  # Cookie 路径
```

#### 配置参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `SESSION_COOKIE_SECURE` | `False` (HTTP) / `True` (HTTPS) | 仅通过 HTTPS 发送 Cookie |
| `SESSION_COOKIE_HTTPONLY` | `True` | 防止 JavaScript 访问 Cookie（安全） |
| `SESSION_COOKIE_SAMESITE` | `'Lax'` | 允许跨站请求时携带 Cookie（导航请求） |
| `SESSION_COOKIE_PATH` | `'/'` | Cookie 在整个网站可用 |

### 3. 阿里云特殊配置

如果你的服务器使用 **HTTPS**（推荐），需要修改：

```python
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS 必须设为 True
```

如果使用 **HTTP + Nginx 反向代理**，确保 Nginx 配置中包含：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### 4. 部署步骤

1. **推送代码到服务器**
   ```bash
   git pull origin main
   ```

2. **重启 Gunicorn 服务**
   ```bash
   # 如果使用 systemd
   sudo systemctl restart patent-workbench
   
   # 或者直接重启
   pkill -f gunicorn
   gunicorn wsgi:app -c gunicorn.conf.py
   ```

3. **验证配置**
   - 打开浏览器开发者工具
   - 查看 Application → Cookies
   - 确认 `session` Cookie 已正确设置
   - Cookie 的 Path 应该是 `/`
   - Cookie 的 SameSite 应该是 `Lax`

### 5. 测试登录

1. 清除浏览器缓存和 Cookie
2. 访问登录页面
3. 输入用户名、密码和验证码
4. 点击登录 - **应该直接进入系统，不再需要后退**

### 6. 故障排查

如果问题仍然存在，检查：

#### 查看 Gunicorn 日志
```bash
# 查看错误日志
journalctl -u patent-workbench -n 100 --no-pager

# 或查看实时日志
tail -f /var/log/patent-workbench/error.log
```

#### 查看浏览器控制台
- 打开开发者工具（F12）
- 查看 Console 和 Network 标签
- 检查是否有 Cookie 相关的错误

#### 检查 HTTPS 配置
如果使用 HTTPS，确保：
- SSL 证书有效
- `SESSION_COOKIE_SECURE = True`
- 浏览器没有混合内容警告

### 7. 提交记录

- `f8bccfe` - Add-session-cookie-config-for-alicloud
- `d5b2fa3` - Add-gunicorn-config-for-session-handling

## 总结

这个问题的核心是 **Session Cookie 在阿里云环境下的配置问题**。通过正确配置 Cookie 参数，确保：
1. Cookie 能正确发送到浏览器
2. 重定向时 Cookie 能带回服务器
3. Session 数据在多次请求间保持一致

修复后，登录应该一次性成功，不再需要点击后退按钮。

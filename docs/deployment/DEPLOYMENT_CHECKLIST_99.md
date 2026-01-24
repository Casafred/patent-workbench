# 阿里云¥99/年部署检查清单

> 打印此清单，逐项勾选，确保不遗漏任何步骤

## 📋 部署前准备

- [ ] 已购买阿里云¥99/年ECS
- [ ] 操作系统选择：Ubuntu 22.04 LTS
- [ ] 已记录服务器公网IP：`_______________`
- [ ] 已记录root密码：`_______________`
- [ ] 已配置安全组（开放22、80、443端口）
- [ ] 准备好GitHub仓库地址：`_______________`

## 🔧 系统环境安装

- [ ] SSH登录成功
- [ ] 系统更新完成（apt update && apt upgrade）
- [ ] Python 3.11 安装完成
- [ ] PostgreSQL 安装完成
- [ ] Nginx 安装完成
- [ ] Git 安装完成

## 👤 用户和代码

- [ ] 创建appuser用户
- [ ] 克隆代码到 /home/appuser/patent-app
- [ ] 创建Python虚拟环境
- [ ] 安装requirements.txt依赖
- [ ] 安装gunicorn

## 🗄️ 数据库配置

- [ ] 创建数据库：patent_db
- [ ] 创建用户：patent_user
- [ ] 设置数据库密码：`_______________`
- [ ] 授权完成
- [ ] 初始化用户数据（init_users.py）

## ⚙️ 应用配置

- [ ] 创建.env文件
- [ ] 设置FLASK_SECRET_KEY：`_______________`
- [ ] 设置DATABASE_URL
- [ ] 设置ZHIPUAI_API_KEY（可选）：`_______________`
- [ ] 创建logs目录
- [ ] 创建gunicorn_config.py

## 🚀 服务配置

- [ ] 创建systemd服务文件
- [ ] 启用服务（systemctl enable）
- [ ] 启动服务（systemctl start）
- [ ] 服务状态正常（active running）

## 🌐 Nginx配置

- [ ] 创建Nginx配置文件
- [ ] 启用站点配置
- [ ] 删除默认站点
- [ ] 测试配置（nginx -t）
- [ ] 重启Nginx

## 🔒 安全配置

- [ ] 安装UFW防火墙
- [ ] 允许SSH（22）
- [ ] 允许HTTP（80）
- [ ] 允许HTTPS（443）
- [ ] 启用防火墙

## ✅ 最终验证

- [ ] 应用服务运行正常
- [ ] Nginx服务运行正常
- [ ] PostgreSQL服务运行正常
- [ ] 本地curl测试成功
- [ ] 浏览器访问成功：http://`_______________`
- [ ] 登录功能正常（admin/admin123）
- [ ] Excel上传功能正常
- [ ] 专利查询功能正常
- [ ] 权利要求处理功能正常

## 📝 部署后任务

- [ ] 修改admin默认密码
- [ ] 配置HTTPS（可选）
- [ ] 设置数据库自动备份
- [ ] 配置日志轮转
- [ ] 记录访问地址和账号信息

## 🆘 紧急联系信息

**服务器信息：**
- IP地址：`_______________`
- SSH端口：22
- 应用端口：5001（内部）
- Web端口：80

**重要文件路径：**
- 应用目录：/home/appuser/patent-app
- 日志目录：/home/appuser/patent-app/logs
- Nginx配置：/etc/nginx/sites-available/patent-app
- 服务配置：/etc/systemd/system/patent-app.service

**常用命令：**
```bash
# 重启应用
systemctl restart patent-app

# 查看日志
tail -f /home/appuser/patent-app/logs/error.log

# 更新代码
su - appuser
cd ~/patent-app
git pull
exit
systemctl restart patent-app
```

---

## 🎯 部署时间记录

- 开始时间：`_______________`
- 结束时间：`_______________`
- 总耗时：`_______________`

## ✍️ 备注

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

**部署完成签名：** `_______________`  
**日期：** `_______________`

# Gunicorn配置文件
import multiprocessing

# 绑定地址和端口
bind = "0.0.0.0:5000"

# Worker进程数量（推荐：CPU核心数 * 2 + 1）
workers = multiprocessing.cpu_count() * 2 + 1

# Worker类型
worker_class = "sync"

# 每个worker的线程数
threads = 2

# 超时时间（秒）
timeout = 120

# 保持连接时间（秒）
keepalive = 5

# 最大请求数（防止内存泄漏）
max_requests = 1000
max_requests_jitter = 50

# 日志级别
loglevel = "info"

# 访问日志
accesslog = "-"  # 输出到stdout
errorlog = "-"   # 输出到stderr

# 进程名称
proc_name = "patent-app"

# 预加载应用（提高性能，但重启时需要完全重启）
preload_app = True

# Daemon模式（systemd管理时设为False）
daemon = False

# PID文件
pidfile = None

# 工作目录
chdir = "/home/appuser/patent-app"

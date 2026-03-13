"""
Gunicorn configuration file for production deployment.

This configuration ensures proper session handling and cookie management
for Alibaba Cloud (Aliyun) deployment.
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:" + os.environ.get('PORT', '5001')

# Worker processes
workers = 2
worker_class = 'gthread'
threads = 4

# Timeout settings
timeout = 600
graceful_timeout = 600
keepalive = 10

# Process naming
proc_name = 'patent-workbench'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
errorlog = '-'
accesslog = '-'
loglevel = 'info'

# SSL configuration (if using HTTPS on Aliyun)
# keyfile = None
# certfile = None

# IMPORTANT: Session cookie settings for production
# These ensure cookies work correctly behind Aliyun load balancers
# Note: These are application-level settings, not Gunicorn settings
# They're included here for documentation purposes
# 
# In production (Aliyun with HTTPS):
# - SESSION_COOKIE_SECURE = True  (only send over HTTPS)
# - SESSION_COOKIE_HTTPONLY = True (prevent JavaScript access)
# - SESSION_COOKIE_SAMESITE = 'Lax' (allow cross-site for navigation)
# - SESSION_COOKIE_PATH = '/' (available across entire site)
#
# The actual configuration is in backend/app.py

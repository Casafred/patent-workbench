"""
Email Trigger Service for CLI Workflow Execution.

This module provides secure email-triggered CLI command execution functionality.
It includes whitelist management, email receiving, command parsing, and scheduling.
"""

import email
import imaplib
import json
import os
import re
import shlex
import smtplib
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WHITELIST_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'email_trigger_whitelist.json')
LOGS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'email_trigger_logs.json')
USERS_FILE = os.path.join(BASE_DIR, 'backend', 'user_management', 'users.json')

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')
SMTP_SERVER = 'smtp.qq.com'
SMTP_PORT = 465
IMAP_SERVER = os.environ.get('IMAP_SERVER', 'imap.qq.com')
IMAP_PORT = int(os.environ.get('IMAP_PORT', 993))


@dataclass
class ParsedCommand:
    command: str
    args: List[str]
    raw_input: str
    is_valid: bool
    error_message: Optional[str] = None


@dataclass
class EmailTriggerLog:
    timestamp: str
    sender: str
    username: str
    command: str
    success: bool
    result: str
    error: Optional[str] = None


class EmailTriggerWhitelist:
    """Whitelist management for email trigger permissions."""
    
    @staticmethod
    def load_data() -> Dict[str, Any]:
        try:
            with open(WHITELIST_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {
                "whitelist": [],
                "settings": {
                    "enabled": False,
                    "check_interval_seconds": 60,
                    "max_commands_per_day": 50,
                    "require_subject_prefix": "[CLI]",
                    "allowed_commands": ["flow", "patent", "ai", "status", "help"]
                },
                "metadata": {"created_at": None, "last_updated": None}
            }
    
    @staticmethod
    def save_data(data: Dict[str, Any]) -> bool:
        try:
            data["metadata"]["last_updated"] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            if not data["metadata"]["created_at"]:
                data["metadata"]["created_at"] = data["metadata"]["last_updated"]
            
            with open(WHITELIST_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存白名单数据失败: {e}")
            return False
    
    @staticmethod
    def get_whitelist() -> List[Dict[str, Any]]:
        data = EmailTriggerWhitelist.load_data()
        return data.get('whitelist', [])
    
    @staticmethod
    def add_to_whitelist(email_addr: str, username: str, 
                         allowed_commands: List[str] = None,
                         max_daily_commands: int = 20,
                         notes: str = "") -> Tuple[bool, str]:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        whitelist = data.get('whitelist', [])
        
        for item in whitelist:
            if item.get('email', '').lower() == email_addr:
                return False, "该邮箱已在白名单中"
        
        if allowed_commands is None:
            allowed_commands = data.get('settings', {}).get('allowed_commands', [])
        
        whitelist.append({
            'email': email_addr,
            'username': username,
            'allowed_commands': allowed_commands,
            'max_daily_commands': max_daily_commands,
            'daily_count': 0,
            'last_reset': datetime.now().strftime('%Y-%m-%d'),
            'enabled': True,
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'notes': notes
        })
        
        data['whitelist'] = whitelist
        if EmailTriggerWhitelist.save_data(data):
            return True, "已添加到白名单"
        return False, "保存失败"
    
    @staticmethod
    def remove_from_whitelist(email_addr: str) -> Tuple[bool, str]:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        whitelist = data.get('whitelist', [])
        
        original_len = len(whitelist)
        whitelist = [item for item in whitelist if item.get('email', '').lower() != email_addr]
        
        if len(whitelist) == original_len:
            return False, "邮箱不在白名单中"
        
        data['whitelist'] = whitelist
        if EmailTriggerWhitelist.save_data(data):
            return True, "已从白名单移除"
        return False, "保存失败"
    
    @staticmethod
    def toggle_whitelist_entry(email_addr: str, enabled: bool) -> Tuple[bool, str]:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        whitelist = data.get('whitelist', [])
        
        for item in whitelist:
            if item.get('email', '').lower() == email_addr:
                item['enabled'] = enabled
                data['whitelist'] = whitelist
                if EmailTriggerWhitelist.save_data(data):
                    return True, f"已{'启用' if enabled else '禁用'}"
                return False, "保存失败"
        
        return False, "邮箱不在白名单中"
    
    @staticmethod
    def update_whitelist_entry(email_addr: str, **kwargs) -> Tuple[bool, str]:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        whitelist = data.get('whitelist', [])
        
        for item in whitelist:
            if item.get('email', '').lower() == email_addr:
                for key, value in kwargs.items():
                    if key in ['allowed_commands', 'max_daily_commands', 'notes']:
                        item[key] = value
                
                data['whitelist'] = whitelist
                if EmailTriggerWhitelist.save_data(data):
                    return True, "更新成功"
                return False, "保存失败"
        
        return False, "邮箱不在白名单中"
    
    @staticmethod
    def is_email_allowed(email_addr: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        
        if not data.get('settings', {}).get('enabled', False):
            return False, None
        
        whitelist = data.get('whitelist', [])
        
        for item in whitelist:
            if item.get('email', '').lower() == email_addr and item.get('enabled', True):
                today = datetime.now().strftime('%Y-%m-%d')
                if item.get('last_reset') != today:
                    item['daily_count'] = 0
                    item['last_reset'] = today
                    EmailTriggerWhitelist.save_data(data)
                
                if item.get('daily_count', 0) >= item.get('max_daily_commands', 20):
                    return False, {'reason': 'daily_limit_exceeded', 'limit': item.get('max_daily_commands')}
                
                return True, item
        
        return False, None
    
    @staticmethod
    def increment_daily_count(email_addr: str) -> bool:
        email_addr = email_addr.lower().strip()
        
        data = EmailTriggerWhitelist.load_data()
        whitelist = data.get('whitelist', [])
        
        for item in whitelist:
            if item.get('email', '').lower() == email_addr:
                item['daily_count'] = item.get('daily_count', 0) + 1
                data['whitelist'] = whitelist
                return EmailTriggerWhitelist.save_data(data)
        
        return False
    
    @staticmethod
    def get_settings() -> Dict[str, Any]:
        data = EmailTriggerWhitelist.load_data()
        return data.get('settings', {})
    
    @staticmethod
    def update_settings(settings: Dict[str, Any]) -> Tuple[bool, str]:
        data = EmailTriggerWhitelist.load_data()
        data['settings'].update(settings)
        if EmailTriggerWhitelist.save_data(data):
            return True, "设置已更新"
        return False, "保存失败"


class CommandParser:
    """Secure command parser for email-triggered CLI execution."""
    
    DANGEROUS_PATTERNS = [
        r'[;&|`$]',
        r'\$\(',
        r'`',
        r'\|\s*\w',
        r'\.\./',
        r'[<>]',
        r'rm\s+-rf',
        r'sudo',
        r'chmod',
        r'chown',
        r'eval',
        r'exec',
        r'import\s+os',
        r'__import__',
        r'subprocess',
        r'open\s*\(',
    ]
    
    @staticmethod
    def parse(user_input: str, allowed_commands: List[str] = None) -> ParsedCommand:
        user_input = user_input.strip()
        
        if not user_input:
            return ParsedCommand(
                command='', args=[], raw_input=user_input,
                is_valid=False, error_message='空命令'
            )
        
        for pattern in CommandParser.DANGEROUS_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                return ParsedCommand(
                    command='', args=[], raw_input=user_input,
                    is_valid=False, error_message='输入包含危险字符或模式'
                )
        
        return ParsedCommand(
            command='natural_language',
            args=[],
            raw_input=user_input,
            is_valid=True
        )


class EmailReceiver:
    """Email receiving service using IMAP."""
    
    def __init__(self):
        self.imap_server = IMAP_SERVER
        self.imap_port = IMAP_PORT
        self.email_account = ADMIN_EMAIL
        self.email_password = EMAIL_PASSWORD
    
    def connect(self) -> Optional[imaplib.IMAP4_SSL]:
        print(f"[EmailTrigger] 尝试连接IMAP服务器: {self.imap_server}:{self.imap_port}")
        print(f"[EmailTrigger] 邮箱账号: {self.email_account}")
        print(f"[EmailTrigger] 密码已配置: {'是' if self.email_password else '否'}")
        
        if not self.email_account or not self.email_password:
            print("[EmailTrigger] 邮件接收服务未配置")
            return None
        
        try:
            mail = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
            mail.login(self.email_account, self.email_password)
            print("[EmailTrigger] IMAP连接成功")
            return mail
        except Exception as e:
            print(f"[EmailTrigger] IMAP连接失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def fetch_unread_emails(self, folder: str = 'INBOX', subject_prefix: str = None, max_count: int = 10) -> Tuple[List[Dict[str, Any]], Any]:
        mail = self.connect()
        if not mail:
            print("[EmailTrigger] 无法连接到IMAP服务器")
            return [], None
        
        try:
            print(f"[EmailTrigger] 选择文件夹: {folder}")
            mail.select(folder)
            
            # 搜索所有未读邮件
            print(f"[EmailTrigger] 搜索未读邮件...")
            typ, msg_ids = mail.search(None, 'UNSEEN')
            
            print(f"[EmailTrigger] 搜索结果: {typ}")
            
            emails = []
            id_list = msg_ids[0].split()
            print(f"[EmailTrigger] 找到 {len(id_list)} 封未读邮件")
            
            # 只获取最新的max_count封邮件（倒序获取）
            id_list = id_list[-max_count:] if len(id_list) > max_count else id_list
            print(f"[EmailTrigger] 将处理最新 {len(id_list)} 封邮件")
            
            for num in id_list:
                if not num:
                    continue
                typ, msg_data = mail.fetch(num, '(RFC822)')
                if msg_data and msg_data[0]:
                    msg = email.message_from_bytes(msg_data[0][1])
                    parsed = self._parse_email(msg)
                    if parsed:
                        parsed['_mail_id'] = num
                        # 如果指定了主题前缀，在代码中过滤
                        if subject_prefix:
                            if subject_prefix in parsed.get('subject', ''):
                                emails.append(parsed)
                                print(f"[EmailTrigger] 匹配CLI邮件: {parsed.get('subject', 'No Subject')}")
                        else:
                            emails.append(parsed)
                            print(f"[EmailTrigger] 解析邮件成功: {parsed.get('subject', 'No Subject')}")
            
            print(f"[EmailTrigger] 成功获取 {len(emails)} 封CLI邮件")
            return emails, mail
        except Exception as e:
            print(f"[EmailTrigger] 获取邮件失败: {e}")
            import traceback
            traceback.print_exc()
            try:
                mail.close()
                mail.logout()
            except:
                pass
            return [], None
    
    def mark_as_read(self, mail_conn, mail_id: bytes) -> bool:
        try:
            mail_conn.store(mail_id, '+FLAGS', '\\Seen')
            print(f"[EmailTrigger] 邮件 {mail_id} 已标记为已读")
            return True
        except Exception as e:
            print(f"[EmailTrigger] 标记邮件已读失败: {e}")
            return False
    
    def close_connection(self, mail_conn) -> bool:
        try:
            mail_conn.close()
            mail_conn.logout()
            print(f"[EmailTrigger] IMAP连接已关闭")
            return True
        except Exception as e:
            print(f"[EmailTrigger] 关闭连接失败: {e}")
            return False
    
    def _parse_email(self, msg: email.message.Message) -> Optional[Dict[str, Any]]:
        try:
            subject = self._decode_header(msg.get('Subject', ''))
            sender = msg.get('From', '')
            sender_email = self._extract_email(sender)
            date = msg.get('Date', '')
            
            body = self._get_email_body(msg)
            
            return {
                'subject': subject,
                'body': body,
                'sender': sender,
                'sender_email': sender_email,
                'date': date
            }
        except Exception as e:
            print(f"解析邮件失败: {e}")
            return None
    
    def _decode_header(self, header: str) -> str:
        if not header:
            return ''
        decoded_parts = decode_header(header)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(charset or 'utf-8', errors='ignore'))
            else:
                result.append(part)
        return ''.join(result)
    
    def _extract_email(self, sender: str) -> str:
        match = re.search(r'[\w\.-]+@[\w\.-]+', sender)
        if match:
            return match.group(0).lower()
        return sender.lower()
    
    def _get_email_body(self, msg: email.message.Message) -> str:
        body = ''
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get('Content-Disposition', ''))
                
                if 'attachment' in content_disposition:
                    continue
                
                if content_type == 'text/plain':
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or 'utf-8'
                        body = payload.decode(charset, errors='ignore')
                        break
                    except Exception:
                        continue
                elif content_type == 'text/html' and not body:
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or 'utf-8'
                        html_body = payload.decode(charset, errors='ignore')
                        body = re.sub(r'<[^>]+>', '', html_body)
                    except Exception:
                        continue
        else:
            try:
                payload = msg.get_payload(decode=True)
                charset = msg.get_content_charset() or 'utf-8'
                body = payload.decode(charset, errors='ignore')
            except Exception:
                body = str(msg.get_payload())
        
        return body.strip()


class EmailSender:
    """Email sending service for results."""
    
    @staticmethod
    def send_result_email(to_email: str, command: str, result: str, success: bool) -> bool:
        if not ADMIN_EMAIL or not EMAIL_PASSWORD:
            print("邮件发送服务未配置")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            status = "执行成功" if success else "执行失败"
            msg['Subject'] = f'【专利工作台】CLI命令{status} - {command[:30]}'
            msg['From'] = ADMIN_EMAIL
            msg['To'] = to_email
            
            text_content = f"""
CLI命令执行结果

命令: {command}
状态: {status}
时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

执行结果:
{result}

---
专利分析智能工作台
"""
            
            status_color = "#22C55E" if success else "#EF4444"
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }}
        .content {{ background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }}
        .status {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }}
        .result-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 16px; white-space: pre-wrap; font-family: monospace; font-size: 13px; max-height: 400px; overflow-y: auto; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0;">CLI命令执行结果</h2>
        </div>
        <div class="content">
            <p><strong>命令:</strong> <code>{command}</code></p>
            <p><strong>状态:</strong> <span class="status" style="background:{status_color}20; color:{status_color};">{status}</span></p>
            <p><strong>时间:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <div class="result-box">{result}</div>
        </div>
    </div>
</body>
</html>
"""
            
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                server.login(ADMIN_EMAIL, EMAIL_PASSWORD)
                server.sendmail(ADMIN_EMAIL, to_email, msg.as_string())
            
            print(f"结果邮件已发送至 {to_email}")
            return True
        except Exception as e:
            print(f"发送结果邮件失败: {e}")
            return False


class EmailTriggerLogger:
    """Logger for email trigger executions."""
    
    @staticmethod
    def load_logs() -> Dict[str, Any]:
        try:
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"logs": [], "daily_stats": {}}
    
    @staticmethod
    def save_logs(data: Dict[str, Any]) -> bool:
        try:
            with open(LOGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存日志失败: {e}")
            return False
    
    @staticmethod
    def add_log(log: EmailTriggerLog) -> bool:
        data = EmailTriggerLogger.load_logs()
        
        log_dict = {
            'timestamp': log.timestamp,
            'sender': log.sender,
            'username': log.username,
            'command': log.command,
            'success': log.success,
            'result': log.result[:500] if log.result else '',
            'error': log.error
        }
        
        data['logs'].insert(0, log_dict)
        
        if len(data['logs']) > 1000:
            data['logs'] = data['logs'][:1000]
        
        today = datetime.now().strftime('%Y-%m-%d')
        if today not in data['daily_stats']:
            data['daily_stats'][today] = {'total': 0, 'success': 0, 'failed': 0}
        
        data['daily_stats'][today]['total'] += 1
        if log.success:
            data['daily_stats'][today]['success'] += 1
        else:
            data['daily_stats'][today]['failed'] += 1
        
        dates = list(data['daily_stats'].keys())
        if len(dates) > 30:
            for old_date in sorted(dates)[:-30]:
                del data['daily_stats'][old_date]
        
        return EmailTriggerLogger.save_logs(data)
    
    @staticmethod
    def get_recent_logs(limit: int = 50) -> List[Dict[str, Any]]:
        data = EmailTriggerLogger.load_logs()
        return data.get('logs', [])[:limit]
    
    @staticmethod
    def get_stats() -> Dict[str, Any]:
        data = EmailTriggerLogger.load_logs()
        return data.get('daily_stats', {})


class EmailTriggerScheduler:
    """Scheduler for email-triggered CLI execution."""
    
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval
        self.running = False
        self.thread = None
        self.email_receiver = EmailReceiver()
        self._executor_callback = None
    
    def set_executor(self, callback):
        self._executor_callback = callback
    
    def start(self):
        settings = EmailTriggerWhitelist.get_settings()
        if not settings.get('enabled', False):
            print("邮件触发服务未启用")
            return False
        
        self.check_interval = settings.get('check_interval_seconds', 60)
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print(f"邮件触发调度器已启动，检查间隔: {self.check_interval}秒")
        return True
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("邮件触发调度器已停止")
    
    def _run_scheduler(self):
        print(f"[EmailTrigger] 调度器开始运行，检查间隔: {self.check_interval}秒")
        while self.running:
            try:
                print(f"[EmailTrigger] 开始检查邮件... {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                self._process_emails()
            except Exception as e:
                print(f"[EmailTrigger] 处理邮件时出错: {e}")
                import traceback
                traceback.print_exc()
            
            time.sleep(self.check_interval)
    
    def _process_emails(self):
        settings = EmailTriggerWhitelist.get_settings()
        if not settings.get('enabled', False):
            print("[EmailTrigger] 服务未启用，跳过检查")
            return
        
        require_prefix = settings.get('require_subject_prefix', '[CLI]')
        print(f"[EmailTrigger] 要求的主题前缀: {require_prefix}")
        
        # 直接搜索包含CLI前缀的未读邮件
        emails, mail_conn = self.email_receiver.fetch_unread_emails(
            subject_prefix=require_prefix,
            max_count=10
        )
        print(f"[EmailTrigger] 获取到 {len(emails)} 封CLI邮件")
        
        processed_count = 0
        for email_data in emails:
            subject = email_data.get('subject', '')
            sender_email = email_data.get('sender_email', '')
            body = email_data.get('body', '')
            mail_id = email_data.get('_mail_id')
            
            print(f"[EmailTrigger] 处理邮件 - 发送者: {sender_email}, 主题: {subject}")
            
            # 检查白名单
            is_allowed, user_info = EmailTriggerWhitelist.is_email_allowed(sender_email)
            print(f"[EmailTrigger] 白名单验证结果: {is_allowed}")
            
            if not is_allowed:
                print(f"[EmailTrigger] 拒绝来自 {sender_email} 的邮件触发请求")
                if mail_conn and mail_id:
                    self.email_receiver.mark_as_read(mail_conn, mail_id)
                continue
            
            # 提取命令
            command_text = body.strip()
            if not command_text:
                command_text = subject.replace(require_prefix, '').strip()
            
            print(f"[EmailTrigger] 提取的命令: {command_text}")
            
            # 解析命令
            allowed_commands = user_info.get('allowed_commands', settings.get('allowed_commands', []))
            parsed = CommandParser.parse(command_text, allowed_commands)
            
            print(f"[EmailTrigger] 命令解析结果: is_valid={parsed.is_valid}")
            
            if not parsed.is_valid:
                EmailSender.send_result_email(
                    sender_email, command_text, 
                    f"命令验证失败: {parsed.error_message}", False
                )
                EmailTriggerLogger.add_log(EmailTriggerLog(
                    timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    sender=sender_email,
                    username=user_info.get('username', 'unknown'),
                    command=command_text,
                    success=False,
                    result='',
                    error=parsed.error_message
                ))
                if mail_conn and mail_id:
                    self.email_receiver.mark_as_read(mail_conn, mail_id)
                continue
            
            # 执行命令
            print(f"[EmailTrigger] 开始执行命令...")
            result, success = self._execute_command(parsed, user_info)
            print(f"[EmailTrigger] 命令执行完成, success={success}")
            
            # 更新计数
            EmailTriggerWhitelist.increment_daily_count(sender_email)
            
            # 发送结果邮件
            EmailSender.send_result_email(sender_email, command_text, result, success)
            print(f"[EmailTrigger] 结果邮件已发送至 {sender_email}")
            
            # 标记邮件已读
            if mail_conn and mail_id:
                self.email_receiver.mark_as_read(mail_conn, mail_id)
            
            # 记录日志
            EmailTriggerLogger.add_log(EmailTriggerLog(
                timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                sender=sender_email,
                username=user_info.get('username', 'unknown'),
                command=command_text,
                success=success,
                result=result
            ))
            processed_count += 1
        
        # 关闭连接
        if mail_conn:
            self.email_receiver.close_connection(mail_conn)
        
        print(f"[EmailTrigger] 本次处理完成，共处理 {processed_count} 封CLI邮件")
    
    def _execute_command(self, parsed: ParsedCommand, user_info: Dict[str, Any]) -> Tuple[str, bool]:
        if self._executor_callback:
            try:
                return self._executor_callback(parsed, user_info)
            except Exception as e:
                return f"执行失败: {str(e)}", False
        
        return f"命令 {parsed.command} 已接收，但未配置执行器", False


email_trigger_scheduler = EmailTriggerScheduler()

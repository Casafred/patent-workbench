"""
企业微信服务模块

功能：
1. 获取Access Token
2. 发送各类消息（文本、文本卡片、Markdown）
3. 生成绑定二维码
4. 处理用户绑定回调
"""

import os
import time
import json
import hashlib
import requests
from typing import Optional, Dict, Any
from backend.config import BASE_DIR


class WecomService:
    """企业微信服务类"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if WecomService._initialized:
            return
        
        self.corp_id = os.environ.get('WECOM_CORP_ID', '')
        self.agent_id = os.environ.get('WECOM_AGENT_ID', '')
        self.secret = os.environ.get('WECOM_SECRET', '')
        self.enabled = os.environ.get('WECOM_ENABLED', 'false').lower() == 'true'
        
        self.access_token = None
        self.token_expires = 0
        
        self.token_file = os.path.join(BASE_DIR, 'backend', 'data', 'wecom_token.json')
        
        WecomService._initialized = True
    
    def is_configured(self) -> bool:
        """检查是否已配置企业微信"""
        return bool(self.corp_id and self.agent_id and self.secret)
    
    def is_enabled(self) -> bool:
        """检查是否启用企业微信推送"""
        return self.enabled and self.is_configured()
    
    def _load_token_from_cache(self) -> Optional[str]:
        """从缓存加载token"""
        try:
            if os.path.exists(self.token_file):
                with open(self.token_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if time.time() < data.get('expires_at', 0):
                        return data.get('access_token')
        except Exception:
            pass
        return None
    
    def _save_token_to_cache(self, token: str, expires_in: int):
        """保存token到缓存"""
        try:
            os.makedirs(os.path.dirname(self.token_file), exist_ok=True)
            with open(self.token_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'access_token': token,
                    'expires_at': time.time() + expires_in - 300
                }, f)
        except Exception:
            pass
    
    def get_access_token(self) -> Optional[str]:
        """
        获取企业微信Access Token
        
        Returns:
            str: Access Token 或 None
        """
        if not self.is_configured():
            return None
        
        if self.access_token and time.time() < self.token_expires:
            return self.access_token
        
        cached_token = self._load_token_from_cache()
        if cached_token:
            self.access_token = cached_token
            return cached_token
        
        url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
        
        try:
            resp = requests.get(url, params={
                'corpid': self.corp_id,
                'corpsecret': self.secret
            }, timeout=10)
            result = resp.json()
            
            if result.get('errcode', 0) != 0:
                print(f"[WecomService] 获取Token失败: {result.get('errmsg')}")
                return None
            
            self.access_token = result['access_token']
            self.token_expires = time.time() + result['expires_in'] - 300
            
            self._save_token_to_cache(self.access_token, result['expires_in'])
            
            return self.access_token
            
        except Exception as e:
            print(f"[WecomService] 获取Token异常: {e}")
            return None
    
    def send_text(self, user_id: str, content: str, safe: int = 0) -> Dict[str, Any]:
        """
        发送文本消息
        
        Args:
            user_id: 企业微信用户ID
            content: 消息内容
            safe: 是否加密（0否1是）
        
        Returns:
            dict: 发送结果
        """
        if not self.is_enabled():
            return {'success': False, 'error': '企业微信推送未启用'}
        
        token = self.get_access_token()
        if not token:
            return {'success': False, 'error': '获取Access Token失败'}
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={token}"
        
        data = {
            "touser": user_id,
            "msgtype": "text",
            "agentid": int(self.agent_id),
            "text": {
                "content": content
            },
            "safe": safe
        }
        
        try:
            resp = requests.post(url, json=data, timeout=10)
            result = resp.json()
            
            if result.get('errcode') == 0:
                return {'success': True, 'msgid': result.get('msgid')}
            else:
                return {'success': False, 'error': result.get('errmsg'), 'errcode': result.get('errcode')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_textcard(self, user_id: str, title: str, description: str, 
                      url: str = "", btn_text: str = "查看详情") -> Dict[str, Any]:
        """
        发送文本卡片消息
        
        Args:
            user_id: 企业微信用户ID
            title: 标题
            description: 描述（支持HTML）
            url: 点击跳转URL
            btn_text: 按钮文字
        
        Returns:
            dict: 发送结果
        """
        if not self.is_enabled():
            return {'success': False, 'error': '企业微信推送未启用'}
        
        token = self.get_access_token()
        if not token:
            return {'success': False, 'error': '获取Access Token失败'}
        
        api_url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={token}"
        
        data = {
            "touser": user_id,
            "msgtype": "textcard",
            "agentid": int(self.agent_id),
            "textcard": {
                "title": title,
                "description": description,
                "url": url,
                "btntxt": btn_text
            }
        }
        
        try:
            resp = requests.post(api_url, json=data, timeout=10)
            result = resp.json()
            
            if result.get('errcode') == 0:
                return {'success': True, 'msgid': result.get('msgid')}
            else:
                return {'success': False, 'error': result.get('errmsg'), 'errcode': result.get('errcode')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_markdown(self, user_id: str, content: str) -> Dict[str, Any]:
        """
        发送Markdown消息
        
        Args:
            user_id: 企业微信用户ID
            content: Markdown内容
        
        Returns:
            dict: 发送结果
        """
        if not self.is_enabled():
            return {'success': False, 'error': '企业微信推送未启用'}
        
        token = self.get_access_token()
        if not token:
            return {'success': False, 'error': '获取Access Token失败'}
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={token}"
        
        data = {
            "touser": user_id,
            "msgtype": "markdown",
            "agentid": int(self.agent_id),
            "markdown": {
                "content": content
            }
        }
        
        try:
            resp = requests.post(url, json=data, timeout=10)
            result = resp.json()
            
            if result.get('errcode') == 0:
                return {'success': True, 'msgid': result.get('msgid')}
            else:
                return {'success': False, 'error': result.get('errmsg'), 'errcode': result.get('errcode')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_task_notification(self, user_id: str, task_name: str, status: str, 
                               details: str = "", result_url: str = "") -> Dict[str, Any]:
        """
        发送任务完成通知（封装好的便捷方法）
        
        Args:
            user_id: 企业微信用户ID
            task_name: 任务名称
            status: 任务状态（完成/失败/进行中）
            details: 详情描述
            result_url: 结果链接
        
        Returns:
            dict: 发送结果
        """
        status_icon = {
            '完成': '✅',
            '成功': '✅',
            '失败': '❌',
            '进行中': '⏳',
            '排队中': '📋'
        }.get(status, '📢')
        
        title = f"{status_icon} {task_name}"
        
        description = f'<div class="highlight">{status}</div>'
        if details:
            description += f'\n{details}'
        
        return self.send_textcard(
            user_id=user_id,
            title=title,
            description=description,
            url=result_url,
            btn_text="查看详情" if result_url else "知道了"
        )
    
    def send_batch_complete_notification(self, user_id: str, task_type: str, 
                                         total_count: int, success_count: int,
                                         duration: str = "", result_url: str = "") -> Dict[str, Any]:
        """
        发送批量任务完成通知
        
        Args:
            user_id: 企业微信用户ID
            task_type: 任务类型（如"专利分析"、"OCR解析"）
            total_count: 总数量
            success_count: 成功数量
            duration: 耗时
            result_url: 结果链接
        
        Returns:
            dict: 发送结果
        """
        failed_count = total_count - success_count
        
        description = f'''<div class="highlight">处理完成</div>
处理数量：<font color="info">{total_count}</font> 条
成功：<font color="info">{success_count}</font> 条'''
        
        if failed_count > 0:
            description += f'\n失败：<font color="warning">{failed_count}</font> 条'
        
        if duration:
            description += f'\n耗时：{duration}'
        
        return self.send_textcard(
            user_id=user_id,
            title=f"✅ 批量{task_type}完成",
            description=description,
            url=result_url,
            btn_text="查看结果"
        )
    
    def generate_bind_qrcode(self, username: str) -> Dict[str, Any]:
        """
        生成绑定二维码
        
        Args:
            username: 系统用户名
        
        Returns:
            dict: 包含二维码URL和绑定token
        """
        if not self.is_configured():
            return {'success': False, 'error': '企业微信未配置'}
        
        bind_token = hashlib.md5(f"{username}{time.time()}".encode()).hexdigest()[:16]
        
        bind_data_file = os.path.join(BASE_DIR, 'backend', 'data', 'wecom_bind_tokens.json')
        
        try:
            os.makedirs(os.path.dirname(bind_data_file), exist_ok=True)
            
            bind_data = {}
            if os.path.exists(bind_data_file):
                with open(bind_data_file, 'r', encoding='utf-8') as f:
                    bind_data = json.load(f)
            
            bind_data[bind_token] = {
                'username': username,
                'created_at': time.time(),
                'expires_at': time.time() + 300
            }
            
            expired_tokens = [k for k, v in bind_data.items() 
                            if v.get('expires_at', 0) < time.time()]
            for t in expired_tokens:
                del bind_data[t]
            
            with open(bind_data_file, 'w', encoding='utf-8') as f:
                json.dump(bind_data, f, ensure_ascii=False, indent=2)
            
            # 使用回调URL作为redirect_uri（需要URL编码）
            from urllib.parse import quote
            redirect_uri = quote(f"https://ipx.asia/api/wecom/callback", safe='')
            qrcode_url = f"https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid={self.corp_id}&agentid={self.agent_id}&redirect_uri={redirect_uri}&state={bind_token}"
            
            return {
                'success': True,
                'bind_token': bind_token,
                'qrcode_url': qrcode_url,
                'expires_in': 300
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_bind_token(self, bind_token: str) -> Optional[str]:
        """
        验证绑定token并返回用户名
        
        Args:
            bind_token: 绑定token
        
        Returns:
            str: 用户名或None
        """
        bind_data_file = os.path.join(BASE_DIR, 'backend', 'data', 'wecom_bind_tokens.json')
        
        try:
            if not os.path.exists(bind_data_file):
                return None
            
            with open(bind_data_file, 'r', encoding='utf-8') as f:
                bind_data = json.load(f)
            
            if bind_token not in bind_data:
                return None
            
            token_info = bind_data[bind_token]
            
            if time.time() > token_info.get('expires_at', 0):
                del bind_data[bind_token]
                with open(bind_data_file, 'w', encoding='utf-8') as f:
                    json.dump(bind_data, f, ensure_ascii=False, indent=2)
                return None
            
            return token_info.get('username')
            
        except Exception:
            return None
    
    def clear_bind_token(self, bind_token: str):
        """清除已使用的绑定token"""
        bind_data_file = os.path.join(BASE_DIR, 'backend', 'data', 'wecom_bind_tokens.json')
        
        try:
            if os.path.exists(bind_data_file):
                with open(bind_data_file, 'r', encoding='utf-8') as f:
                    bind_data = json.load(f)
                
                if bind_token in bind_data:
                    del bind_data[bind_token]
                    with open(bind_data_file, 'w', encoding='utf-8') as f:
                        json.dump(bind_data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


wecom_service = WecomService()

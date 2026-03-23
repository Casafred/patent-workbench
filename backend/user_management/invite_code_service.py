"""
邀请码服务

处理邀请码的生成、验证、使用等功能
"""
import json
import secrets
import string
from datetime import datetime, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.absolute()
INVITE_CODES_FILE = SCRIPT_DIR / 'invite_codes.json'

STATUS_UNUSED = 'unused'
STATUS_USED = 'used'

DEFAULT_EXPIRE_DAYS = 30


def load_invite_codes():
    if not INVITE_CODES_FILE.exists():
        return {'codes': []}
    try:
        with open(INVITE_CODES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'codes' not in data:
                data = {'codes': data if isinstance(data, list) else []}
            return data
    except (json.JSONDecodeError, Exception):
        return {'codes': []}


def save_invite_codes(data):
    with open(INVITE_CODES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_single_code():
    segments = []
    for _ in range(3):
        segment = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
        segments.append(segment)
    return '-'.join(segments)


def generate_codes(count=1, expire_days=None):
    data = load_invite_codes()
    existing_codes = {c['code'] for c in data['codes']}
    
    new_codes = []
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if expire_days is None:
        expire_days = DEFAULT_EXPIRE_DAYS
    
    expires_at = None
    if expire_days > 0:
        expires_at = (datetime.now() + timedelta(days=expire_days)).strftime('%Y-%m-%d %H:%M:%S')
    
    attempts = 0
    max_attempts = count * 10
    
    while len(new_codes) < count and attempts < max_attempts:
        code = generate_single_code()
        attempts += 1
        
        if code not in existing_codes:
            code_record = {
                'code': code,
                'status': STATUS_UNUSED,
                'created_at': created_at,
                'expires_at': expires_at,
                'used_at': None,
                'used_by': None,
                'used_by_email': None
            }
            data['codes'].append(code_record)
            new_codes.append(code_record)
            existing_codes.add(code)
    
    if new_codes:
        save_invite_codes(data)
    
    return {
        'success': True,
        'generated_count': len(new_codes),
        'codes': new_codes
    }


def validate_code(code):
    if not code:
        return {'valid': False, 'message': '请输入邀请码'}
    
    code = code.strip().upper()
    data = load_invite_codes()
    
    for code_record in data['codes']:
        if code_record['code'] == code:
            if code_record['status'] == STATUS_USED:
                return {
                    'valid': False,
                    'message': '该邀请码已被使用'
                }
            
            if code_record['expires_at']:
                try:
                    expire_time = datetime.strptime(code_record['expires_at'], '%Y-%m-%d %H:%M:%S')
                    if datetime.now() > expire_time:
                        return {
                            'valid': False,
                            'message': '该邀请码已过期'
                        }
                except Exception:
                    pass
            
            return {
                'valid': True,
                'message': '邀请码有效',
                'code_record': code_record
            }
    
    return {'valid': False, 'message': '无效的邀请码'}


def use_code(code, username, email):
    if not code:
        return {'success': False, 'message': '邀请码不能为空'}
    
    code = code.strip().upper()
    data = load_invite_codes()
    
    for code_record in data['codes']:
        if code_record['code'] == code:
            if code_record['status'] == STATUS_USED:
                return {'success': False, 'message': '该邀请码已被使用'}
            
            if code_record['expires_at']:
                try:
                    expire_time = datetime.strptime(code_record['expires_at'], '%Y-%m-%d %H:%M:%S')
                    if datetime.now() > expire_time:
                        return {'success': False, 'message': '该邀请码已过期'}
                except Exception:
                    pass
            
            code_record['status'] = STATUS_USED
            code_record['used_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            code_record['used_by'] = username
            code_record['used_by_email'] = email
            
            save_invite_codes(data)
            
            return {
                'success': True,
                'message': '邀请码使用成功',
                'code_record': code_record
            }
    
    return {'success': False, 'message': '无效的邀请码'}


def get_all_codes():
    data = load_invite_codes()
    return data['codes']


def get_unused_codes():
    data = load_invite_codes()
    return [c for c in data['codes'] if c['status'] == STATUS_UNUSED]


def get_used_codes():
    data = load_invite_codes()
    return [c for c in data['codes'] if c['status'] == STATUS_USED]


def delete_code(code):
    code = code.strip().upper()
    data = load_invite_codes()
    
    original_count = len(data['codes'])
    data['codes'] = [c for c in data['codes'] if c['code'] != code]
    
    if len(data['codes']) < original_count:
        save_invite_codes(data)
        return {'success': True, 'message': '邀请码已删除'}
    
    return {'success': False, 'message': '邀请码不存在'}


def get_stats():
    data = load_invite_codes()
    codes = data['codes']
    
    total = len(codes)
    unused = len([c for c in codes if c['status'] == STATUS_UNUSED])
    used = len([c for c in codes if c['status'] == STATUS_USED])
    
    expired_unused = 0
    for c in codes:
        if c['status'] == STATUS_UNUSED and c['expires_at']:
            try:
                expire_time = datetime.strptime(c['expires_at'], '%Y-%m-%d %H:%M:%S')
                if datetime.now() > expire_time:
                    expired_unused += 1
            except Exception:
                pass
    
    return {
        'total': total,
        'unused': unused,
        'used': used,
        'expired_unused': expired_unused
    }

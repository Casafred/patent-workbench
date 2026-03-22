"""
Landing Image Manager routes.

This module handles image management for the landing page:
- List images from frontend/images folder
- Upload new images
- Delete images
- Get image info
- Save/Load image bindings configuration
"""

import os
import json
import uuid
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from backend.utils import create_response
from backend.config import Config, BASE_DIR

landing_image_bp = Blueprint('landing_image', __name__)

IMAGES_FOLDER = os.path.join(BASE_DIR, 'frontend', 'images')
CONFIG_FOLDER = os.path.join(BASE_DIR, 'backend', 'config')
BINDINGS_FILE = os.path.join(CONFIG_FOLDER, 'landing_image_bindings.json')
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'}
MAX_IMAGE_SIZE = 10 * 1024 * 1024


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def get_image_info(filepath):
    try:
        stat = os.stat(filepath)
        return {
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
    except Exception:
        return {'size': 0, 'modified': ''}


def load_bindings_config():
    try:
        if os.path.exists(BINDINGS_FILE):
            with open(BINDINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"[Landing Image] Load bindings error: {e}")
    return {'imageBindings': {}, 'gifBindings': {}}


def save_bindings_config(config):
    try:
        if not os.path.exists(CONFIG_FOLDER):
            os.makedirs(CONFIG_FOLDER, exist_ok=True)
        with open(BINDINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[Landing Image] Save bindings error: {e}")
        return False


@landing_image_bp.route('/landing/images', methods=['GET'])
def list_images():
    try:
        if not os.path.exists(IMAGES_FOLDER):
            os.makedirs(IMAGES_FOLDER, exist_ok=True)
            return create_response(data={'images': [], 'total': 0})
        
        images = []
        for filename in os.listdir(IMAGES_FOLDER):
            filepath = os.path.join(IMAGES_FOLDER, filename)
            if os.path.isfile(filepath):
                ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                if ext in ALLOWED_IMAGE_EXTENSIONS:
                    info = get_image_info(filepath)
                    images.append({
                        'name': filename,
                        'path': f'/frontend/images/{filename}',
                        'size': info['size'],
                        'modified': info['modified'],
                        'type': ext
                    })
        
        images.sort(key=lambda x: x['modified'], reverse=True)
        
        return create_response(data={'images': images, 'total': len(images)})
        
    except Exception as e:
        print(f"[Landing Image] List images error: {traceback.format_exc()}")
        return create_response(error=f'获取图片列表失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/images/upload', methods=['POST'])
def upload_image():
    try:
        if 'file' not in request.files:
            return create_response(error='没有上传文件', status_code=400)
        
        file = request.files['file']
        
        if file.filename == '':
            return create_response(error='没有选择文件', status_code=400)
        
        if not allowed_file(file.filename):
            return create_response(
                error=f'不支持的文件类型，允许的类型: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}',
                status_code=400
            )
        
        if not os.path.exists(IMAGES_FOLDER):
            os.makedirs(IMAGES_FOLDER, exist_ok=True)
        
        original_filename = secure_filename(file.filename)
        name, ext = os.path.splitext(original_filename)
        
        final_filename = original_filename
        counter = 1
        while os.path.exists(os.path.join(IMAGES_FOLDER, final_filename)):
            final_filename = f"{name}_{counter}{ext}"
            counter += 1
        
        filepath = os.path.join(IMAGES_FOLDER, final_filename)
        file.save(filepath)
        
        info = get_image_info(filepath)
        
        return create_response(data={
            'name': final_filename,
            'path': f'/frontend/images/{final_filename}',
            'size': info['size'],
            'modified': info['modified'],
            'message': '上传成功'
        })
        
    except Exception as e:
        print(f"[Landing Image] Upload error: {traceback.format_exc()}")
        return create_response(error=f'上传失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/images/delete', methods=['POST'])
def delete_image():
    try:
        data = request.get_json() or {}
        filename = data.get('filename')
        
        if not filename:
            return create_response(error='缺少文件名参数', status_code=400)
        
        filename = secure_filename(filename)
        
        if not allowed_file(filename):
            return create_response(error='不支持的文件类型', status_code=400)
        
        filepath = os.path.join(IMAGES_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return create_response(error='文件不存在', status_code=404)
        
        os.remove(filepath)
        
        return create_response(data={'message': f'已删除: {filename}'})
        
    except Exception as e:
        print(f"[Landing Image] Delete error: {traceback.format_exc()}")
        return create_response(error=f'删除失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/images/rename', methods=['POST'])
def rename_image():
    try:
        data = request.get_json() or {}
        old_name = data.get('old_name')
        new_name = data.get('new_name')
        
        if not old_name or not new_name:
            return create_response(error='缺少文件名参数', status_code=400)
        
        old_name = secure_filename(old_name)
        new_name = secure_filename(new_name)
        
        if not allowed_file(old_name) or not allowed_file(new_name):
            return create_response(error='不支持的文件类型', status_code=400)
        
        old_path = os.path.join(IMAGES_FOLDER, old_name)
        new_path = os.path.join(IMAGES_FOLDER, new_name)
        
        if not os.path.exists(old_path):
            return create_response(error='原文件不存在', status_code=404)
        
        if os.path.exists(new_path):
            return create_response(error='目标文件名已存在', status_code=400)
        
        os.rename(old_path, new_path)
        
        return create_response(data={
            'old_name': old_name,
            'new_name': new_name,
            'new_path': f'/frontend/images/{new_name}',
            'message': '重命名成功'
        })
        
    except Exception as e:
        print(f"[Landing Image] Rename error: {traceback.format_exc()}")
        return create_response(error=f'重命名失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/images/check', methods=['GET'])
def check_image_exists():
    try:
        filename = request.args.get('filename')
        
        if not filename:
            return create_response(error='缺少文件名参数', status_code=400)
        
        filename = secure_filename(filename)
        filepath = os.path.join(IMAGES_FOLDER, filename)
        
        exists = os.path.exists(filepath)
        info = get_image_info(filepath) if exists else None
        
        return create_response(data={
            'exists': exists,
            'filename': filename,
            'info': info
        })
        
    except Exception as e:
        print(f"[Landing Image] Check error: {traceback.format_exc()}")
        return create_response(error=f'检查失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/images/refresh', methods=['GET'])
def refresh_images():
    try:
        if not os.path.exists(IMAGES_FOLDER):
            os.makedirs(IMAGES_FOLDER, exist_ok=True)
            return create_response(data={'images': [], 'total': 0, 'timestamp': datetime.now().isoformat()})
        
        images = []
        for filename in os.listdir(IMAGES_FOLDER):
            filepath = os.path.join(IMAGES_FOLDER, filename)
            if os.path.isfile(filepath):
                ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                if ext in ALLOWED_IMAGE_EXTENSIONS:
                    info = get_image_info(filepath)
                    images.append({
                        'name': filename,
                        'path': f'/frontend/images/{filename}',
                        'size': info['size'],
                        'modified': info['modified'],
                        'type': ext
                    })
        
        images.sort(key=lambda x: x['modified'], reverse=True)
        
        return create_response(data={
            'images': images,
            'total': len(images),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Landing Image] Refresh error: {traceback.format_exc()}")
        return create_response(error=f'刷新失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings', methods=['GET'])
def get_bindings():
    try:
        config = load_bindings_config()
        return create_response(data=config)
    except Exception as e:
        print(f"[Landing Image] Get bindings error: {traceback.format_exc()}")
        return create_response(error=f'获取绑定配置失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings', methods=['POST'])
def save_bindings():
    try:
        data = request.get_json() or {}
        
        config = load_bindings_config()
        
        if 'imageBindings' in data:
            config['imageBindings'] = data['imageBindings']
        if 'gifBindings' in data:
            config['gifBindings'] = data['gifBindings']
        
        if save_bindings_config(config):
            return create_response(data={'message': '绑定配置保存成功', 'config': config})
        else:
            return create_response(error='保存绑定配置失败', status_code=500)
        
    except Exception as e:
        print(f"[Landing Image] Save bindings error: {traceback.format_exc()}")
        return create_response(error=f'保存绑定配置失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings/image', methods=['POST'])
def save_image_binding():
    try:
        data = request.get_json() or {}
        stack_id = data.get('stackId')
        stack_index = data.get('stackIndex')
        image_name = data.get('imageName')
        
        if not all([stack_id, stack_index is not None, image_name]):
            return create_response(error='缺少必要参数', status_code=400)
        
        config = load_bindings_config()
        
        if stack_id not in config['imageBindings']:
            config['imageBindings'][stack_id] = {}
        
        config['imageBindings'][stack_id][str(stack_index)] = image_name
        
        if save_bindings_config(config):
            return create_response(data={'message': '图片绑定保存成功'})
        else:
            return create_response(error='保存失败', status_code=500)
        
    except Exception as e:
        print(f"[Landing Image] Save image binding error: {traceback.format_exc()}")
        return create_response(error=f'保存图片绑定失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings/gif', methods=['POST'])
def save_gif_binding():
    try:
        data = request.get_json() or {}
        gif_id = data.get('gifId')
        image_name = data.get('imageName')
        
        if not all([gif_id, image_name]):
            return create_response(error='缺少必要参数', status_code=400)
        
        config = load_bindings_config()
        config['gifBindings'][gif_id] = image_name
        
        if save_bindings_config(config):
            return create_response(data={'message': 'GIF绑定保存成功'})
        else:
            return create_response(error='保存失败', status_code=500)
        
    except Exception as e:
        print(f"[Landing Image] Save gif binding error: {traceback.format_exc()}")
        return create_response(error=f'保存GIF绑定失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings/image', methods=['DELETE'])
def remove_image_binding():
    try:
        data = request.get_json() or {}
        stack_id = data.get('stackId')
        stack_index = data.get('stackIndex')
        
        if not all([stack_id, stack_index is not None]):
            return create_response(error='缺少必要参数', status_code=400)
        
        config = load_bindings_config()
        
        if stack_id in config['imageBindings']:
            config['imageBindings'][stack_id].pop(str(stack_index), None)
            if not config['imageBindings'][stack_id]:
                del config['imageBindings'][stack_id]
        
        if save_bindings_config(config):
            return create_response(data={'message': '图片绑定已移除'})
        else:
            return create_response(error='移除失败', status_code=500)
        
    except Exception as e:
        print(f"[Landing Image] Remove image binding error: {traceback.format_exc()}")
        return create_response(error=f'移除图片绑定失败: {str(e)}', status_code=500)


@landing_image_bp.route('/landing/bindings/gif', methods=['DELETE'])
def remove_gif_binding():
    try:
        data = request.get_json() or {}
        gif_id = data.get('gifId')
        
        if not gif_id:
            return create_response(error='缺少必要参数', status_code=400)
        
        config = load_bindings_config()
        config['gifBindings'].pop(gif_id, None)
        
        if save_bindings_config(config):
            return create_response(data={'message': 'GIF绑定已移除'})
        else:
            return create_response(error='移除失败', status_code=500)
        
    except Exception as e:
        print(f"[Landing Image] Remove gif binding error: {traceback.format_exc()}")
        return create_response(error=f'移除GIF绑定失败: {str(e)}', status_code=500)

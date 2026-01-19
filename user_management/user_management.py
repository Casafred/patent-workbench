"""
User management routes.

This module handles user management operations including listing users, adding users, and deleting users.
"""

import json
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash
from backend.config import USERS_FILE

# Create blueprint
user_management_bp = Blueprint('user_management', __name__)

def load_users():
    """
    Load users from JSON file.
    
    Returns:
        dict: Dictionary of username -> password_hash
    """
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_users(users):
    """
    Save users to JSON file.
    
    Args:
        users: Dictionary of username -> password_hash
    """
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)

@user_management_bp.route('/api/users', methods=['GET'])
def get_users():
    """
    Get all users.
    
    Returns:
        JSON response with users list
    """
    users = load_users()
    return jsonify({
        'success': True,
        'users': [{'username': username, 'password_hash': password_hash[:30] + '...'} for username, password_hash in users.items()]
    })

@user_management_bp.route('/api/users', methods=['POST'])
def add_user():
    """
    Add a new user.
    
    Returns:
        JSON response with success status
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'message': '用户名和密码不能为空'
            }), 400
        
        users = load_users()
        users[username] = generate_password_hash(password)
        save_users(users)
        
        return jsonify({
            'success': True,
            'message': f'用户 {username} 添加成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'添加用户失败: {str(e)}'
        }), 500

@user_management_bp.route('/api/users/<username>', methods=['DELETE'])
def delete_user(username):
    """
    Delete a user.
    
    Args:
        username: Username to delete
    
    Returns:
        JSON response with success status
    """
    try:
        users = load_users()
        
        if username not in users:
            return jsonify({
                'success': False,
                'message': f'用户 {username} 不存在'
            }), 404
        
        del users[username]
        save_users(users)
        
        return jsonify({
            'success': True,
            'message': f'用户 {username} 删除成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'删除用户失败: {str(e)}'
        }), 500

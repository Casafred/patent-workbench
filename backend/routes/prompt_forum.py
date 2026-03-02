"""
Prompt Forum API Routes

This module provides API endpoints for the prompt sharing forum.
"""

from flask import Blueprint, request, session, jsonify
from backend.services.prompt_forum_service import PromptForumService
from backend.utils.response import success_response, error_response

prompt_forum_bp = Blueprint('prompt_forum', __name__)


def get_current_username():
    """Get current logged-in username from session."""
    return session.get('user')


def require_login():
    """Check if user is logged in, return error response if not."""
    username = get_current_username()
    if not username:
        return None
    return username


@prompt_forum_bp.route('/api/prompts', methods=['GET'])
def get_prompts():
    """Get paginated list of prompts."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category_id = request.args.get('category_id', type=int)
    sort_by = request.args.get('sort_by', 'latest')
    keyword = request.args.get('keyword', '')
    
    if keyword and len(keyword.strip()) == 0:
        keyword = None
    
    result = PromptForumService.get_prompts_list(
        page=page,
        per_page=per_page,
        category_id=category_id,
        status='approved',
        sort_by=sort_by,
        keyword=keyword
    )
    
    return success_response(result)


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>', methods=['GET'])
def get_prompt(prompt_id):
    """Get prompt details by ID."""
    username = get_current_username()
    prompt = PromptForumService.get_prompt_by_id(prompt_id, username)
    
    if not prompt:
        return error_response('提示词不存在', 404)
    
    if prompt['status'] != 'approved' and prompt['author_username'] != username:
        return error_response('提示词不存在或未审核', 404)
    
    return success_response(prompt)


@prompt_forum_bp.route('/api/prompts', methods=['POST'])
def create_prompt():
    """Create a new prompt (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    data = request.get_json()
    if not data:
        return error_response('无效的请求数据')
    
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title:
        return error_response('标题不能为空')
    if not content:
        return error_response('提示词内容不能为空')
    if len(title) > 100:
        return error_response('标题不能超过100个字符')
    
    prompt_data = {
        'title': title,
        'description': data.get('description', '').strip(),
        'content': content,
        'category_id': data.get('category_id'),
        'author_username': username,
        'target_feature': data.get('target_feature', 'feature_1'),
        'model': data.get('model'),
        'temperature': data.get('temperature', 0.1),
        'output_fields': data.get('output_fields'),
        'tags': data.get('tags', [])
    }
    
    result = PromptForumService.create_prompt(prompt_data)
    
    if result['success']:
        return success_response(result)
    else:
        return error_response(result['message'])


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>/like', methods=['POST'])
def toggle_like(prompt_id):
    """Toggle like status for a prompt (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    result = PromptForumService.toggle_like(prompt_id, username)
    
    if result['success']:
        return success_response(result)
    else:
        return error_response(result.get('message', '操作失败'))


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>/favorite', methods=['POST'])
def toggle_favorite(prompt_id):
    """Toggle favorite status for a prompt (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    result = PromptForumService.toggle_favorite(prompt_id, username)
    
    if result['success']:
        return success_response(result)
    else:
        return error_response(result.get('message', '操作失败'))


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>/import', methods=['POST'])
def record_import(prompt_id):
    """Record an import action for a prompt (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    PromptForumService.record_import(prompt_id)
    
    prompt = PromptForumService.get_prompt_by_id(prompt_id, username)
    
    return success_response({
        'message': '导入成功',
        'prompt': prompt
    })


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>/comments', methods=['GET'])
def get_comments(prompt_id):
    """Get comments for a prompt."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    result = PromptForumService.get_comments(prompt_id, page, per_page)
    
    return success_response(result)


@prompt_forum_bp.route('/api/prompts/<int:prompt_id>/comments', methods=['POST'])
def create_comment(prompt_id):
    """Create a comment for a prompt (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    data = request.get_json()
    if not data:
        return error_response('无效的请求数据')
    
    content = data.get('content', '').strip()
    if not content:
        return error_response('评论内容不能为空')
    if len(content) > 1000:
        return error_response('评论内容不能超过1000个字符')
    
    result = PromptForumService.create_comment(prompt_id, username, content)
    
    if result['success']:
        return success_response(result)
    else:
        return error_response(result['message'])


@prompt_forum_bp.route('/api/prompts/categories', methods=['GET'])
def get_categories():
    """Get all prompt categories."""
    categories = PromptForumService.get_categories()
    return success_response({'categories': categories})


@prompt_forum_bp.route('/api/prompts/tags', methods=['GET'])
def get_popular_tags():
    """Get popular tags."""
    limit = request.args.get('limit', 20, type=int)
    tags = PromptForumService.get_popular_tags(limit)
    return success_response({'tags': tags})


@prompt_forum_bp.route('/api/prompts/user/mine', methods=['GET'])
def get_user_prompts():
    """Get current user's prompts (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    result = PromptForumService.get_user_prompts(username, page, per_page)
    
    return success_response(result)


@prompt_forum_bp.route('/api/prompts/user/favorites', methods=['GET'])
def get_user_favorites():
    """Get current user's favorite prompts (requires login)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    result = PromptForumService.get_user_favorites(username, page, per_page)
    
    return success_response(result)


@prompt_forum_bp.route('/api/prompts/featured', methods=['GET'])
def get_featured_prompts():
    """Get featured prompts for homepage."""
    limit = request.args.get('limit', 5, type=int)
    prompts = PromptForumService.get_featured_prompts(limit)
    return success_response({'prompts': prompts})


@prompt_forum_bp.route('/api/prompts/moderation/pending', methods=['GET'])
def get_pending_items():
    """Get pending items for moderation (admin only)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    item_type = request.args.get('type', 'prompt')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    if item_type not in ['prompt', 'comment']:
        return error_response('无效的类型')
    
    result = PromptForumService.get_pending_items(item_type, page, per_page)
    
    return success_response(result)


@prompt_forum_bp.route('/api/prompts/moderation/<item_type>/<int:item_id>/<action>', methods=['POST'])
def moderate_item(item_type, item_id, action):
    """Approve or reject an item (admin only)."""
    username = require_login()
    if not username:
        return error_response('请先登录', 401)
    
    if item_type not in ['prompt', 'comment']:
        return error_response('无效的类型')
    
    if action not in ['approve', 'reject']:
        return error_response('无效的操作')
    
    data = request.get_json() or {}
    reason = data.get('reason')
    
    result = PromptForumService.moderate_item(
        item_type, item_id, action, username, reason
    )
    
    if result['success']:
        return success_response(result)
    else:
        return error_response(result['message'])

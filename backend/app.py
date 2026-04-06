"""
Main Flask application.

This is the refactored entry point for the application using the
application factory pattern.
"""

import sys
import os
from datetime import datetime

# Add parent directory to path so Python can find the backend module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from backend.config import Config
from backend.extensions import init_extensions
from backend.routes import register_blueprints
from backend.services.auth_service import AuthService
from backend.services.prompt_forum_service import PromptForumService
from backend.services.email_trigger_service import (
    email_trigger_scheduler, 
    EmailTriggerWhitelist,
    ParsedCommand
)
from backend.services.cli_orchestrator import CLIOrchestrator


cli_orchestrator = CLIOrchestrator()


def execute_email_command(parsed: ParsedCommand, user_info: dict) -> tuple:
    """
    Execute CLI command from email trigger.
    
    Args:
        parsed: Parsed command object
        user_info: User information from whitelist
    
    Returns:
        tuple: (result_string, success_bool)
    """
    try:
        username = user_info.get('username', 'email_trigger')
        session_key = f"email_{username}_{int(datetime.now().timestamp())}"
        
        command_str = parsed.raw_input
        
        result_dict = cli_orchestrator.execute(
            user_input=command_str,
            session_key=session_key,
            user_id=username
        )
        
        if isinstance(result_dict, dict):
            if result_dict.get('success'):
                data = result_dict.get('data', {})
                if isinstance(data, dict):
                    summary = data.get('summary', {})
                    if summary:
                        title = summary.get('title', '')
                        answer = data.get('answer', '')
                        result = f"{title}\n\n{answer}" if title else answer
                    else:
                        result = result_dict.get('message', str(data))
                else:
                    result = str(data)
            else:
                result = f"执行失败: {result_dict.get('error', '未知错误')}"
        else:
            result = str(result_dict)
        
        if not result or result == '{}' or result == 'None':
            result = f"命令执行完成，无输出内容"
        
        return result, True
        
    except Exception as e:
        return f"执行失败: {str(e)}", False


def create_app(config_class=Config):
    """
    Application factory pattern.
    
    Creates and configures the Flask application with all necessary
    extensions, blueprints, and initialization.
    
    Args:
        config_class: Configuration class to use (default: Config)
    
    Returns:
        Flask application instance
    """
    # Create Flask app
    app = Flask(__name__, 
                static_folder=Config.STATIC_FOLDER,
                static_url_path=Config.STATIC_URL_PATH,
                template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates'))
    
    # Load configuration
    app.config.from_object(config_class)
    config_class.init_app(app)
    
    # 配置 Session Cookie - 关键！
    # 在阿里云/生产环境下，必须正确配置这些参数
    app.config['SESSION_COOKIE_SECURE'] = False  # 如果是 HTTPS 则设为 True
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # 防止 XSS 攻击
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # 允许跨域携带 Cookie
    app.config['SESSION_COOKIE_PATH'] = '/'  # Cookie 路径
    
    print("✓ Configuration loaded")
    
    # Initialize extensions (CORS, database pool, etc.)
    init_extensions(app)
    print("✓ Extensions initialized")
    
    # Register all blueprints
    register_blueprints(app)
    
    # Initialize database tables
    AuthService.init_database()
    print("✓ Database initialized")
    
    # Initialize prompt forum tables
    PromptForumService.init_tables()
    print("✓ Forum tables initialized")
    
    # Initialize email trigger service if enabled
    settings = EmailTriggerWhitelist.get_settings()
    if settings.get('enabled', False):
        email_trigger_scheduler.set_executor(execute_email_command)
        email_trigger_scheduler.start()
        print("✓ Email trigger service started")
    
    print("\n" + "="*50)
    print("🚀 Application created successfully!")
    print("="*50 + "\n")
    
    return app


# For development/testing
if __name__ == '__main__':
    app = create_app()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )

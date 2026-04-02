"""
CLI Agent - 集成版命令行智能代理

作为Web应用的API端点，提供CLI风格的交互方式。
AI可以通过自然语言命令调用系统各功能模块。
"""

import os
import sys
import json
import time
import traceback
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from flask import Blueprint, request, jsonify, session

from backend.middleware import validate_api_request
from backend.services import get_zhipu_client, get_aliyun_client
from backend.services.llm_service import get_llm_client, is_aliyun_model
from backend.utils import create_response

cli_agent_bp = Blueprint('cli_agent', __name__)


class CommandRegistry:
    """命令注册表 - 管理所有可用命令"""
    
    def __init__(self):
        self._commands: Dict[str, Dict] = {}
        self._register_builtin_commands()
    
    def _register_builtin_commands(self):
        """注册内置命令"""
        self._commands = {
            "patent": {
                "description": "专利爬取与分析",
                "subcommands": {
                    "search": {
                        "description": "爬取专利信息",
                        "params": ["patent_numbers"],
                        "example": "patent search US10123456 CN202310001234"
                    },
                    "analyze": {
                        "description": "AI分析专利",
                        "params": ["patent_data"],
                        "example": "patent analyze <专利数据>"
                    },
                    "translate": {
                        "description": "翻译专利文本",
                        "params": ["text", "text_type"],
                        "example": "patent translate --type claims <权利要求文本>"
                    },
                    "family": {
                        "description": "获取同族专利",
                        "params": ["patent_number"],
                        "example": "patent family US10123456"
                    },
                    "compare": {
                        "description": "对比同族专利权利要求",
                        "params": ["patent_numbers"],
                        "example": "patent compare US10123456 CN202310001234"
                    }
                }
            },
            "claims": {
                "description": "权利要求处理",
                "subcommands": {
                    "upload": {
                        "description": "上传Excel文件",
                        "params": ["file"],
                        "example": "claims upload <文件路径>"
                    },
                    "process": {
                        "description": "处理权利要求",
                        "params": ["file_id", "column_name"],
                        "example": "claims process --file <文件ID> --column 权利要求"
                    },
                    "status": {
                        "description": "查询处理状态",
                        "params": ["task_id"],
                        "example": "claims status <任务ID>"
                    },
                    "result": {
                        "description": "获取处理结果",
                        "params": ["task_id"],
                        "example": "claims result <任务ID>"
                    },
                    "export": {
                        "description": "导出结果",
                        "params": ["task_id", "format"],
                        "example": "claims export <任务ID> --format excel"
                    }
                }
            },
            "classify": {
                "description": "分类标引",
                "subcommands": {
                    "analyze": {
                        "description": "冷启动分析",
                        "params": ["samples"],
                        "example": "classify analyze <样本数据>"
                    },
                    "optimize": {
                        "description": "优化提示词",
                        "params": ["prompt"],
                        "example": "classify optimize <提示词>"
                    },
                    "import": {
                        "description": "智能导入分类体系",
                        "params": ["description"],
                        "example": "classify import <分类体系描述>"
                    }
                }
            },
            "ai": {
                "description": "AI模型调用",
                "subcommands": {
                    "chat": {
                        "description": "AI对话",
                        "params": ["message"],
                        "example": "ai chat 你好，请介绍一下自己"
                    },
                    "models": {
                        "description": "列出可用模型",
                        "params": [],
                        "example": "ai models"
                    }
                }
            },
            "help": {
                "description": "帮助信息",
                "subcommands": {}
            },
            "status": {
                "description": "系统状态",
                "subcommands": {}
            }
        }
    
    def get_command(self, name: str) -> Optional[Dict]:
        """获取命令信息"""
        return self._commands.get(name)
    
    def list_commands(self) -> List[Dict]:
        """列出所有命令"""
        return [
            {"name": name, "description": info["description"]}
            for name, info in self._commands.items()
        ]
    
    def get_help_text(self, command: str = None) -> str:
        """获取帮助文本"""
        if command and command in self._commands:
            cmd_info = self._commands[command]
            help_text = f"## {command}\n{cmd_info['description']}\n\n子命令:\n"
            for sub_name, sub_info in cmd_info.get("subcommands", {}).items():
                help_text += f"  {sub_name}: {sub_info['description']}\n"
                if sub_info.get("example"):
                    help_text += f"    示例: {sub_info['example']}\n"
            return help_text
        
        help_text = "# CLI Agent 命令帮助\n\n可用命令:\n"
        for name, info in self._commands.items():
            help_text += f"  {name}: {info['description']}\n"
        help_text += "\n输入 'help <命令>' 查看详细帮助"
        return help_text


class AICommandParser:
    """AI命令解析器 - 将自然语言转换为结构化命令"""
    
    SYSTEM_PROMPT = """你是一个命令解析助手。你的任务是将用户的自然语言输入转换为结构化的命令格式。

## 可用命令

### 专利相关 (patent)
- patent search <专利号列表> - 爬取专利信息
- patent analyze <专利数据> - AI分析专利
- patent translate --type <claims/description> <文本> - 翻译专利文本
- patent family <专利号> - 获取同族专利
- patent compare <专利号1> <专利号2> ... - 对比同族专利权利要求

### 权利要求处理 (claims)
- claims upload <文件路径> - 上传Excel文件
- claims process --file <文件ID> --column <列名> - 处理权利要求
- claims status <任务ID> - 查询处理状态
- claims result <任务ID> - 获取处理结果
- claims export <任务ID> --format <excel/json> - 导出结果

### 分类标引 (classify)
- classify analyze <样本数据> - 冷启动分析
- classify optimize <提示词> - 优化提示词
- classify import <分类体系描述> - 智能导入分类体系

### AI模型 (ai)
- ai chat <消息> - AI对话
- ai models - 列出可用模型

### 其他
- help [命令] - 帮助信息
- status - 系统状态

## 输出格式

请严格按照以下JSON格式输出解析结果：

```json
{
  "command": "命令名称",
  "subcommand": "子命令名称",
  "params": {
    "参数名": "参数值"
  },
  "confidence": 0.95,
  "suggestions": ["可选的建议"]
}
```

## 解析规则

1. 识别用户意图，匹配最合适的命令
2. 提取关键参数（专利号、文件路径、列名等）
3. 如果意图不明确，在suggestions中给出可能的命令建议
4. confidence表示解析确信度（0-1）

## 示例

用户输入: "帮我爬取US10123456这个专利"
输出: {"command": "patent", "subcommand": "search", "params": {"patent_numbers": ["US10123456"]}, "confidence": 0.95}

用户输入: "分析一下这些权利要求"
输出: {"command": "claims", "subcommand": "process", "params": {}, "confidence": 0.6, "suggestions": ["请先上传Excel文件", "使用 claims upload 上传文件"]}

用户输入: "翻译这段权利要求文本"
输出: {"command": "patent", "subcommand": "translate", "params": {"text_type": "claims"}, "confidence": 0.8}
"""

    def __init__(self, client, model: str = None, provider: str = 'zhipu'):
        self.client = client
        self.provider = provider
        # 根据提供商选择默认模型
        if model is None:
            if provider == 'aliyun':
                self.model = "qwen-plus"
            else:
                self.model = "GLM-4.7-Flash"
        else:
            self.model = model
    
    def parse(self, user_input: str) -> Dict[str, Any]:
        """解析用户输入"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result = json.loads(json_match.group())
                return result
            
            return {
                "command": "unknown",
                "subcommand": None,
                "params": {},
                "confidence": 0,
                "suggestions": ["无法解析命令，请使用 'help' 查看可用命令"]
            }
            
        except Exception as e:
            return {
                "command": "error",
                "subcommand": None,
                "params": {"error": str(e)},
                "confidence": 0,
                "suggestions": [f"解析错误: {str(e)}"]
            }


class CommandExecutor:
    """命令执行器 - 执行解析后的命令"""
    
    def __init__(self, app_context=None):
        self.app_context = app_context
        self.registry = CommandRegistry()
    
    def execute(self, parsed_command: Dict, request_context: Dict = None) -> Dict[str, Any]:
        """执行命令"""
        command = parsed_command.get("command")
        subcommand = parsed_command.get("subcommand")
        params = parsed_command.get("params", {})
        
        if request_context:
            params.update(request_context)
        
        handler_name = f"_handle_{command}"
        handler = getattr(self, handler_name, None)
        
        if handler is None:
            return {
                "success": False,
                "error": f"未知命令: {command}",
                "suggestions": ["使用 'help' 查看可用命令"]
            }
        
        try:
            return handler(subcommand, params)
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    def _handle_patent(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理专利相关命令"""
        if subcommand == "search":
            return self._patent_search(params)
        elif subcommand == "analyze":
            return self._patent_analyze(params)
        elif subcommand == "translate":
            return self._patent_translate(params)
        elif subcommand == "family":
            return self._patent_family(params)
        elif subcommand == "compare":
            return self._patent_compare(params)
        else:
            return {"success": False, "error": f"未知子命令: patent {subcommand}"}
    
    def _patent_search(self, params: Dict) -> Dict[str, Any]:
        """爬取专利"""
        from backend.routes.patent import get_scraper_instance, get_current_user_id
        
        patent_numbers = params.get("patent_numbers", [])
        if isinstance(patent_numbers, str):
            patent_numbers = patent_numbers.replace('\n', ' ').split()
        
        if not patent_numbers:
            return {"success": False, "error": "请提供专利号"}
        
        try:
            scraper = get_scraper_instance()
            user_id = params.get("user_id", "cli_user")
            
            results = scraper.scrape_patents_batch(
                patent_numbers,
                crawl_specification=params.get("crawl_specification", True),
                user_id=user_id
            )
            
            return {
                "success": True,
                "message": f"成功爬取 {len(results)} 个专利",
                "data": [r.to_dict() for r in results]
            }
        except Exception as e:
            return {"success": False, "error": f"爬取失败: {str(e)}"}
    
    def _patent_analyze(self, params: Dict) -> Dict[str, Any]:
        """AI分析专利"""
        patent_data = params.get("patent_data")
        if not patent_data:
            return {"success": False, "error": "请提供专利数据"}
        
        try:
            client, error = get_zhipu_client()
            if error:
                return {"success": False, "error": "AI服务不可用"}
            
            model = params.get("model", "GLM-4.7-Flash")
            temperature = params.get("temperature", 0.4)
            
            prompt = f"""请详细解读以下专利信息，并以JSON格式返回结构化的解读结果：

专利号: {patent_data.get('patent_number', 'N/A')}
标题: {patent_data.get('title', 'N/A')}
摘要: {patent_data.get('abstract', 'N/A')}
发明人: {', '.join(patent_data.get('inventors', []))}
受让人: {', '.join(patent_data.get('assignees', []))}
申请日期: {patent_data.get('application_date', 'N/A')}
公开日期: {patent_data.get('publication_date', 'N/A')}

请返回以下JSON格式：
{{
  "technical_field": "技术领域",
  "innovation_points": "创新点",
  "technical_solution": "技术方案",
  "application_scenarios": "应用场景",
  "advantages": "技术优势",
  "summary": "总结"
}}"""
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "你是一位专业的专利分析师。请严格按照JSON格式返回结果。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )
            
            content = response.choices[0].message.content
            
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                analysis = {"raw_content": content}
            
            return {
                "success": True,
                "data": analysis
            }
        except Exception as e:
            return {"success": False, "error": f"分析失败: {str(e)}"}
    
    def _patent_translate(self, params: Dict) -> Dict[str, Any]:
        """翻译专利文本"""
        text = params.get("text")
        text_type = params.get("text_type", "description")
        
        if not text:
            return {"success": False, "error": "请提供要翻译的文本"}
        
        try:
            client, error = get_zhipu_client()
            if error:
                return {"success": False, "error": "AI服务不可用"}
            
            model = params.get("model", "GLM-4.7-Flash")
            
            prompt = f"""请将以下专利{'权利要求' if text_type == 'claims' else '说明书'}翻译成中文：

{text}

请直接输出翻译结果，保持专业术语的准确性。"""
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "你是一位专业的专利翻译专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            translated = response.choices[0].message.content
            
            return {
                "success": True,
                "data": {
                    "original": text[:500] + "..." if len(text) > 500 else text,
                    "translated": translated
                }
            }
        except Exception as e:
            return {"success": False, "error": f"翻译失败: {str(e)}"}
    
    def _patent_family(self, params: Dict) -> Dict[str, Any]:
        """获取同族专利"""
        patent_number = params.get("patent_number")
        if not patent_number:
            return {"success": False, "error": "请提供专利号"}
        
        return {
            "success": True,
            "message": f"获取专利 {patent_number} 的同族专利",
            "api_endpoint": f"/api/patent/family/{patent_number}",
            "note": "请使用API端点获取详细数据"
        }
    
    def _patent_compare(self, params: Dict) -> Dict[str, Any]:
        """对比专利"""
        patent_numbers = params.get("patent_numbers", [])
        if len(patent_numbers) < 2:
            return {"success": False, "error": "请提供至少2个专利号进行对比"}
        
        return {
            "success": True,
            "message": f"对比 {len(patent_numbers)} 个专利的权利要求",
            "api_endpoint": "/api/patent/family/compare",
            "params": {"patent_numbers": patent_numbers},
            "note": "请使用API端点获取详细对比结果"
        }
    
    def _handle_claims(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理权利要求相关命令"""
        if subcommand == "upload":
            return {
                "success": True,
                "message": "请通过API上传文件",
                "api_endpoint": "/api/claims/upload",
                "note": "使用multipart/form-data格式上传Excel文件"
            }
        elif subcommand == "process":
            return {
                "success": True,
                "message": "启动权利要求处理",
                "api_endpoint": "/api/claims/process",
                "params": params
            }
        elif subcommand == "status":
            task_id = params.get("task_id")
            return {
                "success": True,
                "api_endpoint": f"/api/claims/status/{task_id}"
            }
        elif subcommand == "result":
            task_id = params.get("task_id")
            return {
                "success": True,
                "api_endpoint": f"/api/claims/result/{task_id}"
            }
        elif subcommand == "export":
            task_id = params.get("task_id")
            return {
                "success": True,
                "api_endpoint": f"/api/claims/export/{task_id}"
            }
        else:
            return {"success": False, "error": f"未知子命令: claims {subcommand}"}
    
    def _handle_classify(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理分类标引相关命令"""
        if subcommand == "analyze":
            return {
                "success": True,
                "api_endpoint": "/api/classify/cold_start",
                "params": params
            }
        elif subcommand == "optimize":
            return {
                "success": True,
                "api_endpoint": "/api/classify/optimize_prompt",
                "params": params
            }
        elif subcommand == "import":
            return {
                "success": True,
                "api_endpoint": "/api/classify/smart_import",
                "params": params
            }
        else:
            return {"success": False, "error": f"未知子命令: classify {subcommand}"}
    
    def _handle_ai(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理AI相关命令"""
        if subcommand == "chat":
            message = params.get("message")
            if not message:
                return {"success": False, "error": "请提供消息内容"}
            
            try:
                client, error = get_zhipu_client()
                if error:
                    return {"success": False, "error": "AI服务不可用"}
                
                model = params.get("model", "GLM-4.7-Flash")
                
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": message}],
                    temperature=0.7
                )
                
                return {
                    "success": True,
                    "data": {
                        "content": response.choices[0].message.content,
                        "model": model
                    }
                }
            except Exception as e:
                return {"success": False, "error": f"AI调用失败: {str(e)}"}
        
        elif subcommand == "models":
            return {
                "success": True,
                "data": {
                    "zhipu": ["GLM-4.7-Flash", "GLM-4-Flash", "GLM-4-Plus", "GLM-4-Long"],
                    "aliyun": ["qwen-plus", "qwen-turbo", "qwen-max", "deepseek-v3"]
                }
            }
        else:
            return {"success": False, "error": f"未知子命令: ai {subcommand}"}
    
    def _handle_help(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理帮助命令"""
        help_text = self.registry.get_help_text(subcommand)
        return {
            "success": True,
            "data": {
                "help": help_text,
                "commands": self.registry.list_commands()
            }
        }
    
    def _handle_status(self, subcommand: str, params: Dict) -> Dict[str, Any]:
        """处理状态命令"""
        return {
            "success": True,
            "data": {
                "status": "running",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
        }


# 创建全局实例
registry = CommandRegistry()
executor = CommandExecutor()


@cli_agent_bp.route('/cli/execute', methods=['POST'])
def execute_command():
    """
    执行CLI命令
    
    Request body:
        - input: 用户输入的自然语言命令
        - mode: 解析模式 (auto/direct)
        
    Returns:
        执行结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        user_input = req_data.get('input', '')
        mode = req_data.get('mode', 'auto')
        
        if not user_input:
            return create_response(error="请输入命令")
        
        # 尝试获取可用的AI客户端（智谱或阿里云）
        client = None
        error_msg = None
        provider = None
        
        # 首先尝试智谱AI
        client, error_msg = get_zhipu_client()
        if client:
            provider = 'zhipu'
        else:
            # 如果智谱不可用，尝试阿里云
            client, error_msg = get_aliyun_client()
            if client:
                provider = 'aliyun'
        
        if not client:
            return create_response(error="AI服务不可用，请配置智谱AI或阿里云API Key")
        
        parser = AICommandParser(client, provider=provider)
        parsed = parser.parse(user_input)
        
        if parsed.get("confidence", 0) < 0.5:
            return create_response(data={
                "success": False,
                "parsed": parsed,
                "message": "命令解析置信度较低，请确认命令是否正确",
                "suggestions": parsed.get("suggestions", [])
            })
        
        request_context = {
            "user_id": session.get("user_id", "anonymous"),
            "session_id": session.get("session_id")
        }
        
        result = executor.execute(parsed, request_context)
        
        return create_response(data={
            "success": result.get("success", False),
            "parsed": parsed,
            "result": result
        })
        
    except Exception as e:
        print(f"Error in execute_command: {traceback.format_exc()}")
        return create_response(error=f"执行失败: {str(e)}")


@cli_agent_bp.route('/cli/parse', methods=['POST'])
def parse_command():
    """
    解析命令（不执行）
    
    Request body:
        - input: 用户输入
        
    Returns:
        解析结果
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        user_input = req_data.get('input', '')
        
        if not user_input:
            return create_response(error="请输入命令")
        
        # 尝试获取可用的AI客户端（智谱或阿里云）
        client = None
        provider = None
        
        client, error = get_zhipu_client()
        if client:
            provider = 'zhipu'
        else:
            client, error = get_aliyun_client()
            if client:
                provider = 'aliyun'
        
        if not client:
            return create_response(error="AI服务不可用，请配置智谱AI或阿里云API Key")
        
        parser = AICommandParser(client, provider=provider)
        parsed = parser.parse(user_input)
        
        return create_response(data={
            "parsed": parsed,
            "help": registry.get_help_text(parsed.get("command"))
        })
        
    except Exception as e:
        return create_response(error=f"解析失败: {str(e)}")


@cli_agent_bp.route('/cli/help', methods=['GET'])
def get_help():
    """获取帮助信息"""
    command = request.args.get('command')
    help_text = registry.get_help_text(command)
    
    return create_response(data={
        "help": help_text,
        "commands": registry.list_commands()
    })


@cli_agent_bp.route('/cli/commands', methods=['GET'])
def list_commands():
    """列出所有可用命令"""
    return create_response(data={
        "commands": registry.list_commands()
    })


@cli_agent_bp.route('/cli/chat', methods=['POST'])
def chat():
    """
    AI对话模式
    
    支持多轮对话，AI会理解上下文并执行相应操作
    """
    is_valid, error_response = validate_api_request()
    if not is_valid:
        return error_response
    
    try:
        req_data = request.get_json()
        messages = req_data.get('messages', [])
        auto_execute = req_data.get('auto_execute', True)
        
        if not messages:
            return create_response(error="请提供对话消息")
        
        # 尝试获取可用的AI客户端（智谱或阿里云）
        client = None
        provider = None
        model = None
        
        client, error = get_zhipu_client()
        if client:
            provider = 'zhipu'
            model = "GLM-4.7-Flash"
        else:
            client, error = get_aliyun_client()
            if client:
                provider = 'aliyun'
                model = "qwen-plus"
        
        if not client:
            return create_response(error="AI服务不可用，请配置智谱AI或阿里云API Key")
        
        system_prompt = f"""你是一个智能助手，帮助用户使用CLI Agent系统。

{registry.get_help_text()}

## 你的任务

1. 理解用户的自然语言请求
2. 将请求转换为CLI命令格式
3. 如果用户确认，执行命令并返回结果
4. 如果需要更多信息，询问用户

## 响应格式

当需要执行命令时，使用以下JSON格式：
```json
{{
  "type": "command",
  "command": {{
    "command": "命令名",
    "subcommand": "子命令",
    "params": {{}}
  }},
  "explanation": "命令说明"
}}
```

当需要回复用户时，使用普通文本。"""

        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = client.chat.completions.create(
            model=model,
            messages=full_messages,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        command_match = re.search(r'"type":\s*"command"', content)
        
        if command_match and auto_execute:
            json_match = re.search(r'\{[\s\S]*"type":\s*"command"[\s\S]*\}', content)
            if json_match:
                try:
                    command_data = json.loads(json_match.group())
                    parsed = command_data.get("command", {})
                    
                    request_context = {
                        "user_id": session.get("user_id", "anonymous"),
                        "session_id": session.get("session_id")
                    }
                    
                    result = executor.execute(parsed, request_context)
                    
                    return create_response(data={
                        "type": "command_result",
                        "content": content,
                        "command": parsed,
                        "result": result
                    })
                except json.JSONDecodeError:
                    pass
        
        return create_response(data={
            "type": "chat",
            "content": content
        })
        
    except Exception as e:
        print(f"Error in chat: {traceback.format_exc()}")
        return create_response(error=f"对话失败: {str(e)}")

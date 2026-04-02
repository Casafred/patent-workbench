# CLI Agent 用户指南

## 概述

CLI Agent 是一个基于命令行界面的智能代理工具，提供Excel文件处理、AI模型调用、API接口集成等功能。所有操作完全通过文本命令完成，无需图形界面支持。

## 安装

### 系统要求

- Python 3.8+
- Windows / Linux / macOS

### 安装依赖

```bash
pip install pandas openpyxl zhipuai openai requests
```

### 启动方式

**交互模式：**
```bash
python -m cli_agent.main
# 或
./cli_agent.sh        # Linux/Mac
cli_agent.bat         # Windows
```

**单命令模式：**
```bash
python -m cli_agent.main -c "help"
```

## 命令结构

```
<模块> <子命令> [参数] [选项]
```

## 内置命令

| 命令 | 说明 |
|------|------|
| `help [command]` | 显示帮助信息 |
| `version` | 显示版本信息 |
| `exit` / `quit` | 退出程序 |
| `clear` | 清屏 |
| `history [count]` | 显示命令历史 |
| `status` | 显示系统状态 |

## Excel 模块

### 加载文件
```
excel load <文件路径> [--header-row 0] [--max-rows 1000]
```

### 获取文件信息
```
excel info <文件路径>
```

### 列出列名
```
excel columns <文件路径>
```

### 搜索数据
```
excel search <文件路径> --column <列名> --query <关键词> [--limit 50]
```

### 拼接列
```
excel concat <文件路径> --columns 列1,列2,列3 [--separator "\n\n"] [--output output.xlsx]
```

### 导出数据
```
excel export <文件路径> --output <输出路径> [--format xlsx]
```

### 预览文件
```
excel preview <文件路径> [--rows 10]
```

### 验证文件
```
excel validate <文件路径>
```

## AI 模块

### 注册AI服务提供商
```
ai register <provider> <api_key>
```

支持的提供商：
- `zhipu` - 智谱AI
- `aliyun` - 阿里云百炼
- `deepseek` - DeepSeek

### 发送聊天消息
```
ai chat "你的问题" [--provider zhipu] [--model glm-4-flash] [--system "系统提示"]
```

### 列出可用模型
```
ai models [--provider zhipu]
```

### 列出提供商
```
ai providers
```

### 设置默认提供商
```
ai set-default <provider>
```

### 查看状态
```
ai status
```

### 批量处理
```
ai batch "提示1" "提示2" "提示3" [--output results.json]
```

### 文本分析
```
ai analyze "文本内容" --task summarize
```

任务类型：
- `summarize` - 总结
- `extract` - 提取关键信息
- `translate` - 翻译
- `classify` - 分类
- `sentiment` - 情感分析

## API 模块

### 注册API端点
```
api register <名称> <基础URL> [--auth-type bearer] [--auth-value token]
```

认证类型：
- `bearer` - Bearer Token
- `basic` - Basic Auth
- `api_key` - API Key
- `custom` - 自定义请求头

### 发送请求
```
api get <端点名> [--path /api/users] [--params key=value]
api post <端点名> [--path /api/users] [--json '{"name": "test"}']
api put <端点名> [--path /api/users/1] [--json '{"name": "updated"}']
api delete <端点名> [--path /api/users/1]
```

### 管理端点
```
api list              # 列出所有端点
api info <名称>       # 查看端点详情
api test <名称>       # 测试端点连接
api remove <名称>     # 移除端点
api clear-cache       # 清除缓存
```

## 配置模块

### 查看配置
```
config get [key]              # 获取所有配置或特定配置
config show                   # 显示配置概览
config path                   # 显示配置文件路径
```

### 设置配置
```
config set <key> <value>      # 设置配置值
```

### API密钥管理
```
config set-api-key <provider> <api_key>
config get-api-key <provider>
config delete-api-key <provider>
config list-secrets
```

### 导入导出
```
config export <输出路径>
config import <输入路径> [--include-secrets]
```

### 重置配置
```
config reset
```

## 配置文件

配置文件位于用户目录下的 `.cli_agent` 文件夹：

- `config.json` - 主配置文件
- `secrets.json` - 密钥存储（API密钥等）
- `command_history.json` - 命令历史

### 环境变量

| 变量名 | 说明 |
|--------|------|
| `CLI_AGENT_DEBUG` | 启用调试模式 |
| `CLI_AGENT_LOG_LEVEL` | 日志级别 |
| `CLI_AGENT_DEFAULT_PROVIDER` | 默认AI提供商 |
| `CLI_AGENT_DEFAULT_MODEL` | 默认模型 |
| `CLI_AGENT_TIMEOUT` | 超时时间 |

## 示例

### Excel处理示例

```bash
# 加载Excel文件
> excel load data.xlsx
✓ 文件加载成功: 1000 行, 5 列

# 查看列名
> excel columns data.xlsx
✓ 成功
  index: 0
  name: 专利号
  ...

# 搜索数据
> excel search data.xlsx --column 专利号 --query CN2023
✓ 找到 15 条匹配记录
```

### AI调用示例

```bash
# 注册智谱AI
> ai register zhipu your-api-key
✓ 已注册AI服务提供商: zhipu

# 发送聊天
> ai chat "请解释什么是专利" --model glm-4-flash
✓ 成功
  content: 专利是一种知识产权...

# 批量处理
> ai batch "翻译成英文：你好" "翻译成英文：谢谢" --output results.json
✓ 批量处理完成: 2 个提示
```

### API调用示例

```bash
# 注册API端点
> api register myapi https://api.example.com --auth-type bearer --auth-value your-token
✓ 已注册API端点: myapi

# 发送GET请求
> api get myapi --path /users
✓ 成功
  status_code: 200
  data: [...]
```

## 错误处理

CLI Agent 提供详细的错误信息和恢复建议：

```bash
> excel load nonexistent.xlsx
✗ 文件不存在: nonexistent.xlsx

> ai chat "hello"
✗ 提供商 zhipu 未注册，请先设置API密钥
  提示: 使用 ai register zhipu <api_key> 注册
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 取消当前输入 |
| `Ctrl+D` | 退出程序 |
| `↑` / `↓` | 浏览历史命令 |
| `Tab` | 命令补全 |

## 扩展开发

### 添加新命令

1. 在 `cli_agent/commands/` 下创建新模块
2. 继承命令处理器模式
3. 在 `main.py` 中注册命令处理器

### 添加新AI提供商

1. 在 `cli_agent/services/ai_service.py` 中添加新的 Provider 类
2. 继承 `BaseAIProvider`
3. 实现必要的方法

## 常见问题

**Q: 如何保存API密钥？**
```
config set-api-key zhipu your-api-key
```

**Q: 如何查看命令历史？**
```
history 20    # 查看最近20条命令
```

**Q: 如何启用调试模式？**
```
# 启动时设置日志级别
python -m cli_agent.main --log-level DEBUG
```

**Q: 配置文件在哪里？**
```
config path
```

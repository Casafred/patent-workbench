---
name: "ai-integrator"
description: "Helps integrate AI/LLM APIs including ZhipuAI, OpenAI, and Alibaba Bailian. Invoke when working with AI features, streaming responses, or model configuration."
---

# AI Integrator Skill

This skill helps integrate AI/LLM APIs including ZhipuAI, OpenAI, and Alibaba Bailian for this patent analysis platform.

## When to Invoke

- User is implementing AI chat features
- User needs to configure AI models
- User is debugging streaming responses
- User wants to add new AI providers
- User needs help with prompt engineering

## Supported AI Providers

| Provider | Models | Use Case |
|----------|--------|----------|
| ZhipuAI | glm-4, glm-4-flash, glm-4-plus | Primary AI, Chinese optimized |
| OpenAI | gpt-4, gpt-3.5-turbo | Alternative provider |
| Alibaba Bailian | qwen-turbo, qwen-plus | Chinese AI, cost-effective |

## Project AI Architecture

```
backend/
├── services/
│   ├── llm/
│   │   └── __init__.py
│   ├── llm_service.py      # LLM service layer
│   └── api_service.py      # API management
├── routes/
│   ├── chat.py             # Chat endpoints
│   └── async_batch.py      # Batch processing
└── config/
    └── models.json         # Model configurations
```

## ZhipuAI Integration

### Basic Usage
```python
from zhipuai import ZhipuAI

client = ZhipuAI(api_key=user_api_key)

response = client.chat.completions.create(
    model="glm-4-flash",
    messages=[
        {"role": "user", "content": "你好"}
    ]
)
print(response.choices[0].message.content)
```

### Streaming Response
```python
def stream_chat(messages, model="glm-4-flash", api_key=None):
    client = ZhipuAI(api_key=api_key)
    
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True
    )
    
    for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

### Flask Streaming Endpoint
```python
@bp.route('/api/stream_chat', methods=['POST'])
def stream_chat():
    data = request.get_json()
    messages = data.get('messages', [])
    model = data.get('model', 'glm-4-flash')
    api_key = get_user_api_key()
    
    def generate():
        for chunk in llm_service.stream_chat(messages, model, api_key):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')
```

## OpenAI Integration

```python
from openai import OpenAI

client = OpenAI(api_key=user_api_key)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)
```

## Alibaba Bailian Integration

```python
import dashscope
from dashscope import Generation

dashscope.api_key = user_api_key

response = Generation.call(
    model='qwen-turbo',
    messages=[
        {'role': 'user', 'content': '你好'}
    ],
    result_format='message'
)
```

## Model Configuration

```json
// config/models.json
{
  "zhipu": {
    "models": [
      {
        "id": "glm-4-flash",
        "name": "GLM-4-Flash",
        "type": "chat",
        "max_tokens": 4096,
        "supports_streaming": true
      },
      {
        "id": "glm-4-plus",
        "name": "GLM-4-Plus",
        "type": "chat",
        "max_tokens": 8192,
        "supports_streaming": true
      }
    ]
  },
  "openai": {
    "models": [
      {
        "id": "gpt-4",
        "name": "GPT-4",
        "type": "chat",
        "max_tokens": 8192
      }
    ]
  }
}
```

## Frontend Streaming

```javascript
// js/modules/chat/chat-api.js
export class ChatAPI {
  static async streamChat(messages, model, onChunk, onComplete) {
    const response = await fetch('/api/stream_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onComplete?.();
        break;
      }
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          onChunk(data.content);
        }
      }
    }
  }
}
```

## Prompt Engineering

### System Prompts
```python
PATENT_SYSTEM_PROMPT = """你是一个专业的专利分析助手。
你的任务是帮助用户理解和分析专利文档。

请遵循以下原则：
1. 使用专业但易懂的语言
2. 提供具体的引用和解释
3. 识别关键技术和创新点
4. 比较相关专利的异同
"""
```

### Message Formatting
```python
def format_messages(user_message, history=None, system_prompt=None):
    messages = []
    
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt
        })
    
    if history:
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    return messages
```

## Error Handling

```python
def safe_ai_call(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as e:
        error_msg = str(e)
        
        if "api_key" in error_msg.lower():
            return {"error": "API密钥无效，请检查配置"}
        elif "rate_limit" in error_msg.lower():
            return {"error": "请求过于频繁，请稍后重试"}
        elif "timeout" in error_msg.lower():
            return {"error": "请求超时，请重试"}
        else:
            return {"error": f"AI服务错误: {error_msg}"}
```

## Best Practices

1. **API Key Security**: Never log or expose API keys
2. **Rate Limiting**: Implement request throttling
3. **Error Recovery**: Handle API failures gracefully
4. **Streaming**: Use streaming for long responses
5. **Caching**: Cache common responses when appropriate
6. **Cost Control**: Monitor token usage
7. **User Experience**: Show loading states and progress

## Common Issues

| Issue | Solution |
|-------|----------|
| API key invalid | Check key format and permissions |
| Rate limit exceeded | Implement backoff and retry |
| Timeout | Increase timeout or use streaming |
| Empty response | Check message format and model availability |
| High latency | Use faster model (glm-4-flash) |

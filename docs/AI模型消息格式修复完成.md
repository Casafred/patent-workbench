# AI模型消息格式修复完成

## 问题描述
功能八AI说明书处理器调用智谱AI API时报错：
```
Error code: 400, with error text {"error":{"code":"1211","message":"模型不存在，请检查模型代码。"}}
```

## 根本原因
对比功能六（patent.py）和聊天功能（chat.py）的成功实现，发现问题：

**失败的调用方式（功能八）：**
```python
response = self.client.chat.completions.create(
    model=model_name,
    messages=[
        {"role": "user", "content": prompt}  # ❌ 只有user消息
    ],
    stream=False,
    temperature=0.1,
    max_tokens=4000
)
```

**成功的调用方式（功能六、聊天）：**
```python
messages = [
    {
        "role": "system",
        "content": "系统提示词"
    },
    {
        "role": "user", 
        "content": prompt
    }
]

response = client.chat.completions.create(
    model=model,
    messages=messages,
    stream=False,
    temperature=0.4
)
```

## 修复方案

### 1. 修复 `translation_service.py`
添加system角色消息：
```python
messages = [
    {
        "role": "system",
        "content": "你是一位专业的专利文献翻译专家。请准确翻译专利文本，保持专业术语的准确性。"
    },
    {
        "role": "user",
        "content": prompt
    }
]
```

### 2. 修复 `ai_component_extractor.py`
添加system角色消息：
```python
messages = [
    {
        "role": "system",
        "content": "你是一个专业的专利文献分析助手。请严格按照要求的JSON格式返回结果。"
    },
    {
        "role": "user",
        "content": prompt
    }
]
```

### 3. 移除不必要的参数
- 移除 `max_tokens` 参数（功能六和聊天功能都没有使用）
- 保持 `stream=False` 和 `temperature` 参数

## 修改文件
- ✅ `backend/services/ai_description/translation_service.py`
- ✅ `backend/services/ai_description/ai_component_extractor.py`

## 测试验证
1. 打开功能八
2. 上传专利附图
3. 输入说明书文本
4. 开启"AI说明书解析"开关
5. 点击"开始处理"
6. 验证AI模型调用成功，返回部件标记

## 技术要点
- 智谱AI API要求messages数组包含system和user两个角色
- system消息用于设定AI的行为和输出格式
- user消息包含实际的任务内容
- 必须与其他功能（功能六、聊天）保持一致的调用方式

## 相关文档
- 参考实现：`backend/routes/patent.py`
- 参考实现：`backend/routes/chat.py`
- 用户提供的正确格式示例（使用requests库）

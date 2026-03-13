# 阿里云百炼联网搜索功能使用指南

## 目录

- [功能概述](#功能概述)
- [技术实现](#技术实现)
- [配置方法](#配置方法)
- [使用场景](#使用场景)
- [注意事项](#注意事项)
- [常见问题](#常见问题)

---

## 功能概述

阿里云百炼联网搜索功能允许 AI 模型在回答问题时自动检索互联网上的最新信息，并将搜索结果与 AI 知识无缝融合，提供准确、及时的回答。

### 核心特性

- **自动搜索**：模型根据问题自动检索相关网络信息
- **智能整合**：将搜索结果与 AI 知识无缝融合
- **来源标注**：回答中会自动标注信息来源链接（格式：`[ref_1]`、`[ref_2]`）
- **基于夸克**：使用夸克搜索引擎，精准检索相关信息

### 支持模型

以下阿里云模型支持联网搜索功能：

| 模型名称 | 模型 ID | 上下文 | 价格 | 特点 |
|---------|---------|--------|------|------|
| Qwen-Flash | `qwen-flash` | 1M | 0.15 元/百万 tokens | 极速低价，性价比高 |
| Qwen-Turbo | `qwen-turbo` | 128K | 0.3 元/百万 tokens | 快速响应 |
| Qwen-Plus | `qwen-plus` | 1M | 0.8 元/百万 tokens | 性价比首选（推荐） |
| Qwen3-Max | `qwen3-max` | 262K | 2.5 元/百万 tokens | 最新旗舰，效果最佳 |

---

## 技术实现

### API 接口规范

阿里云百炼通过 `enable_search` 参数启用联网搜索功能：

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)

response = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {"role": "user", "content": "2026 年最新的 AI 技术趋势是什么？"}
    ],
    extra_body={"enable_search": True}
)

print(response.choices[0].message.content)
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | 是 | 模型名称，必须是支持联网搜索的模型 |
| `messages` | array | 是 | 对话消息列表 |
| `extra_body.enable_search` | boolean | 否 | 是否启用联网搜索，默认 `false` |
| `extra_body.enable_thinking` | boolean | 否 | 是否启用思考模式，可与搜索同时启用 |
| `extra_body.thinking_budget` | integer | 否 | 思考过程最大 Token 数 |

### 响应格式

阿里云百炼的响应格式与 OpenAI 兼容：

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "根据最新资料，2026 年 AI 技术呈现以下趋势...\n\n[ref_1] [ref_2]"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 200,
    "total_tokens": 250
  }
}
```

### 引用格式

模型会在回答中使用 `[ref_1]`、`[ref_2]` 等格式标注信息来源，前端会自动将这些引用转换为可点击的链接。

---

## 配置方法

### 后端配置

#### 1. 配置阿里云 API Key

在环境变量中配置阿里云百炼 API Key：

```bash
export ALIYUN_API_KEY="sk-xxx"
```

或在代码中直接传入：

```python
from backend.services.llm_service import get_aliyun_client

client, error = get_aliyun_client(api_key="sk-xxx")
```

#### 2. 启用联网搜索

在请求中添加 `enable_search` 参数：

```python
# 流式调用
def stream_chat_aliyun(req_data):
    model = req_data.get('model', 'qwen-plus')
    messages = req_data.get('messages', [])
    enable_search = req_data.get('enable_web_search', False)
    
    request_params = build_aliyun_request_params(
        model=model,
        messages=messages,
        enable_search=enable_search,
        stream=True
    )
    
    response = client.chat.completions.create(**request_params)
```

### 前端配置

#### 1. 开启联网搜索

在前端点击联网搜索按钮（🔍图标），选择"阿里云联网搜索配置"。

#### 2. 配置说明

前端会自动识别当前服务商（阿里云/智谱），并显示相应的配置界面：

- **阿里云**：无需配置搜索引擎和数量，模型自动决定最优搜索策略
- **智谱**：可配置搜索引擎类型、返回数量、内容长度等

#### 3. 代码示例

```javascript
// 发送请求时自动添加搜索参数
const requestPayload = {
    model: 'qwen-plus',
    messages: messages,
    enable_web_search: true  // 前端统一参数
};

// 后端会根据服务商转换为对应的参数
// 阿里云：extra_body.enable_search = true
// 智谱：tools = [{type: "web_search", ...}]
```

---

## 使用场景

### 适用场景

1. **时事新闻**：查询最新发生的新闻事件
   - 示例："今天杭州发生了什么大事？"
   
2. **科技动态**：了解最新的技术发展和产品发布
   - 示例："2026 年最新的 AI 技术趋势是什么？"

3. **政策法规**：查询最新的政策法规信息
   - 示例："2026 年高新技术企业认定标准是什么？"

4. **数据查询**：需要实时数据的查询
   - 示例："今天杭州的空气质量如何？"

5. **产品评测**：了解最新产品的评测信息
   - 示例："iPhone 17 Pro 的评测怎么样？"

### 不适用场景

1. **历史事实**：已经确定的历史事实不需要搜索
   - 示例："中华人民共和国成立于哪一年？"

2. **数学计算**：纯数学问题不需要搜索
   - 示例："1234 × 5678 = ?"

3. **代码生成**：编程问题通常不需要搜索
   - 示例："用 Python 写一个快速排序"

---

## 注意事项

### ⚠️ 重要提示

1. **模型限制**
   - 仅支持特定模型：`qwen-flash`、`qwen-turbo`、`qwen-plus`、`qwen3-max`
   - 其他模型（如 `qwq-plus`、`deepseek-r1`）不支持联网搜索

2. **参数配置**
   - 阿里云只需设置 `enable_search: true`，无需配置搜索引擎和数量
   - 模型会自动决定最优的搜索策略和返回数量

3. **引用格式**
   - 回答中的引用格式为 `[ref_1]`、`[ref_2]`
   - 前端会自动将这些引用转换为可点击的链接

4. **搜索模式组合**
   - 可以同时启用思考模式和联网搜索
   - 推荐组合：`enable_thinking: true` + `enable_search: true`
   - 适合复杂问题的深度分析和准确回答

5. **费用说明**
   - 联网搜索功能不额外收费
   - 仅按模型调用的 tokens 数量计费

### 最佳实践

1. **选择合适的模型**
   - 日常查询：`qwen-plus`（性价比首选）
   - 复杂问题：`qwen3-max`（效果最佳）
   - 快速响应：`qwen-turbo`

2. **合理设置参数**
   - 简单问题：仅启用搜索
   - 复杂问题：同时启用搜索和思考模式

3. **结果验证**
   - 查看搜索结果来源，验证信息可靠性
   - 对比多个来源，确保信息准确性

---

## 常见问题

### Q1: 如何判断是否启用了联网搜索？

**A**: 有以下几种方式：

1. **前端界面**：联网搜索按钮会高亮显示，并显示"阿里云联网搜索已启用"提示
2. **响应内容**：回答中会包含 `[ref_1]`、`[ref_2]` 等引用标记
3. **来源列表**：回答下方会显示搜索来源列表

### Q2: 为什么我的搜索没有返回来源？

**A**: 可能的原因：

1. 模型认为不需要搜索即可回答问题
2. 搜索到的信息与问题相关性不高
3. 模型选择了不展示搜索结果

建议：尝试重新提问，或使用更具体的问题描述。

### Q3: 联网搜索会增加响应时间吗？

**A**: 是的，会增加一定的响应时间：

- 普通回答：1-3 秒
- 联网搜索：3-8 秒（取决于搜索复杂度）

但这是值得的，因为可以获得最新、最准确的信息。

### Q4: 可以同时启用思考模式和联网搜索吗？

**A**: 可以，而且推荐这样做：

```python
extra_body = {
    "enable_thinking": True,
    "enable_search": True,
    "thinking_budget": 2048  # 可选
}
```

这样模型会先深度思考问题，然后有针对性地搜索信息，最后整合成完整回答。

### Q5: 搜索结果的数量可以控制吗？

**A**: 阿里云百炼的搜索数量由模型自动决定，无法手动配置。这是为了：

1. 简化用户配置
2. 让模型根据问题复杂度自动调整
3. 提供最优的搜索效果

如果需要更精细的控制，建议使用智谱 AI 的联网搜索功能。

### Q6: 如何验证搜索结果的质量？

**A**: 可以通过以下方式验证：

1. **查看来源链接**：点击回答中的引用链接，查看原始来源
2. **交叉验证**：对比多个搜索结果来源
3. **时效性检查**：查看搜索结果的发布日期，确保信息是最新的

---

## 技术支持

如有问题或建议，请联系：

- **阿里云百炼官方文档**：https://help.aliyun.com/zh/model-studio/web-search
- **GitHub Issues**：提交问题反馈
- **开发者社区**：参与讨论和交流

---

## 更新日志

### v1.0.0 (2026-03-13)

- ✅ 实现阿里云百炼联网搜索功能
- ✅ 支持 `enable_search` 参数
- ✅ 优化前端搜索配置 UI
- ✅ 增强搜索结果展示
- ✅ 添加单元测试和集成测试
- ✅ 完善技术文档和使用说明

---

**文档版本**: v1.0.0  
**最后更新**: 2026-03-13  
**维护者**: Patent Workbench Team

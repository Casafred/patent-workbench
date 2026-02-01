# AI说明书处理器 - 配置指南

## 概述

本文档说明如何配置AI说明书处理器所需的环境变量、模型配置和API密钥。

---

## 环境变量配置

### 必需的环境变量

#### ZHIPU_API_KEY

智谱AI的API密钥，用于调用AI模型进行翻译和抽取。

**获取方式**:
1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 在控制台创建API密钥
4. 复制密钥并配置到环境变量

**配置方法**:

**本地开发**:
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
ZHIPU_API_KEY=your-actual-api-key-here
```

**Render部署**:
1. 进入Render Dashboard
2. 选择你的服务
3. 进入 Environment 标签
4. 添加环境变量:
   - Key: `ZHIPU_API_KEY`
   - Value: `your-actual-api-key-here`

**阿里云ECS部署**:
```bash
# 编辑服务配置文件
sudo nano /etc/systemd/system/patent-app.service

# 在 [Service] 部分添加
Environment="ZHIPU_API_KEY=your-actual-api-key-here"

# 重启服务
sudo systemctl daemon-reload
sudo systemctl restart patent-app
```

### 可选的环境变量

#### ZHIPU_API_BASE

API基础URL，默认值为 `https://open.bigmodel.cn/api/paas/v4/`

通常不需要修改，除非使用代理或私有部署。

```bash
ZHIPU_API_BASE=https://your-custom-api-endpoint.com/
```

#### AI_REQUEST_TIMEOUT

AI请求超时时间（秒），默认值为 60 秒。

```bash
AI_REQUEST_TIMEOUT=90  # 增加到90秒
```

#### AI_MAX_RETRIES

API调用失败时的最大重试次数，默认值为 3 次。

```bash
AI_MAX_RETRIES=5  # 增加到5次重试
```

---

## 模型配置

### 配置文件位置

模型配置文件位于: `config/models.json`

### 配置文件结构

```json
{
  "models": [
    {
      "name": "glm-4-flash",
      "display_name": "GLM-4-Flash (推荐)",
      "description": "快速、经济的模型，适合日常使用",
      "max_tokens": 4096,
      "supports_translation": true,
      "supports_extraction": true
    }
  ],
  "default_model": "glm-4-flash",
  "api_settings": {
    "base_url": "https://open.bigmodel.cn/api/paas/v4/",
    "timeout": 60,
    "max_retries": 3
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 模型的API调用名称 |
| `display_name` | string | 在UI中显示的名称 |
| `description` | string | 模型描述 |
| `max_tokens` | number | 最大token数 |
| `supports_translation` | boolean | 是否支持翻译功能 |
| `supports_extraction` | boolean | 是否支持抽取功能 |

### 添加新模型

如果智谱AI发布了新模型，可以在 `models` 数组中添加:

```json
{
  "name": "glm-5-flash",
  "display_name": "GLM-5-Flash",
  "description": "新一代模型",
  "max_tokens": 8192,
  "supports_translation": true,
  "supports_extraction": true
}
```

修改后重启服务即可生效。

---

## API密钥管理

### 系统级密钥 vs 用户级密钥

系统支持两种API密钥配置方式:

#### 1. 系统级密钥（环境变量）

- 配置在 `ZHIPU_API_KEY` 环境变量中
- 所有用户共享
- 适合企业内部部署
- 管理员统一管理成本

#### 2. 用户级密钥（页面配置）

- 用户登录后在页面中配置自己的API密钥
- 每个用户使用自己的密钥和额度
- 适合多用户SaaS场景
- 用户自行承担成本

**优先级**: 用户级密钥 > 系统级密钥

### 用户级密钥配置方法

1. 用户登录系统
2. 进入设置页面
3. 找到"API密钥配置"部分
4. 输入自己的智谱AI API密钥
5. 保存配置

用户配置的密钥会保存在浏览器本地存储中，仅在该浏览器中有效。

---

## 安全最佳实践

### 1. 保护API密钥

❌ **不要做**:
- 不要将API密钥提交到Git仓库
- 不要在代码中硬编码API密钥
- 不要在日志中打印API密钥
- 不要在前端代码中暴露API密钥

✅ **应该做**:
- 使用环境变量存储API密钥
- 将 `.env` 文件添加到 `.gitignore`
- 定期轮换API密钥
- 监控API使用量和异常调用

### 2. 访问控制

- 启用用户认证，防止未授权访问
- 设置IP白名单（如果可能）
- 限制单个用户的API调用频率
- 记录API调用日志用于审计

### 3. 成本控制

- 设置API调用额度上限
- 监控每日/每月API消费
- 对异常高频调用设置告警
- 考虑使用更经济的模型（如 GLM-4-Air）

---

## 配置验证

### 验证环境变量

创建测试脚本 `test_config.py`:

```python
import os
from backend.config import Config

def test_config():
    """验证配置是否正确"""
    
    # 检查API密钥
    api_key = os.getenv('ZHIPU_API_KEY')
    if not api_key:
        print("❌ ZHIPU_API_KEY 未配置")
        return False
    
    if api_key == 'your-zhipu-api-key-here':
        print("❌ ZHIPU_API_KEY 仍为示例值，请配置实际密钥")
        return False
    
    print(f"✅ ZHIPU_API_KEY 已配置 (长度: {len(api_key)})")
    
    # 检查API基础URL
    api_base = os.getenv('ZHIPU_API_BASE', 'https://open.bigmodel.cn/api/paas/v4/')
    print(f"✅ API基础URL: {api_base}")
    
    # 检查超时设置
    timeout = int(os.getenv('AI_REQUEST_TIMEOUT', 60))
    print(f"✅ 请求超时: {timeout}秒")
    
    # 检查重试次数
    max_retries = int(os.getenv('AI_MAX_RETRIES', 3))
    print(f"✅ 最大重试: {max_retries}次")
    
    return True

if __name__ == '__main__':
    if test_config():
        print("\n✅ 配置验证通过")
    else:
        print("\n❌ 配置验证失败")
```

运行验证:
```bash
python test_config.py
```

### 验证模型配置

```python
import json

def test_models_config():
    """验证模型配置文件"""
    
    with open('config/models.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 检查必需字段
    assert 'models' in config, "缺少 models 字段"
    assert 'default_model' in config, "缺少 default_model 字段"
    
    # 检查模型列表
    models = config['models']
    assert len(models) > 0, "模型列表为空"
    
    # 检查每个模型的字段
    for model in models:
        assert 'name' in model, f"模型缺少 name 字段"
        assert 'display_name' in model, f"模型 {model.get('name')} 缺少 display_name"
        assert 'max_tokens' in model, f"模型 {model.get('name')} 缺少 max_tokens"
    
    print(f"✅ 模型配置验证通过，共 {len(models)} 个模型")
    
    # 打印模型列表
    for model in models:
        print(f"  - {model['display_name']} ({model['name']})")

if __name__ == '__main__':
    test_models_config()
```

### 验证API连接

```python
import requests
import os

def test_api_connection():
    """测试API连接"""
    
    api_key = os.getenv('ZHIPU_API_KEY')
    if not api_key:
        print("❌ 未配置API密钥")
        return False
    
    # 简单的API调用测试
    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "glm-4-flash",
        "messages": [{"role": "user", "content": "测试"}],
        "max_tokens": 10
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 200:
            print("✅ API连接成功")
            return True
        else:
            print(f"❌ API返回错误: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ API连接失败: {e}")
        return False

if __name__ == '__main__':
    test_api_connection()
```

---

## 故障排查

### 问题: "API密钥未配置"错误

**原因**: 环境变量未正确设置

**解决方法**:
1. 检查 `.env` 文件是否存在
2. 确认 `ZHIPU_API_KEY` 已设置
3. 重启应用服务
4. 运行配置验证脚本

### 问题: "API调用失败"错误

**原因**: API密钥无效或已过期

**解决方法**:
1. 登录智谱AI控制台检查密钥状态
2. 检查账户余额是否充足
3. 尝试重新生成API密钥
4. 运行API连接测试脚本

### 问题: "模型不可用"错误

**原因**: 选择的模型不存在或未配置

**解决方法**:
1. 检查 `config/models.json` 中的模型列表
2. 确认模型名称拼写正确
3. 查看智谱AI文档确认模型是否可用
4. 尝试使用默认模型 `glm-4-flash`

### 问题: 请求超时

**原因**: 网络延迟或文本过长

**解决方法**:
1. 增加 `AI_REQUEST_TIMEOUT` 值
2. 缩短输入文本长度
3. 检查网络连接
4. 尝试使用更快的模型（如 GLM-4-Air）

---

## 配置示例

### 开发环境配置

```bash
# .env
FLASK_SECRET_KEY=dev-secret-key
ZHIPU_API_KEY=your-dev-api-key
AI_REQUEST_TIMEOUT=30
AI_MAX_RETRIES=2
PORT=5001
```

### 生产环境配置

```bash
# 生产环境环境变量（通过部署平台配置）
FLASK_SECRET_KEY=<strong-random-secret>
ZHIPU_API_KEY=<production-api-key>
AI_REQUEST_TIMEOUT=60
AI_MAX_RETRIES=3
PORT=5000
DEFAULT_ADMIN_PASSWORD=<secure-password>
```

### 高负载环境配置

```bash
# 高负载场景优化
ZHIPU_API_KEY=<api-key>
AI_REQUEST_TIMEOUT=90
AI_MAX_RETRIES=5
SCRAPER_MAX_CONCURRENT=5
```

---

## 相关文档

- [用户指南](./ai_description_processor_guide.md) - 功能使用说明
- [API文档](../../backend/routes/drawing_marker.py) - API接口说明
- [部署指南](../deployment/) - 部署相关文档

---

**最后更新**: 2026-02-01  
**文档版本**: 1.0.0

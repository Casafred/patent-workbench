# AI说明书处理开关修复完成

## 问题描述
用户反馈：打开"AI说明书解析"按钮后，说明书的解析仍然采用正则/jieba方式，而不是AI响应的结果。

## 问题原因
后端 `backend/routes/drawing_marker.py` 中的 `process_drawing_marker` 函数虽然接收了前端传来的 `ai_mode`、`model_name`、`custom_prompt` 参数，但**完全忽略了这些参数**，始终使用 `extract_reference_markers` (jieba分词) 处理说明书。

## 修复内容

### 修改文件
- `backend/routes/drawing_marker.py`

### 修复逻辑
在 `process_drawing_marker` 函数中添加了AI模式判断：

```python
# 1. 解析说明书，提取附图标记和部件名称
# 根据AI模式选择不同的处理方式
if ai_mode:
    # AI模式：使用AI处理说明书
    print(f"[DEBUG] Using AI mode to extract components")
    
    if not model_name:
        return create_response(
            error="model_name is required when ai_mode is true",
            status_code=400
        )
    
    # Get API key and create AI processor
    client, error = get_zhipu_client()
    if error:
        return error
    
    api_key = client.api_key
    processor = AIDescriptionProcessor(api_key)
    
    # Process description using AI
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        ai_result = loop.run_until_complete(
            processor.process(specification, model_name, custom_prompt)
        )
    finally:
        loop.close()
    
    # Check AI processing result
    if not ai_result.get('success'):
        return create_response(
            error=ai_result.get('error', 'AI processing failed'),
            status_code=500
        )
    
    # Convert AI components to reference_map format
    components = ai_result['data'].get('components', [])
    reference_map = {
        comp['marker']: comp['name']
        for comp in components
    }
    
    print(f"[DEBUG] AI extracted reference_map: {reference_map}")
    print(f"[DEBUG] Total markers from AI: {len(reference_map)}")
else:
    # 规则模式：使用jieba分词
    print(f"[DEBUG] Using rule-based mode (jieba) to extract components")
    reference_map = extract_reference_markers(specification)
    print(f"[DEBUG] Extracted reference_map: {reference_map}")
    print(f"[DEBUG] Total markers in specification: {len(reference_map)}")
```

### 返回结果标识
更新了返回结果中的 `extraction_method` 字段：

```python
'extraction_method': 'AI智能抽取' if ai_mode else 'jieba分词'
```

## 工作流程

### AI模式开启时
1. 前端发送请求，包含 `ai_mode: true`, `model_name`, `custom_prompt`
2. 后端检测到 `ai_mode=true`
3. 使用 `AIDescriptionProcessor` 处理说明书：
   - 检测语言
   - 如需要则翻译为中文
   - 使用AI模型抽取部件标记
4. 将AI抽取的结果转换为 `reference_map` 格式
5. 使用AI抽取的 `reference_map` 与OCR识别结果匹配

### AI模式关闭时
1. 前端发送请求，`ai_mode: false` 或不传
2. 后端检测到 `ai_mode=false`
3. 使用传统的 `extract_reference_markers` (jieba分词) 处理说明书
4. 使用jieba抽取的 `reference_map` 与OCR识别结果匹配

## 测试验证

### 测试步骤
1. 打开功能八（交互式附图标注）
2. 上传专利附图
3. 输入说明书文本
4. **关闭** "AI说明书解析" 开关
5. 点击"开始处理"
6. 查看调试信息中的 `extraction_method` 应显示 "jieba分词"
7. **打开** "AI说明书解析" 开关
8. 选择AI模型（如 glm-4-flash）
9. 点击"开始处理"
10. 查看调试信息中的 `extraction_method` 应显示 "AI智能抽取"

### 预期结果
- AI模式关闭：使用jieba分词，快速但可能不够准确
- AI模式开启：使用AI智能抽取，更准确但需要更多时间

## 调试日志
后端会输出以下日志帮助调试：
- `[DEBUG] Using AI mode to extract components` - AI模式
- `[DEBUG] Using rule-based mode (jieba) to extract components` - 规则模式
- `[DEBUG] AI extracted reference_map: {...}` - AI抽取结果
- `[DEBUG] Extracted reference_map: {...}` - jieba抽取结果

## 部署说明
修改已完成，可以直接部署到服务器测试。

## 相关文件
- `backend/routes/drawing_marker.py` - 主要修复文件
- `backend/services/ai_description/ai_description_processor.py` - AI处理器
- `frontend/js/ai_description/ai_processing_panel.js` - 前端AI控制面板
- `frontend/index.html` - 前端主页面（功能八）

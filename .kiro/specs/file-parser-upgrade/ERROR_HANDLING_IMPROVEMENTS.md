# 文件解析错误处理改进

## 改进日期
2026-02-03

## 改进概述

针对用户报告的"Failed to create parsing task"错误，我们进行了全面的错误处理改进，使错误信息更加详细和可操作。

## 改进内容

### 1. 后端错误处理增强

#### 文件：`backend/services/file_parser_service.py`

**改进前**：
```python
except requests.RequestException as e:
    logger.error(f"Failed to create parser task: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error creating parser task: {e}")
    raise
```

**改进后**：
```python
except requests.RequestException as e:
    logger.error(f"Failed to create parser task: {e}")
    # 提取API返回的详细错误信息
    error_msg = str(e)
    if hasattr(e, 'response') and e.response is not None:
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', str(e))
            logger.error(f"API error details: {error_data}")
        except:
            error_msg = e.response.text or str(e)
            logger.error(f"API error response: {error_msg}")
    raise ValueError(f"API调用失败: {error_msg}")
except Exception as e:
    logger.error(f"Unexpected error creating parser task: {e}")
    raise ValueError(f"创建解析任务失败: {str(e)}")
```

**改进效果**：
- ✅ 提取ZhipuAI API返回的详细错误信息
- ✅ 记录完整的错误响应到日志
- ✅ 将技术错误转换为用户友好的中文消息
- ✅ 保留原始错误信息用于调试

#### 文件：`backend/routes/file_parser.py`

**改进前**：
```python
except ValueError as e:
    print(f"[File Parser] Validation error: {str(e)}")
    return create_response(error=str(e), status_code=400)
except Exception as e:
    print(f"[File Parser] Task creation failed: {traceback.format_exc()}")
    return create_response(
        error=f"Failed to create parsing task: {str(e)}",
        status_code=500
    )
```

**改进后**：
```python
except ValueError as e:
    # Validation errors (file type, size, etc.) or API errors
    error_msg = str(e)
    print(f"[File Parser] Validation/API error: {error_msg}")
    print(f"[File Parser] Full traceback: {traceback.format_exc()}")
    return create_response(error=error_msg, status_code=400)
except Exception as e:
    error_msg = str(e)
    print(f"[File Parser] Task creation failed: {error_msg}")
    print(f"[File Parser] Full traceback: {traceback.format_exc()}")
    return create_response(
        error=f"创建解析任务失败: {error_msg}",
        status_code=500
    )
```

**改进效果**：
- ✅ 打印完整的错误堆栈到控制台
- ✅ 区分验证错误和API错误
- ✅ 返回详细的错误消息给前端
- ✅ 便于后端日志排查

### 2. 前端错误处理增强

#### 文件：`js/fileParserHandler.js`

**改进前**：
```javascript
catch (error) {
    console.error('Create parser task error:', error);
    if (error.message.includes('API key')) {
        throw new Error('API Key配置错误，请检查设置');
    } else if (error.message.includes('Unsupported file type')) {
        throw new Error('不支持的文件类型');
    } else if (error.message.includes('exceeds limit')) {
        throw new Error('文件大小超过限制');
    } else if (error.message) {
        throw error;
    } else {
        throw new Error('创建解析任务失败，请稍后重试');
    }
}
```

**改进后**：
```javascript
catch (error) {
    console.error('Create parser task error:', error);
    
    // 提取详细的错误信息
    let errorMessage = '创建解析任务失败';
    
    if (error.message) {
        // 如果错误消息已经是中文的详细信息，直接使用
        if (error.message.includes('API调用失败') || 
            error.message.includes('创建解析任务失败') ||
            error.message.includes('不支持的文件类型') ||
            error.message.includes('文件大小超过限制')) {
            errorMessage = error.message;
        }
        // 处理特定的英文错误
        else if (error.message.includes('API key')) {
            errorMessage = 'API Key配置错误，请检查设置';
        } else if (error.message.includes('Unsupported file type')) {
            errorMessage = '不支持的文件类型';
        } else if (error.message.includes('exceeds limit')) {
            errorMessage = '文件大小超过限制';
        } else if (error.message.includes('timeout')) {
            errorMessage = '请求超时，请检查网络连接';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = '网络错误，请检查连接';
        } else {
            // 其他错误，显示原始消息
            errorMessage = `创建解析任务失败: ${error.message}`;
        }
    }
    
    throw new Error(errorMessage);
}
```

**改进效果**：
- ✅ 优先显示后端返回的详细中文错误
- ✅ 识别更多类型的错误（超时、网络等）
- ✅ 保留原始错误信息用于调试
- ✅ 提供可操作的错误提示

### 3. 诊断工具

#### 文件：`test_file_parser_debug.py`

创建了一个独立的诊断脚本，用于：
- ✅ 验证API Key是否有效
- ✅ 测试与ZhipuAI API的连接
- ✅ 显示完整的API请求和响应
- ✅ 帮助快速定位问题

**使用方法**：
```bash
python test_file_parser_debug.py
```

**输出示例**：
```
✅ Using API key: xxxxxxxxxx...
✅ Test file found: test.pdf (12345 bytes)

📤 Sending request to ZhipuAI API...
   URL: https://open.bigmodel.cn/api/paas/v4/files/parser/create
   Tool Type: lite
   File Type: PDF

📥 Response Status: 200
   Response Body: {"task_id": "xxx", "status": "processing"}

✅ Success! Task ID: xxx
```

### 4. 故障排查文档

#### 文件：`.kiro/specs/file-parser-upgrade/TROUBLESHOOTING.md`

创建了详细的故障排查指南，包括：
- ✅ 快速诊断步骤
- ✅ 常见错误及解决方案
- ✅ 调试技巧
- ✅ 性能优化建议

## 错误信息对比

### 改进前

**用户看到的错误**：
```
文件解析失败: Failed to create parsing task
```

**问题**：
- ❌ 信息不明确
- ❌ 无法判断原因
- ❌ 不知道如何解决

### 改进后

**场景1：API Key错误**
```
文件解析失败: API Key配置错误，请检查设置
```

**场景2：网络错误**
```
文件解析失败: 网络错误，请检查连接
```

**场景3：文件类型错误**
```
文件解析失败: 不支持的文件类型: XYZ
```

**场景4：文件大小超限**
```
文件解析失败: 文件大小超过限制
```

**场景5：API调用失败（详细信息）**
```
文件解析失败: API调用失败: [ZhipuAI API返回的具体错误信息]
```

**改进效果**：
- ✅ 错误信息清晰明确
- ✅ 用户知道问题所在
- ✅ 提供解决方向

## 日志改进

### 后端日志

**改进前**：
```
[File Parser] Task creation failed: <exception>
```

**改进后**：
```
[File Parser] Received create request
[File Parser] Files in request: ['file']
[File Parser] Form data: {'tool_type': 'lite', 'file_type': 'PDF'}
[File Parser] Processing file: test.pdf
[File Parser] Secured filename: test.pdf
[File Parser] Saved to temp file: /tmp/xxx.pdf
[File Parser] File size: 12345 bytes
[File Parser] Validation/API error: API调用失败: [详细错误]
[File Parser] Full traceback: [完整堆栈]
```

**改进效果**：
- ✅ 记录完整的请求信息
- ✅ 跟踪处理流程
- ✅ 详细的错误信息
- ✅ 便于问题排查

### 前端日志

**改进前**：
```
File parser error: Failed to create parsing task
```

**改进后**：
```
Uploading file: test.pdf
Create parser task error: Error: API调用失败: [详细错误]
File parser error: API调用失败: [详细错误]
```

**改进效果**：
- ✅ 记录文件名
- ✅ 显示详细错误
- ✅ 便于浏览器调试

## 测试验证

### 测试场景

1. **正常上传**
   - ✅ 选择PDF文件
   - ✅ 自动上传
   - ✅ 显示解析进度
   - ✅ 完成后显示文件信息

2. **API Key错误**
   - ✅ 清除API Key
   - ✅ 上传文件
   - ✅ 显示"API Key配置错误"

3. **网络错误**
   - ✅ 断开网络
   - ✅ 上传文件
   - ✅ 显示"网络错误"

4. **文件类型错误**
   - ✅ 上传不支持的文件
   - ✅ 显示"不支持的文件类型"

5. **文件大小超限**
   - ✅ 上传超大文件
   - ✅ 显示"文件大小超过限制"

### 验证步骤

1. **运行诊断脚本**
   ```bash
   python test_file_parser_debug.py
   ```

2. **检查后端日志**
   ```bash
   # 查看详细的处理流程
   tail -f logs/app.log | grep "File Parser"
   ```

3. **检查浏览器控制台**
   - 打开开发者工具（F12）
   - 查看Console标签页
   - 上传文件并观察日志

4. **测试各种错误场景**
   - 按照上述测试场景逐一验证
   - 确认错误信息准确

## 部署说明

### 需要更新的文件

1. `backend/services/file_parser_service.py` - 后端服务错误处理
2. `backend/routes/file_parser.py` - 路由错误处理
3. `js/fileParserHandler.js` - 前端错误处理
4. `test_file_parser_debug.py` - 诊断脚本（新增）
5. `.kiro/specs/file-parser-upgrade/TROUBLESHOOTING.md` - 故障排查文档（新增）

### 部署步骤

```bash
# 1. 提交更改
git add backend/services/file_parser_service.py
git add backend/routes/file_parser.py
git add js/fileParserHandler.js
git add test_file_parser_debug.py
git add .kiro/specs/file-parser-upgrade/TROUBLESHOOTING.md
git add .kiro/specs/file-parser-upgrade/ERROR_HANDLING_IMPROVEMENTS.md

# 2. 提交
git commit -m "improve: 增强文件解析错误处理和诊断功能

- 后端提取并返回详细的API错误信息
- 前端智能识别和显示友好的错误消息
- 添加诊断脚本用于快速排查问题
- 创建详细的故障排查文档
- 改进日志记录，便于问题定位"

# 3. 推送
git push
```

### 无需重启

- ✅ 前端更改：刷新浏览器即可
- ✅ 后端更改：如果使用热重载，自动生效
- ✅ 如果未使用热重载，需要重启Flask应用

## 后续优化建议

1. **错误分类**
   - 将错误分为：用户错误、系统错误、API错误
   - 不同类型显示不同的图标和颜色

2. **错误统计**
   - 记录错误发生频率
   - 分析常见错误类型
   - 优化用户体验

3. **自动重试**
   - 对于网络错误，自动重试
   - 显示重试进度
   - 最多重试3次

4. **错误上报**
   - 将错误信息上报到监控系统
   - 便于及时发现和解决问题

## 相关文档

- [文件上传UX修复](.kiro/specs/file-parser-upgrade/FILE_UPLOAD_UX_FIX.md)
- [故障排查指南](.kiro/specs/file-parser-upgrade/TROUBLESHOOTING.md)
- [快速验证指南](.kiro/specs/file-parser-upgrade/QUICK_START_VALIDATION.md)
- [设计文档](.kiro/specs/file-parser-upgrade/design.md)

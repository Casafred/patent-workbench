# 快速验证指南 - 文件解析API升级

## 🚀 5分钟快速验证

如果您想快速验证核心功能是否正常工作，请按照以下步骤操作：

## 步骤 1: 检查环境配置 (30秒)

```bash
# 检查智谱AI API密钥是否配置
echo $ZHIPUAI_API_KEY
```

如果未显示API密钥，请在 `.env` 文件中添加：
```
ZHIPUAI_API_KEY=your_api_key_here
```

## 步骤 2: 启动应用 (30秒)

```bash
# 启动后端服务
python app.py
```

确保看到类似输出：
```
* Running on http://127.0.0.1:5001
```

## 步骤 3: 浏览器测试 (3分钟)

### 3.1 打开对话页面

1. 打开浏览器，访问 `http://localhost:5001`
2. 登录系统
3. 进入功能一（对话功能）

### 3.2 测试文件上传

1. **准备测试文件**：创建一个简单的文本文件
   ```bash
   echo "这是一个测试文件，用于验证文件解析功能。" > test.txt
   ```

2. **上传文件**：
   - 点击对话输入框旁边的文件上传按钮（📎图标）
   - 选择刚创建的 `test.txt` 文件
   - 观察是否显示"已选择文件"和服务选择器

3. **选择服务**：
   - 确认默认选择了 "Lite（免费）" 服务
   - 点击"开始上传"按钮

4. **观察解析过程**：
   - ✅ 应该显示"正在上传文件"
   - ✅ 应该显示"正在解析文件... X%"
   - ✅ 应该在几秒内完成，显示"已附加文件"

5. **测试对话**：
   - 在输入框中输入："请总结这个文件的内容"
   - 点击发送
   - ✅ 用户消息应该显示文件附件标记
   - ✅ AI应该回复文件内容的总结

### 3.3 测试不同文件格式（可选）

如果有其他文件，可以测试：
- PDF 文件
- Word 文档 (.docx)
- 图片文件 (.png, .jpg)

## 步骤 4: 命令行测试（可选，1分钟）

如果想测试后端API，可以使用测试脚本：

```bash
# 1. 更新测试脚本配置
# 编辑 test_file_parser_api.py，设置：
# USERNAME = "your_username"
# PASSWORD = "your_password"
# TEST_FILE_PATH = "test.txt"

# 2. 运行测试
python test_file_parser_api.py
```

预期看到：
```
✓ Login successful
✓ Parser task created successfully
✓ Got parser result
Status: succeeded
```

## ✅ 验证成功标志

如果您看到以下结果，说明核心功能正常：

1. ✅ 文件可以成功上传
2. ✅ 显示解析进度
3. ✅ 解析完成后显示"已附加文件"
4. ✅ 发送消息时显示文件附件标记
5. ✅ AI回复包含文件内容

## ❌ 常见问题快速修复

### 问题：显示"ZhipuAI API key not configured"

**解决**：
```bash
# 在 .env 文件中添加
echo "ZHIPUAI_API_KEY=your_api_key_here" >> .env

# 重启应用
```

### 问题：文件上传后一直显示"解析中"

**解决**：
1. 检查网络连接
2. 检查浏览器控制台是否有错误
3. 尝试上传更小的文件（如 test.txt）

### 问题：点击上传按钮没有反应

**解决**：
1. 检查浏览器控制台是否有 JavaScript 错误
2. 确认 `fileParserHandler.js` 已正确加载
3. 刷新页面重试

## 📋 完整验证清单

如果快速验证通过，您可以选择进行更详细的验证：

- [ ] 查看 `VALIDATION_GUIDE.md` 进行完整验证
- [ ] 测试所有支持的文件格式
- [ ] 测试不同的解析服务（Lite/Expert/Prime）
- [ ] 测试错误处理（不支持的格式、大小超限等）
- [ ] 测试浏览器兼容性

## 🎯 下一步

### 如果验证成功：

1. **继续开发可选功能**：
   - Task 7: 解析结果管理（历史记录、复用）
   - Task 9: 错误处理优化（取消、重试）
   - Task 10: 性能优化（缓存、指数退避）

2. **准备部署**：
   - 更新文档
   - 配置生产环境
   - 进行压力测试

3. **开始使用**：
   - 核心功能已完成，可以开始使用！

### 如果验证失败：

1. 查看详细错误信息
2. 参考 `VALIDATION_GUIDE.md` 中的"常见问题排查"部分
3. 检查后端日志和浏览器控制台
4. 修复问题后重新验证

## 📚 相关文档

- **完整验证指南**: `.kiro/specs/file-parser-upgrade/VALIDATION_GUIDE.md`
- **需求文档**: `.kiro/specs/file-parser-upgrade/requirements.md`
- **设计文档**: `.kiro/specs/file-parser-upgrade/design.md`
- **任务列表**: `.kiro/specs/file-parser-upgrade/tasks.md`
- **进度总结**: `.kiro/specs/file-parser-upgrade/PROGRESS_SUMMARY.md`

## 💡 提示

- 首次使用建议先用小文件（< 1MB）测试
- Lite 服务是免费的，适合大多数场景
- 如果需要更好的解析质量，可以尝试 Expert 或 Prime 服务
- 解析时间取决于文件大小和网络速度，通常在 2-30 秒之间

祝验证顺利！🎉

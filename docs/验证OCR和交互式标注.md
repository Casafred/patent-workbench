# 验证OCR和交互式标注功能

## 快速验证清单

### ✅ 第一步：部署
```batch
重新部署OCR和交互式标注.bat
```

### ✅ 第二步：验证OCR修复

#### 1. 访问网站
打开浏览器访问：http://43.99.101.195

#### 2. 进入功能八
点击"专利附图标记识别"

#### 3. 上传测试图片
使用以下任一图片：
- `tests/test patent pic.png`
- `tests/2,0439e17894683f41_full.gif`

#### 4. 检查识别结果
应该看到：
- ✅ 识别出多个数字标记（不是0个）
- ✅ 显示匹配率和置信度
- ✅ 没有报错信息

#### 5. 查看服务器日志
```bash
ssh root@43.99.101.195 "journalctl -u patent-app -n 50 | grep OCR"
```

应该看到：
```
OCR completed in 0.48s
OCR completed: 9 markers detected
```

**不应该看到**：
- ❌ `unsupported format string passed to list.__format__`
- ❌ `could not convert string to float`
- ❌ `OCR processing timeout`

### ✅ 第三步：验证交互式标注

#### 1. 检查标注显示
- ✅ 标注框应该偏移显示（不遮挡数字）
- ✅ 有虚线连接标注框和原始位置
- ✅ 标注框显示部件名称

#### 2. 测试拖动功能
- 点击标注框
- 拖动到新位置
- ✅ 连线应该实时跟随
- ✅ 标注框变为蓝色（选中状态）

#### 3. 测试编辑功能
- 双击标注框
- 弹出编辑对话框
- 修改部件名称
- 点击确定
- ✅ 标注框显示新名称

#### 4. 测试悬停效果
- 鼠标悬停在标注框上
- ✅ 标注框变为橙色
- 移开鼠标
- ✅ 恢复原色

#### 5. 测试导出功能
- 点击"导出图片"按钮
- ✅ 下载PNG图片
- 打开图片
- ✅ 包含所有标注和连线

### ✅ 第四步：浏览器控制台检查

按 F12 打开开发者工具，检查：

#### 1. 没有JS错误
控制台不应该有：
- ❌ `InteractiveDrawingMarker is not defined`
- ❌ `Cannot read property of undefined`
- ❌ 任何红色错误信息

#### 2. 正确加载JS文件
Network标签应该显示：
- ✅ `drawingMarkerInteractive.js` - 200 OK
- ✅ 文件大小 > 10KB

#### 3. 查看Console日志
应该看到：
- ✅ `InteractiveDrawingMarker initialized`
- ✅ `Loaded X annotations`

## 常见问题排查

### 问题1：识别出0个标记

**可能原因**：
1. OCR修复未生效
2. 图片质量太差
3. Python环境问题

**排查步骤**：
```bash
# 1. 检查OCR文件是否更新
ssh root@43.99.101.195 "ls -lh /home/appuser/patent-app/backend/utils/ocr_utils.py"

# 2. 查看详细日志
ssh root@43.99.101.195 "journalctl -u patent-app -n 100 | grep -A 5 'OCR'"

# 3. 检查Python版本
ssh root@43.99.101.195 "ps aux | grep gunicorn"
# 应该看到 python3.11
```

### 问题2：标注框无法拖动

**可能原因**：
1. JS文件未加载
2. 浏览器缓存
3. JS路径错误

**排查步骤**：
1. 按 Ctrl+F5 强制刷新
2. 检查浏览器控制台错误
3. 查看Network标签确认JS文件加载

```bash
# 检查JS文件是否存在
ssh root@43.99.101.195 "ls -lh /home/appuser/patent-app/js/drawingMarkerInteractive.js"
```

### 问题3：服务无法启动

**可能原因**：
1. 文件权限问题
2. Python依赖问题
3. 端口占用

**排查步骤**：
```bash
# 1. 查看服务状态
ssh root@43.99.101.195 "systemctl status patent-app"

# 2. 查看错误日志
ssh root@43.99.101.195 "journalctl -u patent-app -n 50"

# 3. 修复权限
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app"

# 4. 重启服务
ssh root@43.99.101.195 "systemctl restart patent-app"
```

## 成功标准

### OCR功能
- ✅ 能识别出数字标记（不是0个）
- ✅ 显示正确的置信度（0-100%）
- ✅ 没有格式化错误
- ✅ 处理时间合理（< 5秒）

### 交互式标注
- ✅ 标注框偏移显示
- ✅ 可以拖动标注框
- ✅ 连线实时跟随
- ✅ 可以双击编辑
- ✅ 悬停有高亮效果
- ✅ 可以导出图片

### 系统稳定性
- ✅ 服务正常运行
- ✅ 没有内存泄漏
- ✅ 没有崩溃或超时
- ✅ 日志没有错误

## 验证完成

如果以上所有检查都通过，说明：
1. ✅ OCR的两个关键bug已修复
2. ✅ 交互式标注功能正常工作
3. ✅ 系统稳定运行

可以开始正常使用功能八了！

## 下一步

如果验证通过，建议：
1. 提交代码到Git
2. 创建备份
3. 更新文档
4. 通知用户新功能

如果验证失败，参考上面的排查步骤，或查看详细日志定位问题。

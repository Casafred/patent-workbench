# 快速清理行动清单 - 2026-02-07

## 🎯 目标
立即清理项目结构，符合组织标准

## ⚡ 5分钟快速清理

### 步骤1: 删除空文件和临时文件
```bash
# 删除空文件
rm js/claimsComparison_v3.js
rm js/claimsComparison_v4.js

# 删除临时修复文件
rm chat_title_fix.js
rm fix_emoji_buttons.js
rm app_new.py
```

### 步骤2: 移动文档文件
```bash
# 创建必要的目录
mkdir -p docs/changelog
mkdir -p docs/api
mkdir -p docs/examples

# 移动文档
mv 20260130.md docs/changelog/
mv "zhipu doc.txt" docs/api/zhipu-api-doc.txt
mv "google patents html example.txt" docs/examples/
```

### 步骤3: 移动HTML文件
```bash
mv 用户管理.html frontend/user-management.html
```

### 步骤4: 移动工具文件
```bash
mv diagnose_render_login.py tools/
mv debug_template_selector.js tools/
```

### 步骤5: 整理JS文件
```bash
# 移动功能文件到正确位置
mv 功能六增强-buildPatentDetailHTML函数.js js/patent-detail-builder.js
```

## 📊 预期结果

### 清理前
```
根目录: 22个文件 (11个违规)
js/: 40个文件 (包含重复和空文件)
```

### 清理后
```
根目录: 11个文件 (只保留必要配置)
js/: 35个文件 (删除5个无用文件)
docs/: 新增3个分类目录
tools/: 新增2个工具文件
```

## 🔍 验证清单

清理完成后，检查：
- [ ] 根目录只有配置文件
- [ ] 没有空的JS文件
- [ ] 没有临时修复文件
- [ ] 文档都在 docs/ 目录
- [ ] 工具都在 tools/ 目录
- [ ] HTML都在 frontend/ 目录

## ⚠️ 注意事项

1. **备份**: 执行前先提交当前代码
2. **测试**: 清理后测试应用是否正常
3. **引用**: 检查是否有文件引用了被移动的文件

## 🚀 执行命令

复制粘贴以下命令一次性执行：

```bash
# Windows (PowerShell)
Remove-Item js/claimsComparison_v3.js, js/claimsComparison_v4.js, chat_title_fix.js, fix_emoji_buttons.js, app_new.py -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path docs/changelog, docs/api, docs/examples -Force
Move-Item 20260130.md docs/changelog/ -Force
Move-Item "zhipu doc.txt" docs/api/zhipu-api-doc.txt -Force
Move-Item "google patents html example.txt" docs/examples/ -Force
Move-Item 用户管理.html frontend/user-management.html -Force
Move-Item diagnose_render_login.py tools/ -Force
Move-Item debug_template_selector.js tools/ -Force
Move-Item 功能六增强-buildPatentDetailHTML函数.js js/patent-detail-builder.js -Force
```

---

**创建日期**: 2026-02-07  
**预计时间**: 5分钟  
**风险等级**: 低

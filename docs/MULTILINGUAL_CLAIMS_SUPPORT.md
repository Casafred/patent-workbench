# 权利要求处理器多语言支持

## 概述

权利要求处理器支持全球主要专利申请国家的语言，能够自动识别和验证多种语言的权利要求文本。

## 支持的语言

### 1. 中文（Chinese）
- **简体中文**：权利要求
- **繁体中文**：請求項、請求项
- **应用地区**：中国大陆、台湾、香港、澳门

**示例：**
```
1. 一种智能手机，其特征在于...
2. 根据权利要求1所述的智能手机...
3. 根据权利要求1或2所述的智能手机...
```

### 2. 英文（English）
- **关键词**：claim, claims, Claim, Claims, CLAIM, CLAIMS
- **应用地区**：美国、英国、加拿大、澳大利亚、新西兰、印度等

**示例：**
```
1. A smartphone comprising...
2. The smartphone of claim 1...
3. The smartphone of claims 1 or 2...
```

### 3. 日文（Japanese）
- **关键词**：請求項、クレーム
- **应用地区**：日本

**示例：**
```
1. スマートフォンであって、
2. 請求項1に記載のスマートフォン
3. クレーム1に記載の装置
```

### 4. 韩文（Korean）
- **关键词**：청구항、請求項
- **应用地区**：韩国

**示例：**
```
1. 스마트폰에 있어서...
2. 청구항 1에 따른 스마트폰...
3. 청구항 1 또는 2에 따른 스마트폰...
```

### 5. 德文（German）
- **关键词**：Anspruch, Ansprüche, anspruch, ansprüche
- **应用地区**：德国、奥地利、瑞士

**示例：**
```
1. Ein Smartphone, dadurch gekennzeichnet...
2. Smartphone nach Anspruch 1...
3. Smartphone nach einem der Ansprüche 1 oder 2...
```

### 6. 法文（French）
- **关键词**：revendication, revendications, Revendication, Revendications
- **应用地区**：法国、比利时、瑞士、加拿大（魁北克）

**示例：**
```
1. Un smartphone caractérisé en ce que...
2. Smartphone selon la revendication 1...
3. Smartphone selon l'une des revendications 1 ou 2...
```

### 7. 西班牙文（Spanish）
- **关键词**：reivindicación, reivindicaciones, Reivindicación, Reivindicaciones
- **应用地区**：西班牙、墨西哥、阿根廷、智利等

**示例：**
```
1. Un teléfono inteligente caracterizado por...
2. Teléfono inteligente según la reivindicación 1...
3. Teléfono inteligente según una de las reivindicaciones 1 o 2...
```

### 8. 葡萄牙文（Portuguese）
- **关键词**：reivindicação, reivindicações, Reivindicação, Reivindicações
- **应用地区**：葡萄牙、巴西

**示例：**
```
1. Um smartphone caracterizado por...
2. Smartphone de acordo com a reivindicação 1...
3. Smartphone de acordo com uma das reivindicações 1 ou 2...
```

### 9. 俄文（Russian）
- **关键词**：пункт формулы, формула изобретения
- **应用地区**：俄罗斯、白俄罗斯、哈萨克斯坦

**示例：**
```
1. Смартфон, характеризующийся тем, что...
2. Смартфон по пункту формулы 1...
3. Смартфон по одному из пунктов формулы 1 или 2...
```

### 10. 意大利文（Italian）
- **关键词**：rivendicazione, rivendicazioni, Rivendicazione, Rivendicazioni
- **应用地区**：意大利

**示例：**
```
1. Uno smartphone caratterizzato da...
2. Smartphone secondo la rivendicazione 1...
3. Smartphone secondo una delle rivendicazioni 1 o 2...
```

### 11. 荷兰文（Dutch）
- **关键词**：conclusie, conclusies, Conclusie, Conclusies
- **应用地区**：荷兰、比利时

**示例：**
```
1. Een smartphone gekenmerkt door...
2. Smartphone volgens conclusie 1...
3. Smartphone volgens een der conclusies 1 of 2...
```

### 12. 阿拉伯文（Arabic）
- **关键词**：مطالبة، مطالبات
- **应用地区**：沙特阿拉伯、阿联酋、埃及等

**示例：**
```
1. هاتف ذكي يتميز بـ...
2. الهاتف الذكي وفقًا للمطالبة 1...
3. الهاتف الذكي وفقًا لإحدى المطالبات 1 أو 2...
```

## 验证机制

### 自动检测
系统会自动检测上传文件中的权利要求文本，验证流程如下：

1. **读取选定列的所有单元格**
2. **统计包含权利要求关键词的单元格数量**
3. **计算关键词出现比例**
4. **验证判断**：
   - 如果 ≥ 50% 的单元格包含关键词 → 验证通过
   - 如果 < 50% 的单元格包含关键词 → 验证失败，提示用户

### 错误提示
当验证失败时，系统会显示：
```
警告：所选列中仅有 X% 的单元格包含"权利要求"相关字样。
请核对是否选择了正确的权利要求文本列。
```

## 混合语言支持

系统支持在同一个Excel文件中处理多种语言的权利要求：

### 场景1：不同单元格使用不同语言
```
单元格1: 1. 一种智能手机... (中文)
单元格2: 1. A smartphone... (英文)
单元格3: 1. Ein Smartphone... (德文)
```
✓ 系统会分别识别每个单元格的语言并正确处理

### 场景2：同一单元格包含多种语言
```
1. 一种智能手机...
1. A smartphone...
```
✓ 系统会自动选择优先语言版本进行处理

## 使用建议

### 1. 文件准备
- 确保权利要求文本列包含正确的语言关键词
- 建议每个单元格只包含一种语言的权利要求
- 保持权利要求编号的连续性

### 2. 列选择
- 选择包含完整权利要求文本的列
- 避免选择摘要、说明书等其他内容列
- 如果有多个语言版本，建议分别处理

### 3. 质量检查
- 处理前检查是否有足够的关键词
- 处理后查看语言分布统计
- 检查独立权利要求和从属权利要求的分类是否正确

## 技术实现

### 关键词列表
```python
claims_keywords = [
    # 中文
    '权利要求', '請求項', '請求项',
    # 英文
    'claim', 'claims', 'Claim', 'Claims', 'CLAIM', 'CLAIMS',
    # 日文
    '請求項', 'クレーム',
    # 韩文
    '청구항', '請求項',
    # 德文
    'Anspruch', 'Ansprüche', 'anspruch', 'ansprüche',
    # 法文
    'revendication', 'revendications', 'Revendication', 'Revendications',
    # 西班牙文
    'reivindicación', 'reivindicaciones', 'Reivindicación', 'Reivindicaciones',
    # 葡萄牙文
    'reivindicação', 'reivindicações', 'Reivindicação', 'Reivindicações',
    # 俄文
    'пункт формулы', 'формула изобретения',
    # 意大利文
    'rivendicazione', 'rivendicazioni', 'Rivendicazione', 'Rivendicazioni',
    # 荷兰文
    'conclusie', 'conclusies', 'Conclusie', 'Conclusies',
    # 阿拉伯文
    'مطالبة', 'مطالبات'
]
```

### 验证算法
```python
cells_with_keywords = 0
total_non_empty_cells = 0

for cell_text in column_data:
    if cell_text and cell_text.strip() and cell_text != 'nan':
        total_non_empty_cells += 1
        if any(keyword in cell_text for keyword in claims_keywords):
            cells_with_keywords += 1

if total_non_empty_cells > 0:
    keyword_ratio = cells_with_keywords / total_non_empty_cells
    if keyword_ratio < 0.5:
        # 返回错误提示
```

## 常见问题

### Q1: 我的语言不在支持列表中怎么办？
A: 请联系技术支持，我们可以添加更多语言支持。

### Q2: 为什么验证失败？
A: 可能原因：
- 选择了错误的列（如摘要列而非权利要求列）
- 权利要求文本格式不标准
- 使用了不常见的表述方式

### Q3: 可以处理混合语言的文件吗？
A: 可以。系统会自动识别每个单元格的语言并分别处理。

### Q4: 验证阈值为什么是50%？
A: 50%是一个平衡点，既能识别正确的权利要求列，又能容忍一定比例的格式不规范文本。

## 未来扩展

计划添加的语言支持：
- 🇵🇱 波兰文（Polish）
- 🇸🇪 瑞典文（Swedish）
- 🇩🇰 丹麦文（Danish）
- 🇳🇴 挪威文（Norwegian）
- 🇫🇮 芬兰文（Finnish）
- 🇹🇷 土耳其文（Turkish）
- 🇬🇷 希腊文（Greek）
- 🇮🇱 希伯来文（Hebrew）

## 反馈与建议

如果您在使用过程中遇到语言识别问题，或希望添加新的语言支持，请通过以下方式联系我们：
- 提交Issue到GitHub仓库
- 发送邮件至技术支持
- 在系统中使用反馈功能

---

**最后更新：** 2026年1月16日  
**版本：** 1.0.0

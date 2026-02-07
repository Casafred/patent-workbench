#!/bin/bash
# 旧文件清理脚本
# 创建时间: 2026-02-07
# 说明: 删除重构后已被新模块替代的旧文件

echo "========================================"
echo "旧文件清理脚本"
echo "========================================"
echo ""

echo "警告: 此脚本将删除以下文件:"
echo "  - js/chat.js (已拆分为7个模块)"
echo "  - js/claimsProcessorIntegrated.js (已拆分为6个模块)"
echo "  - js/claimsProcessor.js (未被引用)"
echo "  - 备份文件 (*.backup)"
echo "  - 旧版本文件 (*_v*.js)"
echo "  - 旧测试文件"
echo ""

read -p "确认删除? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "已取消操作"
    exit 0
fi

echo ""
echo "开始清理..."
echo ""

# 1. 删除已拆分的旧文件
echo [1/5] 删除已拆分的旧文件...
[ -f js/chat.js ] && rm js/chat.js && echo "  ✓ 删除 js/chat.js"
[ -f js/claimsProcessorIntegrated.js ] && rm js/claimsProcessorIntegrated.js && echo "  ✓ 删除 js/claimsProcessorIntegrated.js"
echo "  ℹ js/claimsProcessor.js 暂时保留（可能被独立页面使用）"

# 2. 删除备份文件
echo "[2/5] 删除备份文件..."
[ -f js/claimsProcessorIntegrated.js.backup ] && rm js/claimsProcessorIntegrated.js.backup && echo "  ✓ 删除 js/claimsProcessorIntegrated.js.backup"
[ -f js/patentDetailNewTab.js.backup ] && rm js/patentDetailNewTab.js.backup && echo "  ✓ 删除 js/patentDetailNewTab.js.backup"

# 3. 删除Drawing Marker旧版本
echo "[3/5] 删除Drawing Marker旧版本..."
[ -f js/drawingMarkerInteractive.js ] && rm js/drawingMarkerInteractive.js && echo "  ✓ 删除 js/drawingMarkerInteractive.js"
[ -f js/drawingMarkerInteractive_v5.js ] && rm js/drawingMarkerInteractive_v5.js && echo "  ✓ 删除 js/drawingMarkerInteractive_v5.js"
[ -f js/drawingMarkerInteractive_v6.js ] && rm js/drawingMarkerInteractive_v6.js && echo "  ✓ 删除 js/drawingMarkerInteractive_v6.js"
[ -f js/drawingMarkerInteractive_v8_backup.js ] && rm js/drawingMarkerInteractive_v8_backup.js && echo "  ✓ 删除 js/drawingMarkerInteractive_v8_backup.js"

# 4. 删除Claims Comparison旧版本
echo "[4/5] 删除Claims Comparison旧版本..."
[ -f js/claimsComparison_v3.js ] && rm js/claimsComparison_v3.js && echo "  ✓ 删除 js/claimsComparison_v3.js"
[ -f js/claimsComparison_v4.js ] && rm js/claimsComparison_v4.js && echo "  ✓ 删除 js/claimsComparison_v4.js"

# 5. 删除旧测试文件
echo "[5/5] 删除旧测试文件..."
[ -f tests/tests_html/temp_old_index.html ] && rm tests/tests_html/temp_old_index.html && echo "  ✓ 删除 tests/tests_html/temp_old_index.html"

echo ""
echo "========================================"
echo "清理完成!"
echo "========================================"
echo ""
echo "已删除的文件:"
echo "  - 已拆分的旧文件: 2个"
echo "  - 备份文件: 2个"
echo "  - Drawing Marker旧版本: 4个"
echo "  - Claims Comparison旧版本: 2个"
echo "  - 旧测试文件: 1个"
echo "  总计: 11个文件"
echo ""
echo "保留的文件:"
echo "  - js/claimsProcessor.js (可能被独立页面使用)"
echo ""
echo "下一步:"
echo "  1. 测试所有功能是否正常"
echo "  2. 检查浏览器控制台是否有错误"
echo "  3. 提交更改到Git"
echo ""
echo "如果发现问题，可以使用以下命令回滚:"
echo "  git reset --hard HEAD~1"
echo ""

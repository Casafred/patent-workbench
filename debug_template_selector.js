// 调试模板选择器的脚本
// 在浏览器控制台运行此脚本

console.log('='.repeat(60));
console.log('🔍 模板选择器调试工具');
console.log('='.repeat(60));

const selector = document.getElementById('patent_template_selector');

if (!selector) {
    console.error('❌ 找不到 patent_template_selector 元素！');
    console.log('💡 请确保：');
    console.log('   1. 已经切换到功能六标签页');
    console.log('   2. 页面已完全加载');
} else {
    console.log('✅ 找到 patent_template_selector 元素');
    console.log('');
    
    // 检查选项数量
    console.log('📊 选项统计:');
    console.log('   总选项数:', selector.options.length);
    console.log('   optgroup数量:', selector.querySelectorAll('optgroup').length);
    console.log('');
    
    // 列出所有选项
    console.log('📋 所有选项:');
    Array.from(selector.options).forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.textContent} (value: ${option.value})`);
    });
    console.log('');
    
    // 检查当前选中
    console.log('🎯 当前选中:');
    console.log('   value:', selector.value);
    console.log('   text:', selector.options[selector.selectedIndex]?.textContent);
    console.log('');
    
    // 检查样式
    const styles = window.getComputedStyle(selector);
    console.log('🎨 样式检查:');
    console.log('   display:', styles.display);
    console.log('   visibility:', styles.visibility);
    console.log('   opacity:', styles.opacity);
    console.log('   width:', styles.width);
    console.log('   height:', styles.height);
    console.log('   background:', styles.background);
    console.log('');
    
    // 检查是否被禁用
    console.log('⚙️ 状态检查:');
    console.log('   disabled:', selector.disabled);
    console.log('   readOnly:', selector.readOnly);
    console.log('');
    
    // 输出HTML
    console.log('📄 HTML内容:');
    console.log(selector.outerHTML);
    console.log('');
    
    // 测试点击
    console.log('🖱️ 尝试触发点击事件...');
    try {
        selector.focus();
        console.log('✅ focus() 成功');
    } catch (e) {
        console.error('❌ focus() 失败:', e.message);
    }
}

console.log('='.repeat(60));
console.log('💡 如果选项数量为0，说明初始化失败');
console.log('💡 如果选项数量>0但看不到，可能是CSS样式问题');
console.log('💡 如果display为none，说明元素被隐藏了');
console.log('='.repeat(60));

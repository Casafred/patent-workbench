// 测试模板选择器的脚本
console.log('=== 测试模板选择器 ===');

// 测试1: 检查appState是否存在
console.log('1. 检查appState:', typeof appState);
if (typeof appState !== 'undefined') {
    console.log('2. 检查appState.generator:', typeof appState.generator);
    if (appState.generator) {
        console.log('3. 检查appState.generator.presetTemplates:', typeof appState.generator.presetTemplates);
        if (appState.generator.presetTemplates) {
            console.log('4. 预设模板数量:', appState.generator.presetTemplates.length);
            console.log('5. 预设模板内容:', appState.generator.presetTemplates);
        }
        
        console.log('6. 检查appState.generator.customTemplates:', typeof appState.generator.customTemplates);
        if (appState.generator.customTemplates) {
            console.log('7. 自定义模板数量:', appState.generator.customTemplates.length);
        }
    }
}

// 测试2: 检查模板选择器元素
console.log('8. 检查模板选择器元素:', document.getElementById('template_selector'));

// 测试3: 手动更新模板选择器
function testUpdateTemplateSelector() {
    console.log('9. 开始手动更新模板选择器');
    const templateSelector = document.getElementById('template_selector');
    
    if (!templateSelector) {
        console.error('模板选择器元素不存在');
        return;
    }
    
    if (!appState || !appState.generator || !appState.generator.presetTemplates) {
        console.error('appState.generator.presetTemplates 不存在');
        return;
    }
    
    // 清空选择器
    templateSelector.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '选择预置模板或新建';
    templateSelector.appendChild(defaultOption);
    
    // 添加预设模板
    console.log('10. 添加预设模板:');
    appState.generator.presetTemplates.forEach(template => {
        console.log('预设模板:', template.name);
        const option = document.createElement('option');
        option.value = template.name;
        option.textContent = `[预设] ${template.name}`;
        templateSelector.appendChild(option);
    });
    
    // 添加自定义模板
    console.log('11. 添加自定义模板:');
    if (appState.generator.customTemplates) {
        appState.generator.customTemplates.forEach(template => {
            console.log('自定义模板:', template.name);
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = `[自定义] ${template.name}`;
            templateSelector.appendChild(option);
        });
    }
    
    console.log('12. 模板选择器更新完成，总选项数:', templateSelector.options.length);
}

// 运行测试
testUpdateTemplateSelector();
console.log('=== 测试完成 ===');

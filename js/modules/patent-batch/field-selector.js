// ====================================================================
// 字段选择器功能模块
// ====================================================================

/**
 * 切换字段选择器面板
 */
window.toggleFieldSelectorPanel = function() {
    const panel = document.getElementById('field_selector_panel');
    const btn = document.getElementById('toggle_field_selector_btn');
    
    if (!panel || !btn) {
        console.warn('Field selector panel or button not found');
        return;
    }
    
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px;"><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>收起字段选择';
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 6px;"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>选择爬取字段';
    }
};

/**
 * 切换字段选项
 */
window.toggleFieldOption = function(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
        element.classList.toggle('checked', checkbox.checked);
        updateFieldCount();
        checkPerformanceWarning();
    }
};

/**
 * 全选可选字段
 */
window.selectAllOptionalFields = function() {
    const checkboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]:not([disabled])');
    checkboxes.forEach(cb => {
        cb.checked = true;
        cb.closest('.field-option')?.classList.add('checked');
    });
    updateFieldCount();
    checkPerformanceWarning();
};

/**
 * 取消全选可选字段
 */
window.deselectAllOptionalFields = function() {
    const checkboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]:not([disabled])');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.field-option')?.classList.remove('checked');
    });
    updateFieldCount();
    checkPerformanceWarning();
};

/**
 * 选择推荐字段配置
 */
window.selectRecommendedFields = function() {
    // 推荐字段列表
    const recommendedFields = [
        'abstract',
        'claims',
        'description',
        'drawings',
        'citations',
        'legal_events',
        'family'
    ];
    
    const checkboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]:not([disabled])');
    checkboxes.forEach(cb => {
        const fieldName = cb.value;
        if (recommendedFields.includes(fieldName)) {
            cb.checked = true;
            cb.closest('.field-option')?.classList.add('checked');
        } else {
            cb.checked = false;
            cb.closest('.field-option')?.classList.remove('checked');
        }
    });
    updateFieldCount();
    checkPerformanceWarning();
};

/**
 * 更新字段计数
 */
function updateFieldCount() {
    const baseCount = 8; // 基础字段数量
    const optionalCheckboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]:not([disabled])');
    const selectedOptional = Array.from(optionalCheckboxes).filter(cb => cb.checked).length;
    const total = baseCount + selectedOptional;
    
    const countElement = document.getElementById('selected_fields_count');
    if (countElement) {
        countElement.textContent = total;
    }
    
    // 更新统计文本
    const statsElement = document.querySelector('.field-selector-count');
    if (statsElement) {
        statsElement.innerHTML = `已选择 <strong id="selected_fields_count">${total}</strong> 个字段（基础${baseCount}个 + 可选${selectedOptional}个）`;
    }
}

/**
 * 检查性能警告
 */
function checkPerformanceWarning() {
    // 耗时字段列表
    const expensiveFields = ['description', 'claims', 'full_text'];
    
    const selectedExpensive = Array.from(
        document.querySelectorAll('#field_selector_panel input[type="checkbox"]:checked')
    ).filter(cb => expensiveFields.includes(cb.value)).length;
    
    const warning = document.getElementById('field_selector_warning');
    if (warning) {
        warning.style.display = selectedExpensive >= 2 ? 'flex' : 'none';
    }
}

/**
 * 获取选中的字段列表（根据字段选择器面板状态决定）
 * 如果面板未展开，返回所有字段（全爬取模式）
 * 如果面板已展开，返回勾选的字段（选择性爬取模式）
 */
window.getSelectedFields = function() {
    const panel = document.getElementById('field_selector_panel');
    const isPanelOpen = panel && panel.style.display === 'block';
    
    // 基础字段（始终包含）
    const baseFields = [
        'patent_number',
        'title',
        'applicant',
        'inventor',
        'filing_date',
        'publication_date',
        'priority_date',
        'ipc_classification'
    ];
    
    // 如果面板未展开，返回所有字段（全爬取模式）
    if (!isPanelOpen) {
        // 所有可选字段
        const allOptionalFields = [
            'classifications',
            'landscapes',
            'family_id',
            'family_applications',
            'country_status',
            'patent_citations',
            'cited_by',
            'events_timeline',
            'legal_events',
            'similar_documents',
            'description',
            'drawings',
            'external_links'
        ];
        console.log('📋 字段选择器未展开，使用全爬取模式（所有字段）');
        return [...baseFields, ...allOptionalFields];
    }
    
    // 面板已展开，返回勾选的字段（选择性爬取模式）
    const optionalCheckboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]:checked');
    const optionalFields = Array.from(optionalCheckboxes).map(cb => cb.value);
    console.log('📋 字段选择器已展开，使用选择性爬取模式，勾选字段:', optionalFields);
    
    return [...baseFields, ...optionalFields];
};

/**
 * 获取所有字段列表（用于全爬取模式）
 */
window.getAllFields = function() {
    const baseFields = [
        'patent_number',
        'title',
        'applicant',
        'inventor',
        'filing_date',
        'publication_date',
        'priority_date',
        'ipc_classification'
    ];
    
    const allOptionalFields = [
        'classifications',
        'landscapes',
        'family_id',
        'family_applications',
        'country_status',
        'patent_citations',
        'cited_by',
        'events_timeline',
        'legal_events',
        'similar_documents',
        'description',
        'drawings',
        'external_links'
    ];
    
    return [...baseFields, ...allOptionalFields];
};

/**
 * 检查字段选择器是否处于展开状态
 */
window.isFieldSelectorOpen = function() {
    const panel = document.getElementById('field_selector_panel');
    return panel && panel.style.display === 'block';
};

/**
 * 选择性爬取 - 开始获取
 * 在字段选择器展开时，根据勾选的字段开始爬取
 */
window.startSelectiveCrawl = function() {
    const patentNumbersInput = document.getElementById('patent_numbers_input');
    
    if (!patentNumbersInput) {
        console.error('❌ 专利号输入框不存在');
        alert('页面加载异常，请刷新后重试');
        return;
    }
    
    const input = patentNumbersInput.value.trim();
    if (!input) {
        alert('请输入专利号');
        return;
    }
    
    // 处理专利号
    const patentNumbers = input.replace(/\n/g, ' ').split(/\s+/).filter(num => num);
    const uniquePatents = [...new Set(patentNumbers)];
    
    if (uniquePatents.length > 50) {
        alert('最多支持50个专利号');
        return;
    }
    
    if (uniquePatents.length === 0) {
        alert('请输入有效的专利号');
        return;
    }
    
    // 获取选中的字段
    const selectedFields = getSelectedFields();
    console.log('📋 选择性爬取 - 选中的字段:', selectedFields);
    
    // 触发批量查询按钮的点击事件
    const searchPatentsBtn = document.getElementById('search_patents_btn');
    if (searchPatentsBtn) {
        searchPatentsBtn.click();
    } else {
        console.error('❌ 批量查询按钮不存在');
        alert('页面加载异常，请刷新后重试');
    }
};

/**
 * 初始化字段选择器
 * 这个函数会在组件加载后被调用
 */
window.initFieldSelector = function() {
    console.log('🔧 Initializing field selector...');
    
    // 绑定切换按钮
    const toggleBtn = document.getElementById('toggle_field_selector_btn');
    if (toggleBtn) {
        // 移除旧的事件监听器（如果有）
        toggleBtn.replaceWith(toggleBtn.cloneNode(true));
        const newToggleBtn = document.getElementById('toggle_field_selector_btn');
        newToggleBtn.addEventListener('click', toggleFieldSelectorPanel);
        console.log('✅ Field selector toggle button bound');
    } else {
        console.warn('⚠️ Field selector toggle button not found');
    }
    
    // 初始化字段计数
    updateFieldCount();
    
    // 初始化性能警告
    checkPerformanceWarning();
    
    // 为所有字段选项添加checked类（如果已选中）
    const checkboxes = document.querySelectorAll('#field_selector_panel input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.checked) {
            cb.closest('.field-option')?.classList.add('checked');
        }
        
        // 绑定change事件
        cb.addEventListener('change', function() {
            updateFieldCount();
            checkPerformanceWarning();
        });
    });
    
    console.log('✅ Field selector initialized');
};

console.log('✅ Field selector module loaded');

/**
 * Claims Processor Core Module
 * Main initialization and coordination for claims processing
 * Version: 1.0.0
 * Date: 2026-02-07
 */

console.log('Claims Processor Core Module v1.0.0 Loaded');

// Import sub-modules
import { handleClaimsFileSelect, loadClaimsColumns } from './claims-file-handler.js';
import { handleClaimsProcess, exportClaimsResults } from './claims-processor.js';
import { claimsGenerateVisualization } from './claims-visualization.js';
import { 
    analyzeClaimsText, 
    loadClaimsTextExample,
    initClaimsTextAnalyzer 
} from './claims-text-analyzer.js';
import { 
    claimsSearchPatentNumbers, 
    claimsSelectPatent,
    showClaimsPatentQuerySection 
} from './claims-patent-search.js';

// Global state object to avoid global variables
const claimsState = {
    currentFile: null,
    currentFilePath: null,
    currentFileId: null,
    currentTaskId: null,
    processingInterval: null,
    processedData: null,
    currentPatentColumn: null,
    selectedPatentNumber: null,
    selectedPatentRow: null,
    visualizationRenderer: null,
    textAnalyzedData: [],
    textVisualizationRenderer: null
};

/**
 * Initialize claims processor
 */
export function initClaimsProcessor() {
    const fileInput = document.getElementById('claims_excel_file');
    const processBtn = document.getElementById('claims_process_btn');
    const exportExcelBtn = document.getElementById('claims_export_excel_btn');
    const exportJsonBtn = document.getElementById('claims_export_json_btn');
    
    // Patent search and visualization elements
    const patentSearchInput = document.getElementById('claims_patent_search_input');
    const searchPatentBtn = document.getElementById('claims_search_patent_btn');
    const visualizePatentBtn = document.getElementById('claims_visualize_patent_btn');
    const styleSelector = document.getElementById('claims_style_selector');
    const zoomIn = document.getElementById('claims_zoom_in');
    const zoomOut = document.getElementById('claims_zoom_out');
    const zoomReset = document.getElementById('claims_zoom_reset');
    const centerView = document.getElementById('claims_center_view');
    
    if (!fileInput) return;
    
    // File selection event
    fileInput.addEventListener('change', (event) => handleClaimsFileSelect(event, claimsState));
    
    // Process button
    if (processBtn) {
        processBtn.addEventListener('click', () => handleClaimsProcess(claimsState));
    }
    
    // Export buttons
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => exportClaimsResults('excel', claimsState));
    }
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => exportClaimsResults('json', claimsState));
    }
    
    // Patent search event listeners
    if (searchPatentBtn) {
        searchPatentBtn.addEventListener('click', () => claimsSearchPatentNumbers(claimsState));
    }
    
    if (patentSearchInput) {
        patentSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                claimsSearchPatentNumbers(claimsState);
            }
        });
    }
    
    if (visualizePatentBtn) {
        visualizePatentBtn.addEventListener('click', () => claimsGenerateVisualization(claimsState));
    }
    
    // Visualization controls
    if (styleSelector) {
        styleSelector.addEventListener('change', () => {
            if (claimsState.visualizationRenderer && claimsState.visualizationRenderer.currentData) {
                claimsState.visualizationRenderer.render(claimsState.visualizationRenderer.currentData, styleSelector.value);
            }
        });
    }
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            if (claimsState.visualizationRenderer) claimsState.visualizationRenderer.zoomIn();
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            if (claimsState.visualizationRenderer) claimsState.visualizationRenderer.zoomOut();
        });
    }
    
    if (zoomReset) {
        zoomReset.addEventListener('click', () => {
            if (claimsState.visualizationRenderer) claimsState.visualizationRenderer.zoomReset();
        });
    }
    
    if (centerView) {
        centerView.addEventListener('click', () => {
            if (claimsState.visualizationRenderer) claimsState.visualizationRenderer.centerView();
        });
    }
    
    // Tree spread control
    const treeSpreadSlider = document.getElementById('claims_tree_spread_slider');
    const treeSpreadValue = document.getElementById('claims_tree_spread_value');
    const treeSpreadControl = document.getElementById('claims_tree_spread_control');
    
    if (treeSpreadSlider && treeSpreadValue) {
        treeSpreadSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            treeSpreadValue.textContent = value.toFixed(1) + 'x';
            if (claimsState.visualizationRenderer) {
                claimsState.visualizationRenderer.setTreeSpreadFactor(value);
            }
        });
    }
    
    // Show/hide tree spread control based on style
    if (styleSelector && treeSpreadControl) {
        styleSelector.addEventListener('change', () => {
            if (styleSelector.value === 'tree') {
                treeSpreadControl.style.display = 'flex';
            } else {
                treeSpreadControl.style.display = 'none';
            }
        });
        treeSpreadControl.style.display = styleSelector.value === 'tree' ? 'flex' : 'none';
    }
    
    // Screenshot button
    const screenshotBtn = document.getElementById('claims_screenshot_btn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
            if (claimsState.visualizationRenderer) {
                const success = claimsState.visualizationRenderer.captureHighResScreenshot();
                if (success) {
                    showClaimsMessage('高清截图已保存！', 'success');
                }
            } else {
                showClaimsMessage('请先生成可视化图表', 'error');
            }
        });
    }
    
    // Initialize text analyzer
    initClaimsTextAnalyzer(claimsState);
}

/**
 * Switch between claims sub-tabs
 * @param {String} tabName - Tab name to switch to
 */
export function switchClaimsSubTab(tabName) {
    console.log('=== switchClaimsSubTab called ===');
    console.log('Tab name:', tabName);
    
    // Hide all sub-tabs
    const allSubTabs = document.querySelectorAll('.claims-sub-tab');
    console.log('Found sub-tabs:', allSubTabs.length);
    allSubTabs.forEach(tab => {
        console.log('Hiding tab:', tab.id);
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    const allButtons = document.querySelectorAll('#claims_processor-tab .sub-tab-button');
    console.log('Found buttons:', allButtons.length);
    allButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTabId = `claims-${tabName}-tab`;
    const targetTab = document.getElementById(targetTabId);
    console.log('Looking for tab:', targetTabId);
    console.log('Target tab found:', !!targetTab);
    
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
        targetTab.style.visibility = 'visible';
        targetTab.style.opacity = '1';
        targetTab.style.height = 'auto';
        
        console.log('Tab displayed successfully');
        console.log('Tab computed style:', window.getComputedStyle(targetTab).display);
        console.log('Tab offsetHeight:', targetTab.offsetHeight);
        console.log('Tab children count:', targetTab.children.length);
        
        if (targetTab.children.length > 0) {
            console.log('First child:', targetTab.children[0]);
            console.log('First child display:', window.getComputedStyle(targetTab.children[0]).display);
        }
    } else {
        console.error('Target tab not found:', targetTabId);
        const allTabs = document.querySelectorAll('[id*="claims"]');
        console.log('Available tabs with "claims" in ID:');
        allTabs.forEach(tab => console.log('  -', tab.id));
    }
    
    // Activate corresponding button
    const clickedButton = window.event ? window.event.target : event.target;
    if (clickedButton) {
        clickedButton.classList.add('active');
        console.log('Button activated');
    }
    
    console.log('=== switchClaimsSubTab completed ===');
}

/**
 * Display claims processing results
 * @param {Object} result - Processing result
 * @param {Object} state - Claims state object
 */
export function displayClaimsResults(result, state) {
    const summary = result.summary || {};
    const claims = result.claims || [];
    
    // Update statistics
    document.getElementById('claims_stat_cells').textContent = summary.total_cells_processed || 0;
    document.getElementById('claims_stat_total').textContent = summary.total_claims_extracted || 0;
    document.getElementById('claims_stat_independent').textContent = summary.independent_claims_count || 0;
    document.getElementById('claims_stat_dependent').textContent = summary.dependent_claims_count || 0;
    
    // Show results container
    const resultsContainer = document.getElementById('claims_results_container');
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }
    
    // Fill table
    const tbody = document.getElementById('claims_results_tbody');
    if (tbody && claims.length > 0) {
        tbody.innerHTML = '';
        
        const MAX_DISPLAY_CLAIMS = 500;
        const displayClaims = claims.slice(0, MAX_DISPLAY_CLAIMS);
        
        displayClaims.forEach(claim => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${claim.claim_number}</td>
                <td><span class="badge ${claim.claim_type === 'independent' ? 'badge-primary' : 'badge-secondary'}">${claim.claim_type === 'independent' ? '独立' : '从属'}</span></td>
                <td>${claim.language === 'zh' ? '中文' : claim.language === 'en' ? '英文' : claim.language}</td>
                <td>${claim.referenced_claims && claim.referenced_claims.length > 0 ? claim.referenced_claims.join(', ') : '-'}</td>
                <td title="${claim.claim_text}">${claim.claim_text.substring(0, 100)}${claim.claim_text.length > 100 ? '...' : ''}</td>
                <td>${(claim.confidence_score * 100).toFixed(0)}%</td>
            `;
        });
        
        if (claims.length > MAX_DISPLAY_CLAIMS) {
            const messageRow = tbody.insertRow();
            messageRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 15px; background-color: #fff3cd; color: #856404;">
                    <strong>⚠️ 数据量较大</strong><br>
                    共有 ${claims.length} 条权利要求，当前仅显示前 ${MAX_DISPLAY_CLAIMS} 条以优化性能。<br>
                    完整数据可通过导出功能获取。
                </td>
            `;
        }
    }
    
    // Show patent summary section
    showClaimsPatentSummarySection(claims, state);
    
    // Show patent query section
    showClaimsPatentQuerySection(state);
}

/**
 * Show patent summary section with independent claims
 * @param {Array} claims - Claims array
 * @param {Object} state - Claims state object
 */
export function showClaimsPatentSummarySection(claims, state) {
    const summarySection = document.getElementById('claims_patent_summary_section');
    const summaryTbody = document.getElementById('claims_patent_summary_tbody');
    
    if (!summarySection || !summaryTbody) {
        console.warn('公开号与独权合并视窗元素未找到');
        return;
    }
    
    console.log('开始构建公开号与独权合并视窗，权利要求数量:', claims.length);
    
    // Group by patent number
    const patentGroups = new Map();
    
    claims.forEach((claim, index) => {
        let patentNumber = claim.patent_number;
        if (!patentNumber || patentNumber === 'Unknown' || patentNumber.trim() === '') {
            patentNumber = `Row_${claim.row_index !== undefined && claim.row_index !== null ? claim.row_index : index}`;
        }
        
        if (!patentGroups.has(patentNumber)) {
            patentGroups.set(patentNumber, []);
        }
        patentGroups.get(patentNumber).push(claim);
    });
    
    console.log('专利分组完成，分组数量:', patentGroups.size);
    console.log('专利号列表:', Array.from(patentGroups.keys()));
    
    // Clear table
    summaryTbody.innerHTML = '';
    
    // Create row for each patent
    let rowCount = 0;
    patentGroups.forEach((patentClaims, patentNumber) => {
        const independentClaims = patentClaims.filter(claim => claim.claim_type === 'independent');
        
        console.log(`专利 ${patentNumber}: 总权利要求 ${patentClaims.length}, 独立权利要求 ${independentClaims.length}`);
        
        const rowIndex = patentClaims[0]?.row_index;
        const rowDisplay = rowIndex && rowIndex > 0 ? `Excel行号: ${rowIndex + 1}` : '';
        
        let mergedText = '';
        if (independentClaims.length > 0) {
            mergedText = independentClaims
                .map((claim, idx) => `${idx + 1}. ${claim.claim_text}`)
                .join('\n\n');
        } else {
            mergedText = '无独立权利要求';
        }
        
        const row = summaryTbody.insertRow();
        row.innerHTML = `
            <td class="patent-number-cell">
                <div>${patentNumber}</div>
                ${rowDisplay ? `<div class="row-index-badge">${rowDisplay}</div>` : ''}
            </td>
            <td class="merged-claims-cell" title="${mergedText}">
                <div class="merged-claims-content">${mergedText}</div>
            </td>
            <td class="action-cell">
                <button class="small-button" onclick="window.claimsJumpToVisualization('${patentNumber}', ${rowIndex || 0})">查看引用图</button>
            </td>
        `;
        rowCount++;
    });
    
    console.log('表格行创建完成，总行数:', rowCount);
    
    if (patentGroups.size > 0) {
        summarySection.style.display = 'block';
        console.log('公开号与独权合并视窗已显示');
    } else {
        console.warn('没有专利数据可显示');
    }
}

/**
 * Jump to visualization for a specific patent
 * @param {String} patentNumber - Patent number
 * @param {Number} rowIndex - Row index
 * @param {Object} state - Claims state object
 */
export function claimsJumpToVisualization(patentNumber, rowIndex, state) {
    state.selectedPatentNumber = patentNumber;
    state.selectedPatentRow = rowIndex || 0;
    
    const selectedPatentNumberEl = document.getElementById('claims_selected_patent_number');
    const selectedPatentRowEl = document.getElementById('claims_selected_patent_row');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    
    if (selectedPatentNumberEl) {
        selectedPatentNumberEl.textContent = patentNumber;
    }
    
    if (selectedPatentRowEl) {
        selectedPatentRowEl.textContent = rowIndex && rowIndex > 0 ? (rowIndex + 1) : 'N/A';
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'block';
    }
    
    claimsGenerateVisualization(state);
    
    const visualizationSection = document.getElementById('claims_visualization_section');
    if (visualizationSection) {
        visualizationSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Show message to user
 * @param {String} message - Message text
 * @param {String} type - Message type (info, success, error)
 */
export function showClaimsMessage(message, type) {
    console.log(`[${type}] ${message}`);
    
    const progressText = document.getElementById('claims_progress_text');
    if (progressText && type === 'info') {
        progressText.textContent = message;
    }
    
    if (type === 'error') {
        alert(message);
    }
}

// Expose functions to window object for event handlers
window.switchClaimsSubTab = switchClaimsSubTab;
window.claimsSelectPatent = (patentNumber, rowIndex) => claimsSelectPatent(patentNumber, rowIndex, claimsState);
window.claimsJumpToVisualization = (patentNumber, rowIndex) => claimsJumpToVisualization(patentNumber, rowIndex, claimsState);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClaimsProcessor);
} else {
    initClaimsProcessor();
}

/**
 * Claims Patent Search Module
 * Handles patent number searching and result display
 * Version: 1.0.0
 * Date: 2026-02-07
 */

console.log('Claims Patent Search Module v1.0.0 Loaded');

/**
 * Search for patent numbers in the uploaded file
 * @param {Object} state - Claims state object
 */
export async function claimsSearchPatentNumbers(state) {
    const patentSearchInput = document.getElementById('claims_patent_search_input');
    const query = patentSearchInput ? patentSearchInput.value.trim() : '';
    
    if (!query) {
        showClaimsMessage('请输入专利号片段', 'error');
        return;
    }
    
    if (!state.currentFileId) {
        showClaimsMessage('请先上传文件并完成权利要求处理', 'error');
        return;
    }
    
    try {
        showClaimsMessage('正在搜索专利号...', 'info');
        
        let results = [];
        
        // Strategy 1: Search from processed results
        if (state.processedData && state.processedData.claims) {
            console.log('策略1: 从处理结果中搜索');
            const patentMap = new Map();
            state.processedData.claims.forEach(claim => {
                if (claim.patent_number && claim.patent_number.toLowerCase().includes(query.toLowerCase())) {
                    patentMap.set(claim.patent_number, null);
                }
            });
            
            results = Array.from(patentMap.entries()).map(([patent_number, _]) => ({
                patent_number,
                row_index: 0
            }));
            
            if (results.length > 0) {
                console.log('在处理结果中找到', results.length, '个匹配的专利号');
                displayClaimsSearchResults(results, query, state);
                return;
            }
        }
        
        // Strategy 2: Search from Excel data (if patent column exists)
        if (state.currentPatentColumn) {
            console.log('策略2: 从Excel数据搜索，专利号列:', state.currentPatentColumn);
            try {
                const response = await fetch(`/api/excel/${state.currentFileId}/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        column_name: state.currentPatentColumn,
                        query: query,
                        limit: 20
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data.results.length > 0) {
                    console.log('在Excel数据中找到', result.data.results.length, '个匹配项');
                    displayClaimsSearchResults(result.data.results, query, state);
                    return;
                }
            } catch (error) {
                console.error('Excel搜索失败:', error);
            }
        }
        
        // Strategy 3: Fuzzy search all columns
        console.log('策略3: 模糊搜索所有列');
        try {
            const response = await fetch(`/api/excel/${state.currentFileId}/data?page=1&page_size=100`, {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const fuzzyResults = performFuzzySearch(result.data.data, query);
                if (fuzzyResults.length > 0) {
                    console.log('模糊搜索找到', fuzzyResults.length, '个匹配项');
                    displayClaimsSearchResults(fuzzyResults, query, state);
                    return;
                }
            }
        } catch (error) {
            console.error('模糊搜索失败:', error);
        }
        
        // No results found
        showClaimsMessage('未找到包含 "' + query + '" 的专利号。建议：1) 检查输入是否正确 2) 尝试输入更少的字符 3) 确认Excel中包含专利号数据', 'error');
        displayClaimsSearchResults([], query, state);
        
    } catch (error) {
        console.error('Search error:', error);
        showClaimsMessage('搜索失败: ' + error.message, 'error');
    }
}

/**
 * Perform fuzzy search on data
 * @param {Array} data - Data to search
 * @param {String} query - Search query
 * @returns {Array} Search results
 */
function performFuzzySearch(data, query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    data.forEach((row, index) => {
        for (const [columnName, value] of Object.entries(row.data)) {
            if (value && typeof value === 'string') {
                const valueLower = value.toLowerCase();
                if (valueLower.includes(queryLower)) {
                    if (looksLikePatentNumber(value)) {
                        results.push({
                            patent_number: value,
                            row_index: row.row_index,
                            source_column: columnName,
                            match_type: 'fuzzy',
                            data: row.data
                        });
                        break;
                    }
                }
            }
        }
    });
    
    return results.slice(0, 20);
}

/**
 * Check if a string looks like a patent number
 * @param {String} value - String to check
 * @returns {Boolean} True if looks like patent number
 */
export function looksLikePatentNumber(value) {
    if (!value || typeof value !== 'string') return false;
    
    const cleanValue = value.trim();
    
    if (cleanValue.length < 6 || cleanValue.length > 25) return false;
    
    if (!/\d/.test(cleanValue)) return false;
    
    const patentPatterns = [
        /^[A-Z]{2,4}\d+[A-Z]?\d?$/i,
        /^\d{6,20}$/,
        /^[A-Z]{2}\d{4}-?\d+[A-Z]?$/i,
        /^ZL\d+\.?\d?$/i,
    ];
    
    return patentPatterns.some(pattern => pattern.test(cleanValue));
}

/**
 * Display search results
 * @param {Array} results - Search results
 * @param {String} query - Search query
 * @param {Object} state - Claims state object
 */
export function displayClaimsSearchResults(results, query, state) {
    const searchResults = document.getElementById('claims_search_results');
    const searchResultsContainer = document.getElementById('claims_search_results_container');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    const visualizationSection = document.getElementById('claims_visualization_section');
    
    if (!searchResults) return;
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                未找到包含 "${query}" 的专利号
            </div>
        `;
    } else {
        let html = '';
        results.forEach((result, index) => {
            const patentNumber = result.patent_number || result.claim_number || 'Unknown';
            const rowIndex = result.row_index;
            
            const rowInfo = rowIndex && rowIndex > 0 ? 
                `<div class="search-result-row">行号: ${rowIndex + 1}</div>` : 
                '';
            
            html += `
                <div class="search-result-item" onclick="window.claimsSelectPatent('${patentNumber}', ${rowIndex || 0})">
                    <div class="search-result-patent">${patentNumber}</div>
                    ${rowInfo}
                </div>
            `;
        });
        searchResults.innerHTML = html;
        
        showClaimsMessage(`找到 ${results.length} 个匹配的专利号`, 'success');
    }
    
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'block';
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'none';
    }
    
    if (visualizationSection) {
        visualizationSection.style.display = 'none';
    }
}

/**
 * Select a patent from search results
 * @param {String} patentNumber - Patent number
 * @param {Number} rowIndex - Row index
 * @param {Object} state - Claims state object
 */
export function claimsSelectPatent(patentNumber, rowIndex, state) {
    state.selectedPatentNumber = patentNumber;
    state.selectedPatentRow = rowIndex;
    
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const clickedElement = event.currentTarget;
    if (clickedElement) {
        clickedElement.classList.add('selected');
    }
    
    const selectedPatentNumber = document.getElementById('claims_selected_patent_number');
    const selectedPatentRow = document.getElementById('claims_selected_patent_row');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    const visualizationSection = document.getElementById('claims_visualization_section');
    
    if (selectedPatentNumber) {
        selectedPatentNumber.textContent = patentNumber;
    }
    
    if (selectedPatentRow) {
        selectedPatentRow.textContent = rowIndex && rowIndex > 0 ? (rowIndex + 1) : 'N/A';
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'block';
    }
    
    if (visualizationSection) {
        visualizationSection.style.display = 'none';
    }
}

/**
 * Show patent query section
 * @param {Object} state - Claims state object
 */
export function showClaimsPatentQuerySection(state) {
    console.log('showClaimsPatentQuerySection called');
    console.log('claimsCurrentFileId:', state.currentFileId);
    console.log('claimsCurrentPatentColumn:', state.currentPatentColumn);
    
    const patentQuerySection = document.getElementById('claims_patent_query_section');
    
    if (state.currentFileId && patentQuerySection) {
        console.log('Showing claims patent query section');
        patentQuerySection.style.display = 'block';
        
        patentQuerySection.scrollIntoView({ behavior: 'smooth' });
        
        if (!state.currentPatentColumn) {
            showClaimsMessage('提示：如果需要使用专利号搜索功能，请先确保Excel中有专利号列', 'info');
        }
    } else {
        console.log('No file uploaded yet or patent query section not found');
    }
}

/**
 * Show message to user
 * @param {String} message - Message text
 * @param {String} type - Message type (info, success, error)
 */
function showClaimsMessage(message, type) {
    console.log(`[${type}] ${message}`);
    
    const progressText = document.getElementById('claims_progress_text');
    if (progressText && type === 'info') {
        progressText.textContent = message;
    }
    
    if (type === 'error') {
        alert(message);
    }
}

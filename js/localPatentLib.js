// js/localPatentLib.js (V4 - Resizable columns and column selection - Full Version)

function initLocalPatentLib() {
    // --- 事件监听器绑定 ---
    // 步骤 1
    lplOriginalFileInput.addEventListener('change', (e) => handleFileUpload(e, 'originalFile', lplOriginalSheetSelect, lplOriginalIgnoreHeader));
    lplOriginalSheetSelect.addEventListener('change', () => parseSheetData('originalFile', lplOriginalSheetSelect.value, lplOriginalIgnoreHeader.checked));
    lplOriginalIgnoreHeader.addEventListener('change', () => parseSheetData('originalFile', lplOriginalSheetSelect.value, lplOriginalIgnoreHeader.checked));
    lplExpandBtn.addEventListener('click', performExpansion);
    lplCopyBtn.addEventListener('click', copyExpandedList);
    lplDownloadTxtBtn.addEventListener('click', downloadExpandedListAsTxt);

    // 步骤 2
    lplOriginalReuploadInput.addEventListener('change', (e) => handleFileUpload(e, 'originalFile', lplOriginalMergeSheetSelect, lplOriginalMergeIgnoreHeader));
    lplOriginalMergeSheetSelect.addEventListener('change', () => parseSheetData('originalFile', lplOriginalMergeSheetSelect.value, lplOriginalMergeIgnoreHeader.checked, true));
    lplOriginalMergeIgnoreHeader.addEventListener('change', () => parseSheetData('originalFile', lplOriginalMergeSheetSelect.value, lplOriginalMergeIgnoreHeader.checked, true));
    
    lplNewFileInput.addEventListener('change', (e) => handleFileUpload(e, 'newFile', lplNewSheetSelect, lplNewIgnoreHeader));
    lplNewSheetSelect.addEventListener('change', () => parseSheetData('newFile', lplNewSheetSelect.value, lplNewIgnoreHeader.checked));
    lplNewIgnoreHeader.addEventListener('change', () => parseSheetData('newFile', lplNewSheetSelect.value, lplNewIgnoreHeader.checked));

    // 新增：列选择按钮事件
    lplSelectAllColsBtn.addEventListener('click', () => toggleAllColCheckboxes(true));
    lplDeselectAllColsBtn.addEventListener('click', () => toggleAllColCheckboxes(false));
    
    lplMergeBtn.addEventListener('click', performMerge);
    
    // 步骤 3
    lplDownloadFinalBtn.addEventListener('click', downloadFinalMergedReport);


    // --- 逻辑函数 ---

    // 【新功能】使表格列宽可拖动
    function makeTableResizable(table) {
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            const resizer = document.createElement('div');
            resizer.style.position = 'absolute';
            resizer.style.top = '0';
            resizer.style.right = '-3px';
            resizer.style.width = '6px';
            resizer.style.height = '100%';
            resizer.style.cursor = 'col-resize';
            resizer.style.userSelect = 'none';
            resizer.style.zIndex = '10';
            header.style.position = 'relative'; // 必须设置，否则resizer的absolute定位无效
            header.appendChild(resizer);

            let x = 0;
            let w = 0;

            const mouseDownHandler = function (e) {
                e.preventDefault(); // 防止拖动时选中文本
                x = e.clientX;
                const styles = window.getComputedStyle(header);
                w = parseInt(styles.width, 10);
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.style.backgroundColor = 'var(--primary-color)'; // 提供视觉反馈
            };

            const mouseMoveHandler = function (e) {
                const dx = e.clientX - x;
                header.style.width = `${w + dx}px`;
            };

            const mouseUpHandler = function () {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                resizer.style.backgroundColor = 'transparent'; // 恢复透明
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    }

    // 检查合并按钮状态的函数
    function checkMergeButtonState() {
        const isOriginalDataReady = appState.lpl.originalFile.jsonData && appState.lpl.originalFile.jsonData.length > 0;
        const isNewDataReady = appState.lpl.newFile.jsonData && appState.lpl.newFile.jsonData.length > 0;
        
        lplMergeBtn.disabled = !(isOriginalDataReady && isNewDataReady);
    }
    
    // 通用文件上传处理函数
    function handleFileUpload(event, fileType, sheetSelectElement, ignoreHeaderCheckbox) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                appState.lpl[fileType] = { ...appState.lpl[fileType], name: file.name, workbook, sheets: workbook.SheetNames, jsonData: null, headers: [] };
                
                sheetSelectElement.innerHTML = workbook.SheetNames.map(name => `<option value="${name}">${name}</option>`).join('');
                sheetSelectElement.disabled = false;
                
                // 自动触发第一个sheet的解析
                sheetSelectElement.dispatchEvent(new Event('change'));

            } catch (err) {
                alert(`解析 ${file.name} 失败: ${err.message}`);
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // 解析指定工作表的数据
    function parseSheetData(fileType, sheetName, ignoreHeader, isMergeContext = false) {
        const fileState = appState.lpl[fileType];
        if (!fileState.workbook) return;

        fileState.selectedSheet = sheetName;
        fileState.ignoreHeader = ignoreHeader;

        const worksheet = fileState.workbook.Sheets[sheetName];
        const options = { defval: "" };
        if (ignoreHeader) {
            options.header = 1;
        }

        let jsonData = XLSX.utils.sheet_to_json(worksheet, options);

        if (ignoreHeader && jsonData.length > 1) { // 至少要有表头和一行数据
            const headers = jsonData[0];
            const dataRows = jsonData.slice(1);
            jsonData = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
        }
        
        fileState.jsonData = jsonData;

        if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            fileState.headers = headers;

            if (fileType === 'originalFile') {
                lplOriginalFileConfirm.value = fileState.name;
                populateSelect(lplOriginalKeySelect, headers);
                lplExpandBtn.disabled = false;
                
                populateColumnSelection(headers);

                if(isMergeContext) {
                    lplOriginalMergeSheetSelect.innerHTML = fileState.sheets.map(name => `<option value="${name}">${name}</option>`).join('');
                    lplOriginalMergeSheetSelect.value = sheetName;
                    lplOriginalMergeSheetSelect.disabled = false;
                }
            } else if (fileType === 'newFile') {
                populateSelect(lplNewKeySelect, headers);
            }
        } else {
             fileState.jsonData = null;
             fileState.headers = [];
             const keySelect = fileType === 'originalFile' ? lplOriginalKeySelect : lplNewKeySelect;
             keySelect.innerHTML = '<option>无有效数据</option>';
             keySelect.disabled = true;
             if (fileType === 'originalFile') {
                lplOldColsSelectionArea.style.display = 'none';
                lplOldColsCheckboxes.innerHTML = '';
             }
        }
        
        checkMergeButtonState();
    }

    // 填充下拉选择框
    function populateSelect(selectElement, headers) {
        selectElement.innerHTML = headers.map(h => `<option value="${h}">${h}</option>`).join('');
        selectElement.disabled = false;
    }
    
    // 填充列选择复选框
    function populateColumnSelection(headers) {
        lplOldColsSelectionArea.style.display = 'block';
        lplOldColsCheckboxes.innerHTML = headers.map(header => `
            <label style="display: flex; align-items: center; cursor: pointer; padding: 5px; border-radius: 4px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--primary-color-hover-bg)'" onmouseout="this.style.backgroundColor='transparent'">
                <input type="checkbox" class="lpl-col-checkbox" value="${header}" style="width: auto; margin-right: 8px;">
                <span title="${header}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${header}</span>
            </label>
        `).join('');
    }

    // 全选/全不选复选框
    function toggleAllColCheckboxes(checked) {
        document.querySelectorAll('.lpl-col-checkbox').forEach(cb => cb.checked = checked);
    }
    
    // 获取用户勾选的列
    function getSelectedOldColumns() {
        return Array.from(document.querySelectorAll('.lpl-col-checkbox:checked')).map(cb => cb.value);
    }

    // 步骤 1: 展开专利号
    function performExpansion() {
        if (!appState.lpl.originalFile.jsonData) return alert('请先上传并选择有效的原始文件和工作表！');
        
        const familyColName = lplFamilyColNameInput.value.trim();
        const delimiter = lplDelimiterInput.value;
        const data = appState.lpl.originalFile.jsonData;

        if (!familyColName || !data[0] || typeof data[0][familyColName] === 'undefined') {
            return alert(`错误：在当前工作表中找不到名为 "${familyColName}" 的列。`);
        }

        updateStatus(lplExpandStatus, "正在处理，请稍候...", 'info');
        lplExpandResultArea.style.display = 'none';

        setTimeout(() => {
            try {
                const allPatentsInOrder = data.flatMap(row => {
                    const familyString = row[familyColName];
                    return (familyString && typeof familyString === 'string') 
                        ? familyString.split(delimiter).map(p => p.trim()).filter(Boolean)
                        : [];
                });
                
                const uniquePatents = [...new Set(allPatentsInOrder)];
                appState.lpl.expandedPatents = uniquePatents;

                lplUniqueCountSpan.textContent = uniquePatents.length;
                lplExpandedListOutput.value = uniquePatents.join('\n');
                updateStatus(lplExpandStatus, `✅ 处理成功！共展开 ${uniquePatents.length} 个唯一的专利号。`, 'success');
                lplExpandResultArea.style.display = 'block';
            } catch (error) {
                updateStatus(lplExpandStatus, `❌ 处理失败: ${error.message}`, 'error');
                console.error(error);
            }
        }, 100);
    }
    
    function copyExpandedList() {
        navigator.clipboard.writeText(lplExpandedListOutput.value)
            .then(() => alert('已成功复制到剪贴板！'))
            .catch(() => alert('复制失败，请手动复制。'));
    }

    function downloadExpandedListAsTxt() {
        const blob = new Blob([lplExpandedListOutput.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expanded_patent_list.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 步骤 2: 合并数据
    function performMerge() {
        if (!appState.lpl.originalFile.jsonData || !appState.lpl.newFile.jsonData) {
            return alert('请确保原始库和新库文件都已成功上传并解析！');
        }

        const originalKey = lplOriginalKeySelect.value;
        const newKey = lplNewKeySelect.value;
        const selectedCols = getSelectedOldColumns();

        if (!originalKey || !newKey) return alert('请为原始库和新库都选择一个用于匹配的列！');
        if (selectedCols.length === 0) return alert('请至少从旧表中选择一列进行补充！');
        
        updateStatus(lplMergeStatus, "正在合并数据...", 'info');

        setTimeout(() => {
            try {
                const oldDataMap = new Map();
                appState.lpl.originalFile.jsonData.forEach(row => {
                    const key = row[originalKey];
                    if (key != null && key !== '') {
                        oldDataMap.set(String(key).trim(), row);
                    }
                });

                const mergedData = appState.lpl.newFile.jsonData.map(newRow => {
                    const keyToLookup = newRow[newKey];
                    let finalRow = { ...newRow };

                    if (keyToLookup != null && keyToLookup !== '') {
                        const oldRow = oldDataMap.get(String(keyToLookup).trim());
                        if (oldRow) {
                            selectedCols.forEach(col => {
                                // 如果新行没有这个列，并且旧行有这个列，则添加
                                if (!finalRow.hasOwnProperty(col) && oldRow.hasOwnProperty(col)) {
                                    finalRow[col] = oldRow[col];
                                }
                            });
                        }
                    }
                    return finalRow;
                });
                
                appState.lpl.mergedData = mergedData;
                updateStatus(lplMergeStatus, `✅ 合并成功！最终生成 ${mergedData.length} 行数据。`, 'success');
                
                switchLPLSubTab('result', getEl('lpl-stepper').querySelectorAll('.step-item')[2]);
                displayMergeResults();
            } catch (error) {
                updateStatus(lplMergeStatus, `❌ 合并失败: ${error.message}`, 'error');
                console.error(error);
            }
        }, 100);
    }
    
    // 步骤 3: 显示和下载结果
    function displayMergeResults() {
        const data = appState.lpl.mergedData;
        if (!data || data.length === 0) return;

        const rowCount = data.length;
        const headers = [...new Set(data.flatMap(row => Object.keys(row)))];
        const colCount = headers.length;

        lplResultSummary.textContent = `最终报告包含 ${rowCount} 行数据和 ${colCount} 个字段。`;
        lplResultSummary.style.display = 'block';

        const previewData = data.slice(0, 10);
        if (previewData.length > 0) {
            let tableHTML = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
            previewData.forEach(row => {
                tableHTML += '<tr>' + headers.map(h => {
                    const cellContent = row[h] == null ? '' : String(row[h]);
                    return `<td title="${cellContent.replace(/"/g, '&quot;')}">${cellContent}</td>`;
                }).join('') + '</tr>';
            });
            tableHTML += '</tbody></table>';
            
            lplResultPreviewTable.innerHTML = tableHTML;
            
            const tableElement = lplResultPreviewTable.querySelector('table');
            if (tableElement) {
                makeTableResizable(tableElement);
            }

            lplResultPreviewArea.style.display = 'block';
        }
        
        lplDownloadFinalBtn.disabled = false;
    }

    function downloadFinalMergedReport() {
        if (!appState.lpl.mergedData) return alert('没有可下载的合并数据。');
        try {
            const worksheet = XLSX.utils.json_to_sheet(appState.lpl.mergedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "合并后的专利库");
            XLSX.writeFile(workbook, "最终合并专利库.xlsx");
        } catch (error) {
            alert(`生成Excel文件失败: ${error.message}`);
            console.error(error);
        }
    }

    // 通用状态更新函数
    function updateStatus(element, message, type) {
        element.textContent = message;
        element.className = `info ${type}`;
        element.style.display = 'block';
    }
}

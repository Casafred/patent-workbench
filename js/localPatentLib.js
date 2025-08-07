// js/localPatentLib.js (Refactored for Resizable & Wrapping Table)

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

    lplSelectAllColsBtn.addEventListener('click', () => toggleAllColCheckboxes(true));
    lplDeselectAllColsBtn.addEventListener('click', () => toggleAllColCheckboxes(false));
    
    lplMergeBtn.addEventListener('click', performMerge);
    
    // 步骤 3
    lplDownloadFinalBtn.addEventListener('click', downloadFinalMergedReport);


    // --- 逻辑函数 ---

    // ▼▼▼ 需求 1: 全新的列宽拖动功能 ▼▼▼
    function makeTableResizable(table) {
        const colgroup = table.querySelector('colgroup');
        if (!colgroup) return;

        const cols = Array.from(colgroup.children);
        const headers = Array.from(table.querySelectorAll('th'));

        headers.forEach((header, i) => {
            // 最后一列不需要拖动器
            if (i === headers.length - 1) return;

            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            header.appendChild(resizer);

            let x = 0;
            let w = 0;

            const mouseDownHandler = function(e) {
                e.preventDefault();
                x = e.clientX;
                w = cols[i].offsetWidth; // 获取当前列的实际宽度

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.classList.add('resizing');
                table.style.cursor = 'col-resize'; // 改变整个表格的光标
            };

            const mouseMoveHandler = function(e) {
                const dx = e.clientX - x;
                const newWidth = w + dx;
                // 设置一个最小宽度，防止列被拖得太窄
                if (newWidth > 50) { 
                    cols[i].style.width = `${newWidth}px`;
                }
            };

            const mouseUpHandler = function() {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                resizer.classList.remove('resizing');
                table.style.cursor = 'default'; // 恢复光标
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    }
    // ▲▲▲ 需求 1: 功能结束 ▲▲▲

    // ▼▼▼ 需求 1: 重构 displayMergeResults 函数以生成新的表格结构 ▼▼▼
    function displayMergeResults() {
        const data = appState.lpl.mergedData;
        if (!data || data.length === 0) return;

        const rowCount = data.length;
        // 确保表头顺序一致
        const headers = Object.keys(data.reduce((acc, row) => ({...acc, ...row }), {}));
        const colCount = headers.length;

        lplResultSummary.textContent = `最终报告包含 ${rowCount} 行数据和 ${colCount} 个字段。`;
        lplResultSummary.style.display = 'block';

        const previewData = data.slice(0, 10);
        if (previewData.length > 0) {
            let tableHTML = '<table>';
            
            // 1. 添加 <colgroup> 和 <col> 元素，为每列设置一个初始宽度
            tableHTML += '<colgroup>';
            headers.forEach(() => {
                // 设置一个合理的初始列宽
                tableHTML += `<col style="width: 200px;">`; 
            });
            tableHTML += '</colgroup>';

            // 2. 添加 <thead>
            tableHTML += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
            
            // 3. 添加 <tbody>，并为每个单元格内容包裹一个div
            tableHTML += '<tbody>';
            previewData.forEach(row => {
                tableHTML += '<tr>' + headers.map(h => {
                    const cellContent = row[h] == null ? '' : String(row[h]);
                    // 将内容放入div中，以支持单元格内部滚动
                    return `<td><div>${cellContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></td>`;
                }).join('') + '</tr>';
            });
            tableHTML += '</tbody></table>';
            
            // 4. 将HTML注入DOM并调用拖动功能
            lplResultPreviewTable.innerHTML = tableHTML;
            const tableElement = lplResultPreviewTable.querySelector('table');
            if (tableElement) {
                makeTableResizable(tableElement);
            }

            lplResultPreviewArea.style.display = 'block';
        }
        
        lplDownloadFinalBtn.disabled = false;
    }
    // ▲▲▲ 需求 1: 修改完成 ▲▲▲

    function checkMergeButtonState() {
        const isOriginalDataReady = appState.lpl.originalFile.jsonData && appState.lpl.originalFile.jsonData.length > 0;
        const isNewDataReady = appState.lpl.newFile.jsonData && appState.lpl.newFile.jsonData.length > 0;
        lplMergeBtn.disabled = !(isOriginalDataReady && isNewDataReady);
    }
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
                sheetSelectElement.dispatchEvent(new Event('change'));
            } catch (err) {
                alert(`解析 ${file.name} 失败: ${err.message}`);
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    }
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
        if (ignoreHeader && jsonData.length > 1) {
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
    function populateSelect(selectElement, headers) {
        selectElement.innerHTML = headers.map(h => `<option value="${h}">${h}</option>`).join('');
        selectElement.disabled = false;
    }
    function populateColumnSelection(headers) {
        lplOldColsSelectionArea.style.display = 'block';
        lplOldColsCheckboxes.innerHTML = headers.map(header => `
            <label style="display: flex; align-items: center; cursor: pointer; padding: 5px; border-radius: 4px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--primary-color-hover-bg)'" onmouseout="this.style.backgroundColor='transparent'">
                <input type="checkbox" class="lpl-col-checkbox" value="${header}" style="width: auto; margin-right: 8px;">
                <span title="${header}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${header}</span>
            </label>
        `).join('');
    }
    function toggleAllColCheckboxes(checked) {
        document.querySelectorAll('.lpl-col-checkbox').forEach(cb => cb.checked = checked);
    }
    function getSelectedOldColumns() {
        return Array.from(document.querySelectorAll('.lpl-col-checkbox:checked')).map(cb => cb.value);
    }
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
    function updateStatus(element, message, type) {
        element.textContent = message;
        element.className = `info ${type}`;
        element.style.display = 'block';
    }
}

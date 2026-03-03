/**
 * IPC Predict Module
 * IPC分类预测功能实现
 */

const IPCPredict = (function() {
    let isPredicting = false;

    async function performPredict() {
        if (isPredicting) return;

        const input = document.getElementById('ipc_predict_input');
        const text = input ? input.value.trim() : '';

        if (!text) {
            IPCCore.showToast('请输入技术描述', 'error');
            return;
        }

        if (text.length > 1500) {
            IPCCore.showToast('文本长度不能超过1500字符', 'error');
            return;
        }

        isPredicting = true;

        const lang = document.getElementById('ipc_predict_lang')?.value || 'zh';
        const level = document.getElementById('ipc_predict_level')?.value || 'subgroup';
        const limit = parseInt(document.getElementById('ipc_predict_limit')?.value || '5');

        const btn = document.getElementById('ipc_predict_btn');
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        }

        IPCCore.showLoading('ipc_predict_loading');
        IPCCore.hideResult('ipc_predict_result');

        try {
            const data = await IPCCore.predict(text, { lang, level, limit });
            
            renderResults(data);
            IPCCore.showResult('ipc_predict_result');
        } catch (error) {
            console.error('预测失败:', error);
            IPCCore.showError('ipc_predict_result', error.message);
            IPCCore.showResult('ipc_predict_result');
        } finally {
            IPCCore.hideLoading('ipc_predict_loading');
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
            isPredicting = false;
        }
    }

    function renderResults(data) {
        const statsEl = document.getElementById('ipc_predict_stats');
        const listEl = document.getElementById('ipc_predict_list');

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="ipc-stat-item">
                    <div class="stat-value">${data.count || 0}</div>
                    <div class="stat-label">预测结果数</div>
                </div>
                <div class="ipc-stat-item">
                    <div class="stat-value">${data.lang || '-'}</div>
                    <div class="stat-label">检测语言</div>
                </div>
                <div class="ipc-stat-item">
                    <div class="stat-value">${data.version || 'latest'}</div>
                    <div class="stat-label">IPC版本</div>
                </div>
            `;
        }

        if (!listEl) return;

        if (!data.results || data.results.length === 0) {
            listEl.innerHTML = `
                <div class="ipc-empty-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 10px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <div>未能预测出IPC分类</div>
                    <div style="font-size: 12px; margin-top: 5px;">请尝试更详细的技术描述</div>
                </div>
            `;
            return;
        }

        let html = '';
        data.results.forEach((item, index) => {
            const scoreClass = IPCCore.getScoreClass(item.score);
            const score = Math.round(item.score || 0);

            html += `
                <div class="ipc-result-item" onclick="IPCPredict.showDetail('${item.symbol}')">
                    <div class="ipc-result-score ${scoreClass}">
                        ${score}%
                    </div>
                    <div class="ipc-result-content">
                        <div class="ipc-result-symbol">
                            ${IPCCore.formatSymbol(item.symbol)}
                            <button class="ipc-copy-btn" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${item.symbol}')">复制</button>
                        </div>
                        <div class="ipc-result-code">${item.code || ''}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    async function showDetail(symbol) {
        IPCSearch.showDetail(symbol);
    }

    function clearInput() {
        const input = document.getElementById('ipc_predict_input');
        if (input) {
            input.value = '';
        }
        IPCCore.hideResult('ipc_predict_result');
    }

    function loadExample() {
        const input = document.getElementById('ipc_predict_input');
        if (input) {
            input.value = `一种基于深度学习的图像识别方法，包括以下步骤：
1. 获取待识别的图像数据；
2. 对图像进行预处理，包括归一化和尺寸调整；
3. 使用卷积神经网络模型提取图像特征；
4. 通过全连接层进行特征融合；
5. 输出图像的分类结果。`;
        }
    }

    return {
        performPredict,
        showDetail,
        clearInput,
        loadExample
    };
})();

window.IPCPredict = IPCPredict;

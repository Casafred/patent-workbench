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
            renderError(error.message, text, lang);
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
            const levelNames = {
                'class': '部',
                'subclass': '大类',
                'maingroup': '大组',
                'subgroup': '小组'
            };
            const langNames = {
                'zh': '中文',
                'en': 'English',
                'ja': '日本語',
                'ko': '한국어'
            };
            
            statsEl.innerHTML = `
                <div class="ipc-stat-item-simple">
                    <span class="stat-label">结果</span>
                    <span class="stat-value">${data.count || 0}</span>
                </div>
                <div class="ipc-stat-item-simple">
                    <span class="stat-label">语言</span>
                    <span class="stat-value">${langNames[data.lang] || data.lang}</span>
                </div>
                <div class="ipc-stat-item-simple">
                    <span class="stat-label">层级</span>
                    <span class="stat-value">${levelNames[data.level] || data.level || '小组'}</span>
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
            const score = item.score || 0;
            const scoreClass = score >= 4 ? 'high' : (score >= 2 ? 'medium' : 'low');

            html += `
                <div class="ipc-result-item" onclick="IPCPredict.showDetail('${item.symbol}')">
                    <div class="ipc-result-score ${scoreClass}">
                        ${score}
                    </div>
                    <div class="ipc-result-content">
                        <div class="ipc-result-symbol">
                            <span class="ipc-symbol-text">${IPCCore.formatSymbol(item.symbol)}</span>
                            <span class="ipc-copy-link" onclick="event.stopPropagation(); IPCCore.copyToClipboard('${item.symbol}')">复制</span>
                        </div>
                        <div class="ipc-result-code">${item.code || ''}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    async function showDetail(symbol) {
        if (!symbol) return;
        
        const modal = document.getElementById('ipc_detail_modal');
        const titleEl = document.getElementById('ipc_detail_title');
        const bodyEl = document.getElementById('ipc_detail_body');

        if (!modal || !titleEl || !bodyEl) {
            IPCCore.showToast('无法显示详情', 'error');
            return;
        }

        titleEl.textContent = 'IPC分类详情';
        bodyEl.innerHTML = `
            <div class="ipc-detail-symbol">
                ${IPCCore.formatSymbol(symbol)}
                <span class="ipc-copy-link" onclick="IPCCore.copyToClipboard('${symbol}')">复制</span>
            </div>
            <div class="ipc-detail-info">
                <p style="color: #666; font-size: 14px; margin: 0;">
                    IPC分类号: <strong>${symbol}</strong>
                </p>
            </div>
        `;
        modal.style.display = 'flex';
        modal.classList.add('show');
    }

    function renderError(message, text, lang) {
        const listEl = document.getElementById('ipc_predict_list');
        const statsEl = document.getElementById('ipc_predict_stats');
        
        if (statsEl) {
            statsEl.innerHTML = '';
        }
        
        if (!listEl) return;
        
        const isWipoDown = message.includes('500') || message.includes('不可用') || message.includes('WIPO');
        
        if (isWipoDown) {
            listEl.innerHTML = `
                <div class="ipc-error-message" style="margin-bottom: 15px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 8px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    WIPO IPCCAT 服务暂时不可用
                </div>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #166534;">替代方案：使用关键词搜索</h5>
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #166534;">
                        您可以使用关键词搜索功能查找相关的IPC分类号。
                    </p>
                    <button class="small-button" onclick="IPCPredict.fallbackToSearch('${text.replace(/'/g, "\\'")}', '${lang}')">
                        切换到关键词搜索
                    </button>
                </div>
                <div style="font-size: 12px; color: #666;">
                    <strong>提示：</strong>IPCCAT 是 WIPO 提供的 AI 分类预测服务，偶尔会出现服务中断。关键词搜索功能使用不同的 API 端点，通常更加稳定。
                </div>
            `;
        } else {
            listEl.innerHTML = `
                <div class="ipc-error-message">
                    ${message}
                </div>
            `;
        }
    }

    async function fallbackToSearch(text, lang) {
        switchIpcSubTab('search');
        
        const searchInput = document.getElementById('ipc_search_input');
        if (searchInput) {
            const keywords = extractKeywords(text);
            searchInput.value = keywords;
        }
        
        const searchLang = document.getElementById('ipc_search_lang');
        if (searchLang && (lang === 'zh' || lang === 'en')) {
            searchLang.value = 'en';
        }
        
        setTimeout(() => {
            IPCSearch.performSearch();
        }, 300);
    }

    function extractKeywords(text) {
        const stopWords = ['的', '一种', '包括', '其特征', '所述', '方法', '装置', '系统', '设备', 
                          'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                          'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                          'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
                          'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
                          'from', 'as', 'into', 'through', 'during', 'before', 'after',
                          'above', 'below', 'between', 'under', 'again', 'further', 'then',
                          'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
                          'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
                          'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
                          'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though'];
        
        let words = text.toLowerCase()
            .replace(/[，。！？、；：""''（）【】《》\n\r\t]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));
        
        const uniqueWords = [...new Set(words)];
        
        return uniqueWords.slice(0, 5).join(' ');
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
        loadExample,
        renderError,
        fallbackToSearch,
        extractKeywords
    };
})();

window.IPCPredict = IPCPredict;

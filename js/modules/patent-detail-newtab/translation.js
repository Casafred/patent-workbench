window.PatentDetailTranslation = {
    currentSectionId: null,
    currentColumn: null,
    
    init: function() {
        console.log('[PatentDetailTranslation] Module initialized');
    },
    
    showDialog: function(event, sectionId, column) {
        event.stopPropagation();
        
        if (!column) {
            const dualLeft = event.currentTarget.closest('.dual-column-left');
            const dualRight = event.currentTarget.closest('.dual-column-right');
            if (dualLeft) {
                column = 'left';
            } else if (dualRight) {
                column = 'right';
            }
        }
        
        this.currentColumn = column || null;
        
        let models = ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
        if (window.opener && window.opener.AVAILABLE_MODELS && window.opener.AVAILABLE_MODELS.length > 0) {
            models = window.opener.AVAILABLE_MODELS;
        }
        
        const currentPatentNumber = window.currentPatentNumber || '';
        const cacheKeyPrefix = 'translation_' + currentPatentNumber + '_' + sectionId + '_';
        let cachedModel = null;
        for (let i = 0; i < models.length; i++) {
            const m = models[i];
            const cached = localStorage.getItem(cacheKeyPrefix + m);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        cachedModel = m;
                        break;
                    }
                } catch(e) {}
            }
        }
        
        const existingDialog = document.getElementById('translate-dialog-newtab');
        if (existingDialog) existingDialog.remove();
        
        const dialog = document.createElement('div');
        dialog.id = 'translate-dialog-newtab';
        dialog.style.cssText = 'position: fixed; top: 20px; right: 20px; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 10000; min-width: 300px; cursor: move;';
        
        const self = this;
        
        dialog.innerHTML = '<div class="drag-handle" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: move;">' +
            '<h4 style="margin: 0; color: #009688; display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 选择翻译模型</h4>' +
            '<button id="translate-close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>' +
            '</div>' +
            (cachedModel ? '<p style="margin: 0 0 8px 0; color: #28a745; font-size: 12px;">已有缓存 (模型: ' + cachedModel + ')</p>' : '') +
            '<select id="translate-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px;">' +
            models.map(function(m) { return '<option value="' + m + '"' + (m === cachedModel ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
            '</select>' +
            '<div style="display: flex; gap: 8px;">' +
            '<button id="translate-cancel-btn" style="flex: 1; padding: 8px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">取消</button>' +
            '<button id="start-translate-btn" style="flex: 1; padding: 8px; border: none; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">开始翻译</button>' +
            '</div>';
        
        document.body.appendChild(dialog);
        
        this.makeDraggable(dialog);
        
        this.currentSectionId = sectionId;
        
        document.getElementById('translate-close-btn').onclick = function() { dialog.remove(); };
        document.getElementById('translate-cancel-btn').onclick = function() { dialog.remove(); };
        document.getElementById('start-translate-btn').onclick = function() {
            const model = document.getElementById('translate-model-select').value;
            dialog.remove();
            self.startTranslation(sectionId, model);
        };
    },
    
    startTranslation: async function(textType, model) {
        const self = this;
        const btn = document.querySelector('.translate-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="animation: spin 1s linear infinite;"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/></svg> 翻译中...';
        }
        
        const currentPatentNumber = window.currentPatentNumber || '';
        const pageData = window.pageData || {};
        const cacheKey = 'translation_' + currentPatentNumber + '_' + textType + '_' + model;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    console.log('发现翻译缓存:', cacheKey);
                    self.showResult(data.translations, textType);
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077z"/></svg> 翻译';
                    }
                    return;
                }
            } catch(e) {}
        }
        
        try {
            const openerState = window.opener && window.opener.appState ? window.opener.appState : null;
            const zhipuKey = openerState && openerState.apiKey ? openerState.apiKey : (localStorage.getItem('api_key') || localStorage.getItem('globalApiKey'));
            const aliyunKey = openerState && openerState.aliyunApiKey ? openerState.aliyunApiKey : localStorage.getItem('aliyun_api_key');
            
            if (!zhipuKey && !aliyunKey) {
                throw new Error('请先配置API Key');
            }
            
            const getProviderForModel = window.opener && window.opener.getProviderForModel ? window.opener.getProviderForModel : function(m) {
                if (m.startsWith('glm-') || m.startsWith('GLM-')) return 'zhipu';
                if (m.startsWith('qwen') || m.startsWith('Qwen') || m.startsWith('qwq') || m.startsWith('QwQ') || m.startsWith('deepseek') || m.startsWith('DeepSeek') || m.startsWith('kimi') || m.startsWith('Kimi') || m.startsWith('minimax')) return 'aliyun';
                return 'zhipu';
            };
            
            const provider = getProviderForModel(model);
            
            const headers = { 'Content-Type': 'application/json' };
            
            if (provider === 'aliyun') {
                headers['X-LLM-Provider'] = 'aliyun';
                headers['Authorization'] = 'Bearer ' + aliyunKey;
            } else {
                headers['Authorization'] = 'Bearer ' + zhipuKey;
            }
            
            let translations = [];
            
            if (textType === 'claims') {
                const claims = pageData.claims || [];
                if (claims.length === 0) throw new Error('没有可翻译的权利要求');
                
                const formattedClaims = claims.map(function(claim, i) {
                    const text = typeof claim === 'string' ? claim : claim.text || '';
                    return '权利要求 ' + (i + 1) + ': ' + text;
                }).join('\n\n');
                
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利权利要求翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。保持权利要求的编号和格式。只返回翻译结果，不要添加任何解释。请按照以下格式返回：权利要求 1: [翻译内容]' },
                            { role: 'user', content: formattedClaims }
                        ],
                        temperature: 0.3,
                        max_tokens: 4096
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(function() { return {}; });
                    throw new Error(errorData.error && errorData.error.message ? errorData.error.message : (errorData.error || 'API请求失败: ' + response.status));
                }
                
                const result = await response.json();
                const translatedText = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content ? result.choices[0].message.content : '';
                
                const pattern = /权利要求\s*(\d+)[:：]\s*(.*?)(?=权利要求\s*\d+[:：]|$)/gs;
                const matches = Array.from(translatedText.matchAll(pattern));
                
                if (matches.length > 0) {
                    const translatedMap = {};
                    matches.forEach(function(match) {
                        translatedMap[parseInt(match[1])] = match[2].trim();
                    });
                    
                    claims.forEach(function(claim, i) {
                        const claimText = typeof claim === 'string' ? claim : claim.text || '';
                        translations.push({
                            original: claimText,
                            translated: translatedMap[i + 1] || '[翻译解析失败]',
                            index: i + 1
                        });
                    });
                } else {
                    const lines = translatedText.split('\n').filter(function(l) { return l.trim(); });
                    claims.forEach(function(claim, i) {
                        const claimText = typeof claim === 'string' ? claim : claim.text || '';
                        translations.push({
                            original: claimText,
                            translated: lines[i] || translatedText,
                            index: i + 1
                        });
                    });
                }
            } else {
                const description = pageData.description || '';
                if (!description) throw new Error('没有可翻译的说明书内容');
                
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利说明书翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。只返回翻译结果，不要添加任何解释。' },
                            { role: 'user', content: description.substring(0, 4000) }
                        ],
                        temperature: 0.3,
                        max_tokens: 4096
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(function() { return {}; });
                    throw new Error(errorData.error && errorData.error.message ? errorData.error.message : (errorData.error || 'API请求失败: ' + response.status));
                }
                
                const result = await response.json();
                const translatedText = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content ? result.choices[0].message.content : '';
                
                translations = [{
                    original: description.substring(0, 500) + '...',
                    translated: translatedText,
                    index: 1
                }];
            }
            
            localStorage.setItem(cacheKey, JSON.stringify({
                translations: translations,
                timestamp: Date.now()
            }));
            
            self.showResult(translations, textType);
            
        } catch (error) {
            console.error('翻译失败:', error);
            alert('翻译失败: ' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077z"/></svg> 翻译';
            }
        }
    },
    
    showResult: function(translations, textType) {
        const self = this;
        let targetContainer;
        
        if (this.currentColumn) {
            targetContainer = document.querySelector('.dual-column-' + this.currentColumn);
        }
        
        if (!targetContainer) {
            targetContainer = document;
        }
        
        const sectionId = textType === 'claims' ? 'claims' : 'description';
        let section = targetContainer.querySelector('#' + sectionId);
        if (!section) section = targetContainer.querySelector('[data-section-id="' + sectionId + '"]');
        
        if (!section) {
            alert('翻译完成！请查看控制台获取结果。');
            console.log('翻译结果:', translations);
            return;
        }
        
        const existingResult = section.querySelector('.translation-result');
        if (existingResult) existingResult.remove();
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'translation-result';
        resultDiv.style.cssText = 'margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%); border-radius: 8px; border-left: 4px solid #009688;';
        
        let html = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
            '<h4 style="margin: 0; color: #009688; display: flex; align-items: center; gap: 8px;">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077z"/></svg>' +
            '翻译结果' +
            '</h4>' +
            '<button class="close-translation-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #009688;">&times;</button>' +
            '</div>';
        
        translations.forEach(function(t) {
            html += '<div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px;">';
            if (t.index) {
                html += '<div style="font-weight: 500; color: #009688; margin-bottom: 4px;">第 ' + t.index + ' 项</div>';
            }
            html += '<div style="font-size: 12px; color: #666; margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">原文: ' + self.escapeHtml(t.original.substring(0, 200)) + (t.original.length > 200 ? '...' : '') + '</div>';
            html += '<div style="font-size: 14px; line-height: 1.6; color: #333;">' + self.escapeHtml(t.translated) + '</div>';
            html += '</div>';
        });
        
        resultDiv.innerHTML = html;
        section.appendChild(resultDiv);
        
        resultDiv.querySelector('.close-translation-btn').onclick = function() {
            resultDiv.remove();
        };
        
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    
    makeDraggable: function(element) {
        const dragHandle = element.querySelector('.drag-handle') || element;
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        dragHandle.onmousedown = function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.onmousemove = function(e) {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                element.style.left = (startLeft + dx) + 'px';
                element.style.top = (startTop + dy) + 'px';
                element.style.right = 'auto';
            };
            
            document.onmouseup = function() {
                isDragging = false;
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    },
    
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

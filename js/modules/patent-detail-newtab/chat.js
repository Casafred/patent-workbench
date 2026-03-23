window.PatentDetailChat = {
    providers: {},
    currentProvider: 'zhipu',
    currentModel: 'glm-4-flash',
    patentNumber: '',
    patentData: {},
    messages: [],
    isLoading: false,
    stopStreaming: false,
    apiKeys: {},
    
    estimateTokens: function(text) {
        if (!text) return 0;
        let chineseChars = 0;
        let otherChars = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[\u4e00-\u9fa5]/.test(char)) {
                chineseChars++;
            } else {
                otherChars++;
            }
        }
        return Math.ceil(chineseChars / 1.5) + Math.ceil(otherChars / 4);
    },
    
    init: function() {
        console.log('[PatentDetailChat] Module initialized');
    },
    
    getApiKeysFromOpener: function() {
        const keys = {
            zhipu: null,
            aliyun: null
        };
        
        if (window.opener) {
            try {
                if (window.opener.localStorage) {
                    keys.zhipu = window.opener.localStorage.getItem('globalApiKey') || window.opener.localStorage.getItem('zhipu_api_key');
                    keys.aliyun = window.opener.localStorage.getItem('aliyun_api_key');
                }
                if (window.opener.appState) {
                    if (!keys.zhipu && window.opener.appState.apiKey) keys.zhipu = window.opener.appState.apiKey;
                    if (!keys.aliyun && window.opener.appState.aliyunApiKey) keys.aliyun = window.opener.appState.aliyunApiKey;
                }
            } catch (e) {
                console.warn('无法从主窗口获取API Key:', e);
            }
        }
        
        return keys;
    },
    
    initProviders: async function() {
        this.apiKeys = this.getApiKeysFromOpener();
        
        try {
            const response = await fetch('/api/providers');
            if (response.ok) {
                const data = await response.json();
                if (data.providers) {
                    this.providers = data.providers;
                    
                    if (window.opener && window.opener.patentChatState) {
                        this.currentProvider = window.opener.patentChatState.currentProvider || 'zhipu';
                        this.currentModel = window.opener.patentChatState.currentModel || 'glm-4-flash';
                    } else {
                        this.currentProvider = 'zhipu';
                        this.currentModel = data.providers.zhipu && data.providers.zhipu.default_model ? data.providers.zhipu.default_model : 'glm-4-flash';
                    }
                    
                    this.updateProviderSelect();
                    this.updateModelSelect();
                }
            }
        } catch (error) {
            console.warn('加载服务商配置失败，使用默认配置');
            this.providers = {
                zhipu: { 
                    name: '智谱AI', 
                    models: [
                        {id: 'glm-4-flash', name: 'GLM-4-Flash'}, 
                        {id: 'glm-4-long', name: 'GLM-4-Long'},
                        {id: 'glm-4.7-flash', name: 'GLM-4.7-Flash'}
                    ] 
                },
                aliyun: { 
                    name: '阿里云百炼', 
                    models: [
                        {id: 'qwen-turbo', name: 'Qwen-Turbo'}, 
                        {id: 'qwen-plus', name: 'Qwen-Plus'},
                        {id: 'qwen-max', name: 'Qwen-Max'}
                    ] 
                }
            };
            this.updateProviderSelect();
            this.updateModelSelect();
        }
    },
    
    updateProviderSelect: function() {
        const providerSelect = document.getElementById('newtab_chat_provider');
        if (!providerSelect || !this.providers) return;
        
        const zhipuKey = this.apiKeys.zhipu;
        const aliyunKey = this.apiKeys.aliyun;
        const hasZhipuKey = !!zhipuKey;
        const hasAliyunKey = !!aliyunKey;
        
        let optionsHtml = '';
        const self = this;
        Object.keys(this.providers).forEach(function(key) {
            const val = self.providers[key];
            const hasKey = key === 'zhipu' ? hasZhipuKey : hasAliyunKey;
            const isCurrent = key === self.currentProvider;
            const disabled = !hasKey ? ' disabled' : '';
            const selected = isCurrent && hasKey ? ' selected' : '';
            const label = hasKey ? val.name : val.name + ' (未配置)';
            optionsHtml += '<option value="' + key + '"' + disabled + selected + '>' + label + '</option>';
        });
        
        providerSelect.innerHTML = optionsHtml;
        
        if (!hasZhipuKey && !hasAliyunKey) {
            providerSelect.disabled = true;
        } else if (this.currentProvider === 'zhipu' && !hasZhipuKey && hasAliyunKey) {
            this.currentProvider = 'aliyun';
            providerSelect.value = 'aliyun';
            this.updateModelSelect();
        } else if (this.currentProvider === 'aliyun' && !hasAliyunKey && hasZhipuKey) {
            this.currentProvider = 'zhipu';
            providerSelect.value = 'zhipu';
            this.updateModelSelect();
        }
    },
    
    updateModelSelect: function() {
        const modelSelect = document.getElementById('newtab_chat_model');
        if (!modelSelect) return;
        
        const provider = this.currentProvider;
        const providerConfig = this.providers[provider];
        
        if (!providerConfig || !providerConfig.models || providerConfig.models.length === 0) {
            modelSelect.innerHTML = '<option value="">无可用模型</option>';
            return;
        }
        
        let optionsHtml = '';
        const self = this;
        providerConfig.models.forEach(function(m) {
            const modelId = typeof m === 'string' ? m : m.id;
            const modelName = typeof m === 'string' ? m : (m.name || m.id);
            const selected = modelId === self.currentModel ? ' selected' : '';
            optionsHtml += '<option value="' + modelId + '"' + selected + '>' + modelName + '</option>';
        });
        
        modelSelect.innerHTML = optionsHtml;
        
        const modelIds = providerConfig.models.map(function(m) { return typeof m === 'string' ? m : m.id; });
        if (modelIds.indexOf(this.currentModel) === -1) {
            this.currentModel = modelIds[0];
            modelSelect.value = this.currentModel;
        }
    },
    
    openChat: async function(patentNumber) {
        const existingBall = document.getElementById('newtab_chat_floating_ball');
        if (existingBall) {
            this.showModal();
            return;
        }
        
        const existingModal = document.getElementById('newtab_patent_chat_modal');
        if (existingModal) {
            existingModal.style.display = 'flex';
            return;
        }
        
        let patentData = window.pageData || {};
        
        if (window.opener && !window.opener.closed) {
            try {
                let originalPatent = null;
                
                if (window.opener.patentResults) {
                    originalPatent = window.opener.patentResults.find(r => r.patent_number === patentNumber);
                }
                
                if (!originalPatent && window.opener.patentTabManager) {
                    for (let i = 0; i < window.opener.patentTabManager.tabs.length; i++) {
                        const tab = window.opener.patentTabManager.tabs[i];
                        const found = tab.results.find(r => r.patent_number === patentNumber);
                        if (found && found.success) {
                            originalPatent = found;
                            break;
                        }
                    }
                }
                
                if (originalPatent && originalPatent.success && originalPatent.data) {
                    patentData = originalPatent.data;
                    console.log('[PatentDetailChat.openChat] 从主窗口获取原始专利数据，description存在:', !!patentData.description, '长度:', patentData.description ? patentData.description.length : 0);
                }
            } catch (e) {
                console.warn('[PatentDetailChat.openChat] 无法从主窗口获取专利数据:', e);
            }
        }
        
        console.log('[PatentDetailChat.openChat] patentData.description exists:', !!patentData.description, 'length:', patentData.description ? patentData.description.length : 0);
        
        const isSamePatent = this.patentNumber === patentNumber;
        const hasMessages = (this.messages || []).length > 0;
        
        if (!isSamePatent || !hasMessages) {
            this.patentNumber = patentNumber;
            this.patentData = patentData;
            this.messages = [];
        }
        this.isLoading = false;
        this.stopStreaming = false;
        
        this.createModal(patentNumber, patentData);
        
        await this.initProviders();
        
        if (hasMessages && isSamePatent) {
            this.restoreHistory();
        }
        
        const self = this;
        const input = document.getElementById('newtab_chat_input');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                self.sendMessage();
            }
        });
        
        input.addEventListener('input', function() {
            self.updateTokenCount();
        });
        
        input.focus();
        self.updateTokenCount();
    },
    
    createModal: function(patentNumber, patentData) {
        const chatModal = document.createElement('div');
        chatModal.id = 'newtab_patent_chat_modal';
        chatModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';
        
        const self = this;
        
        chatModal.innerHTML = '<div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">' +
            '<div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e8f5e9; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); border-radius: 12px 12px 0 0;">' +
            '<div><h4 style="margin: 0; font-size: 18px; color: white;">专利对话：' + patentNumber + '</h4>' +
            '<p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">' + (patentData.title || '无标题') + '</p></div>' +
            '<div style="display: flex; gap: 8px;">' +
            '<button id="minimize-chat-btn" title="最小化为悬浮球" style="background: rgba(255,255,255,0.2); border: none; font-size: 18px; cursor: pointer; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">−</button>' +
            '<button id="close-chat-btn" style="background: rgba(255,255,255,0.2); border: none; font-size: 24px; cursor: pointer; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">&times;</button>' +
            '</div></div>' +
            '<div style="padding: 12px 16px; background: #f1f8e9; border-bottom: 1px solid #e8f5e9;">' +
            '<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">' +
            '<div style="display: flex; align-items: center; gap: 8px;"><label style="font-size: 13px; color: #2e7d32; font-weight: 500;">服务商:</label>' +
            '<select id="newtab_chat_provider" style="padding: 6px 12px; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; background: white; cursor: pointer;"></select></div>' +
            '<div style="display: flex; align-items: center; gap: 8px;"><label style="font-size: 13px; color: #2e7d32; font-weight: 500;">模型:</label>' +
            '<select id="newtab_chat_model" style="padding: 6px 12px; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; background: white; cursor: pointer;"></select></div>' +
            '<label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #2e7d32; cursor: pointer;" title="勾选后将包含完整的说明书和权利要求作为上下文">' +
            '<input type="checkbox" id="newtab_chat_full_context" style="width: 16px; height: 16px; cursor: pointer; accent-color: #2e7d32;">' +
            '<span>包含完整内容</span></label>' +
            '<span id="newtab_chat_context_info" style="display: none; font-size: 12px; color: #6c757d; background: #e9ecef; padding: 3px 8px; border-radius: 4px;"></span>' +
            '<button id="clear-chat-btn" style="padding: 6px 12px; background: white; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; cursor: pointer; color: #2e7d32;">清空对话</button>' +
            '</div></div>' +
            '<div id="newtab_chat_history" style="flex: 1; overflow-y: auto; padding: 16px; background: #fafafa;">' +
            '<div class="welcome-message" style="text-align: center; padding: 40px 20px; color: #666;">' +
            '<div style="font-size: 48px; margin-bottom: 16px;">💬</div>' +
            '<p style="font-size: 16px; margin: 0;">暂无对话记录</p>' +
            '<p style="font-size: 14px; color: #999; margin-top: 8px;">在下方输入您的问题，开始与 AI 对话</p></div></div>' +
            '<div style="padding: 16px; background: white; border-top: 1px solid #e8f5e9; border-radius: 0 0 12px 12px;">' +
            '<div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">' +
            '<button class="newtab-quick-question-btn" data-question="这个专利的核心技术是什么？" style="padding: 6px 12px; background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 16px; font-size: 12px; cursor: pointer; color: #2e7d32; transition: all 0.2s;">核心技术</button>' +
            '<button class="newtab-quick-question-btn" data-question="这个专利的创新点在哪里？" style="padding: 6px 12px; background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 16px; font-size: 12px; cursor: pointer; color: #2e7d32; transition: all 0.2s;">创新点</button>' +
            '<button class="newtab-quick-question-btn" data-question="请解释这个专利的权利要求" style="padding: 6px 12px; background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 16px; font-size: 12px; cursor: pointer; color: #2e7d32; transition: all 0.2s;">解释权利要求</button>' +
            '<button class="newtab-quick-question-btn" data-question="这个专利的应用场景有哪些？" style="padding: 6px 12px; background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 16px; font-size: 12px; cursor: pointer; color: #2e7d32; transition: all 0.2s;">应用场景</button>' +
            '</div>' +
            '<div style="display: flex; gap: 12px; position: relative;">' +
            '<textarea id="newtab_chat_input" placeholder="输入您的问题，按 Enter 发送..." style="flex: 1; padding: 12px 16px; border: 2px solid #c8e6c9; border-radius: 8px; font-size: 14px; resize: none; height: 48px; line-height: 1.4; padding-bottom: 32px;"></textarea>' +
            '<span id="newtab_chat_token_count" style="position: absolute; bottom: 20px; right: 140px; font-size: 11px; color: #999; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 4px; pointer-events: none;">0 Tokens</span>' +
            '<button id="newtab_chat_send_btn" style="padding: 12px 24px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500;">发送</button>' +
            '<button id="newtab_chat_stop_btn" style="padding: 12px 24px; background: #c62828; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; display: none;">停止</button></div></div></div>';
        
        document.body.appendChild(chatModal);
        
        document.getElementById('minimize-chat-btn').onclick = function() { self.minimize(); };
        document.getElementById('close-chat-btn').onclick = function() { self.close(); };
        document.getElementById('clear-chat-btn').onclick = function() { self.clearHistory(); };
        document.getElementById('newtab_chat_send_btn').onclick = function() { self.sendMessage(); };
        document.getElementById('newtab_chat_stop_btn').onclick = function() { self.stopStream(); };
        
        const fullContextCheckbox = document.getElementById('newtab_chat_full_context');
        const contextInfoEl = document.getElementById('newtab_chat_context_info');
        
        if (fullContextCheckbox && contextInfoEl) {
            fullContextCheckbox.onchange = function() {
                if (this.checked) {
                    const claimsCount = patentData.claims ? patentData.claims.length : 0;
                    const claimsText = patentData.claims ? patentData.claims.join('\n') : '';
                    const descText = patentData.description || '';
                    const totalText = claimsText + descText;
                    const estimatedTokens = self.estimateTokens(totalText);
                    
                    contextInfoEl.innerHTML = '将加载 <strong>' + claimsCount + '</strong> 条权利要求 + <strong>' + estimatedTokens.toLocaleString() + '</strong> Tokens 上下文';
                    contextInfoEl.style.display = 'inline';
                    
                    if (estimatedTokens > 5000) {
                        contextInfoEl.style.color = '#856404';
                        contextInfoEl.style.background = '#fff3cd';
                    } else {
                        contextInfoEl.style.color = '#6c757d';
                        contextInfoEl.style.background = '#e9ecef';
                    }
                } else {
                    contextInfoEl.style.display = 'none';
                }
            };
        }
        
        const providerSelect = document.getElementById('newtab_chat_provider');
        const modelSelect = document.getElementById('newtab_chat_model');
        
        providerSelect.onchange = function() {
            self.currentProvider = providerSelect.value;
            const providerConfig = self.providers[self.currentProvider];
            if (providerConfig && providerConfig.default_model) {
                self.currentModel = providerConfig.default_model;
            } else if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
                self.currentModel = typeof providerConfig.models[0] === 'string' ? providerConfig.models[0] : providerConfig.models[0].id;
            }
            self.updateModelSelect();
        };
        
        modelSelect.onchange = function() {
            self.currentModel = modelSelect.value;
        };
        
        const quickQuestionBtns = chatModal.querySelectorAll('.newtab-quick-question-btn');
        quickQuestionBtns.forEach(function(btn) {
            btn.onclick = function() {
                const question = this.getAttribute('data-question');
                input.value = question;
                self.updateTokenCount();
                input.focus();
            };
        });
    },
    
    updateTokenCount: function() {
        const input = document.getElementById('newtab_chat_input');
        const tokenCountEl = document.getElementById('newtab_chat_token_count');
        
        if (!input || !tokenCountEl) return;
        
        const text = input.value || '';
        const tokens = this.estimateTokens(text);
        tokenCountEl.textContent = tokens + ' Tokens';
    },
    
    restoreHistory: function() {
        const historyEl = document.getElementById('newtab_chat_history');
        if (!historyEl) return;
        
        const messages = this.messages || [];
        if (messages.length === 0) return;
        
        historyEl.innerHTML = '';
        
        const self = this;
        messages.forEach(function(msg) {
            if (msg.role === 'system') return;
            
            const msgDiv = document.createElement('div');
            if (msg.role === 'user') {
                msgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-end;';
                msgDiv.innerHTML = '<div style="max-width: 70%; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 12px 16px; border-radius: 16px 16px 4px 16px;"><div style="font-size: 14px; line-height: 1.5;">' + self.escapeHtmlAdvanced(msg.content) + '</div></div>';
            } else if (msg.role === 'assistant') {
                msgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-start;';
                msgDiv.innerHTML = '<div style="max-width: 70%; background: white; padding: 12px 16px; border-radius: 16px 16px 16px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8f5e9;"><div style="font-size: 14px; line-height: 1.5;">' + self.formatContent(msg.content) + '</div></div>';
            }
            historyEl.appendChild(msgDiv);
        });
        
        historyEl.scrollTop = historyEl.scrollHeight;
    },
    
    createFloatingBall: function() {
        const ball = document.createElement('div');
        ball.id = 'newtab_chat_floating_ball';
        ball.style.cssText = 'position: fixed; bottom: 80px; right: 20px; width: 56px; height: 56px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(46,125,50,0.4); z-index: 9999; transition: transform 0.2s;';
        ball.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="white" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/></svg>';
        ball.title = '点击打开问一问';
        
        const self = this;
        ball.onclick = function() { self.showModal(); };
        
        ball.onmouseenter = function() { this.style.transform = 'scale(1.1)'; };
        ball.onmouseleave = function() { this.style.transform = 'scale(1)'; };
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        ball.onmousedown = function(e) {
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = ball.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.onmousemove = function(e) {
                if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                    isDragging = true;
                    ball.style.left = (startLeft + e.clientX - startX) + 'px';
                    ball.style.top = (startTop + e.clientY - startY) + 'px';
                    ball.style.right = 'auto';
                    ball.style.bottom = 'auto';
                }
            };
            
            document.onmouseup = function() {
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
        
        document.body.appendChild(ball);
    },
    
    minimize: function() {
        const modal = document.getElementById('newtab_patent_chat_modal');
        if (modal) modal.style.display = 'none';
        
        if (!document.getElementById('newtab_chat_floating_ball')) {
            this.createFloatingBall();
        } else {
            document.getElementById('newtab_chat_floating_ball').style.display = 'flex';
        }
    },
    
    showModal: function() {
        const modal = document.getElementById('newtab_patent_chat_modal');
        const ball = document.getElementById('newtab_chat_floating_ball');
        
        if (modal) {
            modal.style.display = 'flex';
        }
        if (ball) {
            ball.style.display = 'none';
        }
    },
    
    close: function() {
        const modal = document.getElementById('newtab_patent_chat_modal');
        const ball = document.getElementById('newtab_chat_floating_ball');
        
        const messages = this.messages || [];
        const nonSystemMessages = messages.filter(function(m) { return m.role !== 'system'; });
        
        if (nonSystemMessages.length >= 2 && window.opener && !window.opener.closed) {
            const shouldSync = confirm('是否将本次对话记录同步到主页面历史？\n\n同步后可在主页面"功能一即时对话"中查看和继续此对话。');
            
            if (shouldSync) {
                try {
                    if (window.opener.ChatHistorySync) {
                        window.opener.ChatHistorySync.syncToHistory(
                            messages,
                            'NEW_TAB_CHAT',
                            {
                                patentNumber: this.patentNumber,
                                patentTitle: this.patentData && this.patentData.title ? this.patentData.title : '',
                                model: this.currentModel,
                                thinkingMode: false
                            }
                        );
                        alert('对话已同步到主页面历史记录！');
                    } else {
                        alert('主页面未加载对话同步模块，无法同步。');
                    }
                } catch (e) {
                    console.error('同步对话失败:', e);
                    alert('同步失败，请确保主页面已加载完成。');
                }
            }
        }
        
        if (modal) modal.remove();
        if (ball) ball.remove();
        this.messages = [];
    },
    
    clearHistory: function() {
        const historyEl = document.getElementById('newtab_chat_history');
        historyEl.innerHTML = '<div class="welcome-message" style="text-align: center; padding: 40px 20px; color: #666;"><div style="font-size: 48px; margin-bottom: 16px;">💬</div><p style="font-size: 16px; margin: 0;">暂无对话记录</p><p style="font-size: 14px; color: #999; margin-top: 8px;">在下方输入您的问题，开始与AI对话</p></div>';
        this.messages = [];
    },
    
    stopStream: function() {
        this.stopStreaming = true;
    },
    
    sendMessage: async function() {
        const self = this;
        const input = document.getElementById('newtab_chat_input');
        const message = input.value.trim();
        
        if (!message) return;
        
        input.value = '';
        
        const historyEl = document.getElementById('newtab_chat_history');
        const welcomeDiv = historyEl.querySelector('.welcome-message');
        if (welcomeDiv) welcomeDiv.remove();
        
        const userMsgDiv = document.createElement('div');
        userMsgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-end;';
        userMsgDiv.innerHTML = '<div style="max-width: 70%; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 12px 16px; border-radius: 16px 16px 4px 16px;"><div style="font-size: 14px; line-height: 1.5;">' + this.escapeHtmlAdvanced(message) + '</div></div>';
        historyEl.appendChild(userMsgDiv);
        historyEl.scrollTop = historyEl.scrollHeight;
        
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-start;';
        aiMsgDiv.innerHTML = '<div style="max-width: 70%; background: white; padding: 12px 16px; border-radius: 16px 16px 16px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8f5e9;"><div style="font-size: 14px; color: #666;">思考中...</div></div>';
        historyEl.appendChild(aiMsgDiv);
        historyEl.scrollTop = historyEl.scrollHeight;
        
        this.isLoading = true;
        this.stopStreaming = false;
        
        const sendBtn = document.getElementById('newtab_chat_send_btn');
        const stopBtn = document.getElementById('newtab_chat_stop_btn');
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        
        const contentDiv = aiMsgDiv.querySelector('div > div');
        
        try {
            this.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
            
            const patentInfo = this.patentData;
            const patentNumber = this.patentNumber;
            console.log('[PatentDetailChat.sendMessage] patentInfo.description exists:', !!patentInfo.description, 'length:', patentInfo.description ? patentInfo.description.length : 0);
            
            const safeValue = function(val) {
                if (!val) return '未知';
                if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '未知';
                return String(val);
            };
            
            const safeArray = function(val, limit) {
                limit = limit || 10;
                if (!val || !Array.isArray(val) || val.length === 0) return '无';
                return val.slice(0, limit).map(function(item, i) { return (i + 1) + '. ' + (typeof item === 'string' ? item : JSON.stringify(item)); }).join('\n');
            };
            
            const fullContextCheckbox = document.getElementById('newtab_chat_full_context');
            const useFullContext = fullContextCheckbox && fullContextCheckbox.checked;
            
            let contextInfo = '你是一个专业的专利分析助手。当前正在分析专利号为 ' + patentNumber + ' 的专利。请基于以下完整的专利信息，准确、专业地回答用户的问题。\n\n';
            
            contextInfo += '## 专利基本信息\n';
            contextInfo += '- **专利号**: ' + (patentInfo.patent_number || patentNumber) + '\n';
            contextInfo += '- **标题**: ' + (patentInfo.title || '无标题') + '\n';
            contextInfo += '- **申请日期**: ' + (patentInfo.application_date || patentInfo.filing_date || '未知') + '\n';
            contextInfo += '- **公开日期**: ' + (patentInfo.publication_date || '未知') + '\n';
            contextInfo += '- **授权日期**: ' + (patentInfo.grant_date || '未知') + '\n';
            contextInfo += '- **优先权日期**: ' + (patentInfo.priority_date || '未知') + '\n';
            contextInfo += '- **法律状态**: ' + (patentInfo.legal_status || '未知') + '\n';
            
            contextInfo += '\n## 申请人与发明人\n';
            contextInfo += '- **申请人/受让人**: ' + safeValue(patentInfo.assignees || patentInfo.applicant) + '\n';
            contextInfo += '- **发明人**: ' + safeValue(patentInfo.inventors || patentInfo.inventor) + '\n';
            
            contextInfo += '\n## 分类信息\n';
            contextInfo += '- **IPC分类**: ' + safeValue(patentInfo.ipc_classification) + '\n';
            contextInfo += '- **CPC分类**: ' + safeValue(patentInfo.cpc_classification) + '\n';
            
            if (patentInfo.abstract) {
                contextInfo += '\n## 摘要\n' + patentInfo.abstract + '\n';
            }
            
            if (patentInfo.claims && patentInfo.claims.length > 0) {
                contextInfo += '\n## 权利要求\n';
                if (useFullContext) {
                    contextInfo += safeArray(patentInfo.claims, patentInfo.claims.length) + '\n';
                } else {
                    contextInfo += safeArray(patentInfo.claims, 5) + '\n';
                    if (patentInfo.claims.length > 5) {
                        contextInfo += '\n...(共' + patentInfo.claims.length + '条权利要求，勾选"包含完整内容"可加载全部)\n';
                    }
                }
            }
            
            if (patentInfo.description) {
                const descText = typeof patentInfo.description === 'string' ? patentInfo.description : JSON.stringify(patentInfo.description);
                if (useFullContext) {
                    contextInfo += '\n## 说明书\n' + descText + '\n';
                } else {
                    const descPreview = descText.substring(0, 500);
                    contextInfo += '\n## 说明书摘要\n' + descPreview;
                    if (descText.length > 500) {
                        contextInfo += '...(勾选"包含完整内容"可加载全部)';
                    }
                    contextInfo += '\n';
                }
            }
            
            contextInfo += '\n请基于以上完整的专利信息，准确、专业地回答用户的问题。回答时可以使用Markdown格式来组织内容，使其更易读。';
            
            const apiMessages = [
                { role: 'system', content: contextInfo }
            ];
            
            this.messages.forEach(function(m) {
                if (m.role !== 'system') {
                    apiMessages.push({ role: m.role, content: m.content });
                }
            });
            
            const requestBody = {
                model: this.currentModel,
                messages: apiMessages,
                temperature: 0.7,
                stream: true
            };
            
            if (this.currentProvider === 'aliyun') {
                requestBody.provider = 'aliyun';
            }
            
            const headers = { 'Content-Type': 'application/json' };
            
            if (this.currentProvider === 'aliyun') {
                const aliyunKey = this.apiKeys.aliyun;
                if (!aliyunKey) throw new Error('请先配置阿里云API密钥');
                headers['X-LLM-Provider'] = 'aliyun';
                headers['Authorization'] = 'Bearer ' + aliyunKey;
            } else {
                const apiKey = this.apiKeys.zhipu;
                if (!apiKey) throw new Error('请先配置智谱API密钥');
                headers['Authorization'] = 'Bearer ' + apiKey;
            }
            
            const response = await fetch('/api/stream_chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(function() { return {}; });
                throw new Error(errorData.error || 'API请求失败: ' + response.status);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';
            let renderTimer = null;
            let lastRenderTime = 0;
            const RENDER_INTERVAL = 50;
            
            contentDiv.textContent = '';
            
            function scheduleRender() {
                const now = Date.now();
                if (now - lastRenderTime >= RENDER_INTERVAL) {
                    lastRenderTime = now;
                    contentDiv.innerHTML = self.formatContentStreaming(fullContent);
                    historyEl.scrollTop = historyEl.scrollHeight;
                } else {
                    if (renderTimer) clearTimeout(renderTimer);
                    renderTimer = setTimeout(function() {
                        lastRenderTime = Date.now();
                        contentDiv.innerHTML = self.formatContentStreaming(fullContent);
                        historyEl.scrollTop = historyEl.scrollHeight;
                    }, RENDER_INTERVAL - (now - lastRenderTime));
                }
            }
            
            while (true) {
                if (self.stopStreaming) break;
                
                const result = await reader.read();
                const value = result.value;
                const done = result.done;
                
                if (value) buffer += decoder.decode(value, { stream: !done });
                if (done) break;
                
                let lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.trim() || !line.startsWith('data:')) continue;
                    
                    const jsonStr = line.substring(5).trim();
                    if (jsonStr === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        const content = data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content ? data.choices[0].delta.content : (data.content || '');
                        if (content) {
                            fullContent += content;
                            scheduleRender();
                        }
                    } catch (e) {}
                }
            }
            
            if (renderTimer) clearTimeout(renderTimer);
            contentDiv.innerHTML = self.formatContent(fullContent);
            
            if (fullContent) {
                self.messages.push({ role: 'assistant', content: fullContent, timestamp: new Date().toISOString() });
            }
            
        } catch (error) {
            console.error('发送失败:', error);
            contentDiv.innerHTML = '<span style="color: #c62828;">发送失败: ' + self.escapeHtmlAdvanced(error.message) + '</span>';
        } finally {
            self.isLoading = false;
            sendBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    },
    
    formatContent: function(content) {
        if (typeof marked !== 'undefined') {
            try {
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: false,
                    mangle: false
                });
                
                const html = marked.parse(content);
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                const scripts = tempDiv.querySelectorAll('script');
                scripts.forEach(function(script) { script.remove(); });
                
                const allElements = tempDiv.querySelectorAll('*');
                allElements.forEach(function(el) {
                    Array.from(el.attributes).forEach(function(attr) {
                        if (attr.name.startsWith('on')) {
                            el.removeAttribute(attr.name);
                        }
                    });
                });
                
                return tempDiv.innerHTML;
            } catch (e) {
                console.error('Markdown渲染失败:', e);
                return this.simpleFormatContent(content);
            }
        } else {
            return this.simpleFormatContent(content);
        }
    },
    
    formatContentStreaming: function(content) {
        if (typeof marked !== 'undefined') {
            try {
                let processedContent = content;
                
                const codeBlockCount = (content.match(/```/g) || []).length;
                if (codeBlockCount % 2 !== 0) {
                    processedContent += '\n```';
                }
                
                const tableLineMatch = content.match(/^\|.*\|$/gm);
                if (tableLineMatch && tableLineMatch.length > 0) {
                    const lastLine = content.split('\n').pop();
                    if (lastLine.startsWith('|') && !lastLine.endsWith('|')) {
                        processedContent += '|';
                    }
                }
                
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: false,
                    mangle: false
                });
                
                let html = marked.parse(processedContent);
                
                html = html.replace(/<\/code><\/pre>/g, '</code><span class="blinking-cursor">|</span></pre>');
                html = html.replace(/<\/p>/g, '<span class="blinking-cursor">|</span></p>');
                html = html.replace(/<\/li>/g, '<span class="blinking-cursor">|</span></li>');
                html = html.replace(/<\/td>/g, '<span class="blinking-cursor">|</span></td>');
                
                return html;
            } catch (e) {
                return this.simpleFormatContent(content) + '<span class="blinking-cursor">|</span>';
            }
        } else {
            return this.simpleFormatContent(content) + '<span class="blinking-cursor">|</span>';
        }
    },
    
    simpleFormatContent: function(content) {
        let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return formatted;
    },
    
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    escapeHtmlAdvanced: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>')
            .replace(/\r/g, '')
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
};

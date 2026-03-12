window.PatentDetailChat = {
    init: function() {
        const self = this;
        
        window.openPatentChatInNewTab = function(patentNumber) {
            self.openChat(patentNumber);
        };
        
        window.closePatentChatDialog = function() {
            self.closeChat();
        };
        
        window.sendPatentChatMessage = function() {
            self.sendMessage();
        };
        
        window.handlePatentChatKeydown = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                self.sendMessage();
            }
        };
    },

    openChat: function(patentNumber) {
        const existingDialog = document.getElementById('patent-chat-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const existingOverlay = document.getElementById('patent-chat-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        const patentData = window.pageData || {};
        const patentTitle = patentData.title || patentNumber;
        
        const self = this;
        
        const dialogHTML = `
            <div id="patent-chat-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10001; width: 600px; max-width: 90vw; height: 70vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/></svg>
                        问一问 - ${patentTitle}
                    </h3>
                    <button id="chat-close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div id="patent-chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f5f5f5;">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#667eea" viewBox="0 0 16 16" style="margin-bottom: 10px;"><path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/></svg>
                        <div>您好！我是专利智能助手。</div>
                        <div style="font-size: 12px; margin-top: 5px;">您可以询问关于此专利的任何问题</div>
                    </div>
                </div>
                <div style="padding: 15px; background: white; border-top: 1px solid #e0e0e0; flex-shrink: 0;">
                    <div style="display: flex; gap: 10px;">
                        <textarea id="patent-chat-input" placeholder="输入您的问题..." style="flex: 1; padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 14px; resize: none; height: 44px; line-height: 1.4;"></textarea>
                        <button id="chat-send-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329-.124l-2.064-4.653-.534-.239a.75.75 0 0 1-.239-.534l-.239-.534-4.653-2.064a.75.75 0 0 1-.124-1.329L14.854.146a.5.5 0 0 1 .546.044zM5.594 7.594l2.064 4.653L12.39 2.39 5.594 7.594z"/></svg>
                            发送
                        </button>
                    </div>
                    <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="chat-quick-btn" data-msg="这个专利的核心技术是什么？" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">核心技术</button>
                        <button class="chat-quick-btn" data-msg="这个专利的创新点在哪里？" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">创新点</button>
                        <button class="chat-quick-btn" data-msg="请解释一下权利要求1" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">解释权利要求</button>
                        <button class="chat-quick-btn" data-msg="这个专利的应用场景有哪些？" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">应用场景</button>
                    </div>
                </div>
            </div>
            <div id="patent-chat-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.patentNumber = patentNumber;
        this.patentData = patentData;
        
        document.getElementById('chat-close-btn').onclick = function() { self.closeChat(); };
        document.getElementById('patent-chat-overlay').onclick = function() { self.closeChat(); };
        document.getElementById('chat-send-btn').onclick = function() { self.sendMessage(); };
        document.getElementById('patent-chat-input').onkeydown = function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                self.sendMessage();
            }
        };
        
        var quickBtns = document.querySelectorAll('.chat-quick-btn');
        for (var i = 0; i < quickBtns.length; i++) {
            quickBtns[i].onclick = function() {
                document.getElementById('patent-chat-input').value = this.getAttribute('data-msg');
            };
        }
    },

    closeChat: function() {
        const dialog = document.getElementById('patent-chat-dialog');
        const overlay = document.getElementById('patent-chat-overlay');
        if (dialog) dialog.remove();
        if (overlay) overlay.remove();
    },

    sendMessage: function() {
        const input = document.getElementById('patent-chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        const messagesContainer = document.getElementById('patent-chat-messages');
        
        const userMessageHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 15px; border-radius: 12px 12px 0 12px; max-width: 80%; font-size: 14px;">
                    ${message}
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', userMessageHTML);
        
        input.value = '';
        
        const loadingHTML = `
            <div id="chat-loading" style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
                <div style="background: white; padding: 10px 15px; border-radius: 12px 12px 12px 0; max-width: 80%; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <div style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></div>
                        <div style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out 0.16s both;"></div>
                        <div style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out 0.32s both;"></div>
                        <style>
                            @keyframes bounce {
                                0%, 80%, 100% { transform: scale(0); }
                                40% { transform: scale(1); }
                            }
                        </style>
                    </div>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', loadingHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.callAI(message, messagesContainer);
    },

    callAI: function(message, messagesContainer) {
        const patentInfo = {
            patent_number: this.patentNumber,
            title: this.patentData.title || '',
            abstract: this.patentData.abstract || '',
            claims: this.patentData.claims || [],
            description: this.patentData.description || ''
        };
        
        if (window.opener && window.opener.askPatentQuestion) {
            window.opener.askPatentQuestion(patentInfo, message).then(response => {
                this.displayResponse(response, messagesContainer);
            }).catch(err => {
                this.displayResponse('抱歉，发生了错误: ' + err.message, messagesContainer);
            });
        } else {
            setTimeout(() => {
                const mockResponse = this.generateMockResponse(message, patentInfo);
                this.displayResponse(mockResponse, messagesContainer);
            }, 1500);
        }
    },

    generateMockResponse: function(message, patentInfo) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('核心') || lowerMessage.includes('技术')) {
            return '根据专利"' + (patentInfo.title || this.patentNumber) + '"的内容分析，核心技术主要涉及：\n\n1. 创新的技术方案设计\n2. 独特的实现方法\n3. 优化的系统架构\n\n如需更详细的技术分析，请查看专利的权利要求书和说明书部分。';
        } else if (lowerMessage.includes('创新') || lowerMessage.includes('特点')) {
            return '该专利的创新点主要体现在：\n\n1. 技术方案的创新性\n2. 解决问题的独特方法\n3. 相比现有技术的改进\n\n建议您仔细阅读权利要求书以了解具体的技术特征。';
        } else if (lowerMessage.includes('权利要求') || lowerMessage.includes('claim')) {
            return '权利要求是专利保护范围的核心界定。该专利共有 ' + (patentInfo.claims ? patentInfo.claims.length : 0) + ' 项权利要求。\n\n独立权利要求定义了最核心的技术方案，从属权利要求则在此基础上增加了更多技术特征。\n\n您想了解哪一项权利要求的具体内容？';
        } else if (lowerMessage.includes('应用') || lowerMessage.includes('场景')) {
            return '该专利可能的应用场景包括：\n\n1. 相关技术领域的实际应用\n2. 产品开发中的技术实现\n3. 行业解决方案的优化\n\n具体应用需要结合您的业务需求进行分析。';
        } else {
            return '感谢您的提问！关于"' + message + '"，我建议您：\n\n1. 查看专利的摘要部分了解整体概况\n2. 阅读权利要求书了解保护范围\n3. 参考说明书了解技术细节\n\n如有更具体的问题，请随时提问。';
        }
    },

    displayResponse: function(response, messagesContainer) {
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        
        const formattedResponse = response.replace(/\n/g, '<br>');
        
        const aiMessageHTML = `
            <div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
                <div style="background: white; padding: 10px 15px; border-radius: 12px 12px 12px 0; max-width: 80%; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.6;">
                    ${formattedResponse}
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', aiMessageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
};

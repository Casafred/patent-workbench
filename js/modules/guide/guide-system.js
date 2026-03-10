/**
 * 用户引导系统 - 核心模块
 * 实现首次登录用户的交互式引导
 * 
 * @module guide-system
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    const GuideSystem = {
        version: '1.0.0',
        initialized: false,
        active: false,
        currentStep: 0,
        steps: [],
        overlay: null,
        highlight: null,
        tooltip: null,
        config: {
            storageKey: 'patent_workbench_guide_completed',
            skipConfirmEnabled: true,
            animationDuration: 400,
            autoStartDelay: 1000
        },

        guideSteps: [
            {
                id: 'welcome',
                type: 'modal',
                title: '欢迎使用 ALFRED X IP',
                content: `
                    <p>您好！欢迎使用<strong>专利智能工作台</strong>。</p>
                    <p>这是一个专为专利分析设计的智能工具平台，让我们花几分钟时间了解系统的核心功能。</p>
                `,
                position: 'center',
                features: [
                    { icon: 'chat', text: 'AI智能对话' },
                    { icon: 'search', text: '专利检索分析' },
                    { icon: 'compare', text: '权利要求比对' },
                    { icon: 'ocr', text: '文档OCR识别' }
                ]
            },
            {
                id: 'sidebar',
                type: 'highlight',
                target: '#sidebarNav',
                title: '功能导航栏',
                content: `
                    <p>左侧是<strong>功能导航栏</strong>，包含系统的所有功能模块。</p>
                    <p>点击不同的功能标签即可切换到对应的功能页面。</p>
                    <ul>
                        <li><strong>功能一</strong>：AI智能体对话</li>
                        <li><strong>功能二</strong>：文本批量智能分析</li>
                        <li><strong>功能三</strong>：本地数据表管理</li>
                        <li><strong>功能四</strong>：权利要求智能比对</li>
                        <li><strong>功能五</strong>：批量专利检索与解读</li>
                        <li><strong>功能六</strong>：独从权识别与可视化</li>
                        <li><strong>功能七</strong>：专利附图智能标记</li>
                        <li><strong>功能八</strong>：文档OCR与智能分析</li>
                        <li><strong>功能九</strong>：IPC分类智能查询</li>
                    </ul>
                `,
                position: 'right'
            },
            {
                id: 'api_config',
                type: 'highlight',
                target: '#api_config_toggle_btn',
                title: 'API密钥配置',
                content: `
                    <p>点击此按钮可以<strong>配置AI模型的API密钥</strong>。</p>
                    <div class="guide-api-config">
                        <h4>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                            如何获取API密钥？
                        </h4>
                        <div class="guide-api-steps">
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">1</div>
                                <div class="guide-api-step-content">
                                    <strong>智谱AI</strong>
                                    <p>访问 <a href="https://open.bigmodel.cn/" target="_blank">open.bigmodel.cn</a> 注册账号</p>
                                </div>
                            </div>
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">2</div>
                                <div class="guide-api-step-content">
                                    <strong>创建API Key</strong>
                                    <p>在控制台创建API密钥并复制</p>
                                </div>
                            </div>
                            <div class="guide-api-step">
                                <div class="guide-api-step-number">3</div>
                                <div class="guide-api-step-content">
                                    <strong>粘贴保存</strong>
                                    <p>将密钥粘贴到输入框并点击保存</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                position: 'left',
                action: 'click_api_config'
            },
            {
                id: 'theme_toggle',
                type: 'highlight',
                target: '#theme_toggle_btn',
                title: '主题切换',
                content: `
                    <p>点击此按钮可以<strong>切换明暗主题</strong>。</p>
                    <p>系统支持亮色和暗色两种主题模式，根据您的喜好自由切换。</p>
                `,
                position: 'left'
            },
            {
                id: 'help_button',
                type: 'highlight',
                target: '.sidebar-footer',
                title: '帮助文档',
                content: `
                    <p>点击这里可以打开<strong>帮助文档</strong>。</p>
                    <p>帮助文档包含详细的功能说明、操作指南和常见问题解答。</p>
                `,
                position: 'right'
            },
            {
                id: 'feature_instant_chat',
                type: 'highlight',
                target: '[data-tab="instant"]',
                title: '功能一：AI智能体对话',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <h4 class="guide-feature-title">AI智能体对话</h4>
                        </div>
                        <p class="guide-feature-desc">与AI进行智能对话，支持专利分析、技术问答、文本处理等多种场景。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">多模型支持</span>
                            <span class="guide-feature-tag">流式输出</span>
                            <span class="guide-feature-tag">历史记录</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'instant'
            },
            {
                id: 'feature_batch',
                type: 'highlight',
                target: '[data-tab="unified_batch"]',
                title: '功能二：文本批量智能分析',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </div>
                            <h4 class="guide-feature-title">文本批量智能分析</h4>
                        </div>
                        <p class="guide-feature-desc">批量处理文本数据，支持Excel导入导出、智能分类标引、批量翻译等功能。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">Excel导入导出</span>
                            <span class="guide-feature-tag">智能分类</span>
                            <span class="guide-feature-tag">批量处理</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'unified_batch'
            },
            {
                id: 'feature_local_lib',
                type: 'highlight',
                target: '[data-tab="local_patent_lib"]',
                title: '功能三：本地数据表管理',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                            </div>
                            <h4 class="guide-feature-title">本地数据表管理</h4>
                        </div>
                        <p class="guide-feature-desc">管理本地专利数据，支持数据导入导出、智能检索和批量操作。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">数据管理</span>
                            <span class="guide-feature-tag">智能检索</span>
                            <span class="guide-feature-tag">批量操作</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'local_patent_lib'
            },
            {
                id: 'feature_claims_compare',
                type: 'highlight',
                target: '[data-tab="claims_comparison"]',
                title: '功能四：权利要求智能比对',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                            </div>
                            <h4 class="guide-feature-title">权利要求智能比对</h4>
                        </div>
                        <p class="guide-feature-desc">智能比对不同专利的权利要求，分析差异和相似性，支持侵权分析。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">智能比对</span>
                            <span class="guide-feature-tag">差异分析</span>
                            <span class="guide-feature-tag">侵权分析</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'claims_comparison'
            },
            {
                id: 'feature_global_search',
                type: 'highlight',
                target: '[data-tab="global_patent_search"]',
                title: '功能五：全球专利检索',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            </div>
                            <h4 class="guide-feature-title">全球专利检索</h4>
                        </div>
                        <p class="guide-feature-desc">全球专利数据库检索，支持多国专利查询、同族专利分析。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">全球检索</span>
                            <span class="guide-feature-tag">同族分析</span>
                            <span class="guide-feature-tag">多数据源</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'global_patent_search'
            },
            {
                id: 'feature_patent_batch',
                type: 'highlight',
                target: '[data-tab="patent_batch"]',
                title: '功能六：批量专利检索与解读',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            </div>
                            <h4 class="guide-feature-title">批量专利检索与解读</h4>
                        </div>
                        <p class="guide-feature-desc">批量检索专利信息，支持Google专利、CNIPA专利查询，AI智能解读专利内容。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">专利检索</span>
                            <span class="guide-feature-tag">AI解读</span>
                            <span class="guide-feature-tag">批量处理</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'patent_batch'
            },
            {
                id: 'feature_claims_processor',
                type: 'highlight',
                target: '[data-tab="claims_processor"]',
                title: '功能七：独从权识别与可视化',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                            </div>
                            <h4 class="guide-feature-title">独从权识别与可视化</h4>
                        </div>
                        <p class="guide-feature-desc">自动识别独立权利要求和从属权利要求，可视化展示权利要求关系。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">权利要求分析</span>
                            <span class="guide-feature-tag">可视化</span>
                            <span class="guide-feature-tag">关系图谱</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'claims_processor'
            },
            {
                id: 'feature_drawing_marker',
                type: 'highlight',
                target: '[data-tab="drawing_marker"]',
                title: '功能八：专利附图智能标记',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                            <h4 class="guide-feature-title">专利附图智能标记</h4>
                        </div>
                        <p class="guide-feature-desc">智能识别专利附图中的标记，自动关联说明书内容。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">OCR识别</span>
                            <span class="guide-feature-tag">智能匹配</span>
                            <span class="guide-feature-tag">交互查看</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'drawing_marker'
            },
            {
                id: 'feature_pdf_ocr',
                type: 'highlight',
                target: '[data-tab="pdf_ocr_reader"]',
                title: '功能九：文档OCR与智能分析',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <h4 class="guide-feature-title">文档OCR与智能分析</h4>
                        </div>
                        <p class="guide-feature-desc">PDF文档OCR识别，支持智能分析和对话，快速理解文档内容。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">PDF处理</span>
                            <span class="guide-feature-tag">OCR识别</span>
                            <span class="guide-feature-tag">智能对话</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'pdf_ocr_reader'
            },
            {
                id: 'feature_ipc',
                type: 'highlight',
                target: '[data-tab="ipc_lookup"]',
                title: '功能十：IPC分类智能查询',
                content: `
                    <div class="guide-feature-card">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <h4 class="guide-feature-title">IPC分类智能查询</h4>
                        </div>
                        <p class="guide-feature-desc">查询IPC分类号，AI智能预测专利分类，浏览完整IPC分类树。</p>
                        <div class="guide-feature-tags">
                            <span class="guide-feature-tag">IPC查询</span>
                            <span class="guide-feature-tag">分类预测</span>
                            <span class="guide-feature-tag">AI预测</span>
                        </div>
                    </div>
                `,
                position: 'right',
                switchTab: 'ipc_lookup'
            },
            {
                id: 'complete',
                type: 'modal',
                title: '引导完成',
                content: `
                    <p>恭喜您完成了系统引导！</p>
                    <p>现在您可以开始使用专利智能工作台了。如有任何问题，请随时查看帮助中心。</p>
                `,
                position: 'center'
            }
        ],

        init: function() {
            if (this.initialized) {
                console.warn('[GuideSystem] 已经初始化');
                return;
            }

            console.log('[GuideSystem] 初始化引导系统...');
            
            this.steps = this.guideSteps;
            this.createDOMElements();
            this.bindEvents();
            this.initialized = true;
            
            console.log('[GuideSystem] 引导系统初始化完成');
        },

        createDOMElements: function() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'guide-overlay';
            this.overlay.id = 'guide-overlay';
            document.body.appendChild(this.overlay);

            this.highlight = document.createElement('div');
            this.highlight.className = 'guide-highlight';
            this.highlight.id = 'guide-highlight';
            document.body.appendChild(this.highlight);

            this.tooltip = document.createElement('div');
            this.tooltip.className = 'guide-tooltip';
            this.tooltip.id = 'guide-tooltip';
            document.body.appendChild(this.tooltip);
        },

        bindEvents: function() {
            const self = this;
            
            this.overlay.addEventListener('click', function(e) {
                if (e.target === self.overlay) {
                    self.showSkipConfirm();
                }
            });

            document.addEventListener('keydown', function(e) {
                if (!self.active) return;
                
                switch(e.key) {
                    case 'Escape':
                        self.showSkipConfirm();
                        break;
                    case 'ArrowRight':
                    case 'Enter':
                        self.next();
                        break;
                    case 'ArrowLeft':
                        self.previous();
                        break;
                }
            });
        },

        start: function() {
            if (this.isCompleted()) {
                console.log('[GuideSystem] 用户已完成引导，跳过');
                return false;
            }

            if (this.active) {
                console.warn('[GuideSystem] 引导已在进行中');
                return false;
            }

            this.init();
            this.active = true;
            this.currentStep = 0;
            this.showStep(0);
            
            console.log('[GuideSystem] 引导开始');
            return true;
        },

        showStep: function(index) {
            if (index < 0 || index >= this.steps.length) {
                console.error('[GuideSystem] 无效的步骤索引:', index);
                return;
            }

            const step = this.steps[index];
            this.currentStep = index;

            if (step.type === 'modal') {
                this.showModalStep(step);
            } else if (step.type === 'highlight') {
                this.showHighlightStep(step);
            }
        },

        showModalStep: function(step) {
            this.overlay.classList.add('active');
            this.highlight.style.display = 'none';

            if (step.id === 'welcome') {
                this.showWelcomeModal(step);
            } else if (step.id === 'complete') {
                this.showCompleteModal(step);
            }
        },

        showWelcomeModal: function(step) {
            const featureIcons = {
                chat: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
                search: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
                compare: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
                ocr: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
            };

            let featuresHtml = '';
            if (step.features) {
                featuresHtml = '<div class="guide-welcome-features">';
                step.features.forEach(function(f) {
                    featuresHtml += `
                        <div class="guide-welcome-feature">
                            <div class="guide-welcome-feature-icon">${featureIcons[f.icon] || ''}</div>
                            <span class="guide-welcome-feature-text">${f.text}</span>
                        </div>
                    `;
                });
                featuresHtml += '</div>';
            }

            const html = `
                <div class="guide-welcome-modal active" id="guide-welcome-modal">
                    <div class="guide-overlay active"></div>
                    <div class="guide-welcome-content">
                        <div class="guide-welcome-header">
                            <div class="guide-welcome-logo">ALFRED X IP</div>
                            <div class="guide-welcome-subtitle">专利智能工作台</div>
                        </div>
                        <div class="guide-welcome-body">
                            <h2>${step.title}</h2>
                            ${step.content}
                            ${featuresHtml}
                            <div class="guide-welcome-footer">
                                <button class="guide-btn guide-btn-primary" onclick="GuideSystem.startGuide()">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    开始引导
                                </button>
                                <button class="guide-btn guide-btn-skip" onclick="GuideSystem.skip()">
                                    跳过引导
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('guide-welcome-modal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', html);
        },

        showCompleteModal: function(step) {
            const html = `
                <div class="guide-complete-modal active" id="guide-complete-modal">
                    <div class="guide-overlay active"></div>
                    <div class="guide-complete-content">
                        <div class="guide-complete-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2>${step.title}</h2>
                        ${step.content}
                        <button class="guide-btn guide-btn-primary" onclick="GuideSystem.complete()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                            开始使用
                        </button>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('guide-complete-modal');
            if (existingModal) {
                existingModal.remove();
            }

            this.tooltip.classList.remove('active');
            document.body.insertAdjacentHTML('beforeend', html);
        },

        showHighlightStep: function(step) {
            const welcomeModal = document.getElementById('guide-welcome-modal');
            if (welcomeModal) {
                welcomeModal.remove();
            }

            const completeModal = document.getElementById('guide-complete-modal');
            if (completeModal) {
                completeModal.remove();
            }

            this.overlay.classList.add('active');
            this.showProgressBar();

            if (step.id === 'sidebar' || step.id.startsWith('feature_') || step.id === 'help_button') {
                this.expandSidebar();
            }

            if (step.switchTab) {
                this.switchToTab(step.switchTab);
            }

            const self = this;
            const tryShowHighlight = function(attempts) {
                attempts = attempts || 0;
                
                const target = document.querySelector(step.target);
                if (!target) {
                    if (attempts < 5) {
                        setTimeout(function() {
                            tryShowHighlight(attempts + 1);
                        }, 200);
                    } else {
                        console.warn('[GuideSystem] 重试后仍未找到目标元素:', step.target);
                        self.next();
                    }
                    return;
                }

                self.highlightElement(target);
                self.positionTooltip(target, step);
                self.updateProgressBar();
                self.updateProgressBarPosition();
            };

            tryShowHighlight(0);
        },

        highlightElement: function(element) {
            const rect = element.getBoundingClientRect();
            
            this.highlight.style.display = 'block';
            this.highlight.style.top = rect.top + 'px';
            this.highlight.style.left = rect.left + 'px';
            this.highlight.style.width = rect.width + 'px';
            this.highlight.style.height = rect.height + 'px';

            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        positionTooltip: function(target, step) {
            const rect = target.getBoundingClientRect();
            const tooltipWidth = 420;
            const tooltipHeight = 300;
            const margin = 20;

            let top, left;
            const position = step.position || 'right';

            switch(position) {
                case 'right':
                    left = rect.right + margin;
                    top = rect.top;
                    if (left + tooltipWidth > window.innerWidth) {
                        left = rect.left - tooltipWidth - margin;
                    }
                    break;
                case 'left':
                    left = rect.left - tooltipWidth - margin;
                    top = rect.top;
                    if (left < 0) {
                        left = rect.right + margin;
                    }
                    break;
                case 'top':
                    left = rect.left;
                    top = rect.top - tooltipHeight - margin;
                    if (top < 0) {
                        top = rect.bottom + margin;
                    }
                    break;
                case 'bottom':
                    left = rect.left;
                    top = rect.bottom + margin;
                    if (top + tooltipHeight > window.innerHeight) {
                        top = rect.top - tooltipHeight - margin;
                    }
                    break;
            }

            top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

            this.renderTooltip(step, top, left);
        },

        renderTooltip: function(step, top, left) {
            const progressDots = this.renderProgressDots();
            const isLastHighlightStep = this.currentStep === this.steps.length - 2;
            
            const html = `
                <div class="guide-tooltip-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        ${step.title}
                    </h3>
                    <span class="guide-step-badge">步骤 ${this.currentStep + 1}/${this.steps.length}</span>
                </div>
                <div class="guide-tooltip-body">
                    <div class="guide-tooltip-content">
                        ${step.content}
                    </div>
                </div>
                <div class="guide-tooltip-footer">
                    <div class="guide-progress">
                        ${progressDots}
                    </div>
                    <div class="guide-nav-buttons">
                        <button class="guide-btn guide-btn-skip" onclick="GuideSystem.showSkipConfirm()">
                            跳过
                        </button>
                        ${this.currentStep > 0 ? `
                            <button class="guide-btn guide-btn-secondary" onclick="GuideSystem.previous()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                                上一步
                            </button>
                        ` : ''}
                        <button class="guide-btn guide-btn-primary" onclick="GuideSystem.next()">
                            ${isLastHighlightStep ? '完成引导' : '下一步'}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </div>
            `;

            this.tooltip.innerHTML = html;
            this.tooltip.style.top = top + 'px';
            this.tooltip.style.left = left + 'px';
            this.tooltip.classList.add('active');
        },

        renderProgressDots: function() {
            let html = '';
            for (let i = 0; i < this.steps.length; i++) {
                let className = 'guide-progress-dot';
                if (i < this.currentStep) {
                    className += ' completed';
                } else if (i === this.currentStep) {
                    className += ' active';
                }
                html += `<div class="${className}"></div>`;
            }
            return html;
        },

        startGuide: function() {
            const welcomeModal = document.getElementById('guide-welcome-modal');
            if (welcomeModal) {
                welcomeModal.remove();
            }
            
            this.currentStep = 1;
            this.showStep(1);
        },

        next: function() {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.showStep(this.currentStep);
                this.updateProgressBar();
            }
        },

        previous: function() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.showStep(this.currentStep);
                this.updateProgressBar();
            }
        },

        goToStep: function(index) {
            if (index >= 0 && index < this.steps.length) {
                this.currentStep = index;
                this.showStep(index);
                this.updateProgressBar();
            }
        },

        updateProgressBar: function() {
            const progressBar = document.getElementById('guide-progress-bar');
            if (!progressBar) return;

            const dots = progressBar.querySelectorAll('.guide-progress-bar-dot');
            dots.forEach(function(dot, index) {
                dot.classList.remove('active', 'completed');
                if (index < this.currentStep) {
                    dot.classList.add('completed');
                } else if (index === this.currentStep) {
                    dot.classList.add('active');
                }
            }.bind(this));

            const stepInfo = progressBar.querySelector('.guide-progress-bar-step-info');
            if (stepInfo) {
                const step = this.steps[this.currentStep];
                stepInfo.textContent = `${this.currentStep + 1}/${this.steps.length}: ${step.title}`;
            }
        },

        updateProgressBarPosition: function() {
            const progressBar = document.getElementById('guide-progress-bar');
            if (!progressBar) return;

            const sidebar = document.getElementById('sidebarNav');
            const isExpanded = sidebar && sidebar.classList.contains('expanded');
            
            if (isExpanded) {
                progressBar.classList.add('sidebar-expanded');
            } else {
                progressBar.classList.remove('sidebar-expanded');
            }
        },

        expandSidebar: function() {
            const sidebar = document.getElementById('sidebarNav');
            if (sidebar) {
                sidebar.classList.add('expanded');
                sidebar.classList.remove('collapsed');
            }
            
            const toggle = document.getElementById('sidebarToggle');
            if (toggle) {
                toggle.setAttribute('title', '收起菜单');
            }
        },

        switchToTab: function(tabId) {
            if (typeof switchTab === 'function') {
                switchTab(tabId);
            } else {
                const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
                if (tabElement && typeof tabElement.onclick === 'function') {
                    tabElement.click();
                }
            }
        },

        showProgressBar: function() {
            let floatBall = document.getElementById('guide-float-ball');
            if (!floatBall) {
                const stepsHtml = this.steps.map(function(step, index) {
                    const isActive = index === this.currentStep;
                    const isCompleted = index < this.currentStep;
                    return `
                        <div class="guide-float-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-step="${index}">
                            <div class="guide-float-step-dot"></div>
                            <span class="guide-float-step-text">${step.title}</span>
                        </div>
                    `;
                }.bind(this)).join('');

                const html = `
                    <div class="guide-float-ball" id="guide-float-ball" title="引导进度">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span class="guide-badge">${this.currentStep + 1}/${this.steps.length}</span>
                        <div class="guide-float-panel" id="guide-float-panel">
                            <div class="guide-float-panel-header">
                                <h4>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    引导进度
                                </h4>
                                <button class="guide-float-panel-close" id="guide-float-close">&times;</button>
                            </div>
                            <div class="guide-float-panel-body">
                                ${stepsHtml}
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', html);
                floatBall = document.getElementById('guide-float-ball');

                const self = this;
                floatBall.addEventListener('click', function(e) {
                    if (e.target.closest('.guide-float-panel-close')) {
                        document.getElementById('guide-float-panel').classList.remove('show');
                        return;
                    }
                    if (e.target.closest('.guide-float-step')) {
                        const stepEl = e.target.closest('.guide-float-step');
                        const stepIndex = parseInt(stepEl.dataset.step);
                        self.goToStep(stepIndex);
                        return;
                    }
                    const panel = document.getElementById('guide-float-panel');
                    panel.classList.toggle('show');
                });
            }

            setTimeout(function() {
                floatBall.classList.add('active');
            }, 100);
        },

        hideProgressBar: function() {
            const floatBall = document.getElementById('guide-float-ball');
            if (floatBall) {
                floatBall.classList.remove('active');
            }
        },

        showSkipConfirm: function() {
            if (!this.config.skipConfirmEnabled) {
                this.skip();
                return;
            }

            const existingConfirm = document.querySelector('.guide-skip-confirm');
            if (existingConfirm) {
                existingConfirm.remove();
            }

            const html = `
                <div class="guide-skip-confirm">
                    <h3>确定要跳过引导吗？</h3>
                    <p>您可以随时在帮助中心查看使用指南。</p>
                    <div class="guide-skip-confirm-buttons">
                        <button class="guide-btn guide-btn-secondary" onclick="GuideSystem.hideSkipConfirm()">
                            继续引导
                        </button>
                        <button class="guide-btn guide-btn-primary" onclick="GuideSystem.skip()">
                            确认跳过
                        </button>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
        },

        hideSkipConfirm: function() {
            const confirm = document.querySelector('.guide-skip-confirm');
            if (confirm) {
                confirm.remove();
            }
        },

        skip: function() {
            this.hideSkipConfirm();
            this.markCompleted();
            this.destroy();
            console.log('[GuideSystem] 用户跳过引导');
        },

        complete: function() {
            this.markCompleted();
            this.destroy();
            console.log('[GuideSystem] 用户完成引导');
        },

        markCompleted: function() {
            try {
                const data = {
                    completed: true,
                    completedAt: new Date().toISOString(),
                    version: this.version
                };
                localStorage.setItem(this.config.storageKey, JSON.stringify(data));
            } catch (e) {
                console.error('[GuideSystem] 保存引导状态失败:', e);
            }
        },

        isCompleted: function() {
            try {
                const data = localStorage.getItem(this.config.storageKey);
                if (data) {
                    const parsed = JSON.parse(data);
                    return parsed.completed === true;
                }
            } catch (e) {
                console.error('[GuideSystem] 读取引导状态失败:', e);
            }
            return false;
        },

        reset: function() {
            try {
                localStorage.removeItem(this.config.storageKey);
                console.log('[GuideSystem] 引导状态已重置');
            } catch (e) {
                console.error('[GuideSystem] 重置引导状态失败:', e);
            }
        },

        destroy: function() {
            this.active = false;
            
            if (this.overlay) {
                this.overlay.classList.remove('active');
            }
            if (this.highlight) {
                this.highlight.style.display = 'none';
            }
            if (this.tooltip) {
                this.tooltip.classList.remove('active');
            }

            const welcomeModal = document.getElementById('guide-welcome-modal');
            if (welcomeModal) {
                welcomeModal.remove();
            }

            const completeModal = document.getElementById('guide-complete-modal');
            if (completeModal) {
                completeModal.remove();
            }

            const progressBar = document.getElementById('guide-progress-bar');
            if (progressBar) {
                progressBar.classList.remove('active');
                setTimeout(function() {
                    progressBar.remove();
                }, 400);
            }

            this.hideSkipConfirm();
        },

        autoStart: function() {
            const self = this;
            
            if (this.isCompleted()) {
                console.log('[GuideSystem] 用户已完成引导，不自动启动');
                return;
            }

            setTimeout(function() {
                self.start();
            }, this.config.autoStartDelay);
        },

        showApiGuide: function() {
            const apiStep = this.steps.find(s => s.id === 'api_config');
            if (apiStep) {
                this.currentStep = this.steps.indexOf(apiStep);
                this.showStep(this.currentStep);
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GuideSystem;
    } else {
        global.GuideSystem = GuideSystem;
    }

})(typeof window !== 'undefined' ? window : this);

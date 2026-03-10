/**
 * 功能页面介绍模块
 * 为系统各主要功能页面提供简洁明了的功能说明
 * 
 * @module guide-features
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    const GuideFeatures = {
        features: {
            instant: {
                id: 'instant',
                name: 'AI智能体对话',
                icon: 'chat',
                shortDesc: '与AI进行智能对话，支持专利分析、技术问答等多种场景',
                fullDesc: '这是一个强大的AI对话功能，支持多种大语言模型，可以进行专利分析、技术问答、文本处理等多种任务。支持流式输出、多轮对话、历史记录等功能。',
                tags: ['多模型支持', '流式输出', '历史记录', '文件上传'],
                tips: [
                    '可以选择不同的AI模型，根据任务需求选择合适的模型',
                    '支持上传文件进行智能分析',
                    '对话历史会自动保存，方便后续查看',
                    '可以导出对话内容为Markdown格式'
                ],
                useCases: [
                    { title: '专利技术分析', desc: '上传专利文档，让AI帮你分析技术要点' },
                    { title: '技术方案对比', desc: '输入多个技术方案，进行智能对比分析' },
                    { title: '文档润色翻译', desc: '对专利文档进行润色或翻译' }
                ]
            },
            unified_batch: {
                id: 'unified_batch',
                name: '文本批量智能分析',
                icon: 'file-text',
                shortDesc: '批量处理文本数据，支持Excel导入导出、智能分类标引',
                fullDesc: '强大的批量文本处理功能，支持Excel文件导入导出，可以进行智能分类标引、批量翻译、文本处理等操作。适合处理大量专利数据或技术文档。',
                tags: ['Excel导入导出', '智能分类', '批量处理', '模板定制'],
                tips: [
                    '支持Excel文件批量导入，自动识别列名',
                    '可以使用预设模板或自定义处理模板',
                    '处理结果可以导出为Excel或CSV格式',
                    '支持异步处理，可以同时处理多个任务'
                ],
                useCases: [
                    { title: '专利分类标引', desc: '批量对专利进行IPC分类标引' },
                    { title: '技术要点提取', desc: '从大量专利中提取关键技术要点' },
                    { title: '批量翻译', desc: '批量翻译专利摘要或权利要求' }
                ]
            },
            local_patent_lib: {
                id: 'local_patent_lib',
                name: '本地数据表管理',
                icon: 'database',
                shortDesc: '管理本地专利数据，支持数据导入导出和智能检索',
                fullDesc: '本地专利数据管理功能，可以导入、存储和管理专利数据。支持智能检索、数据筛选、批量操作等功能，方便管理大量专利数据。',
                tags: ['数据管理', '智能检索', '批量操作', '数据导出'],
                tips: [
                    '支持多种格式的数据导入',
                    '可以使用关键词进行智能检索',
                    '数据可以按多种条件筛选和排序',
                    '支持批量导出选中的数据'
                ],
                useCases: [
                    { title: '专利库管理', desc: '建立和维护企业专利数据库' },
                    { title: '数据清洗', desc: '对导入的专利数据进行清洗和整理' },
                    { title: '快速检索', desc: '在大量专利中快速找到目标专利' }
                ]
            },
            claims_comparison: {
                id: 'claims_comparison',
                name: '权利要求智能比对',
                icon: 'git-compare',
                shortDesc: '智能比对不同专利的权利要求，分析差异和相似性',
                fullDesc: '专业的权利要求比对工具，可以智能分析不同专利权利要求之间的差异和相似性。支持同族专利比对、侵权分析等场景。',
                tags: ['智能比对', '差异分析', '同族专利', '侵权分析'],
                tips: [
                    '可以同时比对多个专利的权利要求',
                    '系统会自动标记相似和不同的部分',
                    '支持导出比对报告',
                    '可以进行同族专利的权利要求对比'
                ],
                useCases: [
                    { title: '侵权分析', desc: '比对目标专利与现有技术的权利要求' },
                    { title: '专利布局', desc: '分析同族专利的权利要求变化' },
                    { title: '技术演进', desc: '追踪技术方案的演进过程' }
                ]
            },
            patent_batch: {
                id: 'patent_batch',
                name: '批量专利检索与解读',
                icon: 'search',
                shortDesc: '批量检索专利信息，AI智能解读专利内容',
                fullDesc: '强大的专利检索功能，支持Google专利、CNIPA专利数据库检索。可以批量检索专利，并使用AI进行智能解读，快速了解专利内容。',
                tags: ['专利检索', 'AI解读', '批量处理', '同族分析'],
                tips: [
                    '支持多种检索条件组合',
                    '可以批量检索多个专利号',
                    'AI会自动解读专利的核心内容',
                    '支持查看专利的同族信息'
                ],
                useCases: [
                    { title: '技术调研', desc: '批量检索相关领域的专利' },
                    { title: '竞争对手分析', desc: '检索并分析竞争对手的专利布局' },
                    { title: '专利解读', desc: '快速理解大量专利的技术内容' }
                ]
            },
            claims_processor: {
                id: 'claims_processor',
                name: '独从权识别与可视化',
                icon: 'git-branch',
                shortDesc: '自动识别独立权利要求和从属权利要求，可视化展示',
                fullDesc: '专业的权利要求分析工具，可以自动识别独立权利要求和从属权利要求，并以可视化方式展示权利要求之间的关系。',
                tags: ['权利要求分析', '可视化', '独从权识别', '关系图谱'],
                tips: [
                    '自动识别权利要求的类型',
                    '可视化展示权利要求的引用关系',
                    '支持导出分析结果',
                    '可以查看权利要求的完整文本'
                ],
                useCases: [
                    { title: '权利要求分析', desc: '快速理解专利的权利要求结构' },
                    { title: '撰写辅助', desc: '参考现有专利的权利要求布局' },
                    { title: '审查意见答复', desc: '分析权利要求的修改空间' }
                ]
            },
            drawing_marker: {
                id: 'drawing_marker',
                name: '专利附图智能标记',
                icon: 'image',
                shortDesc: '智能识别专利附图中的标记，关联说明书内容',
                fullDesc: '创新的专利附图分析工具，可以智能识别附图中的数字标记，并自动关联说明书中的对应内容。支持OCR识别和AI智能匹配。',
                tags: ['OCR识别', '智能匹配', '附图标注', '交互式查看'],
                tips: [
                    '支持多种OCR引擎，可根据需要选择',
                    'AI会自动匹配说明书中的标记描述',
                    '可以在附图上交互式查看标记内容',
                    '支持批量处理多张附图'
                ],
                useCases: [
                    { title: '附图理解', desc: '快速理解专利附图中的各个部件' },
                    { title: '说明书核对', desc: '核对说明书与附图的一致性' },
                    { title: '技术方案分析', desc: '通过附图理解技术方案' }
                ]
            },
            pdf_ocr_reader: {
                id: 'pdf_ocr_reader',
                name: '文档OCR与智能分析',
                icon: 'file',
                shortDesc: 'PDF文档OCR识别，支持智能分析和对话',
                fullDesc: '强大的PDF文档处理功能，可以进行OCR识别，提取文档内容，并支持与AI进行智能对话，快速理解文档内容。',
                tags: ['PDF处理', 'OCR识别', '智能对话', '内容提取'],
                tips: [
                    '支持多种语言的OCR识别',
                    '可以与AI对话，询问文档内容',
                    '支持选择文本进行智能分析',
                    '识别结果可以导出为文本'
                ],
                useCases: [
                    { title: '文档数字化', desc: '将扫描件转换为可编辑文本' },
                    { title: '内容理解', desc: '快速理解长文档的核心内容' },
                    { title: '信息提取', desc: '从文档中提取关键信息' }
                ]
            },
            ipc_lookup: {
                id: 'ipc_lookup',
                name: 'IPC分类智能查询',
                icon: 'folder-tree',
                shortDesc: '查询IPC分类号，AI智能预测专利分类',
                fullDesc: 'IPC分类号查询工具，可以浏览IPC分类树，查询分类含义，并使用AI预测专利的IPC分类号。',
                tags: ['IPC查询', '分类预测', '分类树浏览', 'AI预测'],
                tips: [
                    '可以浏览完整的IPC分类树',
                    '支持关键词搜索分类号',
                    'AI可以根据专利内容预测分类',
                    '可以查看分类的详细说明'
                ],
                useCases: [
                    { title: '分类查询', desc: '查询IPC分类号的含义和范围' },
                    { title: '分类预测', desc: '预测专利的IPC分类号' },
                    { title: '分类学习', desc: '了解IPC分类体系' }
                ]
            }
        },

        icons: {
            chat: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
            database: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
            'git-compare': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>',
            search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            'git-branch': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
            image: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            file: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
            'folder-tree': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>'
        },

        getFeature: function(id) {
            return this.features[id] || null;
        },

        getAllFeatures: function() {
            return Object.values(this.features);
        },

        renderFeatureCard: function(id, compact) {
            const feature = this.getFeature(id);
            if (!feature) return '';

            if (compact) {
                return `
                    <div class="guide-feature-card guide-feature-card-compact" data-feature-id="${feature.id}">
                        <div class="guide-feature-card-header">
                            <div class="guide-feature-icon">${this.icons[feature.icon] || ''}</div>
                            <h4 class="guide-feature-title">${feature.name}</h4>
                        </div>
                        <p class="guide-feature-desc">${feature.shortDesc}</p>
                    </div>
                `;
            }

            return `
                <div class="guide-feature-card" data-feature-id="${feature.id}">
                    <div class="guide-feature-card-header">
                        <div class="guide-feature-icon">${this.icons[feature.icon] || ''}</div>
                        <div>
                            <h4 class="guide-feature-title">${feature.name}</h4>
                            <p class="guide-feature-desc">${feature.shortDesc}</p>
                        </div>
                    </div>
                    <div class="guide-feature-tags">
                        ${feature.tags.map(tag => `<span class="guide-feature-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        },

        renderFeatureDetail: function(id) {
            const feature = this.getFeature(id);
            if (!feature) return '';

            return `
                <div class="guide-feature-detail">
                    <div class="guide-feature-detail-header">
                        <div class="guide-feature-detail-icon">${this.icons[feature.icon] || ''}</div>
                        <div class="guide-feature-detail-info">
                            <h2>${feature.name}</h2>
                            <p>${feature.fullDesc}</p>
                        </div>
                    </div>
                    
                    <div class="guide-feature-section">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                            使用技巧
                        </h3>
                        <ul class="guide-feature-tips">
                            ${feature.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="guide-feature-section">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                            典型应用场景
                        </h3>
                        <div class="guide-feature-use-cases">
                            ${feature.useCases.map(uc => `
                                <div class="guide-feature-use-case">
                                    <strong>${uc.title}</strong>
                                    <p>${uc.desc}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="guide-feature-tags-section">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                            功能标签
                        </h3>
                        <div class="guide-feature-tags">
                            ${feature.tags.map(tag => `<span class="guide-feature-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        showFeatureModal: function(id) {
            const feature = this.getFeature(id);
            if (!feature) return;

            const existing = document.getElementById('guide-feature-modal');
            if (existing) existing.remove();

            const html = `
                <div class="guide-feature-modal" id="guide-feature-modal">
                    <div class="guide-feature-modal-overlay" onclick="GuideFeatures.hideFeatureModal()"></div>
                    <div class="guide-feature-modal-content">
                        <button class="guide-feature-modal-close" onclick="GuideFeatures.hideFeatureModal()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                        ${this.renderFeatureDetail(id)}
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
            this.addModalStyles();

            setTimeout(() => {
                document.getElementById('guide-feature-modal').classList.add('active');
            }, 10);
        },

        hideFeatureModal: function() {
            const modal = document.getElementById('guide-feature-modal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        },

        addModalStyles: function() {
            if (document.getElementById('guide-feature-modal-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'guide-feature-modal-styles';
            styles.textContent = `
                .guide-feature-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 100010;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                
                .guide-feature-modal.active {
                    opacity: 1;
                    visibility: visible;
                }
                
                .guide-feature-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                }
                
                .guide-feature-modal-content {
                    position: relative;
                    z-index: 2;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                    max-width: 640px;
                    width: 90%;
                    max-height: 85vh;
                    overflow-y: auto;
                    transform: scale(0.95);
                    transition: transform 0.3s ease;
                    padding: 32px;
                }
                
                .guide-feature-modal.active .guide-feature-modal-content {
                    transform: scale(1);
                }
                
                .guide-feature-modal-close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    color: #6b7280;
                    transition: all 0.2s;
                }
                
                .guide-feature-modal-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .guide-feature-detail-header {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 24px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .guide-feature-detail-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }
                
                .guide-feature-detail-icon svg {
                    width: 28px;
                    height: 28px;
                }
                
                .guide-feature-detail-info h2 {
                    margin: 0 0 8px;
                    font-size: 20px;
                    color: #166534;
                }
                
                .guide-feature-detail-info p {
                    margin: 0;
                    font-size: 14px;
                    color: #6b7280;
                    line-height: 1.6;
                }
                
                .guide-feature-section {
                    margin-bottom: 24px;
                }
                
                .guide-feature-section h3 {
                    margin: 0 0 12px;
                    font-size: 14px;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .guide-feature-tips {
                    margin: 0;
                    padding-left: 20px;
                }
                
                .guide-feature-tips li {
                    margin-bottom: 8px;
                    font-size: 13px;
                    color: #6b7280;
                    line-height: 1.6;
                }
                
                .guide-feature-use-cases {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 12px;
                }
                
                .guide-feature-use-case {
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 10px;
                    border: 1px solid #e5e7eb;
                }
                
                .guide-feature-use-case strong {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 13px;
                    color: #374151;
                }
                
                .guide-feature-use-case p {
                    margin: 0;
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .guide-feature-tags-section h3 {
                    margin-bottom: 12px;
                }
                
                [data-theme="dark"] .guide-feature-modal-content {
                    background: #1f2937;
                }
                
                [data-theme="dark"] .guide-feature-modal-close:hover {
                    background: #374151;
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-feature-detail-header {
                    border-bottom-color: #374151;
                }
                
                [data-theme="dark"] .guide-feature-detail-info h2 {
                    color: #4ade80;
                }
                
                [data-theme="dark"] .guide-feature-detail-info p {
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-feature-section h3 {
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-feature-tips li {
                    color: #9ca3af;
                }
                
                [data-theme="dark"] .guide-feature-use-case {
                    background: #374151;
                    border-color: #4b5563;
                }
                
                [data-theme="dark"] .guide-feature-use-case strong {
                    color: #e5e7eb;
                }
                
                [data-theme="dark"] .guide-feature-use-case p {
                    color: #9ca3af;
                }
                
                @media (max-width: 640px) {
                    .guide-feature-modal-content {
                        padding: 20px;
                    }
                    
                    .guide-feature-detail-header {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    
                    .guide-feature-use-cases {
                        grid-template-columns: 1fr;
                    }
                }
            `;

            document.head.appendChild(styles);
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GuideFeatures;
    } else {
        global.GuideFeatures = GuideFeatures;
    }

})(typeof window !== 'undefined' ? window : this);

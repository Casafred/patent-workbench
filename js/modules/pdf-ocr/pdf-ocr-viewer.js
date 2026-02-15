/**
 * PDF-OCR 阅读器视图模块
 * 处理OCR区块的可视化渲染、选中和交互
 */

class PDFOCRViewer {
    constructor() {
        this.ocrBlocks = [];
        this.selectedBlock = null;
        this.highlightedBlock = null;
        this.blockOverlays = new Map();
        this.isBlockMode = false;
        this.filterType = 'all';
        this.colors = {
            text: 'rgba(34, 197, 94, 0.3)',
            table: 'rgba(59, 130, 246, 0.3)',
            formula: 'rgba(168, 85, 247, 0.3)',
            image: 'rgba(249, 115, 22, 0.3)',
            selected: 'rgba(234, 179, 8, 0.5)',
            hover: 'rgba(34, 197, 94, 0.5)'
        };
        this.borderColors = {
            text: '#22c55e',
            table: '#3b82f6',
            formula: '#a855f7',
            image: '#f97316',
            selected: '#eab308'
        };
        this.init();
    }

    init() {
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // 初始化元素引用（可在DOM加载后重新调用）
        this.elements = {
            filterSelect: document.getElementById('ocr-block-filter'),
            toggleBtn: document.getElementById('toggle-ocr-blocks'),
            container: document.getElementById('pdf-ocr-container'),
            blocksLayer: document.getElementById('ocr-blocks-layer'),
            structuredContent: document.getElementById('ocr-structured-content'),
            blockDetails: document.getElementById('ocr-block-details')
        };
    }

    bindEvents() {
        // 区块类型筛选
        const filterSelect = document.getElementById('ocr-block-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterType = e.target.value;
                this.updateBlockVisibility();
            });
        }

        // 显示/隐藏区块按钮
        const toggleBtn = document.getElementById('toggle-ocr-blocks');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleBlockMode();
            });
        }

        // 容器点击事件（取消选中）
        const container = document.getElementById('pdf-ocr-container');
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target === container || e.target.id === 'pdf-canvas') {
                    this.deselectBlock();
                }
            });
        }
    }

    /**
     * 设置OCR解析结果
     */
    setOCRResult(result) {
        if (!result || !result.pages) {
            this.ocrBlocks = [];
            return;
        }

        // 提取所有页面的区块
        this.ocrBlocks = [];
        result.pages.forEach((page, pageIndex) => {
            if (page.blocks) {
                page.blocks.forEach((block, blockIndex) => {
                    this.ocrBlocks.push({
                        ...block,
                        pageIndex: pageIndex + 1,
                        blockIndex: blockIndex,
                        id: `block-${pageIndex}-${blockIndex}`
                    });
                });
            }
        });

        // 更新结构化内容列表
        this.updateStructuredContent();
        
        // 更新统计信息
        this.updateStatistics();
        
        // 如果当前是区块模式，渲染区块
        if (this.isBlockMode) {
            this.renderBlocks();
        }
    }

    /**
     * 渲染OCR区块覆盖层
     */
    renderBlocks() {
        const container = document.getElementById('ocr-blocks-layer');
        if (!container) return;

        // 清空现有区块
        container.innerHTML = '';
        this.blockOverlays.clear();

        // 获取当前页码
        const currentPage = window.pdfOCRCore ? window.pdfOCRCore.currentPage : 1;

        // 过滤当前页的区块
        const pageBlocks = this.ocrBlocks.filter(block => block.pageIndex === currentPage);

        pageBlocks.forEach(block => {
            const overlay = this.createBlockOverlay(block);
            container.appendChild(overlay);
            this.blockOverlays.set(block.id, overlay);
        });

        // 应用筛选
        this.updateBlockVisibility();
    }

    /**
     * 创建单个区块覆盖层
     */
    createBlockOverlay(block) {
        const overlay = document.createElement('div');
        overlay.className = `ocr-block-overlay type-${block.type}`;
        overlay.dataset.blockId = block.id;
        overlay.dataset.blockType = block.type;

        // 设置位置和大小（相对于容器）
        const container = document.getElementById('pdf-canvas');
        if (container && block.bbox) {
            const scaleX = container.offsetWidth / (block.bbox.page_width || container.offsetWidth);
            const scaleY = container.offsetHeight / (block.bbox.page_height || container.offsetHeight);

            const left = block.bbox.lt[0] * scaleX;
            const top = block.bbox.lt[1] * scaleY;
            const width = (block.bbox.rb[0] - block.bbox.lt[0]) * scaleX;
            const height = (block.bbox.rb[1] - block.bbox.lt[1]) * scaleY;

            overlay.style.left = `${left}px`;
            overlay.style.top = `${top}px`;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
        }

        // 设置颜色
        overlay.style.backgroundColor = this.colors[block.type] || this.colors.text;
        overlay.style.borderColor = this.borderColors[block.type] || this.borderColors.text;

        // 添加标签
        const label = document.createElement('div');
        label.className = 'ocr-block-label';
        label.textContent = this.getBlockTypeLabel(block.type);
        overlay.appendChild(label);

        // 绑定事件
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBlock(block);
        });

        overlay.addEventListener('mouseenter', () => {
            this.highlightBlock(block.id);
        });

        overlay.addEventListener('mouseleave', () => {
            this.unhighlightBlock(block.id);
        });

        // 右键菜单
        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showBlockContextMenu(e, block);
        });

        return overlay;
    }

    /**
     * 获取区块类型标签
     */
    getBlockTypeLabel(type) {
        const labels = {
            text: '文本',
            table: '表格',
            formula: '公式',
            image: '图片',
            title: '标题',
            header: '页眉',
            footer: '页脚',
            reference: '引用'
        };
        return labels[type] || type;
    }

    /**
     * 选中区块
     */
    selectBlock(block) {
        // 取消之前的选中
        this.deselectBlock();

        this.selectedBlock = block;

        // 高亮覆盖层
        const overlay = this.blockOverlays.get(block.id);
        if (overlay) {
            overlay.classList.add('selected');
            overlay.style.backgroundColor = this.colors.selected;
            overlay.style.borderColor = this.borderColors.selected;
        }

        // 高亮结构化内容列表中的对应项
        this.highlightStructuredItem(block.id);

        // 显示区块详情
        this.showBlockDetails(block);

        // 触发选中事件
        this.emit('blockSelected', block);
    }

    /**
     * 取消选中区块
     */
    deselectBlock() {
        if (this.selectedBlock) {
            const overlay = this.blockOverlays.get(this.selectedBlock.id);
            if (overlay) {
                overlay.classList.remove('selected');
                const type = this.selectedBlock.type;
                overlay.style.backgroundColor = this.colors[type] || this.colors.text;
                overlay.style.borderColor = this.borderColors[type] || this.borderColors.text;
            }
            this.selectedBlock = null;
        }

        // 清除结构化列表高亮
        document.querySelectorAll('.ocr-content-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    /**
     * 高亮区块（悬停效果）
     */
    highlightBlock(blockId) {
        if (this.selectedBlock && this.selectedBlock.id === blockId) return;

        const overlay = this.blockOverlays.get(blockId);
        if (overlay) {
            overlay.classList.add('highlighted');
        }

        this.highlightedBlock = blockId;
    }

    /**
     * 取消高亮区块
     */
    unhighlightBlock(blockId) {
        if (this.selectedBlock && this.selectedBlock.id === blockId) return;

        const overlay = this.blockOverlays.get(blockId);
        if (overlay) {
            overlay.classList.remove('highlighted');
        }

        this.highlightedBlock = null;
    }

    /**
     * 更新区块可见性（根据筛选条件）
     */
    updateBlockVisibility() {
        this.blockOverlays.forEach((overlay, blockId) => {
            const blockType = overlay.dataset.blockType;
            if (this.filterType === 'all' || blockType === this.filterType) {
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        });
    }

    /**
     * 切换区块显示模式
     */
    toggleBlockMode() {
        this.isBlockMode = !this.isBlockMode;
        const layer = document.getElementById('ocr-blocks-layer');
        const btn = document.getElementById('toggle-ocr-blocks');

        if (layer) {
            layer.style.display = this.isBlockMode ? 'block' : 'none';
        }

        if (btn) {
            btn.classList.toggle('active', this.isBlockMode);
            btn.innerHTML = this.isBlockMode 
                ? '<i class="fas fa-eye-slash"></i> 隐藏解析区块'
                : '<i class="fas fa-eye"></i> 显示解析区块';
        }

        if (this.isBlockMode) {
            this.renderBlocks();
        }
    }

    /**
     * 更新结构化内容列表
     */
    updateStructuredContent() {
        const container = document.getElementById('ocr-structured-content');
        if (!container) return;

        container.innerHTML = '';

        if (this.ocrBlocks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>暂无结构化内容</p>
                    <p class="sub">请先上传文件并进行OCR解析</p>
                </div>
            `;
            return;
        }

        // 按页码和位置排序
        const sortedBlocks = [...this.ocrBlocks].sort((a, b) => {
            if (a.pageIndex !== b.pageIndex) {
                return a.pageIndex - b.pageIndex;
            }
            return a.bbox?.lt[1] - b.bbox?.lt[1] || 0;
        });

        sortedBlocks.forEach(block => {
            const item = this.createStructuredItem(block);
            container.appendChild(item);
        });
    }

    /**
     * 创建结构化内容项
     */
    createStructuredItem(block) {
        const item = document.createElement('div');
        item.className = `ocr-content-item type-${block.type}`;
        item.dataset.blockId = block.id;

        const typeIcon = this.getBlockTypeIcon(block.type);
        const typeLabel = this.getBlockTypeLabel(block.type);
        const previewText = this.getBlockPreviewText(block);

        item.innerHTML = `
            <div class="content-item-header">
                <span class="content-type-badge ${block.type}">
                    <i class="${typeIcon}"></i> ${typeLabel}
                </span>
                <span class="content-page">第${block.pageIndex}页</span>
            </div>
            <div class="content-item-body">
                ${previewText}
            </div>
            <div class="content-item-actions">
                <button class="btn-icon" title="复制" data-action="copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" title="翻译" data-action="translate">
                    <i class="fas fa-language"></i>
                </button>
                <button class="btn-icon" title="提问" data-action="ask">
                    <i class="fas fa-comment-dots"></i>
                </button>
            </div>
        `;

        // 点击选中
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.content-item-actions')) {
                this.selectBlock(block);
                this.scrollToBlock(block.id);
            }
        });

        // 操作按钮
        item.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
        });

        item.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
        });

        item.querySelector('[data-action="ask"]').addEventListener('click', () => {
            this.askAboutBlock(block);
        });

        return item;
    }

    /**
     * 获取区块类型图标
     */
    getBlockTypeIcon(type) {
        const icons = {
            text: 'fas fa-align-left',
            table: 'fas fa-table',
            formula: 'fas fa-square-root-alt',
            image: 'fas fa-image',
            title: 'fas fa-heading',
            header: 'fas fa-header',
            footer: 'fas fa-shoe-prints',
            reference: 'fas fa-quote-right'
        };
        return icons[type] || 'fas fa-square';
    }

    /**
     * 获取区块预览文本
     */
    getBlockPreviewText(block) {
        let text = '';

        switch (block.type) {
            case 'text':
            case 'title':
            case 'header':
            case 'footer':
            case 'reference':
                text = block.text || '无文本内容';
                break;
            case 'table':
                text = block.text || '[表格内容]';
                break;
            case 'formula':
                text = block.latex || block.text || '[公式]';
                break;
            case 'image':
                text = block.caption || '[图片]';
                break;
            default:
                text = block.text || '无内容';
        }

        // 截断长文本
        if (text.length > 200) {
            text = text.substring(0, 200) + '...';
        }

        return text;
    }

    /**
     * 高亮结构化列表中的项
     */
    highlightStructuredItem(blockId) {
        document.querySelectorAll('.ocr-content-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.blockId === blockId) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    /**
     * 滚动到指定区块
     */
    scrollToBlock(blockId) {
        const block = this.ocrBlocks.find(b => b.id === blockId);
        if (!block) return;

        // 如果区块不在当前页，先切换页面
        if (block.pageIndex !== window.pdfOCRCore?.currentPage) {
            window.pdfOCRCore?.goToPage(block.pageIndex);
        }

        // 重新渲染区块（页面切换后）
        setTimeout(() => {
            this.renderBlocks();

            // 高亮区块
            const overlay = this.blockOverlays.get(blockId);
            if (overlay) {
                overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
                overlay.classList.add('flash');
                setTimeout(() => overlay.classList.remove('flash'), 1000);
            }
        }, 100);
    }

    /**
     * 显示区块详情
     */
    showBlockDetails(block) {
        const detailsPanel = document.getElementById('ocr-block-details');
        if (!detailsPanel) return;

        const typeLabel = this.getBlockTypeLabel(block.type);
        const fullText = this.getBlockFullText(block);

        detailsPanel.innerHTML = `
            <div class="block-details-header">
                <span class="block-type-badge ${block.type}">${typeLabel}</span>
                <span class="block-page">第${block.pageIndex}页</span>
            </div>
            <div class="block-details-content">
                <div class="detail-section">
                    <label>内容</label>
                    <div class="detail-text">${fullText}</div>
                </div>
                ${block.latex ? `
                <div class="detail-section">
                    <label>LaTeX</label>
                    <code class="detail-code">${block.latex}</code>
                </div>
                ` : ''}
                ${block.html ? `
                <div class="detail-section">
                    <label>HTML</label>
                    <code class="detail-code">${block.html.substring(0, 500)}${block.html.length > 500 ? '...' : ''}</code>
                </div>
                ` : ''}
            </div>
            <div class="block-details-actions">
                <button class="btn btn-sm btn-primary" data-action="copy">
                    <i class="fas fa-copy"></i> 复制
                </button>
                <button class="btn btn-sm btn-secondary" data-action="translate">
                    <i class="fas fa-language"></i> 翻译
                </button>
            </div>
        `;

        // 绑定按钮事件
        detailsPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
        });

        detailsPanel.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
        });
    }

    /**
     * 获取区块完整文本
     */
    getBlockFullText(block) {
        switch (block.type) {
            case 'table':
                return block.text || block.html || '无表格内容';
            case 'formula':
                return block.latex || block.text || '无公式内容';
            default:
                return block.text || '无文本内容';
        }
    }

    /**
     * 复制区块内容
     */
    async copyBlockContent(block) {
        const text = this.getBlockFullText(block);
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('内容已复制到剪贴板');
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('内容已复制到剪贴板');
        }
    }

    /**
     * 翻译区块
     */
    translateBlock(block) {
        const text = this.getBlockFullText(block);
        const targetLang = document.getElementById('ocr-translate-target')?.value || 'zh';

        // 触发翻译事件
        this.emit('translateBlock', { block, text, targetLang });

        // 切换到翻译标签页
        const translateTab = document.querySelector('[data-tab="translation"]');
        if (translateTab) {
            translateTab.click();
        }

        // 填充翻译输入
        const sourceInput = document.getElementById('ocr-translate-source');
        if (sourceInput) {
            sourceInput.value = text;
        }
    }

    /**
     * 对区块提问
     */
    askAboutBlock(block) {
        const text = this.getBlockFullText(block);
        const context = `关于以下内容：\n\n${text}\n\n`;

        // 触发提问事件
        this.emit('askAboutBlock', { block, context });

        // 切换到AI问答标签页
        const chatTab = document.querySelector('[data-tab="chat"]');
        if (chatTab) {
            chatTab.click();
        }

        // 聚焦输入框
        const chatInput = document.getElementById('ocr-chat-input');
        if (chatInput) {
            chatInput.value = context;
            chatInput.focus();
        }
    }

    /**
     * 显示区块右键菜单
     */
    showBlockContextMenu(event, block) {
        // 移除现有菜单
        document.querySelectorAll('.ocr-context-menu').forEach(menu => menu.remove());

        const menu = document.createElement('div');
        menu.className = 'ocr-context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        menu.innerHTML = `
            <div class="menu-item" data-action="copy">
                <i class="fas fa-copy"></i> 复制内容
            </div>
            <div class="menu-item" data-action="translate">
                <i class="fas fa-language"></i> 翻译
            </div>
            <div class="menu-item" data-action="ask">
                <i class="fas fa-comment-dots"></i> 提问
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="select">
                <i class="fas fa-check-circle"></i> 选中
            </div>
        `;

        menu.querySelector('[data-action="copy"]').addEventListener('click', () => {
            this.copyBlockContent(block);
            menu.remove();
        });

        menu.querySelector('[data-action="translate"]').addEventListener('click', () => {
            this.translateBlock(block);
            menu.remove();
        });

        menu.querySelector('[data-action="ask"]').addEventListener('click', () => {
            this.askAboutBlock(block);
            menu.remove();
        });

        menu.querySelector('[data-action="select"]').addEventListener('click', () => {
            this.selectBlock(block);
            menu.remove();
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const stats = {
            total: this.ocrBlocks.length,
            text: this.ocrBlocks.filter(b => b.type === 'text').length,
            table: this.ocrBlocks.filter(b => b.type === 'table').length,
            formula: this.ocrBlocks.filter(b => b.type === 'formula').length,
            image: this.ocrBlocks.filter(b => b.type === 'image').length
        };

        // 更新UI
        const elements = {
            'ocr-stat-total': stats.total,
            'ocr-stat-text': stats.text,
            'ocr-stat-table': stats.table,
            'ocr-stat-formula': stats.formula,
            'ocr-stat-image': stats.image
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        return stats;
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `ocr-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // 动画显示
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 事件发射器
     */
    emit(eventName, data) {
        const event = new CustomEvent(`pdfocr:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * 监听事件
     */
    on(eventName, callback) {
        document.addEventListener(`pdfocr:${eventName}`, (e) => callback(e.detail));
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.ocrBlocks = [];
        this.selectedBlock = null;
        this.highlightedBlock = null;
        this.blockOverlays.clear();

        // 清空UI
        const container = document.getElementById('ocr-blocks-layer');
        if (container) container.innerHTML = '';

        const contentContainer = document.getElementById('ocr-structured-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <p>暂无结构化内容</p>
                    <p class="sub">请先上传文件并进行OCR解析</p>
                </div>
            `;
        }

        const detailsPanel = document.getElementById('ocr-block-details');
        if (detailsPanel) {
            detailsPanel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>点击解析区块查看详情</p>
                </div>
            `;
        }

        // 重置统计
        this.updateStatistics();
    }
}

// 创建全局实例
window.pdfOCRViewer = new PDFOCRViewer();

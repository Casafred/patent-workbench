/**
 * Prompt Forum Module
 * 
 * This module provides the prompt sharing forum functionality.
 */

const PromptForum = (function() {
    let isOpen = false;
    let currentView = 'list';
    let currentPromptId = null;
    let categories = [];
    let currentPage = 1;
    let currentFilters = {
        category_id: null,
        sort_by: 'latest',
        keyword: ''
    };
    
    function init() {
        loadCategories();
        createForumModal();
        bindEvents();
    }
    
    function createForumModal() {
        const modal = document.createElement('div');
        modal.id = 'prompt_forum_modal';
        modal.className = 'forum-modal';
        modal.innerHTML = `
            <div class="forum-modal-content">
                <div class="forum-header">
                    <h2><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg> 提示词广场</h2>
                    <div class="forum-header-actions">
                        <button id="forum_my_prompts_btn" class="forum-header-btn" title="我的发布">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </button>
                        <button id="forum_my_favorites_btn" class="forum-header-btn" title="我的收藏">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </button>
                        <button id="forum_close_btn" class="forum-close-btn" title="关闭">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="forum-body">
                    <div id="forum_list_view" class="forum-view active">
                        <div class="forum-sidebar">
                            <div class="forum-search">
                                <input type="text" id="forum_search_input" placeholder="搜索提示词...">
                                <button id="forum_search_btn" class="forum-search-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </button>
                            </div>
                            <div class="forum-categories">
                                <h4>分类</h4>
                                <ul id="forum_categories_list"></ul>
                            </div>
                            <div class="forum-sort">
                                <h4>排序</h4>
                                <select id="forum_sort_select">
                                    <option value="latest">最新发布</option>
                                    <option value="hottest">最多浏览</option>
                                    <option value="most_favorites">最多收藏</option>
                                    <option value="most_imports">最多导入</option>
                                </select>
                            </div>
                            <button id="forum_publish_btn" class="forum-publish-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                发布提示词
                            </button>
                        </div>
                        <div class="forum-main">
                            <div id="forum_prompts_container" class="forum-prompts-grid"></div>
                            <div id="forum_pagination" class="forum-pagination"></div>
                        </div>
                    </div>
                    
                    <div id="forum_detail_view" class="forum-view">
                        <div class="forum-detail-header">
                            <button id="forum_back_btn" class="forum-back-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                返回列表
                            </button>
                        </div>
                        <div id="forum_detail_content" class="forum-detail-content"></div>
                        <div id="forum_comments_section" class="forum-comments-section"></div>
                    </div>
                    
                    <div id="forum_publish_view" class="forum-view">
                        <div class="forum-detail-header">
                            <button id="forum_publish_back_btn" class="forum-back-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                返回列表
                            </button>
                        </div>
                        <div id="forum_publish_form" class="forum-publish-form"></div>
                    </div>
                    
                    <div id="forum_user_view" class="forum-view">
                        <div class="forum-detail-header">
                            <button id="forum_user_back_btn" class="forum-back-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                返回列表
                            </button>
                            <h3 id="forum_user_title"></h3>
                        </div>
                        <div id="forum_user_content" class="forum-user-content"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    function bindEvents() {
        document.getElementById('forum_close_btn').addEventListener('click', close);
        document.getElementById('forum_back_btn').addEventListener('click', () => showView('list'));
        document.getElementById('forum_publish_back_btn').addEventListener('click', () => showView('list'));
        document.getElementById('forum_user_back_btn').addEventListener('click', () => showView('list'));
        document.getElementById('forum_publish_btn').addEventListener('click', () => showPublishForm());
        document.getElementById('forum_my_prompts_btn').addEventListener('click', () => showUserPrompts());
        document.getElementById('forum_my_favorites_btn').addEventListener('click', () => showUserFavorites());
        
        document.getElementById('forum_search_btn').addEventListener('click', () => {
            currentFilters.keyword = document.getElementById('forum_search_input').value.trim();
            currentPage = 1;
            loadPrompts();
        });
        
        document.getElementById('forum_search_input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentFilters.keyword = e.target.value.trim();
                currentPage = 1;
                loadPrompts();
            }
        });
        
        document.getElementById('forum_sort_select').addEventListener('change', (e) => {
            currentFilters.sort_by = e.target.value;
            currentPage = 1;
            loadPrompts();
        });
        
        document.getElementById('prompt_forum_modal').addEventListener('click', (e) => {
            if (e.target.id === 'prompt_forum_modal') {
                close();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });
    }
    
    async function loadCategories() {
        try {
            const response = await fetch('/api/prompts/categories');
            const data = await response.json();
            if (data.success) {
                categories = data.data.categories;
                renderCategories();
            }
        } catch (error) {
            console.error('加载分类失败:', error);
        }
    }
    
    function renderCategories() {
        const container = document.getElementById('forum_categories_list');
        let html = `<li class="forum-category-item ${!currentFilters.category_id ? 'active' : ''}" data-id="">全部</li>`;
        
        categories.forEach(cat => {
            const categoryIcon = getCategoryIcon(cat.name);
            html += `<li class="forum-category-item ${currentFilters.category_id === cat.id ? 'active' : ''}" data-id="${cat.id}">
                <span class="category-icon">${categoryIcon}</span>
                <span class="category-name">${cat.name}</span>
            </li>`;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.forum-category-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                currentFilters.category_id = id ? parseInt(id) : null;
                currentPage = 1;
                loadPrompts();
                container.querySelectorAll('.forum-category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    function getCategoryIcon(name) {
        const icons = {
            '专利检索': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
            '权利要求': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            '说明书': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
            '附图标记': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            '智能分类': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
            '其他': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
        };
        return icons[name] || icons['其他'];
    }
    
    async function loadPrompts() {
        const container = document.getElementById('forum_prompts_container');
        container.innerHTML = '<div class="forum-loading">加载中...</div>';
        
        try {
            const params = new URLSearchParams({
                page: currentPage,
                per_page: 20,
                sort_by: currentFilters.sort_by
            });
            
            if (currentFilters.category_id) {
                params.append('category_id', currentFilters.category_id);
            }
            if (currentFilters.keyword) {
                params.append('keyword', currentFilters.keyword);
            }
            
            const response = await fetch(`/api/prompts?${params}`);
            const data = await response.json();
            
            if (data.success) {
                renderPrompts(data.data.prompts);
                renderPagination(data.data);
            } else {
                container.innerHTML = '<div class="forum-empty">加载失败，请重试</div>';
            }
        } catch (error) {
            console.error('加载提示词列表失败:', error);
            container.innerHTML = '<div class="forum-empty">加载失败，请重试</div>';
        }
    }
    
    function renderPrompts(prompts) {
        const container = document.getElementById('forum_prompts_container');
        
        if (!prompts || prompts.length === 0) {
            container.innerHTML = '<div class="forum-empty">暂无提示词</div>';
            return;
        }
        
        let html = '';
        prompts.forEach(prompt => {
            const timeAgo = getTimeAgo(prompt.created_at);
            html += `
                <div class="forum-prompt-card" data-id="${prompt.id}">
                    <div class="prompt-card-header">
                        <span class="prompt-category">${prompt.category_icon ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>` : ''} ${prompt.category_name || '未分类'}</span>
                        ${prompt.is_featured ? '<span class="prompt-featured">精选</span>' : ''}
                    </div>
                    <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
                    <p class="prompt-desc">${escapeHtml(prompt.description || '暂无描述')}</p>
                    <div class="prompt-meta">
                        <span class="prompt-author">@${prompt.author_username}</span>
                        <span class="prompt-time">${timeAgo}</span>
                    </div>
                    <div class="prompt-stats">
                        <span title="浏览"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${prompt.view_count}</span>
                        <span title="点赞"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${prompt.like_count}</span>
                        <span title="收藏"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ${prompt.favorite_count}</span>
                        <span title="导入"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${prompt.import_count}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.forum-prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                showPromptDetail(parseInt(card.dataset.id));
            });
        });
    }
    
    function renderPagination(data) {
        const container = document.getElementById('forum_pagination');
        
        if (data.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (data.page > 1) {
            html += `<button class="forum-page-btn" data-page="${data.page - 1}">上一页</button>`;
        }
        
        const startPage = Math.max(1, data.page - 2);
        const endPage = Math.min(data.total_pages, data.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="forum-page-btn ${i === data.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (data.page < data.total_pages) {
            html += `<button class="forum-page-btn" data-page="${data.page + 1}">下一页</button>`;
        }
        
        container.innerHTML = html;
        
        container.querySelectorAll('.forum-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                loadPrompts();
            });
        });
    }
    
    async function showPromptDetail(promptId) {
        currentPromptId = promptId;
        showView('detail');
        
        const container = document.getElementById('forum_detail_content');
        container.innerHTML = '<div class="forum-loading">加载中...</div>';
        
        try {
            const response = await fetch(`/api/prompts/${promptId}`);
            const data = await response.json();
            
            if (data.success) {
                renderPromptDetail(data.data);
                loadComments(promptId);
            } else {
                container.innerHTML = '<div class="forum-empty">提示词不存在</div>';
            }
        } catch (error) {
            console.error('加载提示词详情失败:', error);
            container.innerHTML = '<div class="forum-empty">加载失败</div>';
        }
    }
    
    function renderPromptDetail(prompt) {
        const container = document.getElementById('forum_detail_content');
        const timeAgo = getTimeAgo(prompt.created_at);
        
        let tagsHtml = '';
        if (prompt.tags && prompt.tags.length > 0) {
            tagsHtml = prompt.tags.map(tag => `<span class="prompt-tag">${escapeHtml(tag)}</span>`).join('');
        }
        
        container.innerHTML = `
            <div class="prompt-detail-header">
                <h2>${escapeHtml(prompt.title)}</h2>
                <div class="prompt-detail-meta">
                    <span class="prompt-category">${prompt.category_icon ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>` : ''} ${prompt.category_name || '未分类'}</span>
                    <span class="prompt-author">@${prompt.author_username}</span>
                    <span class="prompt-time">${timeAgo}</span>
                </div>
                ${tagsHtml ? `<div class="prompt-tags">${tagsHtml}</div>` : ''}
            </div>
            
            ${prompt.description ? `
            <div class="prompt-detail-section">
                <h4>描述</h4>
                <p>${escapeHtml(prompt.description)}</p>
            </div>
            ` : ''}
            
            <div class="prompt-detail-section">
                <div class="prompt-content-header">
                    <h4>提示词内容</h4>
                    <button class="forum-copy-btn" onclick="PromptForum.copyPrompt()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        复制
                    </button>
                </div>
                <pre class="prompt-content">${escapeHtml(prompt.content)}</pre>
            </div>
            
            ${prompt.target_feature === 'feature_5' && prompt.output_fields ? `
            <div class="prompt-detail-section">
                <h4>输出字段</h4>
                <div class="output-fields">
                    ${Array.isArray(prompt.output_fields) ? prompt.output_fields.map(f => `
                        <div class="output-field">
                            <span class="field-name">${escapeHtml(f.name)}</span>
                            <span class="field-desc">${escapeHtml(f.description || '')}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
            ` : ''}
            
            <div class="prompt-detail-actions">
                <button class="forum-action-btn ${prompt.is_liked ? 'liked' : ''}" id="prompt_like_btn" onclick="PromptForum.toggleLike()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${prompt.is_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span id="prompt_like_count">${prompt.like_count}</span>
                </button>
                <button class="forum-action-btn ${prompt.is_favorited ? 'favorited' : ''}" id="prompt_favorite_btn" onclick="PromptForum.toggleFavorite()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${prompt.is_favorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span id="prompt_favorite_count">${prompt.favorite_count}</span>
                </button>
                <button class="forum-action-btn import-btn" onclick="PromptForum.importPrompt()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    导入使用
                </button>
            </div>
            
            <div class="prompt-detail-stats">
                <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${prompt.view_count} 次浏览</span>
                <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${prompt.import_count} 次导入</span>
            </div>
        `;
        
        window.currentPromptData = prompt;
    }
    
    async function loadComments(promptId) {
        const container = document.getElementById('forum_comments_section');
        
        try {
            const response = await fetch(`/api/prompts/${promptId}/comments`);
            const data = await response.json();
            
            if (data.success) {
                renderComments(data.data.comments);
            }
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    }
    
    function renderComments(comments) {
        const container = document.getElementById('forum_comments_section');
        
        let html = `
            <div class="comments-header">
                <h4>评论 (${comments.length})</h4>
            </div>
            <div class="comment-form">
                <textarea id="comment_input" placeholder="写下你的评论..." rows="3"></textarea>
                <button onclick="PromptForum.submitComment()" class="forum-submit-btn">发表评论</button>
            </div>
            <div class="comments-list">
        `;
        
        if (comments.length === 0) {
            html += '<div class="no-comments">暂无评论</div>';
        } else {
            comments.forEach(comment => {
                html += `
                    <div class="comment-item">
                        <div class="comment-meta">
                            <span class="comment-author">@${comment.author_username}</span>
                            <span class="comment-time">${getTimeAgo(comment.created_at)}</span>
                        </div>
                        <p class="comment-content">${escapeHtml(comment.content)}</p>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    function showPublishForm() {
        showView('publish');
        
        const container = document.getElementById('forum_publish_form');
        
        let categoryOptions = categories.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
        
        container.innerHTML = `
            <h3>发布新提示词</h3>
            <form id="prompt_publish_form" onsubmit="return PromptForum.submitPrompt(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label>标题 *</label>
                        <input type="text" id="prompt_title" required maxlength="100" placeholder="给提示词起个名字">
                    </div>
                    <div class="form-group">
                        <label>分类 *</label>
                        <select id="prompt_category" required>
                            <option value="">选择分类</option>
                            ${categoryOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>导入到 *</label>
                        <select id="prompt_target_feature" onchange="PromptForum.onTargetFeatureChange()">
                            <option value="feature_1">💬 即时聊天 - 作为对话角色</option>
                            <option value="feature_5">📦 批量处理 - 作为分析模板</option>
                            <option value="feature_7">📝 文本分析 - 复制使用</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>标签</label>
                        <input type="text" id="prompt_tags" placeholder="多个标签用逗号分隔">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>描述</label>
                    <textarea id="prompt_description" rows="2" placeholder="简单描述这个提示词的用途和效果"></textarea>
                </div>
                
                <div class="form-group">
                    <label>提示词内容 *</label>
                    <textarea id="prompt_content" required rows="6" placeholder="输入提示词内容，可使用 {{INPUT}} 作为输入占位符"></textarea>
                </div>
                
                <div id="feature_5_options" class="feature-options" style="display: none;">
                    <h4>批量处理选项</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>推荐模型</label>
                            <select id="prompt_model">
                                <option value="GLM-4-Flash">GLM-4-Flash（快速）</option>
                                <option value="GLM-4-Plus">GLM-4-Plus（均衡）</option>
                                <option value="GLM-4-Long">GLM-4-Long（长文本）</option>
                                <option value="qwen-plus">Qwen-Plus</option>
                                <option value="qwen-max">Qwen-Max</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>温度: <span id="temperature_value">0.1</span></label>
                            <input type="range" id="prompt_temperature" min="0" max="1" step="0.1" value="0.1">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>输出字段（可选）</label>
                        <div id="output_fields_container">
                            <div class="output-field-row">
                                <input type="text" class="field-name-input" placeholder="字段名">
                                <input type="text" class="field-desc-input" placeholder="字段描述">
                                <button type="button" class="remove-field-btn" onclick="PromptForum.removeOutputField(this)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                            </div>
                        </div>
                        <button type="button" class="add-field-btn" onclick="PromptForum.addOutputField()">+ 添加字段</button>
                    </div>
                </div>
                
                <div class="form-notice">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 发布后需经管理员审核才能公开显示
                </div>
                
                <div class="form-actions">
                    <button type="button" class="forum-cancel-btn" onclick="PromptForum.showView('list')">取消</button>
                    <button type="submit" class="forum-submit-btn">提交审核</button>
                </div>
            </form>
        `;
        
        document.getElementById('prompt_temperature').addEventListener('input', (e) => {
            document.getElementById('temperature_value').textContent = e.target.value;
        });
    }
    
    function onTargetFeatureChange() {
        const feature = document.getElementById('prompt_target_feature').value;
        const options = document.getElementById('feature_5_options');
        options.style.display = feature === 'feature_5' ? 'block' : 'none';
    }
    
    function addOutputField() {
        const container = document.getElementById('output_fields_container');
        const row = document.createElement('div');
        row.className = 'output-field-row';
        row.innerHTML = `
            <input type="text" class="field-name-input" placeholder="字段名">
            <input type="text" class="field-desc-input" placeholder="字段描述">
            <button type="button" class="remove-field-btn" onclick="PromptForum.removeOutputField(this)">删除</button>
        `;
        container.appendChild(row);
    }
    
    function removeOutputField(btn) {
        const container = document.getElementById('output_fields_container');
        if (container.children.length > 1) {
            btn.parentElement.remove();
        }
    }
    
    async function submitPrompt(event) {
        event.preventDefault();
        
        const title = document.getElementById('prompt_title').value.trim();
        const content = document.getElementById('prompt_content').value.trim();
        const categoryId = document.getElementById('prompt_category').value;
        
        if (!title || !content || !categoryId) {
            alert('请填写必填项');
            return false;
        }
        
        const data = {
            title,
            content,
            category_id: parseInt(categoryId),
            description: document.getElementById('prompt_description').value.trim(),
            target_feature: document.getElementById('prompt_target_feature').value,
            tags: document.getElementById('prompt_tags').value.split(',').map(t => t.trim()).filter(t => t)
        };
        
        if (data.target_feature === 'feature_5') {
            data.model = document.getElementById('prompt_model').value;
            data.temperature = parseFloat(document.getElementById('prompt_temperature').value);
            
            const outputFields = [];
            document.querySelectorAll('.output-field-row').forEach(row => {
                const name = row.querySelector('.field-name-input').value.trim();
                const desc = row.querySelector('.field-desc-input').value.trim();
                if (name) {
                    outputFields.push({ name, description: desc });
                }
            });
            data.output_fields = outputFields;
        }
        
        try {
            const response = await fetch('/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('提示词已提交，等待审核');
                showView('list');
                loadPrompts();
            } else {
                alert(result.message || '提交失败');
            }
        } catch (error) {
            console.error('提交失败:', error);
            alert('提交失败，请重试');
        }
        
        return false;
    }
    
    async function submitComment() {
        const input = document.getElementById('comment_input');
        const content = input.value.trim();
        
        if (!content) {
            alert('请输入评论内容');
            return;
        }
        
        try {
            const response = await fetch(`/api/prompts/${currentPromptId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('评论已提交，等待审核');
                input.value = '';
            } else {
                alert(result.message || '评论失败');
            }
        } catch (error) {
            console.error('评论失败:', error);
            alert('评论失败，请重试');
        }
    }
    
    async function toggleLike() {
        try {
            const response = await fetch(`/api/prompts/${currentPromptId}/like`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const btn = document.getElementById('prompt_like_btn');
                const countSpan = document.getElementById('prompt_like_count');
                const svg = btn.querySelector('svg');
                
                btn.classList.toggle('liked', result.data.is_liked);
                svg.setAttribute('fill', result.data.is_liked ? 'currentColor' : 'none');
                countSpan.textContent = result.data.like_count;
            }
        } catch (error) {
            console.error('操作失败:', error);
        }
    }
    
    async function toggleFavorite() {
        try {
            const response = await fetch(`/api/prompts/${currentPromptId}/favorite`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const btn = document.getElementById('prompt_favorite_btn');
                const countSpan = document.getElementById('prompt_favorite_count');
                const svg = btn.querySelector('svg');
                
                btn.classList.toggle('favorited', result.data.is_favorited);
                svg.setAttribute('fill', result.data.is_favorited ? 'currentColor' : 'none');
                countSpan.textContent = result.data.favorite_count;
            }
        } catch (error) {
            console.error('操作失败:', error);
        }
    }
    
    async function importPrompt() {
        if (!window.currentPromptData) return;
        
        const prompt = window.currentPromptData;
        
        try {
            await fetch(`/api/prompts/${currentPromptId}/import`, { method: 'POST' });
        } catch (error) {
            console.error('记录导入失败:', error);
        }
        
        const feature = prompt.target_feature;
        
        if (feature === 'feature_1') {
            importToFeature1(prompt);
        } else if (feature === 'feature_5') {
            importToFeature5(prompt);
        } else {
            copyToClipboard(prompt.content);
            alert('提示词已复制到剪贴板');
        }
        
        close();
    }
    
    function importToFeature1(prompt) {
        const persona = {
            id: `imported_${prompt.id}_${Date.now()}`,
            name: prompt.title,
            system: prompt.content,
            userTemplate: '',
            isCustom: true
        };
        
        if (window.appState && window.appState.chat && window.appState.chat.personas) {
            window.appState.chat.personas[persona.id] = persona;
            
            if (typeof window.savePersonas === 'function') {
                window.savePersonas();
            } else if (window.userCacheStorage) {
                window.userCacheStorage.setJSON('chatPersonas', window.appState.chat.personas);
            }
            
            if (typeof window.updatePersonaSelector === 'function') {
                window.updatePersonaSelector();
            }
            
            alert(`提示词「${prompt.title}」已导入到即时聊天角色`);
            
            const instantChatTab = document.querySelector('[data-tab="instant-chat"]');
            if (instantChatTab) {
                instantChatTab.click();
            }
        } else {
            copyToClipboard(prompt.content);
            alert('提示词已复制到剪贴板，请手动添加到聊天角色');
        }
    }
    
    function importToFeature5(prompt) {
        if (window.UnifiedBatch && window.UnifiedBatch.template) {
            const templateData = {
                name: prompt.title,
                systemPrompt: prompt.content,
                userPromptTemplate: '{{INPUT}}',
                model: prompt.model || 'GLM-4.7-Flash',
                temperature: prompt.temperature || 0.1,
                outputFields: prompt.output_fields || []
            };
            
            const result = window.UnifiedBatch.template.importTemplate(templateData);
            
            if (result.success) {
                alert(`提示词「${prompt.title}」已导入到批量处理模板`);
                
                const unifiedBatchTab = document.querySelector('[data-tab="unified-batch"]');
                if (unifiedBatchTab) {
                    unifiedBatchTab.click();
                }
            } else {
                alert(result.message || '导入失败');
            }
        } else {
            copyToClipboard(prompt.content);
            alert('提示词已复制到剪贴板，请手动添加到处理模板');
        }
    }
    
    function copyPrompt() {
        if (window.currentPromptData) {
            copyToClipboard(window.currentPromptData.content);
            alert('已复制到剪贴板');
        }
    }
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('复制失败:', err);
        });
    }
    
    async function showUserPrompts() {
        showView('user');
        document.getElementById('forum_user_title').textContent = '我的发布';
        
        const container = document.getElementById('forum_user_content');
        container.innerHTML = '<div class="forum-loading">加载中...</div>';
        
        try {
            const response = await fetch('/api/prompts/user/mine');
            const data = await response.json();
            
            if (data.success) {
                renderUserPrompts(data.data.prompts);
            }
        } catch (error) {
            console.error('加载失败:', error);
            container.innerHTML = '<div class="forum-empty">加载失败</div>';
        }
    }
    
    async function showUserFavorites() {
        showView('user');
        document.getElementById('forum_user_title').textContent = '我的收藏';
        
        const container = document.getElementById('forum_user_content');
        container.innerHTML = '<div class="forum-loading">加载中...</div>';
        
        try {
            const response = await fetch('/api/prompts/user/favorites');
            const data = await response.json();
            
            if (data.success) {
                renderUserPrompts(data.data.prompts, true);
            }
        } catch (error) {
            console.error('加载失败:', error);
            container.innerHTML = '<div class="forum-empty">加载失败</div>';
        }
    }
    
    function renderUserPrompts(prompts, isFavorite = false) {
        const container = document.getElementById('forum_user_content');
        
        if (!prompts || prompts.length === 0) {
            container.innerHTML = '<div class="forum-empty">暂无内容</div>';
            return;
        }
        
        let html = '<div class="forum-prompts-grid">';
        
        prompts.forEach(prompt => {
            const statusClass = prompt.status === 'approved' ? 'status-approved' : 
                               prompt.status === 'pending' ? 'status-pending' : 'status-rejected';
            const statusText = prompt.status === 'approved' ? '已审核' : 
                              prompt.status === 'pending' ? '待审核' : '已拒绝';
            
            html += `
                <div class="forum-prompt-card" data-id="${prompt.id}">
                    <div class="prompt-card-header">
                        <span class="prompt-category">${prompt.category_name || '未分类'}</span>
                        ${!isFavorite ? `<span class="prompt-status ${statusClass}">${statusText}</span>` : ''}
                    </div>
                    <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
                    <p class="prompt-desc">${escapeHtml(prompt.description || '暂无描述')}</p>
                    <div class="prompt-meta">
                        <span class="prompt-time">${getTimeAgo(isFavorite ? prompt.favorited_at : prompt.created_at)}</span>
                    </div>
                    <div class="prompt-stats">
                        <span title="浏览"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${prompt.view_count}</span>
                        <span title="点赞"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${prompt.like_count}</span>
                        <span title="收藏"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> ${prompt.favorite_count}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        container.querySelectorAll('.forum-prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                showPromptDetail(parseInt(card.dataset.id));
            });
        });
    }
    
    function showView(view) {
        currentView = view;
        
        document.querySelectorAll('.forum-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`forum_${view}_view`).classList.add('active');
        
        if (view === 'list') {
            loadPrompts();
        }
    }
    
    function open() {
        if (!document.getElementById('prompt_forum_modal')) {
            init();
        }
        
        document.getElementById('prompt_forum_modal').classList.add('open');
        document.body.style.overflow = 'hidden';
        isOpen = true;
        showView('list');
    }
    
    function close() {
        const modal = document.getElementById('prompt_forum_modal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            isOpen = false;
        }
    }
    
    function getTimeAgo(dateStr) {
        if (!dateStr) return '';
        
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 30) return `${days}天前`;
        
        return date.toLocaleDateString('zh-CN');
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return {
        init,
        open,
        close,
        showView,
        toggleLike,
        toggleFavorite,
        importPrompt,
        copyPrompt,
        submitPrompt,
        submitComment,
        onTargetFeatureChange,
        addOutputField,
        removeOutputField
    };
})();

window.PromptForum = PromptForum;

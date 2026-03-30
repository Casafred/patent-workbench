/**
 * Notification Center Module
 * 通知中心模块
 */
(function() {
    'use strict';
    
    window.NotificationCenter = {
        data: {
            announcements: [],
            updates: null
        },

        init: function() {
            console.log('[NotificationCenter] 初始化通知中心...');
            var bellBtn = document.getElementById('notification_center_btn');
            if (bellBtn) {
                bellBtn.onclick = this.open.bind(this);
                console.log('[NotificationCenter] 铃铛按钮事件绑定成功');
                this.loadData();
            } else {
                console.warn('[NotificationCenter] 铃铛按钮未找到，将在header组件加载后重试');
            }
        },

        open: function() {
            console.log('[NotificationCenter] 打开通知中心');
            var modal = document.getElementById('notification_center_modal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                this.loadData();
            } else {
                console.error('[NotificationCenter] 模态框未找到');
            }
        },

        close: function() {
            var modal = document.getElementById('notification_center_modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        },

        switchTab: function(tabName) {
            document.querySelectorAll('.notification-center-tab').forEach(function(tab) {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            document.getElementById('announcements_tab').style.display = tabName === 'announcements' ? 'block' : 'none';
            document.getElementById('updates_tab').style.display = tabName === 'updates' ? 'block' : 'none';
        },

        loadData: async function() {
            try {
                var self = this;
                var response = await fetch('/api/admin/notifications');
                var result = await response.json();
                
                if (result.success) {
                    self.data.announcements = result.data.global_announcements || [];
                    self.data.updates = result.data.login_notifications?.[0] || null;
                    
                    self.renderAnnouncements();
                    self.renderUpdates();
                    self.updateLastUpdateTime(result.data.last_updated);
                }
            } catch (error) {
                console.error('[NotificationCenter] 加载通知数据失败:', error);
                var announcementsList = document.getElementById('announcements_list');
                if (announcementsList) {
                    announcementsList.innerHTML = '<div class="notification-empty-state"><p>加载失败，请稍后重试</p></div>';
                }
            }
        },

        renderAnnouncements: function() {
            var self = this;
            var container = document.getElementById('announcements_list');
            if (!container) return;
            
            var announcements = this.data.announcements.filter(function(a) { return a.is_active; });
            
            if (announcements.length === 0) {
                container.innerHTML = '<div class="notification-empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg><p>暂无公告</p></div>';
                return;
            }
            
            var html = announcements.map(function(a) {
                return '<div class="notification-item-card priority-' + (a.priority || 'medium') + '">' +
                    '<div class="notification-item-header">' +
                    '<h4 class="notification-item-title">' + self.escapeHtml(a.title) + '</h4>' +
                    '<span class="notification-item-date">' + (a.created_at || '') + '</span>' +
                    '</div>' +
                    '<div class="notification-item-content">' + self.escapeHtml(a.message) + '</div>' +
                    '</div>';
            }).join('');
            
            container.innerHTML = html;
        },

        renderUpdates: function() {
            var container = document.getElementById('updates_list');
            if (!container) return;
            
            var update = this.data.updates;
            
            if (!update) {
                container.innerHTML = '<div class="notification-empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path></svg><p>暂无更新日志</p></div>';
                return;
            }
            
            var self = this;
            var html = '<div class="notification-item-card">' +
                '<div class="notification-item-header">' +
                '<h4 class="notification-item-title">' + this.escapeHtml(update.title) + '</h4>' +
                '<span class="notification-item-date">v' + this.escapeHtml(update.version || '1.0.0') + ' · ' + (update.created_at || '') + '</span>' +
                '</div></div>';
            
            if (update.content && Array.isArray(update.content)) {
                update.content.forEach(function(section) {
                    html += '<div class="update-section">' +
                        '<div class="update-section-title">' + self.getSectionIcon(section.section) + self.escapeHtml(section.section) + '</div>' +
                        '<ul class="update-list">' +
                        section.items.map(function(item) {
                            return '<li class="update-list-item"><span class="update-list-icon ' + self.getItemClass(section.section) + '">' + self.getItemIcon(section.section) + '</span><span>' + self.escapeHtml(item) + '</span></li>';
                        }).join('') +
                        '</ul></div>';
                });
            }
            
            container.innerHTML = html;
        },

        getSectionIcon: function(section) {
            var icons = {
                '新增功能': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
                '功能改进': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path></svg>',
                '开发中功能': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"></path></svg>'
            };
            return icons[section] || '';
        },

        getItemClass: function(section) {
            var classes = {
                '新增功能': 'new',
                '功能改进': 'improved',
                '开发中功能': 'developing'
            };
            return classes[section] || 'new';
        },

        getItemIcon: function(section) {
            var icons = {
                '新增功能': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
                '功能改进': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
                '开发中功能': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
            };
            return icons[section] || '';
        },

        updateLastUpdateTime: function(lastUpdated) {
            var el = document.getElementById('notification_last_update');
            if (el && lastUpdated) {
                el.textContent = '最后更新: ' + lastUpdated;
            }
        },

        escapeHtml: function(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    window.closeNotificationCenter = function() {
        window.NotificationCenter.close();
    };

    window.switchNotificationCenterTab = function(tabName) {
        window.NotificationCenter.switchTab(tabName);
    };

    console.log('[NotificationCenter] 模块加载完成');
})();

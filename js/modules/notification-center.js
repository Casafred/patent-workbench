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
            document.getElementById('settings_tab').style.display = tabName === 'settings' ? 'block' : 'none';
            
            if (tabName === 'settings') {
                this.loadWecomSettings();
            }
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
        },

        loadWecomSettings: async function() {
            var container = document.getElementById('wecom-settings-container');
            if (!container) return;

            try {
                var response = await fetch('/api/wecom/bind/status');
                var result = await response.json();

                if (!result.success) {
                    container.innerHTML = this.getWecomUnavailableHTML();
                    return;
                }

                var data = result.data;

                if (data.bound) {
                    container.innerHTML = this.getWecomBoundHTML(data);
                    this.bindWecomEvents();
                } else {
                    container.innerHTML = this.getWecomUnboundHTML();
                    this.bindWecomBindEvents();
                }
            } catch (error) {
                console.error('[NotificationCenter] 加载企业微信设置失败:', error);
                container.innerHTML = '<div class="notification-empty-state"><p>加载失败，请刷新重试</p></div>';
            }
        },

        getWecomUnavailableHTML: function() {
            return '<div class="wecom-status-card wecom-status-unavailable">' +
                '<div class="wecom-status-icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '</div>' +
                '<div class="wecom-status-text">' +
                '<span class="wecom-status-title">企业微信服务未开启</span>' +
                '<span class="wecom-status-desc">请联系管理员配置企业微信服务</span>' +
                '</div>' +
                '</div>';
        },

        getWecomBoundHTML: function(data) {
            return '<div class="wecom-status-card wecom-status-bound">' +
                '<div class="wecom-status-header">' +
                '<div class="wecom-status-icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
                '</div>' +
                '<div class="wecom-status-text">' +
                '<span class="wecom-status-title">已绑定企业微信</span>' +
                '<span class="wecom-status-desc">账号: ' + this.escapeHtml(data.wecom_userid) + '</span>' +
                '</div>' +
                '</div>' +
                '<div class="wecom-notification-options">' +
                '<h4>通知偏好设置</h4>' +
                '<div class="wecom-option-item"><label><input type="checkbox" id="wecom-notify-batch" ' + (data.notify_batch !== false ? 'checked' : '') + '><span>批量任务完成通知</span></label></div>' +
                '<div class="wecom-option-item"><label><input type="checkbox" id="wecom-notify-ocr" ' + (data.notify_ocr !== false ? 'checked' : '') + '><span>OCR解析完成通知</span></label></div>' +
                '<div class="wecom-option-item"><label><input type="checkbox" id="wecom-notify-system" ' + (data.notify_system !== false ? 'checked' : '') + '><span>系统公告通知</span></label></div>' +
                '</div>' +
                '<div class="wecom-actions-row">' +
                '<button class="wecom-btn wecom-btn-test" id="wecom-test-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>发送测试</button>' +
                '<button class="wecom-btn wecom-btn-unbind" id="wecom-unbind-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M6 6L18 18"/></svg>解除绑定</button>' +
                '</div>' +
                '</div>';
        },

        getWecomUnboundHTML: function() {
            return '<div class="wecom-status-card wecom-status-unbound">' +
                '<div class="wecom-status-header">' +
                '<div class="wecom-status-icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
                '</div>' +
                '<div class="wecom-status-text">' +
                '<span class="wecom-status-title">未绑定企业微信</span>' +
                '<span class="wecom-status-desc">绑定后可接收任务完成通知</span>' +
                '</div>' +
                '</div>' +
                '<div class="wecom-bind-methods">' +
                '<div class="wecom-bind-method">' +
                '<div class="wecom-method-header"><span class="wecom-method-icon">📱</span><span class="wecom-method-title">扫码绑定</span><span class="wecom-method-badge">推荐</span></div>' +
                '<button class="wecom-btn wecom-btn-primary" id="wecom-qrcode-btn">显示绑定二维码</button>' +
                '</div>' +
                '<div class="wecom-bind-divider"><span>或</span></div>' +
                '<div class="wecom-bind-method">' +
                '<div class="wecom-method-header"><span class="wecom-method-icon">✏️</span><span class="wecom-method-title">手动输入</span></div>' +
                '<div class="wecom-manual-bind"><input type="text" id="wecom-userid-input" placeholder="输入企业微信账号"><button class="wecom-btn wecom-btn-secondary" id="wecom-manual-bind-btn">绑定</button></div>' +
                '<span class="wecom-hint">账号在企业微信通讯录中查看</span>' +
                '</div>' +
                '</div>' +
                '</div>';
        },

        bindWecomEvents: function() {
            var self = this;
            var testBtn = document.getElementById('wecom-test-btn');
            var unbindBtn = document.getElementById('wecom-unbind-btn');
            var checkboxes = document.querySelectorAll('.wecom-notification-options input[type="checkbox"]');

            testBtn?.addEventListener('click', async function() {
                testBtn.disabled = true;
                testBtn.innerHTML = '<span class="wecom-loading"></span> 发送中...';
                
                try {
                    var response = await fetch('/api/wecom/test', { method: 'POST' });
                    var result = await response.json();
                    
                    if (result.success) {
                        testBtn.innerHTML = '✓ 已发送';
                        setTimeout(function() {
                            testBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>发送测试';
                        }, 2000);
                    } else {
                        alert(result.error || '发送失败');
                        testBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>发送测试';
                    }
                } catch (error) {
                    alert('网络错误');
                    testBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>发送测试';
                } finally {
                    testBtn.disabled = false;
                }
            });

            unbindBtn?.addEventListener('click', async function() {
                if (!confirm('确定要解除企业微信绑定吗？')) return;
                
                try {
                    var response = await fetch('/api/wecom/unbind', { method: 'POST' });
                    var result = await response.json();
                    
                    if (result.success) {
                        self.loadWecomSettings();
                    } else {
                        alert(result.error || '解绑失败');
                    }
                } catch (error) {
                    alert('网络错误');
                }
            });

            checkboxes.forEach(function(checkbox) {
                checkbox.addEventListener('change', async function(e) {
                    var notifyType = e.target.id.replace('wecom-notify-', '');
                    var enabled = e.target.checked;
                    
                    try {
                        await fetch('/api/wecom/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ['notify_' + notifyType]: enabled })
                        });
                    } catch (error) {
                        e.target.checked = !enabled;
                    }
                });
            });
        },

        bindWecomBindEvents: function() {
            var self = this;
            var qrcodeBtn = document.getElementById('wecom-qrcode-btn');
            var manualBindBtn = document.getElementById('wecom-manual-bind-btn');
            var useridInput = document.getElementById('wecom-userid-input');

            qrcodeBtn?.addEventListener('click', async function() {
                try {
                    var response = await fetch('/api/wecom/bind/qrcode');
                    var result = await response.json();
                    
                    if (result.success) {
                        var qrcodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(result.data.qrcode_url);
                        
                        var modal = document.createElement('div');
                        modal.className = 'wecom-qrcode-modal';
                        modal.innerHTML = '<div class="wecom-qrcode-overlay"></div>' +
                            '<div class="wecom-qrcode-content">' +
                            '<div class="wecom-qrcode-header"><h3>扫码绑定企业微信</h3><button class="wecom-qrcode-close">&times;</button></div>' +
                            '<div class="wecom-qrcode-body"><img src="' + qrcodeUrl + '" alt="绑定二维码"><p>使用企业微信App扫描二维码</p>' +
                            '<p class="wecom-qrcode-countdown">有效期: <span id="wecom-countdown">5:00</span></p></div>' +
                            '</div>';
                        
                        document.body.appendChild(modal);
                        
                        modal.querySelector('.wecom-qrcode-close').onclick = function() { modal.remove(); };
                        modal.querySelector('.wecom-qrcode-overlay').onclick = function() { modal.remove(); };
                        
                        var remaining = result.data.expires_in;
                        var countdownEl = modal.querySelector('#wecom-countdown');
                        var timer = setInterval(function() {
                            remaining--;
                            var mins = Math.floor(remaining / 60);
                            var secs = remaining % 60;
                            countdownEl.textContent = mins + ':' + secs.toString().padStart(2, '0');
                            
                            if (remaining <= 0) {
                                clearInterval(timer);
                                modal.remove();
                                alert('二维码已过期');
                            }
                        }, 1000);
                        
                        modal.querySelector('.wecom-qrcode-close').onclick = function() {
                            clearInterval(timer);
                            modal.remove();
                        };
                    } else {
                        alert(result.error || '生成二维码失败');
                    }
                } catch (error) {
                    alert('网络错误');
                }
            });

            manualBindBtn?.addEventListener('click', async function() {
                var userid = useridInput.value.trim();
                if (!userid) {
                    alert('请输入企业微信账号');
                    return;
                }
                
                manualBindBtn.disabled = true;
                manualBindBtn.textContent = '绑定中...';
                
                try {
                    var response = await fetch('/api/wecom/bind/manual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wecom_userid: userid })
                    });
                    
                    var result = await response.json();
                    
                    if (result.success) {
                        self.loadWecomSettings();
                    } else {
                        alert(result.error || '绑定失败');
                        manualBindBtn.textContent = '绑定';
                    }
                } catch (error) {
                    alert('网络错误');
                    manualBindBtn.textContent = '绑定';
                } finally {
                    manualBindBtn.disabled = false;
                }
            });
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

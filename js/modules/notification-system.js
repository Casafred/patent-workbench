/**
 * 通知公告系统前端模块
 * 
 * 功能：
 * 1. 登录后一次性通知展示
 * 2. 全局公告横幅展示
 * 3. 通知状态管理
 */

class NotificationSystem {
    constructor() {
        this.initialized = false;
        this.loginNotificationShown = false;
        this.dismissedAnnouncements = new Set();
        this.apiBase = '/api';
    }

    async init() {
        if (this.initialized) return;

        await this.loadDismissedAnnouncements();
        await this.checkAndShowLoginNotification();
        await this.checkAndShowGlobalAnnouncements();

        this.initialized = true;
    }

    async loadDismissedAnnouncements() {
        try {
            const response = await fetch(`${this.apiBase}/announcements/global/dismissed`);
            const result = await response.json();
            if (result.success) {
                this.dismissedAnnouncements = new Set(result.data.dismissed);
            }
        } catch (error) {
            console.error('加载已关闭公告状态失败:', error);
        }
    }

    async checkAndShowLoginNotification() {
        try {
            const response = await fetch(`${this.apiBase}/notifications/login`);
            const result = await response.json();

            if (result.success && result.data.has_notification) {
                this.showLoginNotification(result.data.notification);
            }
        } catch (error) {
            console.error('检查登录通知失败:', error);
        }
    }

    async checkAndShowGlobalAnnouncements() {
        try {
            const response = await fetch(`${this.apiBase}/announcements/global`);
            const result = await response.json();

            if (result.success && result.data.announcements.length > 0) {
                const visibleAnnouncements = result.data.announcements.filter(
                    a => !this.dismissedAnnouncements.has(a.id)
                );

                if (visibleAnnouncements.length > 0) {
                    this.showGlobalAnnouncement(visibleAnnouncements[0]);
                }
            }
        } catch (error) {
            console.error('检查全局公告失败:', error);
        }
    }

    showLoginNotification(notification) {
        if (this.loginNotificationShown) return;
        this.loginNotificationShown = true;

        const modal = document.createElement('div');
        modal.className = 'login-notification-modal';
        modal.id = 'login-notification-modal';

        const headerClass = notification.type || 'welcome';
        const headerIcon = this.getHeaderIcon(notification.type);

        modal.innerHTML = `
            <div class="login-notification-content">
                <div class="notification-header ${headerClass}">
                    <div class="notification-header-icon">
                        ${headerIcon}
                    </div>
                    <h2 class="notification-header-title">${notification.title}</h2>
                    <div class="notification-header-version">版本 ${notification.version}</div>
                    <div class="notification-header-date">${notification.created_at}</div>
                </div>
                <div class="notification-body">
                    ${this.renderNotificationContent(notification.content)}
                </div>
                <div class="notification-footer">
                    <button class="notification-confirm-btn" id="notification-confirm-btn">
                        我已阅读
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('#notification-confirm-btn');
        confirmBtn.addEventListener('click', () => {
            this.markLoginNotificationAsRead(notification.version);
            this.closeLoginNotification();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeLoginNotification();
            }
        });
    }

    renderNotificationContent(content) {
        if (!content || !Array.isArray(content)) {
            return '<p>暂无更新内容</p>';
        }

        return content.map(section => `
            <div class="notification-section">
                <h3 class="notification-section-title">
                    ${this.getSectionIcon(section.section)}
                    ${section.section}
                </h3>
                <ul class="notification-list">
                    ${section.items.map(item => `
                        <li class="notification-list-item">
                            <span class="notification-list-icon ${this.getItemClass(section.section)}">
                                ${this.getItemIcon(section.section)}
                            </span>
                            <span>${item}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }

    getHeaderIcon(type) {
        const icons = {
            welcome: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>`,
            update: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>`,
            important: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>`
        };
        return icons[type] || icons.welcome;
    }

    getSectionIcon(section) {
        const icons = {
            '新增功能': `<svg class="notification-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>`,
            '功能改进': `<svg class="notification-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>`,
            '开发中功能': `<svg class="notification-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>`
        };
        return icons[section] || '';
    }

    getItemClass(section) {
        const classes = {
            '新增功能': 'new',
            '功能改进': 'improved',
            '开发中功能': 'developing'
        };
        return classes[section] || 'new';
    }

    getItemIcon(section) {
        const icons = {
            '新增功能': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>`,
            '功能改进': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>`,
            '开发中功能': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>`
        };
        return icons[section] || '';
    }

    async markLoginNotificationAsRead(version) {
        try {
            await fetch(`${this.apiBase}/notifications/login/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ version })
            });
        } catch (error) {
            console.error('标记通知已读失败:', error);
        }
    }

    closeLoginNotification() {
        const modal = document.getElementById('login-notification-modal');
        if (modal) {
            modal.style.animation = 'fadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                modal.remove();
            }, 200);
        }
    }

    showGlobalAnnouncement(announcement) {
        const existingBanner = document.querySelector('.global-announcement-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.className = `global-announcement-banner priority-${announcement.priority}`;
        banner.id = `announcement-${announcement.id}`;

        const iconClass = announcement.priority || 'medium';

        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-icon ${iconClass}">
                    ${this.getAnnouncementIcon(announcement.type)}
                </div>
                <div class="banner-text">
                    <div class="banner-title">${announcement.title}</div>
                    <div class="banner-message">${announcement.message}</div>
                    ${announcement.start_time ? `
                        <div class="banner-details">
                            ${announcement.start_time ? `
                                <span class="banner-detail-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    开始: ${announcement.start_time}
                                </span>
                            ` : ''}
                            ${announcement.duration ? `
                                <span class="banner-detail-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    时长: ${announcement.duration}
                                </span>
                            ` : ''}
                            ${announcement.impact ? `
                                <span class="banner-detail-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" y1="16" x2="12" y2="12"/>
                                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                                    </svg>
                                    影响: ${announcement.impact}
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            <button class="banner-close" aria-label="已知晓">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>已知晓</span>
            </button>
        `;

        document.body.insertBefore(banner, document.body.firstChild);

        const closeBtn = banner.querySelector('.banner-close');
        closeBtn.addEventListener('click', () => {
            this.dismissAnnouncement(announcement.id);
        });

        this.adjustPageContent(true);
    }

    getAnnouncementIcon(type) {
        const icons = {
            maintenance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`
        };
        return icons[type] || icons.info;
    }

    async dismissAnnouncement(announcementId) {
        try {
            await fetch(`${this.apiBase}/announcements/global/dismiss`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: announcementId })
            });

            this.dismissedAnnouncements.add(announcementId);

            const banner = document.getElementById(`announcement-${announcementId}`);
            if (banner) {
                banner.style.animation = 'slideDown 0.3s ease-out reverse';
                setTimeout(() => {
                    banner.remove();
                    this.adjustPageContent(false);
                }, 300);
            }
        } catch (error) {
            console.error('关闭公告失败:', error);
        }
    }

    adjustPageContent(hasBanner) {
        const header = document.querySelector('.header');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (hasBanner) {
            const banner = document.querySelector('.global-announcement-banner');
            if (banner) {
                const bannerHeight = banner.offsetHeight;
                if (header) header.style.top = `${bannerHeight}px`;
                if (sidebar) sidebar.style.top = `${bannerHeight}px`;
                if (mainContent) mainContent.style.paddingTop = `${bannerHeight}px`;
            }
        } else {
            if (header) header.style.top = '0';
            if (sidebar) sidebar.style.top = '0';
            if (mainContent) mainContent.style.paddingTop = '0';
        }
    }
}

const notificationSystem = new NotificationSystem();

export default notificationSystem;
export { NotificationSystem };

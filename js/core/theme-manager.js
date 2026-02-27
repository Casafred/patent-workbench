/**
 * Theme Manager - 主题切换管理器
 * 支持亮色/暗色模式切换
 */

(function() {
    'use strict';

    const THEME_KEY = 'patent-workbench-theme';
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };

    let currentTheme = THEMES.LIGHT;

    const ThemeManager = {
        init: function() {
            this.loadTheme();
            this.applyTheme(currentTheme);
            this.bindToggleButton();
            console.log('[ThemeManager] 初始化完成，当前主题:', currentTheme);
        },

        loadTheme: function() {
            const savedTheme = localStorage.getItem(THEME_KEY);
            if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
                currentTheme = savedTheme;
            } else {
                currentTheme = THEMES.LIGHT;
            }
        },

        saveTheme: function(theme) {
            localStorage.setItem(THEME_KEY, theme);
        },

        applyTheme: function(theme) {
            const root = document.documentElement;
            
            if (theme === THEMES.DARK) {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.removeAttribute('data-theme');
            }

            this.updateVantaBackground(theme);
            this.updateToggleButtonIcon();
            this.updateLogo(theme);
            
            console.log('[ThemeManager] 应用主题:', theme);
        },

        updateLogo: function(theme) {
            const logoImg = document.querySelector('.image-logo');
            if (logoImg) {
                if (theme === THEMES.DARK) {
                    logoImg.src = 'frontend/Images/dark_logo.webp';
                } else {
                    logoImg.src = 'frontend/Images/ALFRED X IP LOGO.webp';
                }
            }
        },

        updateVantaBackground: function(theme) {
            if (typeof VANTA === 'undefined' || !VANTA.current) {
                return;
            }

            try {
                const vantaInstance = VANTA.current;
                if (theme === THEMES.DARK) {
                    vantaInstance.setOptions({
                        backgroundColor: 0x0f172a,
                        color: 0x22c55e
                    });
                } else {
                    vantaInstance.setOptions({
                        backgroundColor: 0xf0fdf4,
                        color: 0x4ade80
                    });
                }
            } catch (e) {
                console.warn('[ThemeManager] 更新Vanta背景失败:', e);
            }
        },

        updateToggleButtonIcon: function() {
            const btn = document.getElementById('theme_toggle_btn');
            if (!btn) return;
            
            const sunIcon = btn.querySelector('.sun-icon');
            const moonIcon = btn.querySelector('.moon-icon');
            
            if (sunIcon && moonIcon) {
                if (currentTheme === THEMES.DARK) {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                } else {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                }
            }
        },

        setTheme: function(theme) {
            if (!Object.values(THEMES).includes(theme)) {
                console.warn('[ThemeManager] 无效的主题:', theme);
                return;
            }

            currentTheme = theme;
            this.saveTheme(theme);
            this.applyTheme(theme);
        },

        toggleTheme: function() {
            if (currentTheme === THEMES.DARK) {
                this.setTheme(THEMES.LIGHT);
            } else {
                this.setTheme(THEMES.DARK);
            }
        },

        bindToggleButton: function() {
            const btn = document.getElementById('theme_toggle_btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleTheme();
                });
                console.log('[ThemeManager] 已绑定主题切换按钮');
            } else {
                console.warn('[ThemeManager] 未找到主题切换按钮');
            }
        },

        getCurrentTheme: function() {
            return currentTheme;
        },

        isDark: function() {
            return currentTheme === THEMES.DARK;
        }
    };

    function initOnDOMReady() {
        ThemeManager.init();
    }

    function initAfterHeaderLoaded() {
        ThemeManager.bindToggleButton();
        ThemeManager.updateToggleButtonIcon();
        ThemeManager.updateLogo(currentTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnDOMReady);
    } else {
        initOnDOMReady();
    }

    document.addEventListener('headercomponentLoaded', initAfterHeaderLoaded);

    window.ThemeManager = ThemeManager;

})();

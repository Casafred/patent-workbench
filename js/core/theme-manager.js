/**
 * Theme Manager - 主题切换管理器
 * 支持亮色/暗色/跟随系统三种模式
 */

(function() {
    'use strict';

    const THEME_KEY = 'patent-workbench-theme';
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system'
    };

    let currentTheme = THEMES.LIGHT;
    let mediaQuery = null;

    const ThemeManager = {
        init: function() {
            this.loadTheme();
            this.setupMediaQuery();
            this.applyTheme(currentTheme);
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

        setupMediaQuery: function() {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                if (currentTheme === THEMES.SYSTEM) {
                    this.applyTheme(THEMES.SYSTEM);
                }
            });
        },

        getSystemTheme: function() {
            return mediaQuery && mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
        },

        getEffectiveTheme: function(theme) {
            if (theme === THEMES.SYSTEM) {
                return this.getSystemTheme();
            }
            return theme;
        },

        applyTheme: function(theme) {
            const effectiveTheme = this.getEffectiveTheme(theme);
            const root = document.documentElement;
            
            if (effectiveTheme === THEMES.DARK) {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.removeAttribute('data-theme');
            }

            this.updateVantaBackground(effectiveTheme);
            this.updateToggleButtonIcon(theme);
            
            console.log('[ThemeManager] 应用主题:', theme, '(有效主题:', effectiveTheme, ')');
        },

        updateVantaBackground: function(effectiveTheme) {
            if (typeof VANTA === 'undefined' || !VANTA.current) {
                return;
            }

            try {
                const vantaInstance = VANTA.current;
                if (effectiveTheme === THEMES.DARK) {
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

        updateToggleButtonIcon: function(theme) {
            const buttons = document.querySelectorAll('.theme-toggle-btn');
            buttons.forEach(btn => {
                const sunIcon = btn.querySelector('.sun-icon');
                const moonIcon = btn.querySelector('.moon-icon');
                
                if (sunIcon && moonIcon) {
                    const effectiveTheme = this.getEffectiveTheme(theme);
                    if (effectiveTheme === THEMES.DARK) {
                        sunIcon.style.display = 'none';
                        moonIcon.style.display = 'block';
                    } else {
                        sunIcon.style.display = 'block';
                        moonIcon.style.display = 'none';
                    }
                }
            });
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
            const effectiveTheme = this.getEffectiveTheme(currentTheme);
            
            if (effectiveTheme === THEMES.DARK) {
                this.setTheme(THEMES.LIGHT);
            } else {
                this.setTheme(THEMES.DARK);
            }
        },

        cycleTheme: function() {
            const themeOrder = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];
            const currentIndex = themeOrder.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % themeOrder.length;
            this.setTheme(themeOrder[nextIndex]);
        },

        getCurrentTheme: function() {
            return currentTheme;
        },

        getEffectiveThemeDisplay: function() {
            return this.getEffectiveTheme(currentTheme);
        },

        isDark: function() {
            return this.getEffectiveTheme(currentTheme) === THEMES.DARK;
        }
    };

    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'theme-toggle-btn';
        button.title = '切换主题';
        button.innerHTML = `
            <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;

        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            ThemeManager.toggleTheme();
        });

        return button;
    }

    function injectToggleButton() {
        const existingButton = document.querySelector('.theme-toggle-btn');
        if (existingButton) {
            return;
        }

        const headerRight = document.querySelector('.app-header .api-config-section');
        if (headerRight) {
            const button = createToggleButton();
            button.style.marginRight = '10px';
            headerRight.insertBefore(button, headerRight.firstChild);
            ThemeManager.updateToggleButtonIcon(currentTheme);
            console.log('[ThemeManager] 主题切换按钮已注入到header');
            return;
        }

        const header = document.querySelector('.app-header');
        if (header) {
            const button = createToggleButton();
            button.style.position = 'absolute';
            button.style.right = '100px';
            button.style.top = '50%';
            button.style.transform = 'translateY(-50%)';
            header.style.position = 'relative';
            header.appendChild(button);
            ThemeManager.updateToggleButtonIcon(currentTheme);
            console.log('[ThemeManager] 主题切换按钮已注入到header（备用位置）');
        }
    }

    function initOnDOMReady() {
        ThemeManager.init();
        
        setTimeout(() => {
            injectToggleButton();
        }, 100);

        document.addEventListener('headercomponentLoaded', function() {
            setTimeout(injectToggleButton, 50);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnDOMReady);
    } else {
        initOnDOMReady();
    }

    window.ThemeManager = ThemeManager;
    window.createThemeToggleButton = createToggleButton;

})();

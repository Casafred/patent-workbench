/**
 * 功能锁定遮罩模块
 * 负责检查被锁定的功能并显示遮罩层
 */

window.FeatureLockManager = {
    lockedFeatures: [],
    lockMessage: '功能优化升级中，暂不开放使用，如有需求请在公众号联系',
    qrCodeUrl: '/frontend/images/QRcode.jpg',
    
    init: async function() {
        try {
            await this.fetchLockStatus();
            this.applyLocks();
            console.log('🔒 功能锁定模块初始化完成');
        } catch (error) {
            console.warn('⚠️ 功能锁定模块初始化失败:', error);
        }
    },
    
    fetchLockStatus: async function() {
        try {
            const response = await fetch('/api/feature-lock/status');
            const data = await response.json();
            
            if (data.success) {
                this.lockedFeatures = data.locked_features || [];
                this.lockMessage = data.lock_message || this.lockMessage;
            }
        } catch (error) {
            console.warn('获取功能锁定状态失败:', error);
            this.lockedFeatures = [];
        }
    },
    
    applyLocks: function() {
        if (this.lockedFeatures.length === 0) {
            console.log('🔓 没有被锁定的功能');
            return;
        }
        
        console.log('🔒 被锁定的功能:', this.lockedFeatures);
        
        this.lockedFeatures.forEach(featureId => {
            this.applyLockToFeature(featureId);
        });
    },
    
    applyLockToFeature: function(featureId) {
        const tabContent = document.getElementById(`${featureId}-tab`);
        if (!tabContent) {
            console.warn(`⚠️ 未找到功能页: ${featureId}`);
            return;
        }
        
        if (tabContent.querySelector('.feature-lock-overlay')) {
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'feature-lock-overlay';
        overlay.innerHTML = `
            <div class="feature-lock-content">
                <div class="feature-lock-icon">🔒</div>
                <div class="feature-lock-title">功能暂时锁定</div>
                <div class="feature-lock-message">${this.lockMessage}</div>
                <div class="feature-lock-qr">
                    <img src="${this.qrCodeUrl}" alt="公众号二维码">
                    <p>扫码关注「IP智友」公众号</p>
                </div>
            </div>
        `;
        
        tabContent.style.position = 'relative';
        tabContent.appendChild(overlay);
        
        const tabButton = document.querySelector(`.tab-button[data-tab="${featureId}"]`);
        if (tabButton) {
            tabButton.classList.add('feature-locked');
            if (!tabButton.querySelector('.lock-indicator')) {
                const lockIndicator = document.createElement('span');
                lockIndicator.className = 'lock-indicator';
                lockIndicator.textContent = ' 🔒';
                tabButton.appendChild(lockIndicator);
            }
        }
        
        console.log(`🔒 已锁定功能: ${featureId}`);
    },
    
    removeLockFromFeature: function(featureId) {
        const tabContent = document.getElementById(`${featureId}-tab`);
        if (tabContent) {
            const overlay = tabContent.querySelector('.feature-lock-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
        
        const tabButton = document.querySelector(`.tab-button[data-tab="${featureId}"]`);
        if (tabButton) {
            tabButton.classList.remove('feature-locked');
            const lockIndicator = tabButton.querySelector('.lock-indicator');
            if (lockIndicator) {
                lockIndicator.remove();
            }
        }
        
        console.log(`🔓 已解锁功能: ${featureId}`);
    },
    
    refresh: async function() {
        await this.fetchLockStatus();
        
        document.querySelectorAll('.feature-lock-overlay').forEach(overlay => {
            overlay.remove();
        });
        
        document.querySelectorAll('.tab-button.feature-locked').forEach(button => {
            button.classList.remove('feature-locked');
            const lockIndicator = button.querySelector('.lock-indicator');
            if (lockIndicator) {
                lockIndicator.remove();
            }
        });
        
        this.applyLocks();
    },
    
    isLocked: function(featureId) {
        return this.lockedFeatures.includes(featureId);
    }
};

const featureLockStyles = document.createElement('style');
featureLockStyles.textContent = `
    .feature-lock-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: inherit;
    }
    
    .feature-lock-content {
        background: white;
        padding: 40px 50px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        animation: lockFadeIn 0.3s ease-out;
    }
    
    @keyframes lockFadeIn {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    .feature-lock-icon {
        font-size: 48px;
        margin-bottom: 16px;
    }
    
    .feature-lock-title {
        font-size: 20px;
        font-weight: bold;
        color: #374151;
        margin-bottom: 12px;
    }
    
    .feature-lock-message {
        font-size: 15px;
        color: #6B7280;
        line-height: 1.6;
        margin-bottom: 20px;
    }
    
    .feature-lock-qr {
        padding-top: 16px;
        border-top: 1px solid #E5E7EB;
    }
    
    .feature-lock-qr img {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
        margin-bottom: 8px;
    }
    
    .feature-lock-qr p {
        font-size: 13px;
        color: #9CA3AF;
        margin: 0;
    }
    
    .tab-button.feature-locked {
        opacity: 0.7;
        position: relative;
    }
    
    .tab-button.feature-locked::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(239, 68, 68, 0.1) 10px,
            rgba(239, 68, 68, 0.1) 20px
        );
        border-radius: inherit;
        pointer-events: none;
    }
    
    .tab-button .lock-indicator {
        font-size: 12px;
        margin-left: 4px;
    }
`;
document.head.appendChild(featureLockStyles);

console.log('🔒 功能锁定模块已加载');

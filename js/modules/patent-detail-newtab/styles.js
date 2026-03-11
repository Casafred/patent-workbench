window.PatentDetailStyles = {
    getMainStyles: function() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            html {
                zoom: 0.9;
            }
            
            body {
                font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                line-height: 1.7;
                color: #2c3e50;
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                min-height: 100vh;
                padding: 20px;
                padding-left: 85px;
            }
            
            .side-nav {
                position: fixed;
                left: 5px;
                top: 50%;
                transform: translateY(-50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 15px 10px;
                z-index: 1000;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .side-nav-item {
                display: block;
                padding: 10px 15px;
                margin: 5px 0;
                color: #666;
                text-decoration: none;
                border-radius: 8px;
                font-size: 0.85em;
                transition: all 0.3s;
                white-space: nowrap;
            }
            
            .side-nav-item:hover {
                background: #e8f5e9;
                color: #2e7d32;
                transform: translateX(5px);
            }
            
            .side-nav-item.active {
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                color: white;
                font-weight: 600;
            }
            
            .side-nav-item.disabled {
                color: #ccc;
                cursor: not-allowed;
                opacity: 0.6;
            }
            
            .side-nav-item.disabled:hover {
                background: transparent;
                color: #ccc;
                transform: none;
            }
            
            .side-nav::-webkit-scrollbar {
                width: 4px;
            }
            
            .side-nav::-webkit-scrollbar-thumb {
                background: #2e7d32;
                border-radius: 2px;
            }
            
            .side-nav.collapsed {
                left: -180px;
                transition: left 0.3s ease;
            }
            
            .side-nav.collapsed:hover {
                left: 5px;
            }
            
            .nav-trigger {
                position: fixed;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 80px;
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                border-radius: 0 8px 8px 0;
                cursor: pointer;
                z-index: 999;
                display: none;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                box-shadow: 2px 0 10px rgba(0,0,0,0.2);
                transition: width 0.3s ease;
            }
            
            .nav-trigger:hover {
                width: 28px;
            }
            
            .nav-trigger.visible {
                display: flex;
            }
            
            .tab-content {
                display: flex;
                flex-direction: column;
            }
            
            .tab-content .section-actions {
                align-self: flex-end;
            }
            
            .copy-section-btn {
                background: #2e7d32;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85em;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                margin-left: auto;
            }
            
            .copy-section-btn:hover {
                background: #1b5e20;
                transform: translateY(-2px);
                box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);
            }
            
            .copy-section-btn svg {
                width: 14px;
                height: 14px;
            }

            .analyze-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                margin-right: 8px;
            }

            .analyze-btn:hover {
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            }

            .section-actions {
                display: flex;
                gap: 8px;
                margin-left: auto;
            }

            .section-title-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .collapsible-section {
                transition: all 0.3s ease;
            }
            
            .collapsible-section.collapsed .section-content {
                display: none;
            }
            
            .collapsible-section .section-title {
                cursor: pointer;
                user-select: none;
            }
            
            .collapsible-section .section-title::after {
                content: '▼';
                float: right;
                margin-left: 10px;
                transition: transform 0.3s ease;
                font-size: 0.8em;
            }
            
            .collapsible-section.collapsed .section-title::after {
                transform: rotate(-90deg);
            }
            
            .section-content {
                transition: all 0.3s ease;
            }
            
            .section-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                color: white;
                padding: 30px 40px;
                position: relative;
                overflow: visible;
            }
            
            .header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .patent-number {
                font-size: 1.2em;
                font-weight: 300;
                opacity: 0.9;
            }
            
            .patent-title {
                font-size: 1.8em;
                font-weight: 700;
                line-height: 1.4;
                margin-bottom: 15px;
            }
            
            .meta-info {
                display: flex;
                gap: 20px;
                font-size: 0.9em;
                opacity: 0.9;
                flex-wrap: wrap;
            }
            
            .content {
                padding: 40px;
            }
            
            .section {
                margin-bottom: 40px;
                animation: fadeIn 0.6s ease-out;
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .section-title {
                font-size: 1.4em;
                font-weight: 600;
                color: #2e7d32;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 3px solid #2e7d32;
            }
            
            .section-icon {
                font-size: 1.2em;
                line-height: 1;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .info-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 12px;
                border-left: 4px solid #2e7d32;
                transition: all 0.3s;
            }
            
            .info-card:hover {
                transform: translateX(5px);
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
            }
            
            .info-label {
                font-weight: 600;
                color: #2e7d32;
                font-size: 0.9em;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .info-value {
                color: #2c3e50;
                font-size: 1em;
                line-height: 1.6;
            }
            
            .abstract-box {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                padding: 25px;
                border-radius: 12px;
                line-height: 1.8;
                font-size: 1.05em;
                color: #2c3e50;
            }
            
            .claims-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .claim-item {
                background: white;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #e9ecef;
                transition: all 0.3s;
            }
            
            .claim-item:hover {
                border-color: #2e7d32;
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
            }
            
            .claim-item.claim-independent {
                border-color: #2e7d32;
                background: #f1f8f4;
            }
            
            .claim-item.claim-independent:hover {
                border-color: #1b5e20;
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
            }
            
            .claim-item.claim-dependent {
                border-color: #1976d2;
                background: #f5f9fc;
                margin-left: 20px;
            }
            
            .claim-item.claim-dependent:hover {
                border-color: #0d47a1;
                box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2);
            }
            
            .claim-number {
                font-weight: 700;
                color: #2e7d32;
                font-size: 1.1em;
                margin-bottom: 10px;
            }
            
            .claim-text {
                color: #495057;
                line-height: 1.7;
            }
            
            .data-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }
            
            .data-table thead {
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                color: white;
            }
            
            .data-table th {
                padding: 15px;
                text-align: left;
                font-weight: 600;
                font-size: 0.95em;
            }
            
            .data-table td {
                padding: 15px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .data-table tbody tr:hover {
                background: #f8f9fa;
            }
            
            .data-table tbody tr:last-child td {
                border-bottom: none;
            }
            
            .timeline {
                position: relative;
                padding-left: 40px;
            }
            
            .timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 0;
                bottom: 0;
                width: 3px;
                background: linear-gradient(180deg, #2e7d32 0%, #43a047 100%);
            }
            
            .timeline-item {
                position: relative;
                margin-bottom: 25px;
                padding: 20px;
                background: white;
                border-radius: 12px;
                border: 2px solid #e9ecef;
            }
            
            .timeline-item::before {
                content: '';
                position: absolute;
                left: -33px;
                top: 25px;
                width: 13px;
                height: 13px;
                background: #2e7d32;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 3px #2e7d32;
            }
            
            .timeline-date {
                font-weight: 600;
                color: #2e7d32;
                margin-bottom: 8px;
            }
            
            .timeline-title {
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            
            .timeline-type {
                font-size: 0.85em;
                color: #6c757d;
            }
            
            .cpc-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 15px;
            }
            
            .cpc-card {
                background: white;
                padding: 15px;
                border-radius: 10px;
                border: 2px solid #e9ecef;
                transition: all 0.3s;
            }
            
            .cpc-card:hover {
                border-color: #2e7d32;
                transform: translateY(-3px);
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
            }
            
            .cpc-code {
                font-weight: 700;
                color: #2e7d32;
                font-size: 1.1em;
                margin-bottom: 8px;
            }
            
            .cpc-desc {
                font-size: 0.9em;
                color: #6c757d;
                line-height: 1.5;
            }
            
            .tag-list {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .tag {
                padding: 8px 16px;
                background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
                color: white;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: 500;
            }
            
            .link-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .link-card {
                padding: 15px 20px;
                background: white;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                text-decoration: none;
                color: #2e7d32;
                font-weight: 500;
                transition: all 0.3s;
                text-align: center;
                display: block;
            }
            
            .link-card:hover {
                background: #2e7d32;
                color: white;
                transform: translateY(-3px);
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
            }
            
            @media (max-width: 768px) {
                body {
                    padding: 10px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
                .info-grid {
                    grid-template-columns: 1fr;
                }
            }
            
            @media print {
                body {
                    background: white;
                    padding: 0;
                }
                .close-btn {
                    display: none;
                }
            }
        `;
    }
};

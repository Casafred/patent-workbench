(function() {
    const U = window.PatentDetailUtils;
    const S = window.PatentDetailStyles;
    const HB = window.PatentDetailHtmlBuilder;
    const SEC = window.PatentDetailSections;
    const V = window.PatentDetailViewer;
    const M = window.PatentDetailModes;

    function findPatentResult(patentNumber) {
        let patentResult = window.patentResults ? window.patentResults.find(result => result.patent_number === patentNumber) : null;
        
        if (!patentResult && window.patentTabManager) {
            for (const tab of window.patentTabManager.tabs) {
                const result = tab.results.find(r => r.patent_number === patentNumber);
                if (result) {
                    patentResult = result;
                    break;
                }
            }
        }
        
        return patentResult;
    }

    function findAnalysisResult(patentNumber) {
        return window.patentBatchAnalysisResults ? 
            window.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber) : null;
    }

    function buildPageScripts(patentNumber, data) {
        return `
            const pageData = ${U.safeJsonStringify(data)};
            window.pageData = pageData;
            const currentPatentNumber = '${U.safeStr(patentNumber)}';
            
            window.newTabDrawings = ${U.safeJsonStringify(data.drawings || [])};
            
            function scrollToTop(event) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            window.toggleSection = function(eventOrId, sectionId) {
                let section;
                if (typeof eventOrId === 'object' && eventOrId.currentTarget) {
                    section = eventOrId.currentTarget.closest('.collapsible-section');
                } else {
                    sectionId = eventOrId;
                    section = document.querySelector('[data-section-id="' + sectionId + '"]');
                }
                if (section) {
                    section.classList.toggle('collapsed');
                }
            };
            
            window.copySectionContent = function(event, sectionId, sectionName) {
                event.stopPropagation();
                const section = document.querySelector('[data-section-content="' + sectionId + '"]');
                if (!section) return;
                let textToCopy = section.textContent.trim();
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const btn = event.target.closest('.copy-section-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                }).catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制');
                });
            };
            
            window.copyClaimsWithNumbers = function(event) {
                event.stopPropagation();
                const claimItems = document.querySelectorAll('.claim-item');
                if (!claimItems || claimItems.length === 0) return;
                let textToCopy = '';
                claimItems.forEach((item) => {
                    const claimNumber = item.getAttribute('data-claim-number');
                    const claimText = item.getAttribute('data-claim-text');
                    textToCopy += claimNumber + '. ' + claimText + '\\n\\n';
                });
                navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                    const btn = event.target.closest('.copy-section-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                }).catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制');
                });
            };
            
            window.copyFamilyPublicationNumbers = function(event) {
                event.stopPropagation();
                const table = document.getElementById('family-table');
                if (!table) return;
                const rows = table.querySelectorAll('tbody tr');
                const publicationNumbers = [];
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 3 && cells[2].textContent.trim() && cells[2].textContent.trim() !== '-') {
                        publicationNumbers.push(cells[2].textContent.trim());
                    }
                });
                if (publicationNumbers.length === 0) {
                    alert('没有可复制的公开号');
                    return;
                }
                const textToCopy = publicationNumbers.join('\\n');
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const btn = event.target.closest('.copy-section-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制 ' + publicationNumbers.length + ' 个';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                }).catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制');
                });
            };
            
            window.copyPatentNumbersListFromTab = function(event, tabId) {
                event.stopPropagation();
                const tabContent = document.getElementById(tabId);
                if (!tabContent) return;
                const rows = tabContent.querySelectorAll('tbody tr[data-patent-number]');
                const patentNumbers = Array.from(rows).map(row => row.getAttribute('data-patent-number'));
                if (patentNumbers.length === 0) {
                    alert('没有可复制的专利号');
                    return;
                }
                const textToCopy = patentNumbers.join('\\n');
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const btn = event.target.closest('.copy-section-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" style="width:14px;height:14px"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已复制 ' + patentNumbers.length + ' 个';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                }).catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制');
                });
            };
            
            window.switchEventTab = function(tabId) {
                const container = document.querySelector('#events-combined .tab-container');
                if (!container) return;
                container.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.color = '#666';
                    btn.style.borderBottom = '2px solid transparent';
                });
                container.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                const activeBtn = container.querySelector('[data-tab="' + tabId + '"]');
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    activeBtn.style.color = '#2e7d32';
                    activeBtn.style.borderBottom = '2px solid #2e7d32';
                }
                const activeContent = container.querySelector('#' + tabId);
                if (activeContent) {
                    activeContent.style.display = 'block';
                }
            };
            
            window.switchRelatedPatentsTab = function(tabId) {
                const container = document.querySelector('#related-patents .tab-container');
                if (!container) return;
                container.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.color = '#666';
                    btn.style.borderBottom = '2px solid transparent';
                });
                container.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                const activeBtn = container.querySelector('[data-tab="' + tabId + '"]');
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    activeBtn.style.color = '#2e7d32';
                    activeBtn.style.borderBottom = '2px solid #2e7d32';
                }
                const activeContent = container.querySelector('#' + tabId);
                if (activeContent) {
                    activeContent.style.display = 'block';
                }
            };
            
            window.analyzeRelationPatents = function(event, patentNumber, relationType) {
                event.stopPropagation();
                let relationData = [];
                const sectionMap = {
                    'family': 'family-table',
                    'citations': 'citations-table',
                    'cited_by': 'cited-by-table',
                    'similar': 'similar-table'
                };
                const tableId = sectionMap[relationType];
                const table = document.getElementById(tableId);
                if (table) {
                    const rows = table.querySelectorAll('tbody tr');
                    rows.forEach(row => {
                        if (relationType === 'family') {
                            const pubNumber = row.cells[2]?.textContent?.trim();
                            if (pubNumber && pubNumber !== '-') {
                                relationData.push({
                                    publication_number: pubNumber,
                                    application_number: row.cells[0]?.textContent?.trim() || pubNumber,
                                    status: row.cells[1]?.textContent?.trim() || ''
                                });
                            }
                        } else {
                            const patentNum = row.getAttribute('data-patent-number') || row.cells[0]?.textContent?.trim();
                            if (patentNum) {
                                relationData.push({
                                    patent_number: patentNum,
                                    title: row.cells[1]?.textContent?.trim() || ''
                                });
                            }
                        }
                    });
                }
                if (relationData.length === 0) {
                    alert('没有找到相关专利数据');
                    return;
                }
                if (window.opener && window.opener.openRelationAnalysisTab) {
                    window.opener.openRelationAnalysisTab(patentNumber, relationType, relationData);
                    const btn = event.target.closest('.analyze-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 已发送';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                } else {
                    alert('无法连接到主窗口，请确保从主页面打开此详情页');
                }
            };
            
            window.jumpToFamilyComparisonFromNewTab = function(event, patentNumber) {
                event.stopPropagation();
                const familyApps = pageData.family_applications || [];
                let familyPatentNumbers = familyApps.map(app => app.publication_number).filter(num => num && num !== '-');
                if (familyPatentNumbers.length < 2) {
                    alert('同族专利数量不足，需要至少2个同族专利才能进行对比分析');
                    return;
                }
                if (window.opener && window.opener.startFamilyClaimsComparison) {
                    window.opener.startFamilyClaimsComparison(patentNumber, familyPatentNumbers);
                    const btn = event.target.closest('.copy-section-btn');
                    if (btn) {
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = '已发送';
                        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
                    }
                    alert('已跳转到主页面功能四同族对比分析界面，请在主页面查看');
                } else {
                    alert('无法连接到主窗口的同族对比功能，请确保从主页面打开此详情页，并刷新主页面后重试');
                }
            };
            
            var dualColumnMode = false;
            var imageTextMode = false;
            var originalNavCollapsed = false;
            var imageTextViewerIndex = 0;
            var imageTextViewerScale = 1;
            var imageTextViewerRotation = 0;
            var dualColumnLeftColumn = null;
            var dualColumnRightColumn = null;
            
            var sectionTabs = [
                { id: 'basic-info', name: '基本信息', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M3 3h10v1H3V3zm0 3h10v1H3V6zm0 3h10v1H3V9z"/></svg>' },
                { id: 'abstract', name: '摘要', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm0 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6z"/></svg>' },
                { id: 'drawings', name: '附图', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>' },
                { id: 'claims', name: '权利要求', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.72 3.22a.5.5 0 0 1 .656 0l2.744 2.743 1.897-1.897a.5.5 0 0 1 .698.698l-2.318 2.318a.5.5 0 0 1-.168.11l-2.346 1.03a.5.5 0 0 1-.65-.65l1.03-2.346a.5.5 0 0 1 .11-.168l2.318-2.318a.5.5 0 0 1 .698-.698l-1.897 1.897L4.72 3.22z"/><path d="M1 7v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V7H1zm5 0v4h4V7H6z"/></svg>' },
                { id: 'description', name: '说明书', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h2z"/><path d="M1 6v-.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V9h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/></svg>' },
                { id: 'classifications', name: '分类', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>' },
                { id: 'events', name: '事件', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>' },
                { id: 'family', name: '同族', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>' },
                { id: 'related', name: '相关专利', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>' },
                { id: 'analysis', name: 'AI解读', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2H2V7zm3 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H5V10zm5 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1H10v-1z"/></svg>' }
            ];
            
            function handleTabClick(columnId, tabId, clickedBtn) {
                var col = columnId === 'left' ? dualColumnLeftColumn : dualColumnRightColumn;
                if (!col) return;
                
                var section = col.querySelector('[data-section-id="' + tabId + '"]');
                if (!section) section = col.querySelector('#section-' + tabId);
                if (!section) {
                    var sectionByClass = col.querySelector('.section[data-section="' + tabId + '"]');
                    if (sectionByClass) section = sectionByClass;
                }
                
                if (section) {
                    var collapsedContent = section.querySelector('.section-content.collapsed');
                    if (collapsedContent) {
                        collapsedContent.classList.remove('collapsed');
                    }
                    
                    var toggleIcon = section.querySelector('.toggle-icon');
                    if (toggleIcon && toggleIcon.textContent === '▶') {
                        toggleIcon.textContent = '▼';
                    }
                    
                    col.scrollTop = section.offsetTop - 50;
                    
                    var tabBar = document.getElementById('tab-bar-' + columnId);
                    if (tabBar) {
                        var allBtnsInThisBar = tabBar.querySelectorAll('.column-tab-btn');
                        allBtnsInThisBar.forEach(function(b) { 
                            b.classList.remove('active');
                            b.style.background = 'white';
                            b.style.color = '#495057';
                        });
                    }
                    clickedBtn.classList.add('active');
                    clickedBtn.style.background = '#1976d2';
                    clickedBtn.style.color = 'white';
                }
            }
            
            function createColumnTabBar(columnId) {
                var tabBar = document.createElement('div');
                tabBar.className = 'column-tab-bar';
                tabBar.id = 'tab-bar-' + columnId;
                tabBar.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 12px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-bottom: 2px solid #dee2e6; position: sticky; top: 0; z-index: 10; flex-shrink: 0;';
                
                sectionTabs.forEach(function(tab) {
                    var tabBtn = document.createElement('button');
                    tabBtn.className = 'column-tab-btn';
                    tabBtn.setAttribute('data-section', tab.id);
                    tabBtn.setAttribute('data-column', columnId);
                    tabBtn.style.cssText = 'padding: 6px 12px; border: none; background: white; border-radius: 6px; cursor: pointer; font-size: 12px; color: #495057; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap;';
                    tabBtn.innerHTML = tab.icon + ' ' + tab.name;
                    tabBtn.onmouseenter = function() {
                        this.style.background = '#e3f2fd';
                        this.style.color = '#1976d2';
                    };
                    tabBtn.onmouseleave = function() {
                        if (!this.classList.contains('active')) {
                            this.style.background = 'white';
                            this.style.color = '#495057';
                        }
                    };
                    tabBtn.onclick = function() {
                        var col = columnId === 'left' ? dualColumnLeftColumn : dualColumnRightColumn;
                        if (!col) return;
                        
                        var section = null;
                        var selectors = [
                            '[data-section-id="' + tab.id + '"]',
                            '#section-' + tab.id,
                            '.section[data-section="' + tab.id + '"]',
                            '.section[id*="' + tab.id + '"]',
                            '#' + tab.id
                        ];
                        
                        for (var i = 0; i < selectors.length; i++) {
                            section = col.querySelector(selectors[i]);
                            if (section) break;
                        }
                        
                        if (section) {
                            var collapsedContent = section.querySelector('.section-content.collapsed, .section-body.collapsed');
                            if (collapsedContent) {
                                collapsedContent.classList.remove('collapsed');
                            }
                            
                            var toggleIcon = section.querySelector('.toggle-icon');
                            if (toggleIcon && (toggleIcon.textContent === '▶' || toggleIcon.textContent.includes('▶'))) {
                                toggleIcon.textContent = '▼';
                            }
                            
                            var contentDiv = col.querySelector('.dual-column-content');
                            if (contentDiv) {
                                var sectionTop = section.offsetTop;
                                contentDiv.scrollTop = sectionTop - 60;
                            }
                            
                            var allBtnsInThisBar = tabBar.querySelectorAll('.column-tab-btn');
                            for (var j = 0; j < allBtnsInThisBar.length; j++) { 
                                allBtnsInThisBar[j].classList.remove('active');
                                allBtnsInThisBar[j].style.background = 'white';
                                allBtnsInThisBar[j].style.color = '#495057';
                            }
                            this.classList.add('active');
                            this.style.background = '#1976d2';
                            this.style.color = 'white';
                        } else {
                            console.log('Section not found for:', tab.id);
                        }
                    };
                    tabBar.appendChild(tabBtn);
                });
                
                return tabBar;
            }
            
            window.toggleDualColumnMode = function() {
                dualColumnMode = !dualColumnMode;
                var btn = document.getElementById('dual-column-btn');
                var mainContent = document.querySelector('.content');
                var container = document.querySelector('.container');
                var sideNav = document.getElementById('sideNav');
                
                if (!mainContent) return;
                
                if (dualColumnMode) {
                    if (imageTextMode) {
                        window.toggleImageTextMode();
                        dualColumnMode = true;
                    }
                    
                    btn.style.background = 'rgba(255,255,255,0.4)';
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v1h2V2H2zm3 2h2V2H5v2zm3-2v2h2V2H8zm3 2v2h2V4h-2zm0 3v2h2V7h-2zm0 3v2h2v-2h-2zm-3 2v2h2v-2H8zm-3 2v2h2v-2H5zm-3-2v2h2v-2H2zm0-3v2h2V7H2zm0-3v2h2V4H2zm5 0v2h2V4H7zm2 3H7v2h2V7z"/></svg> 退出双栏';
                    
                    if (container) container.style.maxWidth = '1800px';
                    if (sideNav) {
                        originalNavCollapsed = sideNav.classList.contains('collapsed');
                        sideNav.classList.add('collapsed');
                    }
                    
                    var sections = mainContent.querySelectorAll('.section');
                    
                    var dualColumnWrapper = document.createElement('div');
                    dualColumnWrapper.className = 'dual-column-wrapper';
                    dualColumnWrapper.style.cssText = 'display: flex; gap: 20px; padding: 15px;';
                    
                    var leftContainer = document.createElement('div');
                    leftContainer.className = 'dual-column-container';
                    leftContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;';
                    
                    dualColumnLeftColumn = document.createElement('div');
                    dualColumnLeftColumn.className = 'dual-column-left';
                    dualColumnLeftColumn.style.cssText = 'flex: 1; overflow-y: auto; display: flex; flex-direction: column;';
                    
                    var leftTabBar = createColumnTabBar('left');
                    var leftContent = document.createElement('div');
                    leftContent.className = 'dual-column-content';
                    leftContent.style.cssText = 'padding: 15px;';
                    
                    sections.forEach(function(section) {
                        leftContent.appendChild(section.cloneNode(true));
                    });
                    
                    dualColumnLeftColumn.appendChild(leftTabBar);
                    dualColumnLeftColumn.appendChild(leftContent);
                    leftContainer.appendChild(dualColumnLeftColumn);
                    
                    var rightContainer = document.createElement('div');
                    rightContainer.className = 'dual-column-container';
                    rightContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;';
                    
                    dualColumnRightColumn = document.createElement('div');
                    dualColumnRightColumn.className = 'dual-column-right';
                    dualColumnRightColumn.style.cssText = 'flex: 1; overflow-y: auto; display: flex; flex-direction: column;';
                    
                    var rightTabBar = createColumnTabBar('right');
                    var rightContent = document.createElement('div');
                    rightContent.className = 'dual-column-content';
                    rightContent.style.cssText = 'padding: 15px;';
                    
                    sections.forEach(function(section) {
                        rightContent.appendChild(section.cloneNode(true));
                    });
                    
                    dualColumnRightColumn.appendChild(rightTabBar);
                    dualColumnRightColumn.appendChild(rightContent);
                    rightContainer.appendChild(dualColumnRightColumn);
                    
                    mainContent.style.display = 'none';
                    mainContent.parentNode.insertBefore(dualColumnWrapper, mainContent);
                    dualColumnWrapper.appendChild(leftContainer);
                    dualColumnWrapper.appendChild(rightContainer);
                    
                } else {
                    btn.style.background = 'rgba(255,255,255,0.2)';
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v1h2V2H2zm3 2h2V2H5v2zm3-2v2h2V2H8zm3 2v2h2V4h-2zm0 3v2h2V7h-2zm0 3v2h2v-2h-2zm-3 2v2h2v-2H8zm-3 2v2h2v-2H5zm-3-2v2h2v-2H2zm0-3v2h2V7H2zm0-3v2h2V4H2zm5 0v2h2V4H7zm2 3H7v2h2V7z"/></svg> 双栏对照';
                    
                    if (container) container.style.maxWidth = '1200px';
                    if (sideNav && !originalNavCollapsed) sideNav.classList.remove('collapsed');
                    
                    var wrapper = document.querySelector('.dual-column-wrapper');
                    if (wrapper) wrapper.remove();
                    
                    dualColumnLeftColumn = null;
                    dualColumnRightColumn = null;
                    
                    mainContent.style.display = 'block';
                }
            };
            
            window.toggleImageTextMode = function() {
                imageTextMode = !imageTextMode;
                var btn = document.getElementById('image-text-btn');
                var mainContent = document.querySelector('.content');
                var container = document.querySelector('.container');
                var sideNav = document.getElementById('sideNav');
                var drawings = window.newTabDrawings || [];
                
                if (!mainContent) return;
                
                if (drawings.length === 0) {
                    alert('当前专利没有附图，无法使用图文对照模式');
                    imageTextMode = false;
                    return;
                }
                
                if (imageTextMode) {
                    if (dualColumnMode) window.toggleDualColumnMode();
                    
                    btn.style.background = 'rgba(255,255,255,0.4)';
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg> 退出图文';
                    
                    if (container) container.style.maxWidth = '1800px';
                    if (sideNav) {
                        originalNavCollapsed = sideNav.classList.contains('collapsed');
                        sideNav.classList.add('collapsed');
                    }
                    
                    imageTextViewerIndex = 0;
                    imageTextViewerScale = 1;
                    imageTextViewerRotation = 0;
                    
                    var imageTextWrapper = document.createElement('div');
                    imageTextWrapper.className = 'image-text-wrapper';
                    imageTextWrapper.style.cssText = 'display: flex; gap: 20px; padding: 15px; height: calc(100vh - 80px);';
                    
                    var leftColumn = document.createElement('div');
                    leftColumn.className = 'image-text-left';
                    leftColumn.style.cssText = 'flex: 1; overflow-y: auto; padding-right: 10px;';
                    
                    var sections = mainContent.querySelectorAll('.section');
                    sections.forEach(function(section) {
                        leftColumn.appendChild(section.cloneNode(true));
                    });
                    
                    var rightColumn = document.createElement('div');
                    rightColumn.className = 'image-text-right';
                    rightColumn.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: #1a1a1a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
                    
                    var toolbar = document.createElement('div');
                    toolbar.className = 'image-text-toolbar';
                    toolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white;';
                    toolbar.innerHTML = '<div style="display: flex; align-items: center; gap: 10px;"><span id="image-text-counter" style="font-weight: 500; font-size: 14px;">图 1 / ' + drawings.length + '</span></div><div style="display: flex; gap: 8px; align-items: center;"><button onclick="imageTextZoomIn()" title="放大" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">+</button><span id="image-text-zoom" style="min-width: 50px; text-align: center; font-size: 13px;">100%</span><button onclick="imageTextZoomOut()" title="缩小" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">-</button><button onclick="imageTextRotateLeft()" title="向左旋转" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 16px;">↺</button><button onclick="imageTextRotateRight()" title="向右旋转" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 16px;">↻</button><button onclick="imageTextSmartMarker()" title="智能标记" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">智能标记</button></div>';
                    
                    var imageArea = document.createElement('div');
                    imageArea.className = 'image-text-image-area';
                    imageArea.style.cssText = 'flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #0d0d0d;';
                    imageArea.innerHTML = '<button onclick="imageTextPrevImage()" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 28px; z-index: 10; opacity: 0.7;">‹</button><img id="image-text-main-img" src="' + drawings[0] + '" style="max-width: 95%; max-height: 95%; object-fit: contain; transition: transform 0.3s ease; border-radius: 4px;"><button onclick="imageTextNextImage()" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 28px; z-index: 10; opacity: 0.7;">›</button>';
                    
                    var thumbnailArea = document.createElement('div');
                    thumbnailArea.className = 'image-text-thumbnails';
                    thumbnailArea.style.cssText = 'display: flex; gap: 8px; padding: 12px 15px; background: rgba(0,0,0,0.5); overflow-x: auto; justify-content: center; flex-wrap: wrap; max-height: 100px;';
                    thumbnailArea.id = 'image-text-thumbnail-area';
                    
                    drawings.forEach(function(d, i) {
                        var thumb = document.createElement('div');
                        thumb.style.cssText = 'width: 60px; height: 60px; border: 3px solid ' + (i === 0 ? '#4CAF50' : 'transparent') + '; border-radius: 6px; cursor: pointer; overflow: hidden; opacity: ' + (i === 0 ? '1' : '0.5') + '; transition: all 0.2s; flex-shrink: 0;';
                        thumb.innerHTML = '<img src="' + d + '" style="width: 100%; height: 100%; object-fit: cover;">';
                        thumb.onclick = function() { imageTextJumpToImage(i); };
                        thumbnailArea.appendChild(thumb);
                    });
                    
                    rightColumn.appendChild(toolbar);
                    rightColumn.appendChild(imageArea);
                    rightColumn.appendChild(thumbnailArea);
                    
                    mainContent.style.display = 'none';
                    mainContent.parentNode.insertBefore(imageTextWrapper, mainContent);
                    imageTextWrapper.appendChild(leftColumn);
                    imageTextWrapper.appendChild(rightColumn);
                    
                } else {
                    btn.style.background = 'rgba(255,255,255,0.25)';
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M.002 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V3zm1 9v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12zm5-6.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg> 图文对照';
                    
                    if (container) container.style.maxWidth = '1200px';
                    if (sideNav && !originalNavCollapsed) sideNav.classList.remove('collapsed');
                    
                    var navTrigger = document.getElementById('navTrigger');
                    if (navTrigger) navTrigger.classList.remove('visible');
                    
                    var wrapper = document.querySelector('.image-text-wrapper');
                    if (wrapper) wrapper.remove();
                    
                    mainContent.style.display = 'block';
                }
            };
            
            function imageTextUpdateDisplay() {
                var drawings = window.newTabDrawings || [];
                var img = document.getElementById('image-text-main-img');
                var counter = document.getElementById('image-text-counter');
                var zoomDisplay = document.getElementById('image-text-zoom');
                
                if (img) {
                    img.src = drawings[imageTextViewerIndex];
                    img.style.transform = 'scale(' + imageTextViewerScale + ') rotate(' + imageTextViewerRotation + 'deg)';
                }
                if (counter) counter.textContent = '图 ' + (imageTextViewerIndex + 1) + ' / ' + drawings.length;
                if (zoomDisplay) zoomDisplay.textContent = Math.round(imageTextViewerScale * 100) + '%';
                
                var thumbs = document.querySelectorAll('#image-text-thumbnail-area > div');
                thumbs.forEach(function(thumb, i) {
                    thumb.style.borderColor = i === imageTextViewerIndex ? '#4CAF50' : 'transparent';
                    thumb.style.opacity = i === imageTextViewerIndex ? '1' : '0.5';
                });
            }
            
            window.imageTextPrevImage = function() {
                var drawings = window.newTabDrawings || [];
                imageTextViewerIndex = (imageTextViewerIndex - 1 + drawings.length) % drawings.length;
                imageTextUpdateDisplay();
            };
            
            window.imageTextNextImage = function() {
                var drawings = window.newTabDrawings || [];
                imageTextViewerIndex = (imageTextViewerIndex + 1) % drawings.length;
                imageTextUpdateDisplay();
            };
            
            window.imageTextJumpToImage = function(index) {
                imageTextViewerIndex = index;
                imageTextUpdateDisplay();
            };
            
            window.imageTextZoomIn = function() {
                imageTextViewerScale = Math.min(3, imageTextViewerScale + 0.2);
                imageTextUpdateDisplay();
            };
            
            window.imageTextZoomOut = function() {
                imageTextViewerScale = Math.max(0.5, imageTextViewerScale - 0.2);
                imageTextUpdateDisplay();
            };
            
            window.imageTextRotateLeft = function() {
                imageTextViewerRotation = (imageTextViewerRotation - 90 + 360) % 360;
                imageTextUpdateDisplay();
            };
            
            window.imageTextRotateRight = function() {
                imageTextViewerRotation = (imageTextViewerRotation + 90) % 360;
                imageTextUpdateDisplay();
            };
            
            window.imageTextSmartMarker = function() {
                window.toggleImageTextMode();
                
                var patentData = window.pageData || {};
                var drawings = window.newTabDrawings || [];
                
                if (window.opener && !window.opener.closed) {
                    if (!window.opener.patentDrawingsData) window.opener.patentDrawingsData = {};
                    window.opener.patentDrawingsData[currentPatentNumber] = drawings;
                    
                    if (!window.opener.patentResults) window.opener.patentResults = [];
                    var existingIndex = window.opener.patentResults.findIndex(function(r) { return r.patent_number === currentPatentNumber; });
                    var patentResult = { patent_number: currentPatentNumber, success: true, data: patentData };
                    if (existingIndex >= 0) {
                        window.opener.patentResults[existingIndex] = patentResult;
                    } else {
                        window.opener.patentResults.push(patentResult);
                    }
                    
                    if (typeof window.opener.sendToDrawingMarker === 'function') {
                        window.opener.sendToDrawingMarker(currentPatentNumber);
                        window.opener.focus();
                        alert('已传递数据到主页面，请在主页面中选择要标记的图片');
                        return;
                    }
                }
                
                alert('请在主页面中使用此功能，或确保主页面已加载完成');
            };
            
            var viewerIndex = 0;
            var viewerScale = 1;
            var viewerRotation = 0;
            
            window.openNewTabImageViewer = function(startIndex) {
                var drawings = window.newTabDrawings || [];
                if (drawings.length === 0) return;
                
                viewerIndex = startIndex;
                viewerScale = 1;
                viewerRotation = 0;
                
                var viewerHTML = '<div id="image-viewer-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;">' +
                    '<div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 15px; align-items: center;">' +
                    '<span id="viewer-counter" style="color: white; font-size: 18px; font-weight: 500;">图 ' + (viewerIndex + 1) + ' / ' + drawings.length + '</span>' +
                    '<button onclick="closeNewTabImageViewer()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 44px; height: 44px; border-radius: 50%; cursor: pointer;">&times;</button>' +
                    '</div>' +
                    '<div style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px;">' +
                    '<button onclick="navigateNewTabViewer(-1)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">&#8249;</button>' +
                    '<button onclick="zoomNewTabImage(0.2)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">+</button>' +
                    '<span id="zoom-level" style="color: white; font-size: 14px; text-align: center; min-width: 56px;">' + Math.round(viewerScale * 100) + '%</span>' +
                    '<button onclick="zoomNewTabImage(-0.2)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">-</button>' +
                    '<button onclick="rotateNewTabImage(-90)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 22px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">↺</button>' +
                    '</div>' +
                    '<div style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px;">' +
                    '<button onclick="navigateNewTabViewer(1)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">&#8250;</button>' +
                    '<button onclick="rotateNewTabImage(90)" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 22px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;">↻</button>' +
                    '<button onclick="sendNewTabDrawingsToMarker()" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border: none; color: white; font-size: 12px; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; font-weight: bold; line-height: 1.1; text-align: center;">智能<br>标记</button>' +
                    '</div>' +
                    '<div id="viewer-image-container" style="position: relative; display: flex; align-items: center; justify-content: center;">' +
                    '<img id="viewer-image" src="' + drawings[viewerIndex] + '" style="max-width: 88%; max-height: 78%; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); transition: transform 0.3s ease;">' +
                    '</div>' +
                    '<div style="position: absolute; bottom: 25px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 88%; max-height: 90px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 12px;">';
                
                drawings.forEach(function(d, i) {
                    viewerHTML += '<div onclick="jumpNewTabToImage(' + i + ')" style="width: 60px; height: 60px; border: 3px solid ' + (i === viewerIndex ? '#fff' : 'transparent') + '; border-radius: 6px; cursor: pointer; overflow: hidden; opacity: ' + (i === viewerIndex ? '1' : '0.5') + '; transition: all 0.2s;"><img src="' + d + '" style="width: 100%; height: 100%; object-fit: cover;"></div>';
                });
                
                viewerHTML += '</div></div>';
                
                document.body.insertAdjacentHTML('beforeend', viewerHTML);
                document.body.style.overflow = 'hidden';
                document.addEventListener('keydown', handleViewerKeydown);
            };
            
            window.closeNewTabImageViewer = function() {
                var overlay = document.getElementById('image-viewer-overlay');
                if (overlay) overlay.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleViewerKeydown);
            };
            
            window.navigateNewTabViewer = function(delta) {
                var drawings = window.newTabDrawings || [];
                viewerIndex = (viewerIndex + delta + drawings.length) % drawings.length;
                updateViewerImage();
            };
            
            window.jumpNewTabToImage = function(index) {
                viewerIndex = index;
                updateViewerImage();
            };
            
            window.zoomNewTabImage = function(delta) {
                viewerScale = Math.max(0.5, Math.min(3, viewerScale + delta));
                updateViewerImage();
            };
            
            window.rotateNewTabImage = function(delta) {
                viewerRotation = (viewerRotation + delta) % 360;
                updateViewerImage();
            };
            
            function updateViewerImage() {
                var drawings = window.newTabDrawings || [];
                var img = document.getElementById('viewer-image');
                var counter = document.getElementById('viewer-counter');
                var zoomLevel = document.getElementById('zoom-level');
                
                if (img) {
                    img.src = drawings[viewerIndex];
                    img.style.transform = 'scale(' + viewerScale + ') rotate(' + viewerRotation + 'deg)';
                }
                if (counter) counter.textContent = '图 ' + (viewerIndex + 1) + ' / ' + drawings.length;
                if (zoomLevel) zoomLevel.textContent = Math.round(viewerScale * 100) + '%';
                
                var thumbs = document.querySelectorAll('#image-viewer-overlay > div:last-child > div');
                thumbs.forEach(function(thumb, i) {
                    thumb.style.borderColor = i === viewerIndex ? '#fff' : 'transparent';
                    thumb.style.opacity = i === viewerIndex ? '1' : '0.5';
                });
            }
            
            function handleViewerKeydown(e) {
                if (e.key === 'Escape') window.closeNewTabImageViewer();
                else if (e.key === 'ArrowLeft') window.navigateNewTabViewer(-1);
                else if (e.key === 'ArrowRight') window.navigateNewTabViewer(1);
                else if (e.key === 'ArrowUp' || e.key === '+') window.zoomNewTabImage(0.2);
                else if (e.key === 'ArrowDown' || e.key === '-') window.zoomNewTabImage(-0.2);
                else if (e.key === 'r' || e.key === 'R') window.rotateNewTabImage(90);
            }
            
            window.sendNewTabDrawingsToMarker = function() {
                window.closeNewTabImageViewer();
                
                var patentData = window.pageData || {};
                var drawings = window.newTabDrawings || [];
                
                if (window.opener && !window.opener.closed) {
                    if (!window.opener.patentDrawingsData) window.opener.patentDrawingsData = {};
                    window.opener.patentDrawingsData[currentPatentNumber] = drawings;
                    
                    if (!window.opener.patentResults) window.opener.patentResults = [];
                    var existingIndex = window.opener.patentResults.findIndex(function(r) { return r.patent_number === currentPatentNumber; });
                    var patentResult = { patent_number: currentPatentNumber, success: true, data: patentData };
                    if (existingIndex >= 0) {
                        window.opener.patentResults[existingIndex] = patentResult;
                    } else {
                        window.opener.patentResults.push(patentResult);
                    }
                    
                    if (typeof window.opener.sendToDrawingMarker === 'function') {
                        window.opener.sendToDrawingMarker(currentPatentNumber);
                        window.opener.focus();
                        alert('已传递数据到主页面，请在主页面中选择要标记的图片');
                        return;
                    }
                }
                
                alert('请在主页面中使用此功能，或确保主页面已加载完成');
            };
            
            window.showTranslateDialogNewTab = function(event, sectionId) {
                event.stopPropagation();
                
                var existingDialog = document.getElementById('translate-dialog');
                if (existingDialog) existingDialog.remove();
                
                var dialogHTML = '<div id="translate-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10001; min-width: 400px; max-width: 600px; overflow: hidden;">' +
                    '<div style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">' +
                    '<h3 style="margin: 0; font-size: 16px;">快捷翻译</h3>' +
                    '<button onclick="closeNewTabTranslateDialog()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">&times;</button>' +
                    '</div>' +
                    '<div style="padding: 20px;">' +
                    '<div style="margin-bottom: 15px;">' +
                    '<label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">选择目标语言：</label>' +
                    '<select id="translate-target-lang" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">' +
                    '<option value="zh">中文</option><option value="en">英文</option><option value="ja">日文</option><option value="ko">韩文</option><option value="de">德文</option><option value="fr">法文</option>' +
                    '</select></div>' +
                    '<div style="display: flex; gap: 10px;">' +
                    '<button onclick="translateNewTabContent(\\'' + sectionId + '\\')" style="flex: 1; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">开始翻译</button>' +
                    '<button onclick="closeNewTabTranslateDialog()" style="background: #f5f5f5; color: #666; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">取消</button>' +
                    '</div>' +
                    '<div id="translate-result-container" style="margin-top: 15px; display: none;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                    '<span style="font-weight: 500; color: #333;">翻译结果：</span>' +
                    '<button onclick="copyNewTabTranslatedText()" style="background: #2e7d32; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">复制</button>' +
                    '</div>' +
                    '<div id="translate-result" style="background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6;"></div>' +
                    '</div></div></div>' +
                    '<div id="translate-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;" onclick="closeNewTabTranslateDialog()"></div>';
                
                document.body.insertAdjacentHTML('beforeend', dialogHTML);
            };
            
            window.closeNewTabTranslateDialog = function() {
                var dialog = document.getElementById('translate-dialog');
                var overlay = document.getElementById('translate-overlay');
                if (dialog) dialog.remove();
                if (overlay) overlay.remove();
            };
            
            window.translateNewTabContent = function(sectionId) {
                var section = document.querySelector('[data-section-content="' + sectionId + '"]');
                if (!section) { alert('未找到要翻译的内容'); return; }
                
                var textToTranslate = section.textContent.trim();
                if (!textToTranslate) { alert('内容为空，无法翻译'); return; }
                
                var targetLang = document.getElementById('translate-target-lang').value;
                var resultContainer = document.getElementById('translate-result-container');
                var resultDiv = document.getElementById('translate-result');
                
                resultContainer.style.display = 'block';
                resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #00bcd4; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style><div style="margin-top: 10px; color: #666;">正在翻译...</div></div>';
                
                var langMap = { 'zh': 'Chinese', 'en': 'English', 'ja': 'Japanese', 'ko': 'Korean', 'de': 'German', 'fr': 'French' };
                var targetLangName = langMap[targetLang] || 'Chinese';
                
                if (window.opener && window.opener.translateText) {
                    window.opener.translateText(textToTranslate, targetLangName).then(function(result) {
                        resultDiv.textContent = result;
                    }).catch(function(err) {
                        resultDiv.innerHTML = '<div style="color: #d32f2f;">翻译失败: ' + err.message + '</div>';
                    });
                } else {
                    setTimeout(function() {
                        resultDiv.textContent = '[模拟翻译结果]\\n\\n' + textToTranslate.substring(0, 500) + (textToTranslate.length > 500 ? '...' : '');
                    }, 1000);
                }
            };
            
            window.copyNewTabTranslatedText = function() {
                var resultDiv = document.getElementById('translate-result');
                if (resultDiv && resultDiv.textContent) {
                    navigator.clipboard.writeText(resultDiv.textContent).then(function() {
                        alert('已复制翻译结果');
                    }).catch(function(err) {
                        console.error('复制失败:', err);
                    });
                }
            };
            
            window.openPatentChatInNewTab = function(patentNumber) {
                var existingDialog = document.getElementById('patent-chat-dialog');
                if (existingDialog) existingDialog.remove();
                
                var patentData = window.pageData || {};
                var patentTitle = patentData.title || patentNumber;
                
                var chatHTML = '<div id="patent-chat-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10001; width: 600px; max-width: 90vw; height: 70vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden;">' +
                    '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">' +
                    '<h3 style="margin: 0; font-size: 16px;">问一问 - ' + patentTitle + '</h3>' +
                    '<button onclick="closePatentChatDialog()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">&times;</button>' +
                    '</div>' +
                    '<div id="patent-chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f5f5f5;">' +
                    '<div style="text-align: center; padding: 20px; color: #666;"><div>您好！我是专利智能助手。</div><div style="font-size: 12px; margin-top: 5px;">您可以询问关于此专利的任何问题</div></div>' +
                    '</div>' +
                    '<div style="padding: 15px; background: white; border-top: 1px solid #e0e0e0; flex-shrink: 0;">' +
                    '<div style="display: flex; gap: 10px;">' +
                    '<textarea id="patent-chat-input" placeholder="输入您的问题..." style="flex: 1; padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 14px; resize: none; height: 44px; line-height: 1.4;" onkeydown="handlePatentChatKeydown(event)"></textarea>' +
                    '<button onclick="sendPatentChatMessage()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-size: 14px; cursor: pointer;">发送</button>' +
                    '</div>' +
                    '<div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">' +
                    '<button onclick="document.getElementById(\\'patent-chat-input\\').value=\\'这个专利的核心技术是什么？\\'" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">核心技术</button>' +
                    '<button onclick="document.getElementById(\\'patent-chat-input\\').value=\\'这个专利的创新点在哪里？\\'" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">创新点</button>' +
                    '<button onclick="document.getElementById(\\'patent-chat-input\\').value=\\'请解释一下权利要求1\\'" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">解释权利要求</button>' +
                    '<button onclick="document.getElementById(\\'patent-chat-input\\').value=\\'这个专利的应用场景有哪些？\\'" style="background: #f0f0f0; border: none; padding: 5px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #666;">应用场景</button>' +
                    '</div></div></div>' +
                    '<div id="patent-chat-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;" onclick="closePatentChatDialog()"></div>';
                
                document.body.insertAdjacentHTML('beforeend', chatHTML);
            };
            
            window.closePatentChatDialog = function() {
                var dialog = document.getElementById('patent-chat-dialog');
                var overlay = document.getElementById('patent-chat-overlay');
                if (dialog) dialog.remove();
                if (overlay) overlay.remove();
            };
            
            window.handlePatentChatKeydown = function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    window.sendPatentChatMessage();
                }
            };
            
            window.sendPatentChatMessage = function() {
                var input = document.getElementById('patent-chat-input');
                var message = input.value.trim();
                if (!message) return;
                
                var messagesContainer = document.getElementById('patent-chat-messages');
                messagesContainer.insertAdjacentHTML('beforeend', '<div style="display: flex; justify-content: flex-end; margin-bottom: 15px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 15px; border-radius: 12px 12px 0 12px; max-width: 80%; font-size: 14px;">' + message + '</div></div>');
                input.value = '';
                
                messagesContainer.insertAdjacentHTML('beforeend', '<div id="chat-loading" style="display: flex; justify-content: flex-start; margin-bottom: 15px;"><div style="background: white; padding: 10px 15px; border-radius: 12px 12px 12px 0; max-width: 80%; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">思考中...</div></div>');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                var patentData = window.pageData || {};
                var patentInfo = { patent_number: currentPatentNumber, title: patentData.title || '', abstract: patentData.abstract || '', claims: patentData.claims || [], description: patentData.description || '' };
                
                if (window.opener && window.opener.askPatentQuestion) {
                    window.opener.askPatentQuestion(patentInfo, message).then(function(response) {
                        displayChatResponse(response, messagesContainer);
                    }).catch(function(err) {
                        displayChatResponse('抱歉，发生了错误: ' + err.message, messagesContainer);
                    });
                } else {
                    setTimeout(function() {
                        var mockResponse = generateMockChatResponse(message, patentInfo);
                        displayChatResponse(mockResponse, messagesContainer);
                    }, 1500);
                }
            };
            
            function displayChatResponse(response, messagesContainer) {
                var loading = document.getElementById('chat-loading');
                if (loading) loading.remove();
                
                var formattedResponse = response.replace(/\\n/g, '<br>');
                messagesContainer.insertAdjacentHTML('beforeend', '<div style="display: flex; justify-content: flex-start; margin-bottom: 15px;"><div style="background: white; padding: 10px 15px; border-radius: 12px 12px 12px 0; max-width: 80%; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.6;">' + formattedResponse + '</div></div>');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            function generateMockChatResponse(message, patentInfo) {
                var lowerMessage = message.toLowerCase();
                if (lowerMessage.includes('核心') || lowerMessage.includes('技术')) {
                    return '根据专利"' + (patentInfo.title || currentPatentNumber) + '"的内容分析，核心技术主要涉及：\\n\\n1. 创新的技术方案设计\\n2. 独特的实现方法\\n3. 优化的系统架构\\n\\n如需更详细的技术分析，请查看专利的权利要求书和说明书部分。';
                } else if (lowerMessage.includes('创新') || lowerMessage.includes('特点')) {
                    return '该专利的创新点主要体现在：\\n\\n1. 技术方案的创新性\\n2. 解决问题的独特方法\\n3. 相比现有技术的改进\\n\\n建议您仔细阅读权利要求书以了解具体的技术特征。';
                } else if (lowerMessage.includes('权利要求') || lowerMessage.includes('claim')) {
                    return '权利要求是专利保护范围的核心界定。该专利共有 ' + (patentInfo.claims ? patentInfo.claims.length : 0) + ' 项权利要求。\\n\\n独立权利要求定义了最核心的技术方案，从属权利要求则在此基础上增加了更多技术特征。';
                } else if (lowerMessage.includes('应用') || lowerMessage.includes('场景')) {
                    return '该专利可能的应用场景包括：\\n\\n1. 相关技术领域的实际应用\\n2. 产品开发中的技术实现\\n3. 行业解决方案的优化\\n\\n具体应用需要结合您的业务需求进行分析。';
                } else {
                    return '感谢您的提问！关于"' + message + '"，我建议您：\\n\\n1. 查看专利的摘要部分了解整体概况\\n2. 阅读权利要求书了解保护范围\\n3. 参考说明书了解技术细节\\n\\n如有更具体的问题，请随时提问。';
                }
            }
            
            document.addEventListener('DOMContentLoaded', function() {
                const navItems = document.querySelectorAll('.side-nav-item');
                const sections = document.querySelectorAll('.section');
                
                navItems.forEach(item => {
                    item.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('href').substring(1);
                        const targetSection = document.getElementById(targetId);
                        
                        navItems.forEach(nav => nav.classList.remove('active'));
                        this.classList.add('active');
                        
                        if (targetSection) {
                            if (targetSection.classList.contains('collapsible-section')) {
                                targetSection.classList.remove('collapsed');
                            }
                            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                });
                
                function highlightNav() {
                    let current = '';
                    sections.forEach(section => {
                        const sectionTop = section.offsetTop;
                        if (window.pageYOffset >= sectionTop - 100) {
                            current = section.getAttribute('id');
                        }
                    });
                    navItems.forEach(item => {
                        item.classList.remove('active');
                        if (item.getAttribute('href') === '#' + current) {
                            item.classList.add('active');
                        }
                    });
                }
                
                window.addEventListener('scroll', highlightNav);
                highlightNav();
            });
        `;
    }

    window.openPatentDetailInNewTab = function(patentNumber) {
        const patentResult = findPatentResult(patentNumber);
        
        if (!patentResult || !patentResult.success) {
            alert('无法打开：专利数据不存在');
            return;
        }
        
        const data = patentResult.data;
        const selectedFields = window.getSelectedFields ? window.getSelectedFields() : null;
        const analysisResult = findAnalysisResult(patentNumber);
        
        V.init();
        M.init();
        
        const TR = window.PatentDetailTranslation;
        const CH = window.PatentDetailChat;
        if (TR) TR.init();
        if (CH) CH.init();
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=0.9">
                <title>${U.safeStr(data.title) || patentNumber} - 专利详情</title>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
                <style>
                    ${S.getMainStyles()}
                </style>
            </head>
            <body>
                <div class="nav-trigger" id="navTrigger" title="悬浮展开导航栏">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"/>
                    </svg>
                </div>
                ${HB.buildSideNav(data, analysisResult, selectedFields)}
                
                <div class="container">
                    ${HB.buildHeader(patentNumber, data, patentResult)}
                    
                    <div class="content">
                        ${SEC.buildAnalysisResult(analysisResult)}
                        ${HB.buildBasicInfo(data)}
                        ${HB.buildAbstract(data, selectedFields)}
                        ${HB.buildDrawings(data, selectedFields)}
                        ${SEC.buildClassifications(data, selectedFields)}
                        ${SEC.buildClaims(data, selectedFields, patentNumber)}
                        ${SEC.buildDescription(data, selectedFields)}
                        ${SEC.buildEventsCombined(data, selectedFields)}
                        ${SEC.buildFamily(data, selectedFields, patentNumber)}
                        ${SEC.buildRelatedPatents(data, selectedFields, patentNumber)}
                    </div>
                </div>
                
                <script>
                    ${buildPageScripts(patentNumber, data)}
                </script>
            </body>
            </html>
        `;
        
        const baseUrl = window.location.href.split('?')[0].split('#')[0];
        const newUrl = baseUrl + '?patent_detail=' + encodeURIComponent(patentNumber);
        const newWindow = window.open(newUrl, '_blank');
        
        if (newWindow) {
            window.PatentDetailCache.save(patentNumber, patentResult, analysisResult);
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        }
    };

})();

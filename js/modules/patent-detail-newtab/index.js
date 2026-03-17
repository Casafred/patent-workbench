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
                { id: 'events-combined', name: '事件', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>' },
                { id: 'family', name: '同族', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>' },
                { id: 'related-patents', name: '相关专利', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>' },
                { id: 'analysis-result', name: 'AI解读', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2H2V7zm3 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H5V10zm5 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1H10v-1z"/></svg>' }
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
                            '#' + tab.id,
                            '[data-section-id="' + tab.id + '"]',
                            '#section-' + tab.id,
                            '.section[id="' + tab.id + '"]'
                        ];
                        
                        for (var i = 0; i < selectors.length; i++) {
                            section = col.querySelector(selectors[i]);
                            if (section) break;
                        }
                        
                        if (section) {
                            var sectionOuter = section.closest('.section') || section;
                            
                            if (sectionOuter.classList.contains('collapsed')) {
                                sectionOuter.classList.remove('collapsed');
                            }
                            
                            var collapsedContent = sectionOuter.querySelector('.section-content');
                            if (collapsedContent && collapsedContent.classList.contains('collapsed')) {
                                collapsedContent.classList.remove('collapsed');
                            }
                            
                            var toggleIcon = sectionOuter.querySelector('.toggle-icon');
                            if (toggleIcon) {
                                toggleIcon.textContent = '▼';
                            }
                            
                            setTimeout(function() {
                                var tabBarHeight = 60;
                                var sectionTop = sectionOuter.offsetTop;
                                col.scrollTop = sectionTop - tabBarHeight;
                            }, 50);
                            
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
                    dualColumnWrapper.style.cssText = 'display: flex; gap: 20px; padding: 15px; height: calc(100vh - 100px);';
                    
                    var leftContainer = document.createElement('div');
                    leftContainer.className = 'dual-column-container';
                    leftContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;';
                    
                    dualColumnLeftColumn = document.createElement('div');
                    dualColumnLeftColumn.className = 'dual-column-left';
                    dualColumnLeftColumn.style.cssText = 'flex: 1; overflow-y: auto;';
                    
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
                    dualColumnRightColumn.style.cssText = 'flex: 1; overflow-y: auto;';
                    
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
            
            window.currentTranslateColumn = null;
            
            window.showTranslateDialogNewTab = function(event, textType, column) {
                event.stopPropagation();
                
                if (!column) {
                    var dualLeft = event.currentTarget.closest('.dual-column-left');
                    var dualRight = event.currentTarget.closest('.dual-column-right');
                    if (dualLeft) {
                        column = 'left';
                    } else if (dualRight) {
                        column = 'right';
                    }
                }
                
                window.currentTranslateColumn = column || null;
                
                var models = ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
                if (window.opener && window.opener.AVAILABLE_MODELS && window.opener.AVAILABLE_MODELS.length > 0) {
                    models = window.opener.AVAILABLE_MODELS;
                }
                var cacheKeyPrefix = 'translation_' + currentPatentNumber + '_' + textType + '_';
                var cachedModel = null;
                for (var i = 0; i < models.length; i++) {
                    var m = models[i];
                    var cached = localStorage.getItem(cacheKeyPrefix + m);
                    if (cached) {
                        try {
                            var data = JSON.parse(cached);
                            if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                                cachedModel = m;
                                break;
                            }
                        } catch(e) {}
                    }
                }
                
                var existingDialog = document.getElementById('translate-dialog-newtab');
                if (existingDialog) existingDialog.remove();
                
                var dialog = document.createElement('div');
                dialog.id = 'translate-dialog-newtab';
                dialog.style.cssText = 'position: fixed; top: 20px; right: 20px; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 10000; min-width: 300px; cursor: move;';
                
                dialog.innerHTML = '<div class="drag-handle" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: move;">' +
                    '<h4 style="margin: 0; color: #009688; display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 选择翻译模型</h4>' +
                    '<button onclick="document.getElementById(\\'translate-dialog-newtab\\').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>' +
                    '</div>' +
                    (cachedModel ? '<p style="margin: 0 0 8px 0; color: #28a745; font-size: 12px;">已有缓存 (模型: ' + cachedModel + ')</p>' : '') +
                    '<select id="translate-model-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px;">' +
                    models.map(function(m) { return '<option value="' + m + '"' + (m === cachedModel ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
                    '</select>' +
                    '<div style="display: flex; gap: 8px;">' +
                    '<button onclick="document.getElementById(\\'translate-dialog-newtab\\').remove()" style="flex: 1; padding: 8px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">取消</button>' +
                    '<button id="start-translate-btn" style="flex: 1; padding: 8px; border: none; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">开始翻译</button>' +
                    '</div>';
                
                document.body.appendChild(dialog);
                
                makeNewTabDraggable(dialog);
                
                document.getElementById('start-translate-btn').onclick = function() {
                    var model = document.getElementById('translate-model-select').value;
                    dialog.remove();
                    startTranslationNewTab(textType, model);
                };
            };
            
            window.startTranslationNewTab = async function(textType, model) {
                var btn = document.querySelector('.translate-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="animation: spin 1s linear infinite;"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/></svg> 翻译中...';
                }
                
                var cacheKey = 'translation_' + currentPatentNumber + '_' + textType + '_' + model;
                var cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        var data = JSON.parse(cached);
                        if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                            console.log('发现翻译缓存:', cacheKey);
                            showTranslationResultNewTab(data.translations, textType);
                            if (btn) {
                                btn.disabled = false;
                                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译';
                            }
                            return;
                        }
                    } catch(e) {}
                }
                
                try {
                    var openerState = window.opener && window.opener.appState ? window.opener.appState : null;
                    var zhipuKey = openerState && openerState.apiKey ? openerState.apiKey : (localStorage.getItem('api_key') || localStorage.getItem('globalApiKey'));
                    var aliyunKey = openerState && openerState.aliyunApiKey ? openerState.aliyunApiKey : localStorage.getItem('aliyun_api_key');
                    
                    if (!zhipuKey && !aliyunKey) {
                        throw new Error('请先配置API Key');
                    }
                    
                    var getProviderForModel = window.opener && window.opener.getProviderForModel ? window.opener.getProviderForModel : function(m) {
                        if (m.startsWith('glm-') || m.startsWith('GLM-')) return 'zhipu';
                        if (m.startsWith('qwen') || m.startsWith('Qwen') || m.startsWith('qwq') || m.startsWith('QwQ') || m.startsWith('deepseek') || m.startsWith('DeepSeek') || m.startsWith('kimi') || m.startsWith('Kimi') || m.startsWith('minimax')) return 'aliyun';
                        return 'zhipu';
                    };
                    
                    var provider = getProviderForModel(model);
                    
                    var headers = {
                        'Content-Type': 'application/json'
                    };
                    
                    if (provider === 'aliyun') {
                        headers['X-LLM-Provider'] = 'aliyun';
                        headers['Authorization'] = 'Bearer ' + aliyunKey;
                    } else {
                        headers['Authorization'] = 'Bearer ' + zhipuKey;
                    }
                    
                    var translations = [];
                    
                    if (textType === 'claims') {
                        var claims = pageData.claims || [];
                        if (claims.length === 0) throw new Error('没有可翻译的权利要求');
                        
                        var formattedClaims = claims.map(function(claim, i) {
                            var text = typeof claim === 'string' ? claim : claim.text || '';
                            return '权利要求 ' + (i + 1) + ': ' + text;
                        }).join('\\n\\n');
                        
                        var response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                model: model,
                                messages: [
                                    { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利权利要求翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。保持权利要求的编号和格式。只返回翻译结果，不要添加任何解释。请按照以下格式返回：权利要求 1: [翻译内容]' },
                                    { role: 'user', content: formattedClaims }
                                ],
                                temperature: 0.3,
                                max_tokens: 4096
                            })
                        });
                        
                        if (!response.ok) {
                            var errorData = await response.json().catch(function() { return {}; });
                            throw new Error(errorData.error && errorData.error.message ? errorData.error.message : (errorData.error || 'API请求失败: ' + response.status));
                        }
                        
                        var result = await response.json();
                        var translatedText = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content ? result.choices[0].message.content : '';
                        
                        var pattern = /权利要求\\s*(\\d+)[:：]\\s*(.*?)(?=权利要求\\s*\\d+[:：]|$)/gs;
                        var matches = Array.from(translatedText.matchAll(pattern));
                        
                        if (matches.length > 0) {
                            var translatedMap = {};
                            matches.forEach(function(match) {
                                translatedMap[parseInt(match[1])] = match[2].trim();
                            });
                            
                            claims.forEach(function(claim, i) {
                                var claimText = typeof claim === 'string' ? claim : claim.text || '';
                                translations.push({
                                    original: claimText,
                                    translated: translatedMap[i + 1] || '[翻译解析失败]',
                                    index: i + 1
                                });
                            });
                        } else {
                            var lines = translatedText.split('\\n').filter(function(l) { return l.trim(); });
                            claims.forEach(function(claim, i) {
                                var claimText = typeof claim === 'string' ? claim : claim.text || '';
                                translations.push({
                                    original: claimText,
                                    translated: lines[i] || translatedText,
                                    index: i + 1
                                });
                            });
                        }
                    } else {
                        var description = pageData.description || '';
                        if (!description) throw new Error('没有可翻译的说明书内容');
                        
                        var response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                model: model,
                                messages: [
                                    { role: 'system', content: '你是一位专业的专利文献翻译专家。请将以下英文专利说明书翻译为中文。保持专利术语的准确性，保留所有数字标记，翻译要流畅自然。只返回翻译结果，不要添加任何解释。' },
                                    { role: 'user', content: description.substring(0, 4000) }
                                ],
                                temperature: 0.3,
                                max_tokens: 4096
                            })
                        });
                        
                        if (!response.ok) {
                            var errorData = await response.json().catch(function() { return {}; });
                            throw new Error(errorData.error && errorData.error.message ? errorData.error.message : (errorData.error || 'API请求失败: ' + response.status));
                        }
                        
                        var result = await response.json();
                        translations.push({
                            original: description.substring(0, 500) + '...',
                            translated: result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content ? result.choices[0].message.content : ''
                        });
                    }
                    
                    localStorage.setItem(cacheKey, JSON.stringify({ translations: translations, timestamp: Date.now() }));
                    console.log('翻译结果已缓存', cacheKey);
                    
                    showTranslationResultNewTab(translations, textType);
                    
                } catch (error) {
                    alert('翻译失败: ' + error.message);
                    console.error('翻译错误:', error);
                }
                
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译';
                }
            };
            
            window.showTranslationResultNewTab = function(translations, textType) {
                var panelId = 'translation-result-panel-' + textType + '-' + Date.now();
                var existingPanels = document.querySelectorAll('[id^="translation-result-panel-"]');
                var offsetIndex = existingPanels.length;
                var offsetX = offsetIndex * 30;
                var offsetY = offsetIndex * 30;
                
                var panel = document.createElement('div');
                panel.id = panelId;
                panel.className = 'translation-result-panel';
                panel.style.cssText = 'position: fixed; top: ' + (80 + offsetY) + 'px; right: ' + (20 + offsetX) + 'px; width: 450px; min-width: 300px; min-height: 200px; max-height: 70vh; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 9999; overflow: hidden; resize: both; cursor: default;';
                
                var content = '';
                if (textType === 'claims' && translations[0] && translations[0].index) {
                    translations.forEach(function(t) {
                        content += '<div style="padding: 12px; border-bottom: 1px solid #eee;">' +
                            '<div style="font-weight: 600; color: #009688; margin-bottom: 6px;">权利要求 ' + t.index + '</div>' +
                            '<div style="font-size: 12px; color: #666; margin-bottom: 4px;">原文:</div>' +
                            '<div style="font-size: 13px; color: #333; margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">' + escapeHtmlNewTab(t.original) + '</div>' +
                            '<div style="font-size: 12px; color: #666; margin-bottom: 4px;">译文:</div>' +
                            '<div style="font-size: 13px; color: #2e7d32; padding: 8px; background: #e8f5e9; border-radius: 4px;">' + escapeHtmlNewTab(t.translated) + '</div>' +
                            '</div>';
                    });
                } else {
                    translations.forEach(function(t, i) {
                        content += '<div style="padding: 12px; border-bottom: 1px solid #eee;">' +
                            '<div style="font-weight: 600; color: #009688; margin-bottom: 6px;">段落 ' + (i + 1) + '</div>' +
                            '<div style="font-size: 13px; color: #2e7d32; padding: 8px; background: #e8f5e9; border-radius: 4px; white-space: pre-wrap;">' + escapeHtmlNewTab(t.translated) + '</div>' +
                            '</div>';
                    });
                }
                
                panel.innerHTML = '<div class="drag-handle" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #00bcd4 0%, #009688 100%); color: white; cursor: move;">' +
                    '<h4 style="margin: 0; display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138 1.718-.312 2.5h2.146z"/></svg> 翻译结果 - ' + (textType === 'claims' ? '权利要求' : '说明书') + '</h4>' +
                    '<button onclick="document.getElementById(\\'' + panelId + '\\').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: white;">&times;</button>' +
                    '</div>' +
                    '<div style="max-height: calc(70vh - 120px); overflow-y: auto;">' +
                    content +
                    '</div>' +
                    '<div style="padding: 8px 16px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 8px; background: #f9f9f9;">' +
                    '<button onclick="replaceContentWithTranslation(\\'' + textType + '\\')" style="padding: 6px 12px; border: none; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">替换原文</button>' +
                    '<button onclick="document.getElementById(\\'' + panelId + '\\').remove()" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 12px;">关闭</button>' +
                    '</div>';
                
                document.body.appendChild(panel);
                
                makeNewTabDraggable(panel);
                
                window.currentTranslations = window.currentTranslations || {};
                window.currentTranslations[textType] = translations;
            };
            
            window.replaceContentWithTranslation = function(textType) {
                var translations = window.currentTranslations && window.currentTranslations[textType];
                if (!translations) {
                    alert('没有可用的翻译结果');
                    return;
                }
                
                var column = window.currentTranslateColumn;
                var targetContainer;
                
                if (column === 'left' || column === 'right') {
                    targetContainer = document.querySelector('.dual-column-' + column);
                }
                
                if (textType === 'claims') {
                    if (targetContainer) {
                        var claimsList = targetContainer.querySelector('.claims-list');
                        if (claimsList) {
                            var newHtml = '';
                            translations.forEach(function(t) {
                                newHtml += '<div class="claim-item" data-claim-number="' + t.index + '"><div class="claim-number">权利要求 ' + t.index + '</div><div class="claim-text">' + escapeHtmlNewTab(t.translated) + '</div></div>';
                            });
                            claimsList.innerHTML = newHtml;
                        }
                    } else {
                        var claimsList = document.querySelector('.claims-list');
                        if (claimsList) {
                            var newHtml = '';
                            translations.forEach(function(t) {
                                newHtml += '<div class="claim-item" data-claim-number="' + t.index + '"><div class="claim-number">权利要求 ' + t.index + '</div><div class="claim-text">' + escapeHtmlNewTab(t.translated) + '</div></div>';
                            });
                            claimsList.innerHTML = newHtml;
                        }
                    }
                } else if (textType === 'description') {
                    if (targetContainer) {
                        var descContent = targetContainer.querySelector('.abstract-box[data-section-content="description"]');
                        if (descContent) {
                            var newHtml = '';
                            translations.forEach(function(t) {
                                newHtml += escapeHtmlNewTab(t.translated) + '<br/><br/>';
                            });
                            descContent.innerHTML = newHtml;
                        }
                    } else {
                        var descContent = document.querySelector('.abstract-box[data-section-content="description"]');
                        if (descContent) {
                            var newHtml = '';
                            translations.forEach(function(t) {
                                newHtml += escapeHtmlNewTab(t.translated) + '<br/><br/>';
                            });
                            descContent.innerHTML = newHtml;
                        }
                    }
                }
            };
            
            function makeNewTabDraggable(element) {
                var dragHandle = element.querySelector('.drag-handle');
                if (!dragHandle) return;
                
                var isDragging = false;
                var startX, startY, startLeft, startTop;
                
                dragHandle.addEventListener('mousedown', function(e) {
                    if (e.target.tagName === 'BUTTON') return;
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    var rect = element.getBoundingClientRect();
                    startLeft = rect.left;
                    startTop = rect.top;
                    element.style.right = 'auto';
                    element.style.left = startLeft + 'px';
                    element.style.top = startTop + 'px';
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (!isDragging) return;
                    var dx = e.clientX - startX;
                    var dy = e.clientY - startY;
                    element.style.left = (startLeft + dx) + 'px';
                    element.style.top = (startTop + dy) + 'px';
                });
                
                document.addEventListener('mouseup', function() {
                    isDragging = false;
                });
            }
            
            function escapeHtmlNewTab(text) {
                if (!text) return '';
                var div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            window.newTabChatState = {
                providers: {},
                currentProvider: 'zhipu',
                currentModel: 'glm-4-flash',
                patentNumber: '',
                patentData: {},
                messages: [],
                isLoading: false,
                stopStreaming: false,
                apiKeys: {}
            };
            
            function estimateTokensNewTab(text) {
                if (!text) return 0;
                var chineseChars = 0;
                var otherChars = 0;
                for (var i = 0; i < text.length; i++) {
                    var char = text[i];
                    if (/[\\u4e00-\\u9fa5]/.test(char)) {
                        chineseChars++;
                    } else {
                        otherChars++;
                    }
                }
                return Math.ceil(chineseChars / 1.5) + Math.ceil(otherChars / 4);
            }
            
            window.updateNewTabContextInfo = function() {
                var checkbox = document.getElementById('newtab_chat_full_context');
                var infoSpan = document.getElementById('newtab_chat_context_info');
                
                if (!checkbox || !infoSpan) return;
                
                if (checkbox.checked) {
                    var patentInfo = window.newTabChatState.patentData || window.pageData || {};
                    var totalText = '';
                    
                    if (patentInfo.description) {
                        totalText += typeof patentInfo.description === 'string' ? patentInfo.description : JSON.stringify(patentInfo.description);
                    }
                    if (patentInfo.claims && patentInfo.claims.length > 0) {
                        patentInfo.claims.forEach(function(claim) {
                            totalText += ' ' + (typeof claim === 'string' ? claim : (claim.text || JSON.stringify(claim)));
                        });
                    }
                    
                    var tokenCount = estimateTokensNewTab(totalText);
                    var charCount = totalText.length;
                    
                    infoSpan.textContent = '约 ' + tokenCount + ' Token (' + charCount + ' 字符)';
                    infoSpan.style.display = 'inline-block';
                    
                    if (tokenCount > 10000) {
                        infoSpan.style.color = '#856404';
                        infoSpan.style.background = '#fff3cd';
                    } else {
                        infoSpan.style.color = '#6c757d';
                        infoSpan.style.background = '#e9ecef';
                    }
                } else {
                    infoSpan.style.display = 'none';
                }
            };
            
            function getApiKeysFromOpener() {
                var keys = { zhipu: null, aliyun: null };
                if (window.opener) {
                    try {
                        if (window.opener.localStorage) {
                            keys.zhipu = window.opener.localStorage.getItem('globalApiKey') || window.opener.localStorage.getItem('zhipu_api_key');
                            keys.aliyun = window.opener.localStorage.getItem('aliyun_api_key');
                        }
                        if (window.opener.appState) {
                            if (!keys.zhipu && window.opener.appState.apiKey) keys.zhipu = window.opener.appState.apiKey;
                            if (!keys.aliyun && window.opener.appState.aliyunApiKey) keys.aliyun = window.opener.appState.aliyunApiKey;
                        }
                    } catch (e) {
                        console.warn('无法从主窗口获取API Key:', e);
                    }
                }
                return keys;
            }
            
            async function initNewTabChatProviders() {
                window.newTabChatState.apiKeys = getApiKeysFromOpener();
                
                try {
                    var response = await fetch('/api/providers');
                    if (response.ok) {
                        var data = await response.json();
                        if (data.providers) {
                            window.newTabChatState.providers = data.providers;
                            
                            if (window.opener && window.opener.patentChatState) {
                                window.newTabChatState.currentProvider = window.opener.patentChatState.currentProvider || 'zhipu';
                                window.newTabChatState.currentModel = window.opener.patentChatState.currentModel || 'glm-4-flash';
                            } else {
                                window.newTabChatState.currentProvider = 'zhipu';
                                window.newTabChatState.currentModel = data.providers.zhipu && data.providers.zhipu.default_model ? data.providers.zhipu.default_model : 'glm-4-flash';
                            }
                            
                            updateNewTabChatProviderSelect();
                            updateNewTabChatModelSelect();
                        }
                    }
                } catch (error) {
                    console.warn('加载服务商配置失败，使用默认配置');
                    window.newTabChatState.providers = {
                        zhipu: { 
                            name: '智谱AI', 
                            models: [
                                {id: 'glm-4-flash', name: 'GLM-4-Flash'}, 
                                {id: 'glm-4-long', name: 'GLM-4-Long'},
                                {id: 'glm-4.7-flash', name: 'GLM-4.7-Flash'}
                            ] 
                        },
                        aliyun: { 
                            name: '阿里云百炼', 
                            models: [
                                {id: 'qwen-turbo', name: 'Qwen-Turbo'}, 
                                {id: 'qwen-plus', name: 'Qwen-Plus'},
                                {id: 'qwen-max', name: 'Qwen-Max'}
                            ] 
                        }
                    };
                    updateNewTabChatProviderSelect();
                    updateNewTabChatModelSelect();
                }
            }
            
            function updateNewTabChatProviderSelect() {
                var providerSelect = document.getElementById('newtab_chat_provider');
                if (!providerSelect || !window.newTabChatState.providers) return;
                
                var zhipuKey = window.newTabChatState.apiKeys.zhipu;
                var aliyunKey = window.newTabChatState.apiKeys.aliyun;
                var hasZhipuKey = !!zhipuKey;
                var hasAliyunKey = !!aliyunKey;
                
                var optionsHtml = '';
                var providerKeys = Object.keys(window.newTabChatState.providers);
                for (var i = 0; i < providerKeys.length; i++) {
                    var key = providerKeys[i];
                    var val = window.newTabChatState.providers[key];
                    var hasKey = key === 'zhipu' ? hasZhipuKey : hasAliyunKey;
                    var isCurrent = key === window.newTabChatState.currentProvider;
                    var disabled = !hasKey ? ' disabled' : '';
                    var selected = isCurrent && hasKey ? ' selected' : '';
                    var label = hasKey ? val.name : val.name + ' (未配置)';
                    optionsHtml += '<option value="' + key + '"' + disabled + selected + '>' + label + '</option>';
                }
                
                providerSelect.innerHTML = optionsHtml;
                
                if (!hasZhipuKey && !hasAliyunKey) {
                    providerSelect.disabled = true;
                } else if (window.newTabChatState.currentProvider === 'zhipu' && !hasZhipuKey && hasAliyunKey) {
                    window.newTabChatState.currentProvider = 'aliyun';
                    providerSelect.value = 'aliyun';
                    updateNewTabChatModelSelect();
                } else if (window.newTabChatState.currentProvider === 'aliyun' && !hasAliyunKey && hasZhipuKey) {
                    window.newTabChatState.currentProvider = 'zhipu';
                    providerSelect.value = 'zhipu';
                    updateNewTabChatModelSelect();
                }
            }
            
            function updateNewTabChatModelSelect() {
                var modelSelect = document.getElementById('newtab_chat_model');
                if (!modelSelect) return;
                
                var provider = window.newTabChatState.currentProvider;
                var providerConfig = window.newTabChatState.providers[provider];
                
                if (!providerConfig || !providerConfig.models || providerConfig.models.length === 0) {
                    modelSelect.innerHTML = '<option value="">无可用模型</option>';
                    return;
                }
                
                var optionsHtml = '';
                for (var i = 0; i < providerConfig.models.length; i++) {
                    var m = providerConfig.models[i];
                    var modelId = typeof m === 'string' ? m : m.id;
                    var modelName = typeof m === 'string' ? m : (m.name || m.id);
                    var selected = modelId === window.newTabChatState.currentModel ? ' selected' : '';
                    optionsHtml += '<option value="' + modelId + '"' + selected + '>' + modelName + '</option>';
                }
                
                modelSelect.innerHTML = optionsHtml;
                
                var modelIds = providerConfig.models.map(function(m) { return typeof m === 'string' ? m : m.id; });
                if (modelIds.indexOf(window.newTabChatState.currentModel) === -1) {
                    window.newTabChatState.currentModel = modelIds[0];
                    modelSelect.value = window.newTabChatState.currentModel;
                }
            }
            
            window.openPatentChatInNewTab = async function(patentNumber) {
                var existingBall = document.getElementById('newtab_chat_floating_ball');
                if (existingBall) {
                    showNewTabChatModal();
                    return;
                }
                
                var existingModal = document.getElementById('newtab_patent_chat_modal');
                if (existingModal) {
                    existingModal.style.display = 'flex';
                    return;
                }
                
                var patentData = window.pageData || {};
                
                var isSamePatent = window.newTabChatState.patentNumber === patentNumber;
                var hasMessages = (window.newTabChatState.messages || []).length > 0;
                
                if (!isSamePatent || !hasMessages) {
                    window.newTabChatState.patentNumber = patentNumber;
                    window.newTabChatState.patentData = patentData;
                    window.newTabChatState.messages = [];
                }
                window.newTabChatState.isLoading = false;
                window.newTabChatState.stopStreaming = false;
                
                createNewTabChatModal(patentNumber, patentData);
                
                await initNewTabChatProviders();
                
                if (hasMessages && isSamePatent) {
                    restoreNewTabChatHistory();
                }
                
                var input = document.getElementById('newtab_chat_input');
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendNewTabPatentChatMessage();
                    }
                });
                
                input.focus();
            };
            
            function createNewTabChatModal(patentNumber, patentData) {
                var chatModal = document.createElement('div');
                chatModal.id = 'newtab_patent_chat_modal';
                chatModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10000;';
                
                chatModal.innerHTML = '<div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e8f5e9; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); border-radius: 12px 12px 0 0;">' +
                    '<div><h4 style="margin: 0; font-size: 18px; color: white;">专利对话：' + patentNumber + '</h4>' +
                    '<p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">' + (patentData.title || '无标题') + '</p></div>' +
                    '<div style="display: flex; gap: 8px;">' +
                    '<button onclick="minimizeNewTabChat()" title="最小化为悬浮球" style="background: rgba(255,255,255,0.2); border: none; font-size: 18px; cursor: pointer; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">−</button>' +
                    '<button onclick="closeNewTabPatentChat()" style="background: rgba(255,255,255,0.2); border: none; font-size: 24px; cursor: pointer; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">&times;</button>' +
                    '</div></div>' +
                    '<div style="padding: 12px 16px; background: #f1f8e9; border-bottom: 1px solid #e8f5e9;">' +
                    '<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">' +
                    '<div style="display: flex; align-items: center; gap: 8px;"><label style="font-size: 13px; color: #2e7d32; font-weight: 500;">服务商:</label>' +
                    '<select id="newtab_chat_provider" onchange="onNewTabProviderChange()" style="padding: 6px 12px; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; background: white; cursor: pointer;"></select></div>' +
                    '<div style="display: flex; align-items: center; gap: 8px;"><label style="font-size: 13px; color: #2e7d32; font-weight: 500;">模型:</label>' +
                    '<select id="newtab_chat_model" onchange="onNewTabModelChange()" style="padding: 6px 12px; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; background: white; cursor: pointer;"></select></div>' +
                    '<label class="checkbox-label" title="勾选后将包含完整的说明书和权利要求作为上下文" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #2e7d32;"><input type="checkbox" id="newtab_chat_full_context" onchange="updateNewTabContextInfo()"><span>包含完整内容</span></label>' +
                    '<span id="newtab_chat_context_info" class="context-info" style="display: none; font-size: 12px; color: #6c757d; background: #e9ecef; padding: 3px 8px; border-radius: 4px;"></span>' +
                    '<button onclick="clearNewTabChatHistory()" style="padding: 6px 12px; background: white; border: 1px solid #c8e6c9; border-radius: 6px; font-size: 13px; color: #2e7d32; cursor: pointer;">清空对话</button>' +
                    '</div></div>' +
                    '<div id="newtab_chat_history" style="flex: 1; overflow-y: auto; padding: 16px; background: #fafafa;">' +
                    '<div class="welcome-message" style="text-align: center; padding: 40px 20px; color: #666;">' +
                    '<div style="font-size: 48px; margin-bottom: 16px;">💬</div>' +
                    '<p style="font-size: 16px; margin: 0;">您好！我是专利智能助手。</p>' +
                    '<p style="font-size: 14px; color: #999; margin-top: 8px;">在下方输入您的问题，开始与AI对话</p>' +
                    '</div></div>' +
                    '<div style="padding: 16px; background: white; border-top: 1px solid #e8f5e9;">' +
                    '<div style="display: flex; gap: 10px;">' +
                    '<textarea id="newtab_chat_input" placeholder="输入您的问题... (Shift+Enter换行，Enter发送)" style="flex: 1; padding: 12px 16px; border: 2px solid #c8e6c9; border-radius: 12px; font-size: 14px; resize: none; height: 48px; line-height: 1.4;"></textarea>' +
                    '<button id="newtab_chat_send_btn" onclick="sendNewTabPatentChatMessage()" style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 500;">发送</button>' +
                    '<button id="newtab_chat_stop_btn" onclick="stopNewTabChatStream()" style="background: #ef5350; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 500; display: none;">停止</button>' +
                    '</div>' +
                    '<div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">' +
                    '<button onclick="document.getElementById(\\'newtab_chat_input\\').value=\\'这个专利的核心技术是什么？\\'" style="background: #e8f5e9; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #2e7d32;">核心技术</button>' +
                    '<button onclick="document.getElementById(\\'newtab_chat_input\\').value=\\'这个专利的创新点在哪里？\\'" style="background: #e8f5e9; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #2e7d32;">创新点</button>' +
                    '<button onclick="document.getElementById(\\'newtab_chat_input\\').value=\\'请解释一下权利要求1\\'" style="background: #e8f5e9; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #2e7d32;">解释权利要求</button>' +
                    '<button onclick="document.getElementById(\\'newtab_chat_input\\').value=\\'这个专利的应用场景有哪些？\\'" style="background: #e8f5e9; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; color: #2e7d32;">应用场景</button>' +
                    '</div></div></div>';
                
                document.body.appendChild(chatModal);
                
                updateNewTabContextInfo();
            }
            
            function restoreNewTabChatHistory() {
                var historyEl = document.getElementById('newtab_chat_history');
                if (!historyEl) return;
                
                var messages = window.newTabChatState.messages || [];
                if (messages.length === 0) return;
                
                historyEl.innerHTML = '';
                
                for (var i = 0; i < messages.length; i++) {
                    var msg = messages[i];
                    if (msg.role === 'system') continue;
                    
                    var msgDiv = document.createElement('div');
                    if (msg.role === 'user') {
                        msgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-end;';
                        msgDiv.innerHTML = '<div style="max-width: 70%; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 12px 16px; border-radius: 16px 16px 4px 16px;"><div style="font-size: 14px; line-height: 1.5;">' + escapeHtmlNewTab(msg.content) + '</div></div>';
                    } else if (msg.role === 'assistant') {
                        msgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-start;';
                        msgDiv.innerHTML = '<div style="max-width: 70%; background: white; padding: 12px 16px; border-radius: 16px 16px 16px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8f5e9;"><div style="font-size: 14px; line-height: 1.5;">' + formatChatContentNewTab(msg.content) + '</div></div>';
                    }
                    historyEl.appendChild(msgDiv);
                }
                
                historyEl.scrollTop = historyEl.scrollHeight;
            }
            
            function createNewTabChatFloatingBall() {
                var ball = document.createElement('div');
                ball.id = 'newtab_chat_floating_ball';
                ball.style.cssText = 'position: fixed; bottom: 80px; right: 20px; width: 56px; height: 56px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(46,125,50,0.4); z-index: 9999; transition: transform 0.2s;';
                ball.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="white" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/></svg>';
                ball.title = '点击打开问一问';
                ball.onclick = showNewTabChatModal;
                
                ball.onmouseenter = function() { this.style.transform = 'scale(1.1)'; };
                ball.onmouseleave = function() { this.style.transform = 'scale(1)'; };
                
                var isDragging = false;
                var startX, startY, startLeft, startTop;
                
                ball.onmousedown = function(e) {
                    isDragging = false;
                    startX = e.clientX;
                    startY = e.clientY;
                    var rect = ball.getBoundingClientRect();
                    startLeft = rect.left;
                    startTop = rect.top;
                    
                    document.onmousemove = function(e) {
                        if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                            isDragging = true;
                            ball.style.left = (startLeft + e.clientX - startX) + 'px';
                            ball.style.top = (startTop + e.clientY - startY) + 'px';
                            ball.style.right = 'auto';
                            ball.style.bottom = 'auto';
                        }
                    };
                    
                    document.onmouseup = function() {
                        document.onmousemove = null;
                        document.onmouseup = null;
                    };
                };
                
                ball.onclick = function(e) {
                    if (!isDragging) {
                        showNewTabChatModal();
                    }
                };
                
                document.body.appendChild(ball);
            }
            
            window.minimizeNewTabChat = function() {
                var modal = document.getElementById('newtab_patent_chat_modal');
                if (modal) modal.style.display = 'none';
                
                if (!document.getElementById('newtab_chat_floating_ball')) {
                    createNewTabChatFloatingBall();
                } else {
                    document.getElementById('newtab_chat_floating_ball').style.display = 'flex';
                }
            };
            
            window.showNewTabChatModal = function() {
                var modal = document.getElementById('newtab_patent_chat_modal');
                var ball = document.getElementById('newtab_chat_floating_ball');
                
                if (modal) {
                    modal.style.display = 'flex';
                }
                if (ball) {
                    ball.style.display = 'none';
                }
            };
            
            window.onNewTabProviderChange = function() {
                var providerSelect = document.getElementById('newtab_chat_provider');
                window.newTabChatState.currentProvider = providerSelect.value;
                var providerConfig = window.newTabChatState.providers[window.newTabChatState.currentProvider];
                if (providerConfig && providerConfig.default_model) {
                    window.newTabChatState.currentModel = providerConfig.default_model;
                } else if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
                    window.newTabChatState.currentModel = providerConfig.models[0].id;
                }
                updateNewTabChatModelSelect();
            };
            
            window.onNewTabModelChange = function() {
                var modelSelect = document.getElementById('newtab_chat_model');
                window.newTabChatState.currentModel = modelSelect.value;
            };
            
            window.closeNewTabPatentChat = function() {
                var modal = document.getElementById('newtab_patent_chat_modal');
                var ball = document.getElementById('newtab_chat_floating_ball');
                
                var messages = window.newTabChatState.messages || [];
                var nonSystemMessages = messages.filter(function(m) { return m.role !== 'system'; });
                
                if (nonSystemMessages.length >= 2 && window.opener && !window.opener.closed) {
                    var shouldSync = confirm('是否将本次对话记录同步到主页面历史？\\n\\n同步后可在主页面"功能一即时对话"中查看和继续此对话。');
                    
                    if (shouldSync) {
                        try {
                            if (window.opener.ChatHistorySync) {
                                window.opener.ChatHistorySync.syncToHistory(
                                    messages,
                                    'NEW_TAB_CHAT',
                                    {
                                        patentNumber: window.newTabChatState.patentNumber,
                                        patentTitle: window.newTabChatState.patentData && window.newTabChatState.patentData.title ? window.newTabChatState.patentData.title : '',
                                        model: window.newTabChatState.currentModel,
                                        thinkingMode: window.newTabChatState.thinkingModeEnabled || false
                                    }
                                );
                                alert('对话已同步到主页面历史记录！');
                            } else {
                                alert('主页面未加载对话同步模块，无法同步。');
                            }
                        } catch (e) {
                            console.error('同步对话失败:', e);
                            alert('同步失败，请确保主页面已加载完成。');
                        }
                    }
                }
                
                if (modal) modal.remove();
                if (ball) ball.remove();
                window.newTabChatState.messages = [];
            };
            
            window.clearNewTabChatHistory = function() {
                var historyEl = document.getElementById('newtab_chat_history');
                historyEl.innerHTML = '<div class="welcome-message" style="text-align: center; padding: 40px 20px; color: #666;"><div style="font-size: 48px; margin-bottom: 16px;">💬</div><p style="font-size: 16px; margin: 0;">暂无对话记录</p><p style="font-size: 14px; color: #999; margin-top: 8px;">在下方输入您的问题，开始与AI对话</p></div>';
                window.newTabChatState.messages = [];
            };
            
            window.stopNewTabChatStream = function() {
                window.newTabChatState.stopStreaming = true;
            };
            
            window.sendNewTabPatentChatMessage = async function() {
                var input = document.getElementById('newtab_chat_input');
                var message = input.value.trim();
                
                if (!message) return;
                
                input.value = '';
                
                var historyEl = document.getElementById('newtab_chat_history');
                var welcomeDiv = historyEl.querySelector('.welcome-message');
                if (welcomeDiv) welcomeDiv.remove();
                
                var userMsgDiv = document.createElement('div');
                userMsgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-end;';
                userMsgDiv.innerHTML = '<div style="max-width: 70%; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 12px 16px; border-radius: 16px 16px 4px 16px;"><div style="font-size: 14px; line-height: 1.5;">' + escapeHtmlNewTab(message) + '</div></div>';
                historyEl.appendChild(userMsgDiv);
                historyEl.scrollTop = historyEl.scrollHeight;
                
                var aiMsgDiv = document.createElement('div');
                aiMsgDiv.style.cssText = 'margin-bottom: 16px; display: flex; justify-content: flex-start;';
                aiMsgDiv.innerHTML = '<div style="max-width: 70%; background: white; padding: 12px 16px; border-radius: 16px 16px 16px 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8f5e9;"><div style="font-size: 14px; color: #666;">思考中...</div></div>';
                historyEl.appendChild(aiMsgDiv);
                historyEl.scrollTop = historyEl.scrollHeight;
                
                window.newTabChatState.isLoading = true;
                window.newTabChatState.stopStreaming = false;
                
                var sendBtn = document.getElementById('newtab_chat_send_btn');
                var stopBtn = document.getElementById('newtab_chat_stop_btn');
                sendBtn.style.display = 'none';
                stopBtn.style.display = 'inline-block';
                
                var contentDiv = aiMsgDiv.querySelector('div > div');
                
                try {
                    window.newTabChatState.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
                    
                    var patentInfo = window.newTabChatState.patentData;
                    var patentNumber = window.newTabChatState.patentNumber;
                    
                    var safeValue = function(val) {
                        if (!val) return '未知';
                        if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '未知';
                        return String(val);
                    };
                    
                    var safeArray = function(val, limit) {
                        limit = limit || 10;
                        if (!val || !Array.isArray(val) || val.length === 0) return '无';
                        return val.slice(0, limit).map(function(item, i) { return (i + 1) + '. ' + (typeof item === 'string' ? item : JSON.stringify(item)); }).join('\\n');
                    };
                    
                    var contextInfo = '你是一个专业的专利分析助手。当前正在分析专利号为 ' + patentNumber + ' 的专利。请基于以下完整的专利信息，准确、专业地回答用户的问题。\\n\\n';
                    contextInfo += '## 专利基本信息\\n';
                    contextInfo += '- **专利号**: ' + (patentInfo.patent_number || patentNumber) + '\\n';
                    contextInfo += '- **标题**: ' + (patentInfo.title || '无标题') + '\\n';
                    contextInfo += '- **申请日期**: ' + (patentInfo.application_date || patentInfo.filing_date || '未知') + '\\n';
                    contextInfo += '- **公开日期**: ' + (patentInfo.publication_date || '未知') + '\\n';
                    contextInfo += '- **授权日期**: ' + (patentInfo.grant_date || '未知') + '\\n';
                    contextInfo += '- **优先权日期**: ' + (patentInfo.priority_date || '未知') + '\\n';
                    contextInfo += '- **法律状态**: ' + (patentInfo.legal_status || '未知') + '\\n';
                    contextInfo += '\\n## 申请人与发明人\\n';
                    contextInfo += '- **申请人/受让人**: ' + safeValue(patentInfo.assignees || patentInfo.applicant) + '\\n';
                    contextInfo += '- **发明人**: ' + safeValue(patentInfo.inventors || patentInfo.inventor) + '\\n';
                    contextInfo += '\\n## 分类信息\\n';
                    contextInfo += '- **IPC分类**: ' + safeValue(patentInfo.ipc_classification) + '\\n';
                    contextInfo += '- **CPC分类**: ' + safeValue(patentInfo.cpc_classification) + '\\n';
                    
                    if (patentInfo.abstract) {
                        contextInfo += '\\n## 摘要\\n' + patentInfo.abstract + '\\n';
                    }
                    
                    var fullContextCheckbox = document.getElementById('newtab_chat_full_context');
                    var useFullContext = fullContextCheckbox && fullContextCheckbox.checked;
                    
                    if (patentInfo.claims && patentInfo.claims.length > 0) {
                        contextInfo += '\\n## 权利要求\\n';
                        if (useFullContext) {
                            patentInfo.claims.forEach(function(claim, i) {
                                var claimText = typeof claim === 'string' ? claim : (claim.text || JSON.stringify(claim));
                                contextInfo += (i + 1) + '. ' + claimText + '\\n';
                            });
                        } else {
                            contextInfo += safeArray(patentInfo.claims, 20) + '\\n';
                        }
                    }
                    
                    if (patentInfo.description) {
                        var descText = typeof patentInfo.description === 'string' ? patentInfo.description : JSON.stringify(patentInfo.description);
                        if (useFullContext) {
                            contextInfo += '\\n## 说明书\\n' + descText + '\\n';
                        } else {
                            var truncatedDesc = descText.length > 5000 ? descText.substring(0, 5000) + '...(内容过长已截断)' : descText;
                            contextInfo += '\\n## 说明书\\n' + truncatedDesc + '\\n';
                        }
                    }
                    
                    if (patentInfo.patent_citations && patentInfo.patent_citations.length > 0) {
                        contextInfo += '\\n## 引用专利\\n';
                        patentInfo.patent_citations.slice(0, 10).forEach(function(c, i) {
                            contextInfo += (i + 1) + '. ' + (c.patent_number || c) + (c.title ? ': ' + c.title : '') + '\\n';
                        });
                    }
                    
                    if (patentInfo.cited_by && patentInfo.cited_by.length > 0) {
                        contextInfo += '\\n## 被引用专利\\n';
                        patentInfo.cited_by.slice(0, 10).forEach(function(c, i) {
                            contextInfo += (i + 1) + '. ' + (c.patent_number || c) + (c.title ? ': ' + c.title : '') + '\\n';
                        });
                    }
                    
                    if (patentInfo.legal_events && patentInfo.legal_events.length > 0) {
                        contextInfo += '\\n## 法律事件\\n';
                        patentInfo.legal_events.slice(0, 10).forEach(function(e, i) {
                            contextInfo += (i + 1) + '. ' + (e.date || '') + ': ' + (e.event || e.description || '') + '\\n';
                        });
                    }
                    
                    contextInfo += '\\n请基于以上完整的专利信息，准确、专业地回答用户的问题。回答时可以使用Markdown格式来组织内容，使其更易读。';
                    
                    var apiMessages = [
                        { role: 'system', content: contextInfo }
                    ];
                    
                    var filteredMessages = window.newTabChatState.messages.filter(function(m) { return m.role !== 'system'; });
                    for (var i = 0; i < filteredMessages.length; i++) {
                        apiMessages.push(filteredMessages[i]);
                    }
                    
                    var requestBody = {
                        model: window.newTabChatState.currentModel,
                        messages: apiMessages,
                        temperature: 0.7,
                        stream: true
                    };
                    
                    if (window.newTabChatState.currentProvider === 'aliyun') {
                        requestBody.provider = 'aliyun';
                    }
                    
                    var headers = { 'Content-Type': 'application/json' };
                    
                    if (window.newTabChatState.currentProvider === 'aliyun') {
                        var aliyunKey = window.newTabChatState.apiKeys.aliyun;
                        if (!aliyunKey) throw new Error('请先配置阿里云API密钥');
                        headers['X-LLM-Provider'] = 'aliyun';
                        headers['Authorization'] = 'Bearer ' + aliyunKey;
                    } else {
                        var apiKey = window.newTabChatState.apiKeys.zhipu;
                        if (!apiKey) throw new Error('请先配置智谱API密钥');
                        headers['Authorization'] = 'Bearer ' + apiKey;
                    }
                    
                    var response = await fetch('/api/stream_chat', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (!response.ok) {
                        var errorData = await response.json().catch(function() { return {}; });
                        throw new Error(errorData.error || 'API请求失败: ' + response.status);
                    }
                    
                    var reader = response.body.getReader();
                    var decoder = new TextDecoder();
                    var fullContent = '';
                    var buffer = '';
                    
                    contentDiv.textContent = '';
                    
                    while (true) {
                        if (window.newTabChatState.stopStreaming) break;
                        
                        var result = await reader.read();
                        var value = result.value;
                        var done = result.done;
                        
                        if (value) buffer += decoder.decode(value, { stream: !done });
                        if (done) break;
                        
                        var lines = buffer.split('\\n\\n');
                        buffer = lines.pop() || '';
                        
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];
                            if (!line.trim() || !line.startsWith('data:')) continue;
                            
                            var jsonStr = line.substring(5).trim();
                            if (jsonStr === '[DONE]') continue;
                            
                            try {
                                var data = JSON.parse(jsonStr);
                                var content = data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content ? data.choices[0].delta.content : (data.content || '');
                                if (content) {
                                    fullContent += content;
                                    contentDiv.innerHTML = formatChatContentNewTab(fullContent);
                                    historyEl.scrollTop = historyEl.scrollHeight;
                                }
                            } catch (e) {}
                        }
                    }
                    
                    if (fullContent) {
                        window.newTabChatState.messages.push({ role: 'assistant', content: fullContent, timestamp: new Date().toISOString() });
                    }
                    
                } catch (error) {
                    console.error('发送失败:', error);
                    contentDiv.innerHTML = '<span style="color: #c62828;">发送失败: ' + escapeHtmlNewTab(error.message) + '</span>';
                } finally {
                    window.newTabChatState.isLoading = false;
                    sendBtn.style.display = 'inline-block';
                    stopBtn.style.display = 'none';
                }
            };
            
            function formatChatContentNewTab(content) {
                var formatted = content;
                
                formatted = formatted.replace(/```(\\\\w*)\\\\n([\\\\s\\\\S]*?)```/g, function(match, lang, code) {
                    return '<pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code style="font-family: monospace; font-size: 13px;">' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
                });
                
                formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>');
                
                formatted = formatted.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                formatted = formatted.replace(/^### (.+)$/gm, '<h4 style="margin: 12px 0 6px 0; font-weight: 600;">$1</h4>');
                formatted = formatted.replace(/^## (.+)$/gm, '<h3 style="margin: 14px 0 8px 0; font-weight: 600;">$1</h3>');
                formatted = formatted.replace(/^# (.+)$/gm, '<h2 style="margin: 16px 0 10px 0; font-weight: 700;">$1</h2>');
                
                formatted = formatted.replace(/\\\\*\\\\*(.+?)\\\\*\\\\*/g, '<strong>$1</strong>');
                formatted = formatted.replace(/\\\\*(.+?)\\\\*/g, '<em>$1</em>');
                
                formatted = formatted.replace(/^[-*] (.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
                formatted = formatted.replace(/(<li.*<\\\\/li>\\\\n?)+/g, '<ul style="margin: 8px 0;">$&</ul>');
                
                formatted = formatted.replace(/^(\\\\d+)\\\\. (.+)$/gm, '<li style="margin-left: 20px;">$2</li>');
                
                formatted = formatted.replace(/\\\\n/g, '<br>');
                
                return formatted;
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

    window._openPatentDetailInNewTabImpl = function(patentNumber) {
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

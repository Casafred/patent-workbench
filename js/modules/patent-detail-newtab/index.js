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

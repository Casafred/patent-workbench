window.PatentDetailSections = {
    buildClaims: function(data, selectedFields, patentNumber) {
        const U = window.PatentDetailUtils;
        if (!data.claims || data.claims.length === 0 || !U.shouldShowField('claims', selectedFields)) return '';
        
        let claimsHtml = '';
        data.claims.forEach((claim, index) => {
            let claimText, claimType;
            if (typeof claim === 'string') {
                claimText = claim;
                if (claimText.includes('[从属]') || claimText.includes('<claim-ref') || claimText.match(/claim\s*\d+/i)) {
                    claimType = 'dependent';
                } else {
                    claimType = 'independent';
                }
                claimText = claimText.replace(/\[\d+\]\[从属\]\s*/g, '').replace(/\[\d+\]\s*/g, '');
            } else {
                claimText = claim.text;
                claimType = claim.type || 'unknown';
            }
            
            let claimClass = 'claim-item';
            if (claimType === 'independent') {
                claimClass += ' claim-independent';
            } else if (claimType === 'dependent') {
                claimClass += ' claim-dependent';
            }
            
            const safeClaimText = U.safeStr(claimText);
            
            claimsHtml += `
                <div class="${claimClass}" data-claim-number="${index + 1}" data-claim-text="${safeClaimText.replace(/"/g, '&quot;')}">
                    <div class="claim-number">权利要求 ${index + 1}${claimType === 'independent' ? ' <span style="color: #2e7d32; font-size: 0.85em;">(独立权利要求)</span>' : claimType === 'dependent' ? ' <span style="color: #1976d2; font-size: 0.85em;">(从属权利要求)</span>' : ''}</div>
                    <div class="claim-text">${safeClaimText}</div>
                </div>
            `;
        });
        
        return `
            <div class="section collapsible-section collapsed" id="claims" data-section-id="claims">
                <h2 class="section-title" onclick="toggleSection(event, 'claims')">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/><path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg></span>
                        权利要求 (${data.claims.length})
                    </div>
                    <div class="section-actions" style="margin-left: auto; display: flex; gap: 8px;">
                        <button class="copy-section-btn translate-btn" onclick="showTranslateDialogNewTab(event, 'claims')" title="快捷翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138-1.718-.312 2.5h2.146z"/></svg>
                            翻译
                        </button>
                        <button class="copy-section-btn" onclick="copyClaimsWithNumbers(event)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制
                        </button>
                    </div>
                </h2>
                <div class="section-content">
                    <div class="claims-list" data-section-content="claims">
                        ${claimsHtml}
                    </div>
                </div>
            </div>
        `;
    },

    buildDescription: function(data, selectedFields) {
        const U = window.PatentDetailUtils;
        if (!data.description || !U.shouldShowField('description', selectedFields)) return '';
        
        const desc = data.description || '';
        const processed = desc.replace(/(\[[A-Z\s]+\])/g, '<br/><br/><strong style="font-size: 1.1em; color: #2e7d32;">$1</strong><br/><br/>').replace(/\n/g, '<br/>');
        
        return `
            <div class="section collapsible-section collapsed" id="description" data-section-id="description">
                <h2 class="section-title" onclick="toggleSection(event, 'description')">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-11zm1 1v9h8v-9h-8z"/><path d="M5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg></span>
                        说明书
                    </div>
                    <div class="section-actions" style="margin-left: auto; display: flex; gap: 8px;">
                        <button class="copy-section-btn translate-btn" onclick="showTranslateDialogNewTab(event, 'description')" title="快捷翻译" style="background: linear-gradient(135deg, #00bcd4 0%, #009688 100%) !important;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138-1.718-.312 2.5h2.146z"/></svg>
                            翻译
                        </button>
                        <button class="copy-section-btn" onclick="copySectionContent(event, 'description', '说明书')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制
                        </button>
                    </div>
                </h2>
                <div class="section-content">
                    <div class="abstract-box" style="white-space: pre-wrap; line-height: 1.8;" data-section-content="description">
                        ${U.safeStr(processed)}
                    </div>
                </div>
            </div>
        `;
    },

    buildClassifications: function(data, selectedFields) {
        const U = window.PatentDetailUtils;
        if ((!data.classifications || data.classifications.length === 0 || !U.shouldShowField('classifications', selectedFields)) && 
            (!data.landscapes || data.landscapes.length === 0 || !U.shouldShowField('landscapes', selectedFields))) {
            return '';
        }
        
        let cpcHtml = '';
        if (data.classifications && data.classifications.length > 0 && U.shouldShowField('classifications', selectedFields)) {
            cpcHtml = `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2e7d32; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>
                        CPC分类 (${data.classifications.length})
                    </h3>
                    <div class="cpc-grid">
                        ${data.classifications.map(cls => `
                        <div class="cpc-card">
                            <div class="cpc-code">${U.safeStr(cls.leaf_code || cls.code)}</div>
                            <div class="cpc-desc">${U.safeStr(cls.leaf_description || cls.description)}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        let landscapesHtml = '';
        if (data.landscapes && data.landscapes.length > 0 && U.shouldShowField('landscapes', selectedFields)) {
            landscapesHtml = `
                <div>
                    <h3 style="color: #2e7d32; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49A6.95 6.95 0 0 0 1.674 11H3.82zm10.026-2.5a13.65 13.65 0 0 1-.312 2.5h2.146c.22-.765.368-1.608.426-2.5h-2.26zm-1.068 2.5c-.138.386-.295.744-.468 1.068-.552 1.035-1.218 1.65-1.887 1.855V12h2.355zm.182 2.472A6.696 6.696 0 0 0 13.91 12h1.835a7.024 7.024 0 0 1-3.072 2.472zM14.326 11a6.95 6.95 0 0 0 .656-2.5h-2.49c-.03.877-.138-1.718-.312 2.5h2.146z"/></svg>
                        技术领域 (${data.landscapes.length})
                    </h3>
                    <div class="tag-list">
                        ${data.landscapes.map(landscape => `
                        <span class="tag">${U.safeStr(landscape.name)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="section" id="classifications" data-section-id="classifications">
                <h2 class="section-title">
                    <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg></span>
                    分类信息
                </h2>
                <div class="section-content">
                    ${cpcHtml}
                    ${landscapesHtml}
                </div>
            </div>
        `;
    },

    buildEventsCombined: function(data, selectedFields) {
        const U = window.PatentDetailUtils;
        const hasTimeline = data.events_timeline && data.events_timeline.length > 0 && U.shouldShowField('events_timeline', selectedFields);
        const hasLegalEvents = data.legal_events && data.legal_events.length > 0 && U.shouldShowField('legal_events', selectedFields);
        
        if (!hasTimeline && !hasLegalEvents) return '';
        
        let timelineHtml = '';
        if (hasTimeline) {
            timelineHtml = `
                <div class="tab-content active" id="timeline-tab" style="display: block;">
                    <div class="timeline">
                        ${[...data.events_timeline].reverse().map(event => `
                        <div class="timeline-item">
                            <div class="timeline-date">${U.safeStr(event.date)}</div>
                            <div class="timeline-title">${U.safeStr(event.title || event.description)}</div>
                            ${event.type ? `<div class="timeline-type">${U.safeStr(event.type)}</div>` : ''}
                        </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        let legalEventsHtml = '';
        if (hasLegalEvents) {
            legalEventsHtml = `
                <div class="tab-content" id="legal-events-tab" style="display: none;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>代码</th>
                                <th>描述</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[...data.legal_events].reverse().map(event => `
                            <tr>
                                <td>${U.safeStr(event.date)}</td>
                                <td>${U.safeStr(event.code) || '-'}</td>
                                <td>${U.safeStr(event.description || event.title) || '-'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return `
            <div class="section" id="events-combined">
                <h2 class="section-title">
                    <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg></span>
                    事件信息
                </h2>
                <div class="tab-container" style="margin-top: 15px;">
                    <div class="tab-header" style="display: flex; border-bottom: 2px solid #e0e0e0; margin-bottom: 15px;">
                        ${hasTimeline ? `<button class="tab-btn active" data-tab="timeline-tab" onclick="switchEventTab('timeline-tab')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #2e7d32; border-bottom: 2px solid #2e7d32; margin-bottom: -2px;">时间轴 (${data.events_timeline.length})</button>` : ''}
                        ${hasLegalEvents ? `<button class="tab-btn" data-tab="legal-events-tab" onclick="switchEventTab('legal-events-tab')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px;">法律事件 (${data.legal_events.length})</button>` : ''}
                    </div>
                    ${timelineHtml}
                    ${legalEventsHtml}
                </div>
            </div>
        `;
    },

    buildFamily: function(data, selectedFields, patentNumber) {
        const U = window.PatentDetailUtils;
        const hasFamilyId = data.family_id && U.shouldShowField('family_id', selectedFields);
        const hasFamilyApps = data.family_applications && data.family_applications.length > 0 && U.shouldShowField('family_applications', selectedFields);
        
        if (!hasFamilyId && !hasFamilyApps) return '';
        
        let familyAppsHtml = '';
        if (hasFamilyApps) {
            familyAppsHtml = `
                <table class="data-table" id="family-table" data-patent-number="${U.safeStr(patentNumber)}">
                    <thead>
                        <tr>
                            <th>申请号</th>
                            <th>状态</th>
                            <th>公开号</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.family_applications.map(app => `
                        <tr>
                            <td>${U.safeStr(app.application_number)}</td>
                            <td>${U.safeStr(app.status) || '-'}</td>
                            <td>${U.safeStr(app.publication_number) || '-'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        return `
            <div class="section" id="family">
                <h2 class="section-title">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg></span>
                        同族信息 ${data.family_applications ? '(' + data.family_applications.length + ')' : ''}
                    </div>
                    <div class="section-actions" style="margin-left: auto; display: flex; gap: 8px;">
                        ${data.family_applications && data.family_applications.length > 0 ? `
                        <button class="copy-section-btn" onclick="copyFamilyPublicationNumbers(event)" title="复制所有公开号">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="14" height="14">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制公开号
                        </button>
                        ` : ''}
                        ${data.family_applications && data.family_applications.length > 1 ? `
                        <button class="copy-section-btn" onclick="jumpToFamilyComparisonFromNewTab(event, '${U.safeStr(patentNumber)}')" title="跳转到功能四进行同族权利要求对比分析" style="background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%) !important;">
                            同族对比
                        </button>
                        ` : ''}
                        ${data.family_applications && data.family_applications.length > 0 ? `
                        <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${U.safeStr(patentNumber)}', 'family')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            分析同族专利
                        </button>
                        ` : ''}
                    </div>
                </h2>
                ${hasFamilyId ? `<div class="info-card" style="margin-bottom: 20px;"><div class="info-label">同族ID</div><div class="info-value">${U.safeStr(data.family_id)}</div></div>` : ''}
                ${familyAppsHtml}
            </div>
        `;
    },

    buildRelatedPatents: function(data, selectedFields, patentNumber) {
        const U = window.PatentDetailUtils;
        const hasCitations = data.patent_citations && data.patent_citations.length > 0 && U.shouldShowField('patent_citations', selectedFields);
        const hasCitedBy = data.cited_by && data.cited_by.length > 0 && U.shouldShowField('cited_by', selectedFields);
        const hasSimilar = data.similar_documents && data.similar_documents.length > 0 && U.shouldShowField('similar_documents', selectedFields);
        
        if (!hasCitations && !hasCitedBy && !hasSimilar) return '';
        
        let citationsHtml = '';
        if (hasCitations) {
            citationsHtml = `
                <div class="tab-content active" id="citations-tab" style="display: block;">
                    <div class="section-actions" style="margin-bottom: 15px; display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
                        <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${U.safeStr(patentNumber)}', 'citations')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            分析引用专利
                        </button>
                        <button class="copy-section-btn" onclick="copyPatentNumbersListFromTab(event, 'citations-tab')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制专利号
                        </button>
                    </div>
                    <table class="data-table" id="citations-table" data-patent-number="${U.safeStr(patentNumber)}">
                        <thead>
                            <tr>
                                <th>专利号</th>
                                <th>标题</th>
                                <th>审查员引用</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.patent_citations.map(citation => `
                            <tr data-patent-number="${U.safeStr(citation.patent_number)}">
                                <td>${U.safeStr(citation.patent_number)}${citation.examiner_cited ? ' <span style="color: #d32f2f; font-weight: bold;">*</span>' : ''}</td>
                                <td>${U.safeStr(citation.title) || '-'}</td>
                                <td>${citation.examiner_cited ? '<span style="color: #d32f2f; font-weight: bold;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle;"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> 审查员引用</span>' : '-'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        let citedByHtml = '';
        if (hasCitedBy) {
            citedByHtml = `
                <div class="tab-content" id="cited-by-tab" style="display: none;">
                    <div class="section-actions" style="margin-bottom: 15px; display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
                        <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${U.safeStr(patentNumber)}', 'cited_by')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            分析被引用专利
                        </button>
                        <button class="copy-section-btn" onclick="copyPatentNumbersListFromTab(event, 'cited-by-tab')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制专利号
                        </button>
                    </div>
                    <table class="data-table" id="cited-by-table" data-patent-number="${U.safeStr(patentNumber)}">
                        <thead>
                            <tr>
                                <th>专利号</th>
                                <th>标题</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.cited_by.map(citation => `
                            <tr data-patent-number="${U.safeStr(citation.patent_number)}">
                                <td>${U.safeStr(citation.patent_number)}</td>
                                <td>${U.safeStr(citation.title) || '-'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        let similarHtml = '';
        if (hasSimilar) {
            similarHtml = `
                <div class="tab-content" id="similar-tab" style="display: none;">
                    <div class="section-actions" style="margin-bottom: 15px; display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
                        <button class="copy-section-btn analyze-btn" onclick="analyzeRelationPatents(event, '${U.safeStr(patentNumber)}', 'similar')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            分析相似专利
                        </button>
                        <button class="copy-section-btn" onclick="copyPatentNumbersListFromTab(event, 'similar-tab')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                            </svg>
                            复制专利号
                        </button>
                    </div>
                    <table class="data-table" id="similar-table" data-patent-number="${U.safeStr(patentNumber)}">
                        <thead>
                            <tr>
                                <th>专利号</th>
                                <th>语言</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.similar_documents.map(doc => `
                            <tr data-patent-number="${U.safeStr(doc.patent_number)}">
                                <td>${U.safeStr(doc.patent_number)}</td>
                                <td>${doc.language || '-'}</td>
                                <td><a href="${doc.link}" target="_blank" style="color: #2e7d32;">查看</a></td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return `
            <div class="section collapsible-section collapsed" id="related-patents" data-section-id="related-patents">
                <h2 class="section-title" onclick="toggleSection(event, 'related-patents')">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg></span>
                        相关专利
                    </div>
                </h2>
                <div class="section-content">
                    <div class="tab-container" style="margin-top: 15px;">
                        <div class="tab-header" style="display: flex; border-bottom: 2px solid #e0e0e0; margin-bottom: 15px;">
                            ${hasCitations ? `<button class="tab-btn active" data-tab="citations-tab" onclick="switchRelatedPatentsTab('citations-tab')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #2e7d32; border-bottom: 2px solid #2e7d32; margin-bottom: -2px;">引用专利 (${data.patent_citations.length})</button>` : ''}
                            ${hasCitedBy ? `<button class="tab-btn" data-tab="cited-by-tab" onclick="switchRelatedPatentsTab('cited-by-tab')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px;">被引用专利 (${data.cited_by.length})</button>` : ''}
                            ${hasSimilar ? `<button class="tab-btn" data-tab="similar-tab" onclick="switchRelatedPatentsTab('similar-tab')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px;">相似文档 (${data.similar_documents.length})</button>` : ''}
                        </div>
                        ${citationsHtml}
                        ${citedByHtml}
                        ${similarHtml}
                    </div>
                </div>
            </div>
        `;
    },

    buildAnalysisResult: function(analysisResult) {
        if (!analysisResult) return '';
        
        const U = window.PatentDetailUtils;
        let analysisJson = {};
        let displayContent = '';
        
        try {
            let cleanContent = analysisResult.analysis_content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            analysisJson = JSON.parse(cleanContent);
            
            let tableRows = '';
            Object.keys(analysisJson).forEach(key => {
                const value = analysisJson[key];
                let displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
                const escapedKey = U.safeStr(key);
                tableRows += `<tr><td style="border: 1px solid #ddd; padding: 12px; font-weight: 500; background-color: #f8f9fa; width: 30%;">${escapedKey}</td><td style="border: 1px solid #ddd; padding: 12px;">${displayValue}</td></tr>`;
            });
            
            displayContent = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white;">
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; width: 30%;">字段</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">内容</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
        } catch (e) {
            const escapedContent = U.safeStr(analysisResult.analysis_content);
            displayContent = `
                <div style="padding: 15px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 15px;">
                    解读结果未能解析为结构化格式，显示原始内容：
                </div>
                <div style="white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
                    ${escapedContent}
                </div>
            `;
        }
        
        return `
            <div class="section" id="analysis-result" data-section-id="analysis-result">
                <h2 class="section-title" onclick="toggleSection(event, 'analysis-result')">
                    <div class="section-title-content">
                        <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.5A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5ZM2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 3Z"/></svg></span>
                        AI 解读结果
                    </div>
                </h2>
                <div class="section-content">
                    <div style="padding: 15px; background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%); border-radius: 8px; border-left: 4px solid #2e7d32;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px;">
                            <span style="background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">AI</span>
                            <span style="color: #666; font-size: 0.9em;">以下解读由AI生成，仅供参考</span>
                        </div>
                        ${displayContent}
                    </div>
                </div>
            </div>
        `;
    }
};

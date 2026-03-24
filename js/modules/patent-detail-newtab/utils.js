window.PatentDetailUtils = {
    safeStr: function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');
    },

    safeJsonStringify: function(obj) {
        if (obj === null || obj === undefined) return 'null';
        try {
            let jsonStr = JSON.stringify(obj);
            jsonStr = jsonStr
                .replace(/\\/g, '\\\\')
                .replace(/`/g, '\\`')
                .replace(/\$/g, '\\$');
            return jsonStr;
        } catch (e) {
            console.error('safeJsonStringify error:', e);
            return '{}';
        }
    },

    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatContent: function(content) {
        let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return formatted;
    },

    FIELD_MAPPING: {
        'abstract': ['abstract'],
        'claims': ['claims'],
        'description': ['description'],
        'classifications': ['classifications'],
        'landscapes': ['landscapes'],
        'family_id': ['family_id'],
        'family_applications': ['family_applications'],
        'country_status': ['country_status'],
        'patent_citations': ['patent_citations'],
        'cited_by': ['cited_by'],
        'events_timeline': ['events_timeline'],
        'legal_events': ['legal_events'],
        'similar_documents': ['similar_documents'],
        'drawings': ['drawings'],
        'pdf_link': ['pdf_link'],
        'external_links': ['external_links']
    },

    shouldShowField: function(fieldKey, selectedFields) {
        if (!selectedFields || selectedFields.length === 0) {
            return true;
        }
        
        const baseFields = ['patent_number', 'title', 'abstract', 'applicant', 'inventor', 'filing_date', 'publication_date', 'priority_date', 'ipc_classification', 'url'];
        if (baseFields.includes(fieldKey)) {
            return true;
        }
        
        for (const selectedField of selectedFields) {
            const mappedFields = this.FIELD_MAPPING[selectedField];
            if (mappedFields && mappedFields.includes(fieldKey)) {
                return true;
            }
        }
        
        return false;
    },

    fieldToNavMap: {
        'classifications': 'classifications',
        'landscapes': 'landscapes',
        'claims': 'claims',
        'events_timeline': 'timeline',
        'legal_events': 'legal-events',
        'family_id': 'family',
        'family_applications': 'family',
        'country_status': 'family',
        'external_links': 'external-links',
        'patent_citations': 'citations',
        'cited_by': 'cited-by',
        'similar_documents': 'similar',
        'description': 'description'
    },

    isNavFieldSelected: function(navId, selectedFields) {
        if (!selectedFields || selectedFields.length === 0) {
            return true;
        }
        
        const baseNavIds = ['abstract', 'basic-info'];
        if (baseNavIds.includes(navId)) {
            return true;
        }
        
        for (const [field, nav] of Object.entries(this.fieldToNavMap)) {
            if (nav === navId) {
                return selectedFields.includes(field);
            }
        }
        
        return true;
    },

    buildNavItem: function(navId, icon, label, selectedFields) {
        const isSelected = this.isNavFieldSelected(navId, selectedFields);
        if (isSelected) {
            return `<a href="#${navId}" class="side-nav-item" data-section="${navId}">${icon} ${label}</a>`;
        } else {
            return `<a href="#" class="side-nav-item disabled" data-section="${navId}" onclick="event.preventDefault(); return false;" title="该字段未被爬取" style="color: #ccc; cursor: not-allowed;">${icon} <span style="text-decoration: line-through;">${label}</span></a>`;
        }
    },

    makeDraggable: function(element) {
        const dragHandle = element.querySelector('.drag-handle');
        if (!dragHandle) return;
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        dragHandle.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            element.style.right = 'auto';
            element.style.left = startLeft + 'px';
            element.style.top = startTop + 'px';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = (startLeft + dx) + 'px';
            element.style.top = (startTop + dy) + 'px';
        });
        
        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
    }
};

/**
 * 内容类型识别规则
 * 用于 SmartClipboard 自动识别剪贴板内容类型
 */

const ContentTypeRules = {
    // 专利号列表：CN/US/EP/WO/JP/KR开头，数字+字母组合
    'patent-numbers': {
        name: '专利号列表',
        icon: '📋',
        patterns: [
            // 标准专利号格式
            /^(CN|US|EP|WO|JP|KR)\d+[\d\.]*[A-Z\d]{0,3}$/mi,
            // 带逗号的专利号
            /(?:CN|US|EP|WO|JP|KR)\d+[\d\.]*[A-Z\d]{0,3}/g,
            // 美国专利格式
            /US\s*\d{1,2},?\d{3},?\d{3}\s*B\d?/i
        ],
        minMatches: 1,
        priority: 10,
        extractMatches: (text) => {
            const patterns = [
                /(CN|US|EP|WO|JP|KR)\d+[\d\.]*[A-Z\d]{0,3}/gi,
                /US\s*\d{1,2},?\d{3},?\d{3}\s*B\d?/gi
            ];
            const matches = new Set();
            patterns.forEach(pattern => {
                const found = text.match(pattern);
                if (found) found.forEach(m => matches.add(m.replace(/\s/g, '').toUpperCase()));
            });
            return Array.from(matches);
        }
    },

    // 权利要求文本
    'claims-text': {
        name: '权利要求文本',
        icon: '📄',
        patterns: [
            /权利要求[书\s]*[\d一二三四五六七八九十]+/,
            /其特征在于/,
            /characterized\s+in\s+that/i,
            /^(1|一)[\.、\s]+.*?(?:其特征在于|characterized)/m,
            /^(\d+)[\.、\s]+[一-龥]+.*?(?:包括|包含|具有)/m,
            /根据权利要求\s*\d+.*所述/mi
        ],
        minMatches: 2,
        priority: 9,
        extractMatches: (text) => {
            // 提取各条权利要求
            const claimPattern = /^(\d+)[\.、\s]+([\s\S]*?)(?=^\d+[\.、\s]+|$)/gm;
            const claims = [];
            let match;
            while ((match = claimPattern.exec(text)) !== null) {
                claims.push({
                    number: match[1].trim(),
                    text: match[2].trim()
                });
            }
            return claims;
        }
    },

    // 专利表格数据
    'patent-table': {
        name: '专利表格数据',
        icon: '📊',
        patterns: [
            /公开号|专利号|申请号.*标题|发明名称/i,
            /\t.*\t.*\t/,  // 制表符分隔
            /[,;]\s*(CN|US|EP|WO)\d+/,  // CSV格式含专利号
            /^[^\n]+\t[^\n]+\t[^\n]+$/m  // 多列制表符格式
        ],
        minMatches: 1,
        priority: 8,
        extractMatches: (text) => {
            // 尝试解析为表格
            const lines = text.trim().split('\n');
            if (lines.length < 2) return null;

            // 检测分隔符
            const delimiter = text.includes('\t') ? '\t' : ',';
            const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));

            return {
                headers: rows[0],
                data: rows.slice(1),
                delimiter
            };
        }
    },

    // AI分析结果 (Markdown格式)
    'ai-analysis': {
        name: 'AI分析结果',
        icon: '🤖',
        patterns: [
            /^#{1,6}\s+/m,           // Markdown标题
            /```[\s\S]*?```/,        // 代码块
            /\*\*.*?\*\*/,           // 加粗
            /\[.*?\]\(.*?\)/,        // 链接
            /^[-*]\s+/m,             // 列表
            /^\d+\.\s+/m             // 有序列表
        ],
        minMatches: 2,
        priority: 5
    },

    // JSON数据
    'json-data': {
        name: 'JSON数据',
        icon: '🔧',
        patterns: [
            /^\s*[\{\[]/,
            /"[\w_]+":\s*"/,
            /"[\w_]+":\s*\d+/,
            /"[\w_]+":\s*(true|false|null)/
        ],
        minMatches: 2,
        priority: 6,
        extractMatches: (text) => {
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        }
    },

    // 普通文本
    'plain-text': {
        name: '普通文本',
        icon: '📝',
        patterns: [/.+/],
        minMatches: 1,
        priority: 1
    }
};

/**
 * 目标位置匹配表
 * 定义每种内容类型可以粘贴到的目标位置
 */
const TargetMappings = {
    // 专利号列表 可粘贴到
    'patent-numbers': [
        { 
            target: '#patent_numbers_input', 
            label: '功能六-专利号输入', 
            module: 'patent-batch',
            action: 'replace',
            description: '批量查询专利'
        },
        { 
            target: '#lpl_family_col_name', 
            label: '功能四-同族列名', 
            module: 'local-patent-lib',
            action: 'info',
            description: '查看同族专利'
        },
        { 
            target: '#async_manual_input', 
            label: '功能二-手动输入', 
            module: 'async-batch',
            action: 'replace',
            description: '批量异步处理'
        },
        {
            target: '#chat_input',
            label: '功能一-对话输入',
            module: 'instant-chat',
            action: 'append',
            description: '讨论这些专利'
        }
    ],

    // 权利要求文本 可粘贴到
    'claims-text': [
        { 
            target: '#claims_text_input', 
            label: '功能七-文本分析', 
            module: 'claims-processor',
            action: 'replace',
            description: '分析权利要求结构'
        },
        { 
            target: '[id^="claim_text_"]', 
            label: '功能五-对比输入', 
            module: 'claims-comparison',
            action: 'append',
            description: '添加到对比版本'
        },
        { 
            target: '#chat_input', 
            label: '功能一-对话', 
            module: 'instant-chat',
            action: 'append',
            description: '讨论权利要求'
        },
        {
            target: '#claims_excel_file',
            label: '功能七-Excel分析',
            module: 'claims-processor',
            action: 'file-simulate',
            description: '生成Excel后分析'
        }
    ],

    // 专利表格 可粘贴到
    'patent-table': [
        { 
            target: '#lpl_new_file_input', 
            label: '功能四-新库文件', 
            module: 'local-patent-lib',
            action: 'file-simulate',
            description: '合并到专利库'
        },
        { 
            target: '#gen_file-input', 
            label: '功能三-Excel上传', 
            module: 'large-batch',
            action: 'file-simulate',
            description: '大批量处理'
        },
        { 
            target: '#claims_excel_file', 
            label: '功能七-Excel分析', 
            module: 'claims-processor',
            action: 'file-simulate',
            description: '分析权利要求'
        },
        {
            target: '#async_excel_file',
            label: '功能二-Excel上传',
            module: 'async-batch',
            action: 'file-simulate',
            description: '异步批处理'
        }
    ],

    // AI分析结果 可粘贴到
    'ai-analysis': [
        { 
            target: '#chat_input', 
            label: '功能一-讨论', 
            module: 'instant-chat',
            action: 'append',
            description: '继续讨论'
        },
        { 
            target: '#claims_text_input', 
            label: '功能七-分析', 
            module: 'claims-processor',
            action: 'replace',
            description: '分析内容'
        },
        { 
            target: '#async_system_prompt', 
            label: '功能二-系统提示', 
            module: 'async-batch',
            action: 'replace',
            description: '设为处理模板'
        },
        {
            target: '#api-system-prompt',
            label: '功能三-系统提示',
            module: 'large-batch',
            action: 'replace',
            description: '设为批处理模板'
        }
    ],

    // JSON数据 可粘贴到
    'json-data': [
        {
            target: '#chat_input',
            label: '功能一-讨论',
            module: 'instant-chat',
            action: 'append',
            description: '讨论JSON数据'
        },
        {
            target: '#async_output_fields_container',
            label: '功能二-输出字段',
            module: 'async-batch',
            action: 'replace',
            description: '设置输出字段'
        }
    ],

    // 普通文本 通用
    'plain-text': [
        { 
            target: 'textarea:not([readonly])', 
            label: '任意文本框', 
            module: 'any',
            action: 'focus-paste',
            description: '粘贴到当前焦点'
        }
    ]
};

/**
 * 模块名称映射
 */
const ModuleNames = {
    'instant-chat': '功能一：即时对话',
    'async-batch': '功能二：异步批处理',
    'large-batch': '功能三：大批量处理',
    'local-patent-lib': '功能四：本地专利库',
    'claims-comparison': '功能五：权利要求对比',
    'patent-batch': '功能六：批量专利解读',
    'claims-processor': '功能七：权利要求分析器',
    'drawing-marker': '功能八：附图标记',
    'any': '任意位置'
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentTypeRules, TargetMappings, ModuleNames };
}

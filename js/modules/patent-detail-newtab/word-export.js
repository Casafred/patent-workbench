window.PatentDetailWordExport = {
    exportPatentToWord: async function(patentNumber, patentData, analysisResult) {
        const self = this;
        
        if (typeof docx === 'undefined') {
            alert('Word导出库未加载，请刷新页面后重试');
            return;
        }
        
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageBreak } = docx;
        
        try {
            const sections = [];
            
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '专利详情报告',
                            bold: true,
                            size: 36,
                            color: '2E7D32'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            );
            
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: '专利号: ', bold: true }),
                        new TextRun({ text: patentNumber || '-' })
                    ],
                    spacing: { after: 200 }
                })
            );
            
            if (patentData.title) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: '标题: ', bold: true }),
                            new TextRun({ text: patentData.title })
                        ],
                        spacing: { after: 200 }
                    })
                );
            }
            
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: '导出时间: ', bold: true }),
                        new TextRun({ text: new Date().toLocaleString('zh-CN') })
                    ],
                    spacing: { after: 400 }
                })
            );
            
            sections.push(new Paragraph({ text: '' }));
            
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '一、基本信息',
                            bold: true,
                            size: 28,
                            color: '2E7D32'
                        })
                    ],
                    spacing: { before: 200, after: 200 }
                })
            );
            
            const basicInfoRows = [];
            
            if (patentData.inventors && patentData.inventors.length > 0) {
                basicInfoRows.push(this.createTableRow('发明人', patentData.inventors.join(', ')));
            }
            if (patentData.assignees && patentData.assignees.length > 0) {
                basicInfoRows.push(this.createTableRow('申请人', patentData.assignees.join(', ')));
            }
            if (patentData.application_date) {
                basicInfoRows.push(this.createTableRow('申请日期', patentData.application_date));
            }
            if (patentData.publication_date) {
                basicInfoRows.push(this.createTableRow('公开日期', patentData.publication_date));
            }
            if (patentData.priority_date) {
                basicInfoRows.push(this.createTableRow('优先权日期', patentData.priority_date));
            }
            if (patentData.pdf_link) {
                basicInfoRows.push(this.createTableRow('PDF链接', patentData.pdf_link));
            }
            
            if (basicInfoRows.length > 0) {
                sections.push(new Table({
                    rows: basicInfoRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.abstract) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '二、摘要',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: patentData.abstract })
                        ],
                        spacing: { after: 200 }
                    })
                );
                
                const abstractTranslation = this.getTranslation(patentNumber, 'abstract');
                if (abstractTranslation) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '【翻译】',
                                    bold: true,
                                    color: '009688'
                                })
                            ],
                            spacing: { before: 100, after: 100 }
                        })
                    );
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: abstractTranslation.translated || abstractTranslation })
                            ],
                            spacing: { after: 200 }
                        })
                    );
                }
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.classifications && patentData.classifications.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '三、CPC分类',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const cpcRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('分类号'),
                            this.createHeaderCell('描述')
                        ]
                    })
                ];
                
                patentData.classifications.forEach(cls => {
                    cpcRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(cls.leaf_code || cls.code || '-'),
                                this.createDataCell(cls.leaf_description || cls.description || '-')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: cpcRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.landscapes && patentData.landscapes.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '四、技术领域',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: patentData.landscapes.map(l => l.name).join('、') })
                        ]
                    })
                );
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.claims && patentData.claims.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '五、权利要求',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const claimsTranslation = this.getTranslation(patentNumber, 'claims');
                
                patentData.claims.forEach((claim, index) => {
                    let claimText = typeof claim === 'string' ? claim : claim.text || '';
                    claimText = claimText.replace(/\[\d+\]\[从属\]\s*/g, '').replace(/\[\d+\]\s*/g, '');
                    
                    const isDependent = typeof claim === 'object' ? claim.type === 'dependent' : 
                        (claimText.includes('[从属]') || claimText.includes('<claim-ref') || /claim\s*\d+/i.test(claimText));
                    
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `权利要求 ${index + 1}${isDependent ? ' (从属权利要求)' : ' (独立权利要求)'}`,
                                    bold: true,
                                    color: isDependent ? '1976D2' : '2E7D32'
                                })
                            ],
                            spacing: { before: 150, after: 100 }
                        })
                    );
                    
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: claimText })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                    
                    if (claimsTranslation && claimsTranslation.translations && claimsTranslation.translations[index]) {
                        sections.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: '【翻译】',
                                        bold: true,
                                        color: '009688'
                                    })
                                ],
                                spacing: { before: 50, after: 50 }
                            })
                        );
                        sections.push(
                            new Paragraph({
                                children: [
                                    new TextRun({ text: claimsTranslation.translations[index].translated })
                                ],
                                spacing: { after: 150 }
                            })
                        );
                    }
                });
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.description) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '六、说明书',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const descParagraphs = patentData.description.split(/\n\n+/);
                descParagraphs.forEach(para => {
                    if (para.trim()) {
                        const isSectionHeader = /^\[[A-Z\s]+\]$/.test(para.trim());
                        
                        if (isSectionHeader) {
                            sections.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: para.trim(),
                                            bold: true,
                                            color: '2E7D32'
                                        })
                                    ],
                                    spacing: { before: 200, after: 100 }
                                })
                            );
                        } else {
                            sections.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: para.trim() })
                                    ],
                                    spacing: { after: 100 }
                                })
                            );
                        }
                    }
                });
                
                const descTranslation = this.getTranslation(patentNumber, 'description');
                if (descTranslation) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '【说明书翻译】',
                                    bold: true,
                                    color: '009688'
                                })
                            ],
                            spacing: { before: 200, after: 100 }
                        })
                    );
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: descTranslation.translated || descTranslation })
                            ],
                            spacing: { after: 200 }
                        })
                    );
                }
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.family_applications && patentData.family_applications.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '七、同族信息',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                if (patentData.family_id) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: '同族ID: ', bold: true }),
                                new TextRun({ text: patentData.family_id })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                }
                
                const familyRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('申请号'),
                            this.createHeaderCell('状态'),
                            this.createHeaderCell('公开号')
                        ]
                    })
                ];
                
                patentData.family_applications.forEach(app => {
                    familyRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(app.application_number || '-'),
                                this.createDataCell(app.status || '-'),
                                this.createDataCell(app.publication_number || '-')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: familyRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.patent_citations && patentData.patent_citations.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '八、引用专利',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const citationRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('专利号'),
                            this.createHeaderCell('标题'),
                            this.createHeaderCell('审查员引用')
                        ]
                    })
                ];
                
                patentData.patent_citations.forEach(citation => {
                    citationRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(citation.patent_number || '-'),
                                this.createDataCell(citation.title || '-'),
                                this.createDataCell(citation.examiner_cited ? '是' : '否')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: citationRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.cited_by && patentData.cited_by.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '九、被引用专利',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const citedByRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('专利号'),
                            this.createHeaderCell('标题')
                        ]
                    })
                ];
                
                patentData.cited_by.forEach(citation => {
                    citedByRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(citation.patent_number || '-'),
                                this.createDataCell(citation.title || '-')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: citedByRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.events_timeline && patentData.events_timeline.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '十、事件时间轴',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const eventRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('日期'),
                            this.createHeaderCell('事件')
                        ]
                    })
                ];
                
                [...patentData.events_timeline].reverse().forEach(event => {
                    eventRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(event.date || '-'),
                                this.createDataCell(event.title || event.description || '-')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: eventRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (patentData.legal_events && patentData.legal_events.length > 0) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '十一、法律事件',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                const legalRows = [
                    new TableRow({
                        children: [
                            this.createHeaderCell('日期'),
                            this.createHeaderCell('代码'),
                            this.createHeaderCell('描述')
                        ]
                    })
                ];
                
                [...patentData.legal_events].reverse().forEach(event => {
                    legalRows.push(
                        new TableRow({
                            children: [
                                this.createDataCell(event.date || '-'),
                                this.createDataCell(event.code || '-'),
                                this.createDataCell(event.description || event.title || '-')
                            ]
                        })
                    );
                });
                
                sections.push(new Table({
                    rows: legalRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }));
            }
            
            sections.push(new Paragraph({ text: '' }));
            
            if (analysisResult) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '十二、AI解读结果',
                                bold: true,
                                size: 28,
                                color: '2E7D32'
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
                
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '以下解读由AI生成，仅供参考',
                                italics: true,
                                color: '666666'
                            })
                        ],
                        spacing: { after: 200 }
                    })
                );
                
                let analysisJson = {};
                try {
                    let cleanContent = analysisResult.analysis_content.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    analysisJson = JSON.parse(cleanContent);
                } catch (e) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: analysisResult.analysis_content })
                            ]
                        })
                    );
                    analysisJson = null;
                }
                
                if (analysisJson) {
                    const analysisRows = [
                        new TableRow({
                            children: [
                                this.createHeaderCell('字段'),
                                this.createHeaderCell('内容')
                            ]
                        })
                    ];
                    
                    Object.keys(analysisJson).forEach(key => {
                        const value = analysisJson[key];
                        const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                        analysisRows.push(
                            new TableRow({
                                children: [
                                    this.createDataCell(key, true),
                                    this.createDataCell(displayValue)
                                ]
                            })
                        );
                    });
                    
                    sections.push(new Table({
                        rows: analysisRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                }
            }
            
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: sections
                }]
            });
            
            const blob = await Packer.toBlob(doc);
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `专利详情_${patentNumber}_${new Date().toISOString().slice(0, 10)}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('Word文档导出成功');
            
        } catch (error) {
            console.error('Word导出失败:', error);
            alert('Word导出失败: ' + error.message);
        }
    },
    
    createTableRow: function(label, value) {
        const { TableRow, TableCell, TextRun, WidthType } = docx;
        return new TableRow({
            children: [
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: label, bold: true })]
                        })
                    ],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F5F5F5' }
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: value || '-' })]
                        })
                    ],
                    width: { size: 75, type: WidthType.PERCENTAGE }
                })
            ]
        });
    },
    
    createHeaderCell: function(text) {
        const { TableCell, TextRun, Paragraph } = docx;
        return new TableCell({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: text,
                            bold: true,
                            color: 'FFFFFF'
                        })
                    ]
                })
            ],
            shading: { fill: '2E7D32' }
        });
    },
    
    createDataCell: function(text, isBold) {
        const { TableCell, TextRun, Paragraph } = docx;
        return new TableCell({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: text || '-',
                            bold: isBold || false
                        })
                    ]
                })
            ]
        });
    },
    
    getTranslation: function(patentNumber, textType) {
        const models = window.AVAILABLE_MODELS || ['glm-4-flash', 'glm-4-long', 'glm-4.7-flash'];
        
        for (const model of models) {
            const cacheKey = `translation_${patentNumber}_${textType}_${model}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data.translations && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        return data;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        return null;
    },
    
    exportFromModal: function(patentNumber) {
        const patentResult = window.patentResults ? window.patentResults.find(r => r.patent_number === patentNumber) : null;
        
        if (!patentResult) {
            alert('未找到专利数据');
            return;
        }
        
        const analysisResult = window.patentBatchAnalysisResults ? 
            window.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber) : null;
        
        this.exportPatentToWord(patentNumber, patentResult.data, analysisResult);
    },
    
    exportFromNewTab: function(patentNumber) {
        const pageData = window.pageData;
        
        if (!pageData) {
            alert('未找到专利数据');
            return;
        }
        
        let analysisResult = null;
        if (window.opener && window.opener.patentBatchAnalysisResults) {
            analysisResult = window.opener.patentBatchAnalysisResults.find(item => item.patent_number === patentNumber);
        }
        
        this.exportPatentToWord(patentNumber, pageData, analysisResult);
    }
};

console.log('PatentDetailWordExport module loaded');

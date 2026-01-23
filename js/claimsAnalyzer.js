/**
 * 权利要求分析器 - 独立页面版本
 * 版本: 1.0.0
 * 功能: 直接输入权利要求文本，识别独权和从权关系，生成可视化引证图
 */

console.log('Claims Analyzer v1.0.0 Loaded');

// 全局状态
let analyzedClaims = [];
let visualizationRenderer = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeAnalyzer();
});

function initializeAnalyzer() {
    const analyzeBtn = document.getElementById('analyze_btn');
    const clearBtn = document.getElementById('clear_btn');
    const exampleBtn = document.getElementById('example_btn');
    const vizStyleSelect = document.getElementById('viz_style');
    const treeSpreadSlider = document.getElementById('tree_spread_slider');
    const treeSpreadValue = document.getElementById('tree_spread_value');
    
    // 按钮事件
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeClaims);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearInput);
    }
    
    if (exampleBtn) {
        exampleBtn.addEventListener('click', loadExample);
    }
    
    // 可视化控制
    if (vizStyleSelect) {
        vizStyleSelect.addEventListener('change', () => {
            if (visualizationRenderer && analyzedClaims.length > 0) {
                renderVisualization();
            }
        });
    }
    
    if (treeSpreadSlider) {
        treeSpreadSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            treeSpreadValue.textContent = value.toFixed(1) + 'x';
            if (visualizationRenderer) {
                visualizationRenderer.setTreeSpreadFactor(value);
            }
        });
    }
    
    // 缩放控制
    document.getElementById('zoom_in_btn')?.addEventListener('click', () => {
        if (visualizationRenderer) visualizationRenderer.zoomIn();
    });
    
    document.getElementById('zoom_out_btn')?.addEventListener('click', () => {
        if (visualizationRenderer) visualizationRenderer.zoomOut();
    });
    
    document.getElementById('zoom_reset_btn')?.addEventListener('click', () => {
        if (visualizationRenderer) visualizationRenderer.zoomReset();
    });
    
    document.getElementById('center_view_btn')?.addEventListener('click', () => {
        if (visualizationRenderer) visualizationRenderer.centerView();
    });
    
    document.getElementById('screenshot_btn')?.addEventListener('click', () => {
        if (visualizationRenderer) {
            visualizationRenderer.captureHighResScreenshot();
            showMessage('截图已保存！', 'success');
        }
    });
}

// 分析权利要求
function analyzeClaims() {
    const input = document.getElementById('claims_text_input');
    const text = input.value.trim();
    
    if (!text) {
        showMessage('请输入权利要求文本', 'error');
        return;
    }
    
    try {
        // 解析权利要求文本
        analyzedClaims = parseClaimsText(text);
        
        if (analyzedClaims.length === 0) {
            showMessage('未能识别到有效的权利要求，请检查格式', 'error');
            return;
        }
        
        // 显示结果
        displayResults();
        showMessage(`成功识别 ${analyzedClaims.length} 条权利要求`, 'success');
        
    } catch (error) {
        console.error('Analysis error:', error);
        showMessage('分析失败：' + error.message, 'error');
    }
}

// 解析权利要求文本
function parseClaimsText(text) {
    const claims = [];
    
    // 分割成行
    const lines = text.split('\n');
    let currentClaim = null;
    let claimNumber = 0;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // 匹配权利要求编号
        // 支持格式: "1.", "1、", "权利要求1", "Claim 1", "請求項1"
        const claimMatch = line.match(/^(?:权利要求|请求项|請求項|claim|claims?)\s*(\d+)|^(\d+)[.、．]/i);
        
        if (claimMatch) {
            // 保存上一条权利要求
            if (currentClaim) {
                claims.push(currentClaim);
            }
            
            // 开始新的权利要求
            claimNumber = parseInt(claimMatch[1] || claimMatch[2]);
            const claimText = line.replace(/^(?:权利要求|请求项|請求項|claim|claims?)\s*\d+[.、．]?\s*/i, '');
            
            currentClaim = {
                claim_number: claimNumber,
                claim_text: claimText,
                full_text: claimText,
                referenced_claims: [],
                claim_type: 'independent'
            };
        } else if (currentClaim) {
            // 继续当前权利要求的文本
            currentClaim.full_text += ' ' + line;
            currentClaim.claim_text += ' ' + line;
        }
    }
    
    // 保存最后一条
    if (currentClaim) {
        claims.push(currentClaim);
    }
    
    // 分析引用关系
    claims.forEach(claim => {
        const refs = extractReferences(claim.full_text);
        if (refs.length > 0) {
            claim.referenced_claims = refs;
            claim.claim_type = 'dependent';
        }
    });
    
    return claims;
}

// 提取引用的权利要求编号
function extractReferences(text) {
    const references = [];
    
    // 匹配各种引用格式
    const patterns = [
        /根据权利要求\s*(\d+(?:\s*[-至或、和,]\s*\d+)*)/g,
        /according\s+to\s+claim\s*(\d+(?:\s*[-or,and\s]+\d+)*)/gi,
        /of\s+claim\s*(\d+(?:\s*[-or,and\s]+\d+)*)/gi,
        /請求項\s*(\d+(?:\s*[-または、及び,]\s*\d+)*)/g,
        /claim\s*(\d+(?:\s*[-or,and\s]+\d+)*)/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const refText = match[1];
            // 提取所有数字
            const numbers = refText.match(/\d+/g);
            if (numbers) {
                numbers.forEach(num => {
                    const n = parseInt(num);
                    if (!references.includes(n)) {
                        references.push(n);
                    }
                });
            }
        }
    });
    
    return references.sort((a, b) => a - b);
}

// 显示结果
function displayResults() {
    // 更新统计
    const totalClaims = analyzedClaims.length;
    const independentClaims = analyzedClaims.filter(c => c.claim_type === 'independent').length;
    const dependentClaims = totalClaims - independentClaims;
    
    document.getElementById('stat_total').textContent = totalClaims;
    document.getElementById('stat_independent').textContent = independentClaims;
    document.getElementById('stat_dependent').textContent = dependentClaims;
    
    // 显示权利要求列表
    displayClaimsList();
    
    // 生成可视化
    renderVisualization();
    
    // 显示结果区域
    document.getElementById('results_section').style.display = 'block';
    
    // 滚动到结果
    document.getElementById('results_section').scrollIntoView({ behavior: 'smooth' });
}

// 显示权利要求列表
function displayClaimsList() {
    const container = document.getElementById('claims_list_container');
    container.innerHTML = '';
    
    analyzedClaims.forEach(claim => {
        const claimDiv = document.createElement('div');
        claimDiv.className = claim-item ;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'claim-header';
        
        const numberSpan = document.createElement('span');
        numberSpan.className = 'claim-number';
        numberSpan.textContent = 权利要求 ;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = claim-badge ;
        badgeSpan.textContent = claim.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
        
        headerDiv.appendChild(numberSpan);
        headerDiv.appendChild(badgeSpan);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'claim-text';
        textDiv.textContent = claim.full_text;
        
        claimDiv.appendChild(headerDiv);
        claimDiv.appendChild(textDiv);
        
        if (claim.referenced_claims.length > 0) {
            const refsDiv = document.createElement('div');
            refsDiv.className = 'claim-references';
            refsDiv.innerHTML = <strong>引用:</strong> 权利要求 ;
            claimDiv.appendChild(refsDiv);
        }
        
        container.appendChild(claimDiv);
    });
}

// 渲染可视化
function renderVisualization() {
    const container = document.getElementById('visualization_container');
    const style = document.getElementById('viz_style').value;
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建可视化数据
    const vizData = createVisualizationData();
    
    // 初始化渲染器
    if (!visualizationRenderer) {
        visualizationRenderer = new ClaimsVisualizationRenderer(container);
    }
    
    // 渲染
    visualizationRenderer.render(vizData, style);
}

// 创建可视化数据
function createVisualizationData() {
    const nodes = [];
    const links = [];
    
    analyzedClaims.forEach(claim => {
        nodes.push({
            id: claim.claim_number.toString(),
            label: 权利要求,
            type: claim.claim_type,
            text: claim.full_text.substring(0, 100) + '...'
        });
        
        claim.referenced_claims.forEach(ref => {
            links.push({
                source: claim.claim_number.toString(),
                target: ref.toString()
            });
        });
    });
    
    return { nodes, links };
}

// 清空输入
function clearInput() {
    document.getElementById('claims_text_input').value = '';
    document.getElementById('results_section').style.display = 'none';
    analyzedClaims = [];
}

// 加载示例
function loadExample() {
    const example = 1. 一种智能手机，其特征在于，包括：
   处理器，用于执行指令；
   存储器，与所述处理器连接，用于存储数据；
   显示屏，与所述处理器连接，用于显示信息；
   通信模块，与所述处理器连接，用于无线通信。

2. 根据权利要求1所述的智能手机，其特征在于，所述处理器为八核处理器。

3. 根据权利要求1或2所述的智能手机，其特征在于，所述存储器容量为8GB以上。

4. 根据权利要求1至3任一项所述的智能手机，其特征在于，所述显示屏为OLED显示屏。

5. 根据权利要求1所述的智能手机，其特征在于，还包括指纹识别模块。

6. 根据权利要求5所述的智能手机，其特征在于，所述指纹识别模块集成在所述显示屏下方。

7. 一种移动终端，其特征在于，包括：
   主控芯片；
   电源管理模块；
   天线模块。

8. 根据权利要求7所述的移动终端，其特征在于，所述天线模块支持5G通信。;
    
    document.getElementById('claims_text_input').value = example;
    showMessage('示例已加载，点击"开始分析"按钮进行分析', 'info');
}

// 显示消息
function showMessage(message, type = 'info') {
    const container = document.getElementById('message_container');
    container.textContent = message;
    container.className = message ;
    container.style.display = 'block';
    
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

// 可视化渲染器类
class ClaimsVisualizationRenderer {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.g = null;
        this.zoom = null;
        this.currentData = null;
        this.treeSpreadFactor = 1.0;
    }
    
    render(data, style = 'tree') {
        this.currentData = data;
        
        // 清空容器
        d3.select(this.container).selectAll('*').remove();
        
        // 创建SVG
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // 添加缩放功能
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        this.g = this.svg.append('g');
        
        // 根据样式渲染
        switch (style) {
            case 'tree':
                this.renderTree(data, width, height);
                break;
            case 'network':
                this.renderNetwork(data, width, height);
                break;
            case 'radial':
                this.renderRadial(data, width, height);
                break;
        }
    }
    
    renderTree(data, width, height) {
        // 构建层次结构
        const root = this.buildHierarchy(data);
        
        const treeLayout = d3.tree()
            .size([height - 100, width - 200])
            .separation((a, b) => (a.parent === b.parent ? 1 : 1.5) * this.treeSpreadFactor);
        
        const treeData = treeLayout(root);
        
        // 绘制连线
        this.g.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y + 100)
                .y(d => d.x + 50))
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
        
        // 绘制节点
        const nodes = this.g.selectAll('.node')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y + 100},${d.x + 50})`);
        
        nodes.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.data.type === 'independent' ? '#4a6cf7' : '#999')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3);
        
        nodes.append('text')
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .text(d => d.data.id);
        
        nodes.append('title')
            .text(d => d.data.text);
    }
    
    renderNetwork(data, width, height) {
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));
        
        const link = this.g.selectAll('.link')
            .data(data.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
        
        const node = this.g.selectAll('.node')
            .data(data.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        node.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.type === 'independent' ? '#4a6cf7' : '#999')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3);
        
        node.append('text')
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .text(d => d.id);
        
        node.append('title')
            .text(d => d.text);
        
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
    
    renderRadial(data, width, height) {
        const root = this.buildHierarchy(data);
        
        const radius = Math.min(width, height) / 2 - 100;
        
        const tree = d3.tree()
            .size([2 * Math.PI, radius])
            .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        
        const treeData = tree(root);
        
        this.g.attr('transform', `translate(${width / 2},${height / 2})`);
        
        this.g.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y))
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
        
        const nodes = this.g.selectAll('.node')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);
        
        nodes.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.data.type === 'independent' ? '#4a6cf7' : '#999')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3);
        
        nodes.append('text')
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .text(d => d.data.id);
        
        nodes.append('title')
            .text(d => d.data.text);
    }
    
    buildHierarchy(data) {
        // 找到所有独立权利要求作为根节点
        const independentNodes = data.nodes.filter(n => n.type === 'independent');
        
        // 创建虚拟根节点
        const root = {
            id: 'root',
            label: 'Root',
            type: 'root',
            children: []
        };
        
        // 为每个独立权利要求构建子树
        independentNodes.forEach(indNode => {
            const subtree = this.buildSubtree(indNode, data);
            root.children.push(subtree);
        });
        
        return d3.hierarchy(root);
    }
    
    buildSubtree(node, data) {
        const children = [];
        
        // 找到所有引用当前节点的从属权利要求
        data.links.forEach(link => {
            if (link.target === node.id) {
                const childNode = data.nodes.find(n => n.id === link.source);
                if (childNode) {
                    children.push(this.buildSubtree(childNode, data));
                }
            }
        });
        
        return {
            ...node,
            children: children.length > 0 ? children : undefined
        };
    }
    
    setTreeSpreadFactor(factor) {
        this.treeSpreadFactor = factor;
        if (this.currentData) {
            this.render(this.currentData, document.getElementById('viz_style').value);
        }
    }
    
    zoomIn() {
        this.svg.transition().call(this.zoom.scaleBy, 1.3);
    }
    
    zoomOut() {
        this.svg.transition().call(this.zoom.scaleBy, 0.7);
    }
    
    zoomReset() {
        this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
    }
    
    centerView() {
        const bounds = this.g.node().getBBox();
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const scale = 0.9 / Math.max(bounds.width / width, bounds.height / height);
        const translate = [
            width / 2 - scale * (bounds.x + bounds.width / 2),
            height / 2 - scale * (bounds.y + bounds.height / 2)
        ];
        
        this.svg.transition().call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }
    
    captureHighResScreenshot() {
        // 简单实现：使用浏览器的截图功能
        const svgElement = this.svg.node();
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = claims_visualization_.svg;
        link.click();
        
        URL.revokeObjectURL(url);
        return true;
    }
}

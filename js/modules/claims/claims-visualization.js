/**
 * Claims Visualization Module
 * Handles D3.js visualization rendering and generation
 */

// 生成可视化
export async function claimsGenerateVisualization(state, showMessage) {
    if (!state.selectedPatentNumber) {
        showMessage('请先选择一个专利号', 'error');
        return;
    }
    
    if (!state.currentTaskId) {
        showMessage('请先完成权利要求处理', 'error');
        return;
    }
    
    try {
        const visualizationSection = document.getElementById('claims_visualization_section');
        const vizLoadingIndicator = document.getElementById('claims_viz_loading_indicator');
        const vizErrorMessage = document.getElementById('claims_viz_error_message');
        
        if (visualizationSection) {
            visualizationSection.style.display = 'block';
        }
        
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'block';
        }
        
        if (vizErrorMessage) {
            vizErrorMessage.style.display = 'none';
        }
        
        if (visualizationSection) {
            visualizationSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showMessage('正在生成权利要求引证图...', 'info');
        
        console.log('[claimsGenerateVisualization] 请求参数:', {
            taskId: state.currentTaskId,
            patentNumber: state.selectedPatentNumber,
            rowIndex: state.selectedPatentRow
        });
        
        const response = await fetch(`/api/claims/visualization/${state.currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patent_number: state.selectedPatentNumber,
                row_index: state.selectedPatentRow
            })
        });
        
        console.log('[claimsGenerateVisualization] 响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[claimsGenerateVisualization] HTTP错误:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '获取可视化数据失败');
        }
        
        const visualizationData = result.data.visualization;
        
        if (!visualizationData || !visualizationData.nodes || visualizationData.nodes.length === 0) {
            console.error('[claimsGenerateVisualization] 可视化数据为空或无效:', visualizationData);
            throw new Error('未找到该专利的权利要求数据');
        }
        
        console.log('[claimsGenerateVisualization] 获取到可视化数据:', {
            nodes: visualizationData.nodes.length,
            links: visualizationData.links.length
        });
        
        if (!state.visualizationRenderer) {
            state.visualizationRenderer = new ClaimsD3TreeRenderer('claims_visualization_container');
        }
        
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'none';
        }
        
        const styleSelector = document.getElementById('claims_style_selector');
        const style = styleSelector ? styleSelector.value : 'tree';
        
        state.visualizationRenderer.render(visualizationData, style);
        
        showMessage('权利要求引证图生成完成！', 'success');
        
    } catch (error) {
        console.error('[claimsGenerateVisualization] 错误:', error);
        
        const vizLoadingIndicator = document.getElementById('claims_viz_loading_indicator');
        const vizErrorMessage = document.getElementById('claims_viz_error_message');
        const vizErrorText = document.getElementById('claims_viz_error_text');
        
        if (vizLoadingIndicator) {
            vizLoadingIndicator.style.display = 'none';
        }
        
        if (vizErrorMessage) {
            vizErrorMessage.style.display = 'block';
        }
        
        if (vizErrorText) {
            vizErrorText.textContent = error.message;
        }
        
        showMessage('生成可视化失败: ' + error.message, 'error');
    }
}

// 跳转到权利要求引用图
export function claimsJumpToVisualization(patentNumber, rowIndex, state, generateVisualization) {
    state.selectedPatentNumber = patentNumber;
    state.selectedPatentRow = rowIndex || 0;
    
    const selectedPatentNumberEl = document.getElementById('claims_selected_patent_number');
    const selectedPatentRowEl = document.getElementById('claims_selected_patent_row');
    const selectedPatentInfo = document.getElementById('claims_selected_patent_info');
    
    if (selectedPatentNumberEl) {
        selectedPatentNumberEl.textContent = patentNumber;
    }
    
    if (selectedPatentRowEl) {
        selectedPatentRowEl.textContent = rowIndex && rowIndex > 0 ? (rowIndex + 1) : 'N/A';
    }
    
    if (selectedPatentInfo) {
        selectedPatentInfo.style.display = 'block';
    }
    
    generateVisualization();
    
    const visualizationSection = document.getElementById('claims_visualization_section');
    if (visualizationSection) {
        visualizationSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// D3.js可视化渲染器类
export class ClaimsD3TreeRenderer {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.svg = this.container.select('svg');
        
        if (this.svg.empty()) {
            this.svg = this.container.append('svg')
                .attr('id', 'claims_visualization_svg')
                .style('width', '100%')
                .style('height', '600px');
        }
        
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'claims-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('opacity', 0);
        
        this.updateDimensions();
        
        this.mainGroup = this.svg.append('g').attr('class', 'main-group');
        
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.mainGroup.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        this.currentData = null;
        this.currentStyle = 'tree';
        
        window.addEventListener('resize', () => {
            this.updateDimensions();
            if (this.currentData) {
                this.render(this.currentData, this.currentStyle);
            }
        });
    }
    
    updateDimensions() {
        const containerRect = this.container.node().getBoundingClientRect();
        this.width = containerRect.width || 800;
        this.height = 600;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
    }
    
    render(data, style = 'tree') {
        this.currentData = data;
        this.currentStyle = style;
        
        if (!data || !data.nodes || data.nodes.length === 0) {
            console.error('无效的可视化数据:', data);
            return;
        }
        
        console.log(`渲染 ${style} 布局，节点数: ${data.nodes.length}, 连接数: ${data.links.length}`);
        
        this.mainGroup.selectAll('*').remove();
        
        try {
            switch (style) {
                case 'tree':
                    this.renderTree(data);
                    break;
                case 'network':
                    this.renderNetwork(data);
                    break;
                case 'radial':
                    this.renderRadial(data);
                    break;
                default:
                    console.error('Unknown visualization style:', style);
            }
        } catch (error) {
            console.error(`渲染 ${style} 布局时出错:`, error);
        }
    }

    
    renderTree(data) {
        this.mainGroup.attr('transform', null);
        
        const independentClaims = data.nodes.filter(node => node.claim_type === 'independent');
        const spreadFactor = this.treeSpreadFactor || 1.0;
        const treesCount = Math.max(1, independentClaims.length);
        const treeHeight = ((this.height - 100) / treesCount) * spreadFactor;
        
        independentClaims.forEach((rootClaim, treeIndex) => {
            const buildSubTree = (nodeId, visited = new Set(), depth = 0) => {
                if (depth > 50) {
                    console.warn(`renderTree递归深度超过50层，终止递归: ${nodeId}`);
                    return null;
                }
                
                if (visited.has(nodeId)) {
                    console.warn(`renderTree检测到循环引用: ${nodeId}`);
                    return null;
                }
                
                const node = data.nodes.find(n => n.id === nodeId);
                if (!node) return null;
                
                const newVisited = new Set(visited);
                newVisited.add(nodeId);
                
                const children = data.links
                    .filter(link => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        return sourceId === nodeId;
                    })
                    .map(link => {
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return buildSubTree(targetId, newVisited, depth + 1);
                    })
                    .filter(child => child !== null);
                
                return {
                    ...node,
                    children: children.length > 0 ? children : null
                };
            };
            
            const treeRoot = buildSubTree(rootClaim.id, new Set(), 0);
            if (!treeRoot) return;
            
            const root = d3.hierarchy(treeRoot);
            
            const treeLayout = d3.tree()
                .size([treeHeight, ((this.width - 200) / 2) * spreadFactor]);
            
            const treeData = treeLayout(root);
            const yOffset = 50 + treeIndex * treeHeight;
            
            this.mainGroup.selectAll(`.link-tree-${treeIndex}`)
                .data(treeData.links())
                .enter()
                .append('path')
                .attr('class', `link link-tree-${treeIndex}`)
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('d', d3.linkHorizontal()
                    .x(d => d.y + 100)
                    .y(d => d.x + yOffset)
                );
            
            const nodes = this.mainGroup.selectAll(`.node-tree-${treeIndex}`)
                .data(treeData.descendants())
                .enter()
                .append('g')
                .attr('class', `node-group node-tree-${treeIndex}`)
                .attr('transform', d => `translate(${d.y + 100}, ${d.x + yOffset})`);
            
            nodes.append('circle')
                .attr('class', d => `node ${d.data.claim_type}`)
                .attr('r', d => d.data.claim_type === 'independent' ? 20 : 15)
                .attr('fill', d => d.data.claim_type === 'independent' ? '#4CAF50' : '#2196F3')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => this.showTooltip(event, d.data))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event, d) => this.onNodeClick(d.data));
            
            nodes.append('text')
                .attr('class', 'node-label')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(d => d.data.claim_number);
        });
        
        if (independentClaims.length === 0 && data.nodes.length > 0) {
            const treeLayout = d3.tree()
                .size([this.height - 100, this.width - 200]);
            
            const root = d3.hierarchy({
                ...data.nodes[0],
                children: null
            });
            
            const treeData = treeLayout(root);
            
            const nodes = this.mainGroup.selectAll('.node-default')
                .data(treeData.descendants())
                .enter()
                .append('g')
                .attr('class', 'node-group node-default')
                .attr('transform', d => `translate(${d.y + 100}, ${d.x + 50})`);
            
            nodes.append('circle')
                .attr('class', d => `node ${d.data.claim_type || 'independent'}`)
                .attr('r', 20)
                .attr('fill', '#4CAF50')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => this.showTooltip(event, d.data))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event, d) => this.onNodeClick(d.data));
            
            nodes.append('text')
                .attr('class', 'node-label')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(d => d.data.claim_number);
        }
    }
    
    renderNetwork(data) {
        this.mainGroup.attr('transform', null);
        this.svg.selectAll('defs').remove();
        
        data.nodes.forEach((node, i) => {
            if (!node.x || isNaN(node.x)) {
                node.x = this.width / 2 + (Math.random() - 0.5) * 100;
            }
            if (!node.y || isNaN(node.y)) {
                node.y = this.height / 2 + (Math.random() - 0.5) * 100;
            }
        });
        
        const chargeStrength = this.chargeStrength || -300;
        
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));
        
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead-network')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#10b981')
            .style('stroke', 'none');
        
        const links = this.mainGroup.selectAll('.link')
            .data(data.links)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#10b981')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead-network)');
        
        const nodes = this.mainGroup.selectAll('.node-group')
            .data(data.nodes)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );
        
        nodes.append('circle')
            .attr('class', d => `node ${d.claim_type}`)
            .attr('r', d => d.claim_type === 'independent' ? 25 : 20)
            .attr('fill', d => d.claim_type === 'independent' ? '#10b981' : '#6ee7b7')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => {
                event.stopPropagation();
                this.onNodeClick(d);
            });
        
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(d => d.claim_number);
        
        simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodes.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });
    }
    
    renderRadial(data) {
        const baseRadius = Math.min(this.width, this.height) / 2 - 80;
        const radius = baseRadius * (this.treeSpreadFactor || 1.0);
        const tree = d3.cluster().size([2 * Math.PI, radius]);
        
        this.svg.selectAll('defs').remove();
        
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead-radial')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#10b981')
            .style('stroke', 'none');
        
        const root = this.buildHierarchy(data);
        const treeData = tree(root);
        
        this.mainGroup.attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
        this.mainGroup.selectAll('.link')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('stroke', '#10b981')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead-radial)')
            .attr('d', d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y)
            );
        
        const nodes = this.mainGroup.selectAll('.node-group')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y}, 0)`);
        
        nodes.append('circle')
            .attr('class', d => `node ${d.data.claim_type}`)
            .attr('r', d => d.data.claim_type === 'independent' ? 25 : 20)
            .attr('fill', d => d.data.claim_type === 'independent' ? '#10b981' : '#6ee7b7')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(event, d.data))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => {
                event.stopPropagation();
                this.onNodeClick(d.data);
            });
        
        nodes.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .attr('x', d => d.x < Math.PI === !d.children ? 8 : -8)
            .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
            .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
            .attr('fill', '#333')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(d => d.data.claim_number);
    }

    
    buildHierarchy(data) {
        console.log('构建层次结构数据:', data);
        
        if (!data || !data.nodes || data.nodes.length === 0) {
            console.error('buildHierarchy: 无效的数据');
            return d3.hierarchy({
                id: 'error_root',
                claim_number: '错误',
                claim_type: 'independent',
                claim_text: '数据无效',
                children: null
            });
        }
        
        const nodeIds = new Set(data.nodes.map(node => node.id));
        const invalidLinks = data.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return !nodeIds.has(sourceId) || !nodeIds.has(targetId);
        });
        
        if (invalidLinks.length > 0) {
            console.warn('检测到无效引用:', invalidLinks);
            data.links = data.links.filter(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                return nodeIds.has(sourceId) && nodeIds.has(targetId);
            });
        }
        
        const independentClaims = data.nodes.filter(node => node.claim_type === 'independent');
        console.log('独立权利要求:', independentClaims);
        
        const rootNodes = independentClaims.length > 0 ? independentClaims : data.nodes;
        console.log('根节点:', rootNodes);
        
        const buildChildren = (nodeId, visited = new Set(), depth = 0) => {
            if (depth > 50) {
                console.warn(`递归深度超过50层，终止递归: ${nodeId}`);
                return null;
            }
            
            if (visited.has(nodeId)) {
                console.warn(`检测到循环引用: ${nodeId}`);
                return null;
            }
            
            const newVisited = new Set(visited);
            newVisited.add(nodeId);
            
            const children = data.links
                .filter(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    return sourceId === nodeId;
                })
                .map(link => {
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const childNode = data.nodes.find(node => node.id === targetId);
                    if (childNode) {
                        const childrenOfChild = buildChildren(childNode.id, newVisited, depth + 1);
                        return {
                            ...childNode,
                            children: childrenOfChild
                        };
                    }
                    return null;
                })
                .filter(child => child !== null);
            
            return children.length > 0 ? children : null;
        };
        
        const hierarchyNodes = rootNodes.map(root => ({
            ...root,
            children: buildChildren(root.id, new Set(), 0)
        }));
        
        console.log('层次结构节点:', hierarchyNodes);
        
        if (hierarchyNodes.length > 1) {
            return d3.hierarchy({
                id: 'virtual_root',
                claim_number: 'Root',
                claim_type: 'virtual',
                claim_text: '权利要求根节点',
                children: hierarchyNodes
            });
        } else if (hierarchyNodes.length === 1) {
            return d3.hierarchy(hierarchyNodes[0]);
        } else {
            console.warn('没有找到根节点，创建默认根节点');
            return d3.hierarchy({
                id: 'default_root',
                claim_number: '1',
                claim_type: 'independent',
                claim_text: '默认根节点',
                children: null
            });
        }
    }
    
    showTooltip(event, data) {
        this.tooltip.html(`
            <strong>权利要求 ${data.claim_number}</strong><br>
            类型: ${data.claim_type === 'independent' ? '独立权利要求' : '从属权利要求'}<br>
            ${data.dependencies && data.dependencies.length > 0 ? 
                `依赖: ${data.dependencies.join(', ')}<br>` : ''}
            层级: ${data.level || 0}<br>
            <em>点击查看详细内容</em>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
    }
    
    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
    
    onNodeClick(data) {
        console.log('节点点击事件数据:', data);
        showSimpleClaimModal(data);
    }
    
    zoomIn() {
        this.svg.transition().call(
            this.zoom.scaleBy, 1.5
        );
    }
    
    zoomOut() {
        this.svg.transition().call(
            this.zoom.scaleBy, 1 / 1.5
        );
    }
    
    zoomReset() {
        this.svg.transition().call(
            this.zoom.transform,
            d3.zoomIdentity
        );
    }
    
    centerView() {
        try {
            const bounds = this.mainGroup.node().getBBox();
            
            if (!bounds || bounds.width === 0 || bounds.height === 0 || 
                isNaN(bounds.width) || isNaN(bounds.height)) {
                console.warn('无效的边界框，使用默认居中');
                this.svg.transition().call(
                    this.zoom.transform,
                    d3.zoomIdentity
                );
                return;
            }
            
            const fullWidth = this.width;
            const fullHeight = this.height;
            const width = bounds.width;
            const height = bounds.height;
            const midX = bounds.x + width / 2;
            const midY = bounds.y + height / 2;
            
            const scale = 0.8 / Math.max(width / fullWidth, height / fullHeight);
            const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
            
            if (isNaN(scale) || isNaN(translate[0]) || isNaN(translate[1])) {
                console.warn('计算出的变换值无效，使用默认居中');
                this.svg.transition().call(
                    this.zoom.transform,
                    d3.zoomIdentity
                );
                return;
            }
            
            this.svg.transition().call(
                this.zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
        } catch (error) {
            console.error('centerView 错误:', error);
            this.svg.transition().call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        }
    }
    
    setTreeSpreadFactor(factor) {
        this.treeSpreadFactor = Math.max(0.5, Math.min(5.0, factor));
        this.chargeStrength = -300 * this.treeSpreadFactor;
        
        if (this.currentData) {
            this.render(this.currentData, this.currentStyle);
        }
    }
    
    captureHighResScreenshot() {
        try {
            const svgElement = this.svg.node();
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svgElement);
            
            if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
                svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            if (!svgString.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
                svgString = svgString.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
            }
            
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `claims_visualization_${Date.now()}.svg`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            console.log('高清截图已保存为SVG格式');
            return true;
        } catch (error) {
            console.error('截图失败:', error);
            alert('截图失败: ' + error.message);
            return false;
        }
    }
}

// Modal functions
export function showSimpleClaimModal(claimData) {
    console.log('显示简单权利要求详情模态框:', claimData);
    
    const oldModal = document.getElementById('simple_claim_modal');
    if (oldModal) {
        oldModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'simple_claim_modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        z-index: 1000;
        align-items: center;
        justify-content: center;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 850px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        z-index: 1001;
    `;
    
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
    `;
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = `权利要求 ${claimData.claim_number || '未知'} 详情`;
    modalTitle.style.cssText = `
        margin: 0;
        color: #333;
        font-size: 18px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    `;
    closeBtn.onclick = closeSimpleClaimModal;
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.style.cssText = `padding: 20px;`;
    
    const claimInfo = document.createElement('div');
    claimInfo.style.cssText = `
        margin-bottom: 15px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    `;
    
    const numberBadge = document.createElement('span');
    numberBadge.textContent = `权利要求 ${claimData.claim_number || '未知'}`;
    numberBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: #666;
    `;
    
    const typeBadge = document.createElement('span');
    typeBadge.textContent = claimData.claim_type === 'independent' ? '独立权利要求' : '从属权利要求';
    typeBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: ${claimData.claim_type === 'independent' ? '#4CAF50' : '#2196F3'};
    `;
    
    const levelBadge = document.createElement('span');
    levelBadge.textContent = `层级 ${claimData.level || 0}`;
    levelBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background-color: #666;
    `;
    
    claimInfo.appendChild(numberBadge);
    claimInfo.appendChild(typeBadge);
    claimInfo.appendChild(levelBadge);
    
    const dependenciesDiv = document.createElement('div');
    dependenciesDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 10px;
        background-color: #f8f9fa;
        border-radius: 4px;
        border-left: 4px solid #2196F3;
    `;
    
    const dependenciesLabel = document.createElement('strong');
    dependenciesLabel.textContent = '依赖关系：';
    
    const dependenciesList = document.createElement('span');
    const dependencies = claimData.dependencies || claimData.referenced_claims || [];
    dependenciesList.textContent = dependencies && dependencies.length > 0 ? dependencies.join(', ') : '无';
    
    dependenciesDiv.appendChild(dependenciesLabel);
    dependenciesDiv.appendChild(dependenciesList);
    
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `margin-bottom: 15px;`;
    
    const contentLabel = document.createElement('strong');
    contentLabel.textContent = '权利要求内容：';
    
    const claimText = document.createElement('p');
    claimText.textContent = claimData.claim_text || claimData.text || '暂无详细内容';
    claimText.style.cssText = `
        margin: 10px 0 0 0;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #e9ecef;
    `;
    
    contentDiv.appendChild(contentLabel);
    contentDiv.appendChild(claimText);
    
    modalBody.appendChild(claimInfo);
    modalBody.appendChild(dependenciesDiv);
    modalBody.appendChild(contentDiv);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSimpleClaimModal();
        }
    });
    
    document.body.style.overflow = 'hidden';
    console.log('简单模态框已显示');
}

export function closeSimpleClaimModal() {
    const modal = document.getElementById('simple_claim_modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
    console.log('简单模态框已关闭');
}

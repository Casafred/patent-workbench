// 批量替换emoji按钮为SVG的脚本
// 在js/main.js中查找并替换所有📋 emoji

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'js', 'main.js');
let content = fs.readFileSync(filePath, 'utf8');

// SVG复制图标
const copySVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: middle;"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;

// 替换所有复制按钮中的📋
content = content.replace(/(<button class="copy-field-btn"[^>]*>)📋(<\/button>)/g, `$1${copySVG}$2`);

// 保存文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ 已替换所有复制按钮的emoji为SVG');

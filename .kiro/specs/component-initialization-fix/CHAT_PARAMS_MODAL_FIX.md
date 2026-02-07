# 功能一对话参数弹窗修复

## 问题描述

用户报告功能一（即时对话）的"对话参数设置"按钮无法打开弹窗，无法进行参数设定。

## 根本原因

在代码重构过程中（Task 5: Refactor chat.js into modules），将 `js/chat.js` 拆分为模块化文件时，`js/modules/chat/chat-core.js` 中的选择器出现了错误：

**错误代码（第22行）：**
```javascript
const closeModalBtn = chatParamsModal ? chatParamsModal.querySelector('.close-modal-btn') : null;
```

**HTML实际类名（frontend/components/tabs/instant-chat.html 第7行）：**
```html
<button class="close-modal">&times;</button>
```

选择器不匹配导致 `closeModalBtn` 为 `null`，后续的事件监听器无法绑定，弹窗功能失效。

## 修复方案

### 修复文件
- `js/modules/chat/chat-core.js`

### 修复内容

**修复前（第19-22行）：**
```javascript
const chatParamsModal = document.getElementById('chat_params_modal');
const chatParamsBtn = document.getElementById('chat_params_btn');
const closeModalBtn = chatParamsModal ? chatParamsModal.querySelector('.close-modal-btn') : null;
const saveChatParamsBtn = document.getElementById('chat_save_params_btn');
```

**修复后：**
```javascript
const chatParamsModal = document.getElementById('chat_params_modal');
const chatParamsBtn = document.getElementById('chat_params_btn');
const closeModalBtn = chatParamsModal ? chatParamsModal.querySelector('.close-modal') : null;
const saveChatParamsBtn = document.getElementById('save_chat_params_btn');
```

### 修复的两个问题

1. **关闭按钮选择器错误**：`.close-modal-btn` → `.close-modal`
2. **保存按钮ID错误**：`chat_save_params_btn` → `save_chat_params_btn`

## 验证步骤

1. 刷新浏览器（Ctrl+F5 或 Cmd+Shift+R）清除缓存
2. 进入功能一（即时对话）标签页
3. 点击"对话参数设置"按钮
4. 验证弹窗正常打开
5. 验证可以修改参数（模型、温度、上下文条数等）
6. 验证"保存设置"按钮正常工作
7. 验证关闭按钮（×）正常工作
8. 验证点击弹窗外部可以关闭弹窗

## 相关文件

- `js/modules/chat/chat-core.js` - 修复的主文件
- `frontend/components/tabs/instant-chat.html` - 弹窗HTML定义
- `js/chat.js` - 旧版本（已有正确的选择器，未受影响）

## 注意事项

- 旧版 `js/chat.js` 中的选择器是正确的（`.close-modal`），说明这是重构时引入的回归问题
- 这个问题提醒我们在重构时需要更仔细地验证DOM选择器的一致性
- 建议在未来的重构中添加自动化测试来捕获此类问题

## 修复时间

2026-02-07

## 修复状态

✅ 已修复，等待用户验证

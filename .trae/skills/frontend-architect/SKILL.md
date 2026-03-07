---
name: "frontend-architect"
description: "Guides frontend architecture decisions, component design, and JavaScript module organization. Invoke when planning frontend structure or creating new components."
---

# Frontend Architect Skill

This skill guides frontend architecture decisions, component design, and JavaScript module organization.

## When to Invoke

- User is planning frontend structure
- User needs to create new components
- User wants to organize JavaScript modules
- User needs CSS architecture guidance
- User is refactoring frontend code

## Project Frontend Structure

```
frontend/
├── components/         # HTML components
│   ├── header.html
│   ├── sidebar-navigation.html
│   └── tabs/          # Feature tabs
│       ├── instant-chat.html
│       ├── patent-batch.html
│       └── ...
├── css/
│   ├── base/          # Reset, variables, animations
│   ├── components/    # Component styles
│   ├── layout/        # Layout styles
│   └── pages/         # Page-specific styles
├── js/
│   ├── ai_description/
│   └── [legacy files]
└── images/

js/                     # Modern modules (refactored)
├── core/              # Core utilities
│   ├── api.js
│   └── component-loader.js
├── modules/           # Feature modules
│   ├── chat/
│   ├── claims/
│   ├── pdf-ocr/
│   └── init/
└── main.js            # Entry point
```

## Module Organization

### Core Module Pattern
```javascript
// js/core/api.js
export class API {
  static async post(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  static async stream(url, data, onChunk) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  }
}
```

### Feature Module Pattern
```javascript
// js/modules/chat/chat-ui.js
export class ChatUI {
  constructor(container) {
    this.container = container;
    this.messages = [];
  }
  
  render() {
    this.container.innerHTML = this.template();
    this.bindEvents();
  }
  
  template() {
    return `
      <div class="chat-container">
        <div class="messages"></div>
        <div class="input-area">
          <textarea></textarea>
          <button class="send-btn">发送</button>
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    this.container.querySelector('.send-btn')
      .addEventListener('click', () => this.sendMessage());
  }
  
  async sendMessage() {
    // Implementation
  }
}
```

### Module Index Pattern
```javascript
// js/modules/chat/index.js
export { ChatUI } from './chat-ui.js';
export { ChatAPI } from './chat-api.js';
export { ChatHistory } from './chat-history.js';

// Usage
import { ChatUI, ChatAPI } from './modules/chat/index.js';
```

## Component Loading

```javascript
// js/core/component-loader.js
export class ComponentLoader {
  static async loadComponent(containerId, componentPath) {
    const response = await fetch(componentPath);
    const html = await response.text();
    document.getElementById(containerId).innerHTML = html;
  }
  
  static async loadTab(tabId) {
    const tabConfig = TABS_CONFIG.find(t => t.id === tabId);
    if (tabConfig) {
      await this.loadComponent('tab-content', tabConfig.component);
    }
  }
}
```

## CSS Architecture

### BEM Naming Convention
```css
/* Block */
.chat-container { }

/* Element */
.chat-container__message { }
.chat-container__input { }

/* Modifier */
.chat-container__message--sent { }
.chat-container__message--received { }
```

### CSS Variables
```css
/* css/base/variables.css */
:root {
  /* Colors */
  --color-primary: #4a90d9;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Typography */
  --font-family: 'Segoe UI', sans-serif;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 18px;
}
```

### Component CSS Pattern
```css
/* css/components/chat.css */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-md);
}

.chat-container__messages {
  flex: 1;
  overflow-y: auto;
}

.chat-container__input {
  display: flex;
  gap: var(--spacing-sm);
}

/* Dark theme */
[data-theme="dark"] .chat-container {
  background: var(--color-bg-dark);
}
```

## Event Management

### Event Bus Pattern
```javascript
// js/core/event-bus.js
export class EventBus {
  static events = {};
  
  static on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  static emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
  
  static off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

// Usage
EventBus.on('message-sent', (data) => console.log(data));
EventBus.emit('message-sent', { text: 'Hello' });
```

## State Management

### Simple State Pattern
```javascript
// js/core/state.js
export class State {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = [];
  }
  
  get(key) {
    return key ? this.state[key] : this.state;
  }
  
  set(key, value) {
    this.state[key] = value;
    this.notify();
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notify() {
    this.listeners.forEach(l => l(this.state));
  }
}

// Usage
const appState = new State({ user: null, theme: 'light' });
appState.subscribe(state => console.log('State changed:', state));
appState.set('theme', 'dark');
```

## Best Practices

1. **Modularize**: Split large files into focused modules
2. **Use ES6 Modules**: Import/export syntax
3. **Single Responsibility**: Each module does one thing
4. **Consistent Naming**: Use clear, descriptive names
5. **Document**: JSDoc comments for functions
6. **Test**: Write tests for modules
7. **Lazy Load**: Load components on demand

## File Size Guidelines

| Size | Action |
|------|--------|
| < 200 lines | Good |
| 200-400 lines | Acceptable |
| 400-600 lines | Consider splitting |
| > 600 lines | Must split |

---
name: "code-refactor"
description: "Assists with code refactoring, module splitting, and maintaining code quality. Invoke when user asks to refactor code, split large files, or improve code structure."
---

# Code Refactor Skill

This skill helps you refactor code, split large files into modules, and maintain code quality standards.

## When to Invoke

- User asks to refactor or restructure code
- User wants to split a large file into smaller modules
- User needs to improve code organization
- User wants to apply design patterns
- Code review reveals structural issues

## Refactoring Principles

### 1. Single Responsibility Principle
Each module/function should do one thing well.

### 2. Module Size Guidelines
- **Target**: < 300 lines per file
- **Warning**: > 500 lines needs review
- **Critical**: > 1000 lines must be split

### 3. Code Organization
```
module/
├── core/           # Core functionality
├── utils/          # Helper functions
├── handlers/       # Event handlers
└── index.js        # Main entry point
```

## Refactoring Workflow

1. **Analyze**: Identify dependencies and coupling
2. **Plan**: Create refactoring plan with file structure
3. **Extract**: Move code to new modules
4. **Test**: Verify functionality after each step
5. **Document**: Update comments and docs

## Common Patterns

### Extract Function
```javascript
// Before
function process(data) {
  // 50 lines of validation
  // 30 lines of transformation
  // 20 lines of output
}

// After
function validateData(data) { /* ... */ }
function transformData(data) { /* ... */ }
function outputData(data) { /* ... */ }

function process(data) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  outputData(transformed);
}
```

### Module Split
```javascript
// Before: largeFile.js (1000+ lines)

// After:
// utils/validation.js
// utils/transformation.js
// utils/output.js
// index.js (entry point)
```

## Project-Specific Guidelines

For this patent-workbench project:

### Backend (Python/Flask)
- Follow Blueprint pattern
- Keep routes thin, logic in services
- Use utils for shared functions

### Frontend (JavaScript)
- Split files > 500 lines
- Group by feature (chat/, claims/, pdf-ocr/)
- Use ES6 modules

## Checklist Before Refactoring

- [ ] Understand current functionality
- [ ] Identify all dependencies
- [ ] Create backup/branch
- [ ] Plan new structure
- [ ] Refactor incrementally
- [ ] Test after each change
- [ ] Update documentation

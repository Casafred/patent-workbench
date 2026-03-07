---
name: "bug-fixer"
description: "Diagnoses and fixes bugs systematically with root cause analysis. Invoke when user reports a bug, error, or unexpected behavior."
---

# Bug Fixer Skill

This skill helps you diagnose and fix bugs systematically with proper root cause analysis.

## When to Invoke

- User reports a bug or error
- User sees unexpected behavior
- User needs to debug an issue
- User wants to fix a regression
- Error messages appear in logs

## Bug Fixing Workflow

### 1. Reproduce
- Get exact steps to reproduce
- Note expected vs actual behavior
- Capture error messages and stack traces
- Identify environment (browser, OS, etc.)

### 2. Isolate
- Find the smallest reproducible case
- Check if it's frontend or backend
- Review recent changes that might cause it
- Check related issues in history

### 3. Diagnose
```javascript
// Frontend debugging
console.log('Variable state:', variable);
debugger; // Breakpoint

// Backend debugging (Python)
import logging
logging.debug(f"Variable state: {variable}")
raise Exception("Debug point")  # Quick debug
```

### 4. Fix
- Make minimal necessary changes
- Add tests for the bug case
- Document the fix

### 5. Verify
- Test the fix works
- Test no regressions introduced
- Get user confirmation

## Common Bug Patterns

### Null/Undefined Errors
```javascript
// Before (buggy)
const name = user.profile.name;

// After (safe)
const name = user?.profile?.name || 'Unknown';
```

### Async/Await Issues
```javascript
// Before (buggy)
async function getData() {
  const result = fetchData();
  return result.data; // undefined!
}

// After (fixed)
async function getData() {
  const result = await fetchData();
  return result.data;
}
```

### Race Conditions
```javascript
// Before (buggy)
let data = null;
fetchData().then(d => data = d);
console.log(data); // null!

// After (fixed)
async function init() {
  const data = await fetchData();
  console.log(data);
}
```

## Error Analysis Checklist

- [ ] Full error message captured
- [ ] Stack trace reviewed
- [ ] Reproduction steps documented
- [ ] Affected browsers/environments identified
- [ ] Recent changes reviewed
- [ ] Related code examined
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Test added
- [ ] Verified by user

## Debugging Tools

### Frontend
- Browser DevTools (F12)
- Console.log / Console.table
- Network tab for API calls
- React DevTools (if applicable)

### Backend
- Python logging
- Flask debug mode
- Postman for API testing
- Database query logs

## Quick Diagnosis Questions

1. What were you doing when it happened?
2. What did you expect to happen?
3. What actually happened?
4. Can you reproduce it consistently?
5. Did it work before? When did it break?

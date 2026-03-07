---
name: "api-tester"
description: "Tests API endpoints, validates responses, and debugs streaming interfaces. Invoke when user needs to test APIs, check response formats, or debug endpoint issues."
---

# API Tester Skill

This skill helps you test API endpoints, validate response formats, and debug API issues.

## When to Invoke

- User wants to test an API endpoint
- User needs to verify API response format
- User is debugging API errors
- User wants to check streaming responses
- User needs to validate request parameters

## Testing Workflow

### 1. Identify Endpoint
```python
# Example from this project
POST /api/stream_chat     # Streaming chat
POST /api/chat            # Sync chat
POST /api/patent/search   # Patent search
POST /api/claims/process  # Claims processing
```

### 2. Prepare Request
```javascript
const testRequest = {
  url: '/api/stream_chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: {
    message: '测试消息',
    model: 'glm-4-flash'
  }
};
```

### 3. Execute and Validate
- Check status code (200, 400, 500)
- Validate response structure
- Test error handling
- Verify streaming behavior

## Common Test Scenarios

### Streaming API Test
```javascript
// Test SSE streaming
const response = await fetch('/api/stream_chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

### Error Response Test
```javascript
// Test error handling
const tests = [
  { name: 'Missing auth', headers: {}, expected: 401 },
  { name: 'Invalid params', body: {}, expected: 400 },
  { name: 'Valid request', body: validData, expected: 200 }
];
```

## Response Validation

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed message"
}
```

## Project-Specific Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stream_chat` | POST | Streaming AI chat |
| `/api/patent/search` | POST | Search patents |
| `/api/claims/process` | POST | Process claims |
| `/api/drawing_marker/mark` | POST | Mark drawings |
| `/api/auth/login` | POST | User login |

## Debugging Tips

1. **Check Headers**: Content-Type, Authorization
2. **Log Request**: Full request body and params
3. **Check Logs**: Server-side error messages
4. **Test Isolation**: Test one thing at a time
5. **Use curl/Postman**: For quick manual tests

## Quick Test Commands

```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test with auth
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}' \
     http://localhost:5001/api/stream_chat
```

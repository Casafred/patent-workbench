---
name: "feature-builder"
description: "Guides systematic feature development from planning to implementation. Invoke when user wants to add a new feature or extend existing functionality."
---

# Feature Builder Skill

This skill guides you through systematic feature development from planning to implementation.

## When to Invoke

- User wants to add a new feature
- User needs to extend existing functionality
- User is planning a new module
- User wants to implement a user story

## Feature Development Workflow

### Phase 1: Planning

#### 1.1 Define Requirements
```markdown
## Feature: [Feature Name]

### User Story
As a [user type], I want to [action] so that [benefit].

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Technical Requirements
- Frontend: [requirements]
- Backend: [requirements]
- Database: [requirements]
```

#### 1.2 Design Architecture
```
feature/
├── frontend/
│   ├── components/
│   ├── styles/
│   └── handlers/
├── backend/
│   ├── routes/
│   ├── services/
│   └── models/
└── tests/
```

### Phase 2: Implementation

#### 2.1 Backend First
```python
# 1. Define route
@bp.route('/api/feature', methods=['POST'])
def handle_feature():
    data = request.get_json()
    result = feature_service.process(data)
    return jsonify(result)

# 2. Implement service
class FeatureService:
    def process(self, data):
        # Business logic
        pass

# 3. Add tests
def test_feature():
    response = client.post('/api/feature', json={})
    assert response.status_code == 200
```

#### 2.2 Frontend Integration
```javascript
// 1. Create UI component
class FeatureUI {
  constructor(container) {
    this.container = container;
  }
  
  render() {
    // Render UI
  }
  
  async submit(data) {
    const response = await api.feature(data);
    this.handleResponse(response);
  }
}

// 2. Wire up events
document.querySelector('#feature-btn')
  .addEventListener('click', () => featureUI.submit());
```

### Phase 3: Testing

```markdown
## Test Checklist

### Unit Tests
- [ ] Service functions
- [ ] Utility functions
- [ ] Component rendering

### Integration Tests
- [ ] API endpoint
- [ ] Database operations
- [ ] Frontend-backend flow

### E2E Tests
- [ ] User workflow
- [ ] Error handling
- [ ] Edge cases
```

### Phase 4: Documentation

```markdown
## Feature Documentation

### Overview
Brief description of the feature.

### Usage
How to use the feature.

### API Reference
Endpoint documentation.

### Examples
Code examples and screenshots.
```

## Project-Specific Patterns

### For Patent Workbench

#### Adding a New Tab
```javascript
// 1. Add tab config in tabs_config.json
{
  "id": "new-feature",
  "title": "新功能",
  "icon": "icon-name",
  "component": "tabs/new-feature.html"
}

// 2. Create component HTML
// frontend/components/tabs/new-feature.html

// 3. Add route handler
// backend/routes/new_feature.py

// 4. Add styles
// frontend/css/pages/new-feature.css
```

#### Adding API Endpoint
```python
# 1. Create route file
# backend/routes/new_api.py

from flask import Blueprint, request, jsonify
bp = Blueprint('new_api', __name__)

@bp.route('/api/new-endpoint', methods=['POST'])
def new_endpoint():
    # Implementation
    pass

# 2. Register blueprint in __init__.py
from .new_api import bp as new_api_bp
app.register_blueprint(new_api_bp)
```

## Best Practices

1. **Start Small**: MVP first, iterate later
2. **Test Early**: Write tests alongside code
3. **Document**: Update docs as you go
4. **Review**: Get feedback before merging
5. **Monitor**: Add logging for debugging

## Feature Checklist

- [ ] Requirements documented
- [ ] Architecture designed
- [ ] Backend implemented
- [ ] Frontend implemented
- [ ] Tests written
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed and verified

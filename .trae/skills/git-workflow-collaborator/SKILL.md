---
name: "git-workflow-collaborator"
description: "Guides Git collaboration workflow with Issue management, PR process, code quality gates, and team standards. Invoke when starting new features, creating branches, submitting PRs, or need workflow guidance."
---

# Git Workflow Collaborator Skill

This skill provides comprehensive Git workflow guidance for collaborative development, including Issue management, branch strategies, Pull Request processes, and code quality gates.

## When to Invoke

- Starting a new feature or bug fix
- Creating a development branch
- Preparing to submit a Pull Request
- Need workflow guidance or best practices
- Code review preparation
- Issue and PR management

---

## Core Workflow Overview

```
Issue Creation → Branch Creation → Development → Quality Gates → PR Submission → Code Review → Merge → Issue Closure
```

---

## 1. Issue Management Standards

### Issue Creation Requirements

Before any development, create a detailed Issue with:

**Required Fields:**
- **Title**: Clear, concise description (e.g., `feat: Add user authentication system`)
- **Description**: Detailed requirement explanation
- **Technical Approach**: Proposed implementation strategy
- **Acceptance Criteria**: Measurable completion conditions
- **Priority**: High / Medium / Low
- **Labels**: `feature`, `bugfix`, `enhancement`, `documentation`, etc.
- **Assignee**: Developer responsible
- **Milestone**: Target release version

### Issue Template

```markdown
## Feature/Bug Description
[Detailed description of the feature or bug]

## Technical Approach
[Proposed implementation strategy]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Priority
- [ ] High
- [ ] Medium
- [ ] Low

## Estimated Completion
[Target date or sprint]

## Related Issues/PRs
[Link to related items]
```

### Issue Labels Standard

| Label | Purpose |
|-------|---------|
| `feature` | New functionality |
| `bugfix` | Bug fixes |
| `enhancement` | Improvements to existing features |
| `documentation` | Documentation updates |
| `refactor` | Code refactoring |
| `test` | Testing related |
| `urgent` | Critical priority |
| `blocked` | Waiting on dependencies |

---

## 2. Branch Naming Convention

### Branch Types and Naming

```
<branch-type>/<issue-id>-<short-description>
```

| Branch Type | Purpose | Example |
|-------------|---------|---------|
| `feature/` | New features | `feature/123-user-authentication` |
| `bugfix/` | Bug fixes | `bugfix/456-login-error` |
| `hotfix/` | Production fixes | `hotfix/789-security-patch` |
| `release/` | Release preparation | `release/v2.1.0` |
| `refactor/` | Code refactoring | `refactor/321-api-structure` |
| `docs/` | Documentation | `docs/555-api-documentation` |

### Branch Creation Workflow

```bash
# 1. Sync with main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/123-user-authentication

# 3. Push to remote
git push -u origin feature/123-user-authentication
```

---

## 3. Commit Message Standards

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no feature change) |
| `style` | Code style changes (formatting, etc.) |
| `docs` | Documentation only |
| `test` | Adding or modifying tests |
| `chore` | Build process, dependencies, etc. |
| `perf` | Performance improvements |
| `ci` | CI/CD configuration changes |

### Examples

```bash
# Feature commit
feat(auth): add JWT token refresh mechanism

- Implement automatic token refresh
- Add refresh token storage
- Update auth interceptor

Closes #123

# Bug fix commit
fix(login): resolve session timeout issue

The session was timing out prematurely due to incorrect
cookie configuration. Updated cookie maxAge to 24 hours.

Fixes #456

# Breaking change
feat(api)!: change user endpoint response format

BREAKING CHANGE: The user API response now returns
nested object instead of flat structure.
```

### Commit Best Practices

1. **Atomic Commits**: One logical change per commit
2. **Present Tense**: Use "add" not "added"
3. **No Period**: Don't end subject with period
4. **Reference Issues**: Link to related issues
5. **Explain Why**: Body explains reasoning, not what changed

---

## 4. Pull Request Standards

### PR Creation Checklist

Before creating PR, ensure:

- [ ] Branch is up-to-date with main
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] No unnecessary files committed
- [ ] Commit messages follow convention
- [ ] Issue is referenced in commits

### PR Template

```markdown
## Related Issue
Closes #<issue-number>

## Changes Made
- Change 1
- Change 2
- Change 3

## Type of Change
- [ ] New feature (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor)
- [ ] Documentation (docs)
- [ ] Other: ___________

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added and passing
- [ ] Local tests pass

## Additional Notes
[Any additional information for reviewers]
```

### PR Title Format

```
<type>(<scope>): <description> (#<issue-number>)
```

Examples:
- `feat(auth): add OAuth2 login support (#123)`
- `fix(api): resolve timeout issue in search endpoint (#456)`

---

## 5. Code Quality Gates

### Pre-Commit Checks

```bash
# Run before each commit
npm run lint          # Linting
npm run typecheck     # Type checking
npm run test:unit     # Unit tests
```

### Pre-Merge Requirements

| Check | Requirement | Tool |
|-------|-------------|------|
| Linting | No errors | ESLint/Pylint |
| Type Check | No errors | TypeScript/mypy |
| Unit Tests | Pass, coverage > 80% | Jest/pytest |
| Build | Successful | npm run build |
| Security Scan | No vulnerabilities | npm audit/safety |

### Quality Gate Script

```bash
#!/bin/bash
# quality-gate.sh

echo "Running quality gates..."

# Lint check
echo "1. Linting..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed"
    exit 1
fi

# Type check
echo "2. Type checking..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type check failed"
    exit 1
fi

# Unit tests
echo "3. Running tests..."
npm run test:coverage
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

# Build check
echo "4. Building..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ All quality gates passed!"
```

---

## 6. Code Review Standards

### Review Checklist

**Functionality:**
- [ ] Code implements the requirement
- [ ] Edge cases are handled
- [ ] Error handling is appropriate

**Code Quality:**
- [ ] Code is readable and maintainable
- [ ] No code duplication
- [ ] Functions/methods are focused
- [ ] Naming is clear and consistent

**Testing:**
- [ ] Tests cover new functionality
- [ ] Tests are meaningful
- [ ] Edge cases are tested

**Security:**
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No SQL injection vulnerabilities
- [ ] Authentication/authorization correct

**Performance:**
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] No memory leaks

### Review Comments Format

```markdown
# Severity Levels
🔴 **MUST FIX**: Critical issue that blocks merge
🟡 **SHOULD FIX**: Important but not blocking
🟢 **SUGGESTION**: Optional improvement
❓ **QUESTION**: Clarification needed
```

### Review Examples

```markdown
🔴 **MUST FIX**: SQL injection vulnerability
This query is vulnerable to SQL injection. Use parameterized queries:
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

🟡 **SHOULD FIX**: Missing error handling
Consider adding try-except for database connection failures.

🟢 **SUGGESTION**: Could use list comprehension
This loop could be simplified:
```python
result = [item.value for item in items if item.active]
```
```

---

## 7. Merge Process

### Merge Requirements

1. All quality gates pass
2. At least one approval from code owner
3. No unresolved review comments
4. Branch is up-to-date with main
5. All conversations resolved

### Merge Strategies

| Strategy | When to Use |
|----------|-------------|
| **Squash and Merge** | Feature branches with multiple commits |
| **Merge Commit** | Release branches, preserving history |
| **Rebase and Merge** | Clean linear history needed |

### Post-Merge Actions

```bash
# 1. Delete feature branch (local)
git checkout main
git pull origin main
git branch -d feature/123-user-auth

# 2. Delete remote branch
git push origin --delete feature/123-user-auth

# 3. Close related Issue (auto via PR)
# If PR contains "Closes #123", Issue auto-closes
```

---

## 8. Issue-PR Association

### Automatic Association

Include in PR description:
```markdown
Closes #123
Fixes #456
Resolves #789
```

### Manual Association

If forgotten, add comment:
```markdown
Related to #123
```

---

## 9. Development Workflow Guide

### Starting New Feature

```bash
# Step 1: Create Issue on GitHub/GitLab
# Include: description, technical approach, acceptance criteria

# Step 2: Create branch
git checkout main
git pull origin main
git checkout -b feature/123-new-feature

# Step 3: Make changes with quality commits
git add .
git commit -m "feat(scope): add new feature component"

# Step 4: Keep branch updated
git fetch origin
git rebase origin/main

# Step 5: Run quality gates
npm run lint && npm run test

# Step 6: Push and create PR
git push origin feature/123-new-feature
# Create PR via GitHub/GitLab UI

# Step 7: Address review feedback
# Make changes, commit, push

# Step 8: Merge after approval
# Delete branch after merge
```

### Bug Fix Workflow

```bash
# Step 1: Create bug Issue
# Include: reproduction steps, expected vs actual behavior

# Step 2: Create hotfix branch
git checkout main
git pull origin main
git checkout -b bugfix/456-critical-bug

# Step 3: Fix and test
# Write test that reproduces bug
# Fix the bug
# Verify test passes

# Step 4: Commit with reference
git commit -m "fix(scope): resolve critical bug

- Add test case for bug reproduction
- Fix root cause in component X

Fixes #456"

# Step 5: Create PR and merge
```

---

## 10. Platform-Specific Integration

### GitHub Integration

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

### GitLab Integration

```yaml
# .gitlab-ci.yml
quality_gate:
  stage: test
  script:
    - npm ci
    - npm run lint
    - npm run test:coverage
    - npm run build
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

### Branch Protection Rules

```yaml
# Required settings for main branch
- Require pull request before merging
- Require approvals: 1
- Require status checks to pass
- Require branches to be up to date
- Status checks required:
  - lint
  - test
  - build
```

---

## 11. Emergency Procedures

### Hotfix Process

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/789-critical-fix

# 2. Fix and test
# Make minimal necessary changes

# 3. Create PR with urgent label
# Request immediate review

# 4. After merge, tag release
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Hotfix: critical security fix"
git push origin v1.2.1
```

### Revert Process

```bash
# Revert a merged PR
git revert -m 1 <merge-commit-hash>
git push origin main
```

---

## 12. Best Practices Summary

### Do's ✅

1. **Always create Issue first** - Track all work
2. **Use descriptive branch names** - Include issue number
3. **Write meaningful commit messages** - Explain why
4. **Keep PRs small** - Easier to review
5. **Run quality gates locally** - Before pushing
6. **Update documentation** - Keep docs current
7. **Respond to reviews promptly** - Maintain momentum
8. **Delete branches after merge** - Keep repo clean

### Don'ts ❌

1. **Don't commit directly to main** - Use branches
2. **Don't skip quality gates** - They exist for a reason
3. **Don't force push to shared branches** - Breaks history
4. **Don't merge without approval** - Follow process
5. **Don't ignore review comments** - Address all feedback
6. **Don't commit secrets** - Use environment variables
7. **Don't create large PRs** - Split into smaller ones
8. **Don't forget to close Issues** - Keep tracker updated

---

## Quick Reference Commands

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/123-desc

# Keep branch updated
git fetch origin && git rebase origin/main

# Quality gates
npm run lint && npm run test && npm run build

# Create PR
git push -u origin feature/123-desc
# Then create PR via GitHub/GitLab UI

# After merge cleanup
git checkout main && git pull && git branch -d feature/123-desc

# Emergency revert
git revert -m 1 <commit-hash>
```

---

## Configuration

This skill can be configured for different project needs:

- **Approval count**: Adjust required reviewers
- **Quality gates**: Add/remove checks
- **Branch naming**: Customize patterns
- **Commit format**: Adapt to project standards
- **CI/CD integration**: Platform-specific workflows

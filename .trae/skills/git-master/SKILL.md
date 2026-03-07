---
name: "git-master"
description: "Manages Git operations, resolves conflicts, and maintains clean commit history. Invoke when user needs Git help, conflict resolution, or version control guidance."
---

# Git Master Skill

This skill helps you manage Git operations, resolve conflicts, and maintain clean commit history.

## When to Invoke

- User needs to commit or push changes
- User has merge conflicts
- User wants to revert changes
- User needs branch management
- User wants clean commit history

## Common Git Workflows

### Daily Workflow
```bash
# Start work
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Keep branch updated
git fetch origin
git rebase origin/main

# Push and create PR
git push origin feature/my-feature
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: Formatting
- `docs`: Documentation
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(chat): add streaming response support
fix(patent): resolve duplicate search results
refactor(claims): split processor into modules
```

## Conflict Resolution

### Step-by-Step
```bash
# 1. Fetch latest
git fetch origin

# 2. Try rebase
git rebase origin/main

# 3. If conflicts occur
# Edit conflicted files
# Look for <<<<<<< HEAD markers

# 4. Stage resolved files
git add <resolved-file>

# 5. Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

### Conflict Markers
```
<<<<<<< HEAD
Your changes
=======
Their changes
>>>>>>> branch-name
```

## Useful Commands

### Undo Changes
```bash
# Discard working directory changes
git checkout -- <file>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Create undo commit
git revert <commit-hash>
```

### Branch Management
```bash
# List branches
git branch -a

# Delete local branch
git branch -d feature/old

# Delete remote branch
git push origin --delete feature/old

# Rename branch
git branch -m old-name new-name
```

### History & Debugging
```bash
# View history
git log --oneline --graph --all

# Find who changed a line
git blame <file>

# Search commits
git log --grep="search term"

# See file history
git log -p <file>

# Find bug with bisect
git bisect start
git bisect bad          # Current is bad
git bisect good <hash>  # Known good commit
```

### Stash Management
```bash
# Save changes temporarily
git stash

# Stash with message
git stash save "work in progress"

# List stashes
git stash list

# Apply stash
git stash pop

# Apply specific stash
git stash apply stash@{1}
```

## Project-Specific Tips

### For This Project
```bash
# Check what's changed
git status
git diff --stat

# View recent commits
git log --oneline -10

# Check if deployed
git log origin/main --oneline -5

# Sync with remote
git fetch --all
git status
```

## Best Practices

1. **Commit Often**: Small, focused commits
2. **Pull Before Push**: Always sync first
3. **Write Good Messages**: Explain why, not what
4. **Use Branches**: Don't commit directly to main
5. **Review Changes**: `git diff` before commit
6. **Keep History Clean**: Rebase before merge

## Emergency Recovery

### Recover Deleted Branch
```bash
git reflog
git checkout -b recovered-branch <commit-hash>
```

### Recover Lost Commit
```bash
git reflog
git cherry-pick <commit-hash>
```

### Reset to Remote State
```bash
git fetch origin
git reset --hard origin/main
```

## Git Aliases (Optional)
```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.lg "log --oneline --graph --all"
```

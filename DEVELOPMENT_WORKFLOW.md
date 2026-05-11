# Development Workflow

This document describes the recommended development workflow for the Word Racing game project.

## Branching Strategy

This project follows **GitHub Flow** (a simplified version of GitFlow):

```
main (production-ready)
  ↑
  | Pull Request
  |
feature/xxx (feature branches)
fix/xxx (bug fix branches)
hotfix/xxx (emergency production fixes)
```

### Branch Types

1. **`main`**: Production-ready code
   - Always deployable
   - Protected branch (requires PR + review)
   - All commits are tagged with version numbers

2. **`feature/*`**: New features
   - Branch from: `main`
   - Merge back to: `main` via PR
   - Example: `feature/add-audio`

3. **`fix/*`**: Bug fixes
   - Branch from: `main`
   - Merge back to: `main` via PR
   - Example: `fix/quiz-timer-bug`

4. **`hotfix/*`**: Emergency production fixes
   - Branch from: `main`
   - Merge back to: `main` via PR (expedited review)
   - Example: `hotfix/critical-crash-fix`

## Development Process

### 1. Start a New Feature

```bash
# Ensure you're on main and it's up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/add-sound-effects

# Make your changes
# ... edit files ...

# Commit regularly with meaningful messages
git add .
git commit -m "feat(audio): add background music"

# Push to remote
git push origin feature/add-sound-effects
```

### 2. Create a Pull Request

1. Push your branch to GitHub
   ```bash
   git push origin feature/add-sound-effects
   ```

2. Go to GitHub and create a Pull Request
   - Use the PR template
   - Fill in all sections
   - Link related issues (`Closes #123`)
   - Request reviews from team members

3. Wait for CI checks and reviews

### 3. Code Review Process

**Reviewer Responsibilities:**
- Check code quality and style
- Verify the feature works as described
- Test on multiple browsers/devices
- Suggest improvements or alternatives
- Approve or request changes

**Author Responsibilities:**
- Respond to feedback promptly
- Make requested changes
- Push updates to the same branch
- Reply to all comments

### 4. Merge to Main

Once approved:
1. Use **"Squash and merge"** to keep history clean
2. Delete the feature branch after merging
3. Tag a new version (if releasing)

```bash
# After merge, clean up local branch
git checkout main
git pull origin main
git branch -d feature/add-sound-effects
```

## Commit Message Convention

Follow **Conventional Commits**:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes
- **perf**: Performance improvements

### Scopes (examples)
- `quiz`: Quiz-related changes
- `race`: Racing mechanics
- `shop`: Shop system
- `ui`: User interface
- `audio`: Sound effects/music
- `data`: Vocabulary data

### Examples
```bash
feat(quiz): add difficulty levels 1-5

Added difficulty selection to quiz menu. Easy mode shows
hint for each word.

Closes #42

fix(race): fix car getting stuck on track edges

The collision detection was too aggressive. Reduced the
collision boundary by 10% to allow smoother edge riding.

fixes #38

docs(readme): update installation instructions

Added Python server command for local testing.
```

## Code Style Guidelines

### JavaScript
```javascript
// Use 2 spaces for indentation
function example() {
  if (condition) {
    doSomething();
  }
}

// Use camelCase for variables and functions
const playerScore = 100;
function calculateFuel() { ... }

// Use PascalCase for classes
class Car { ... }

// Add JSDoc comments for functions
/**
 * Calculate player's score
 * @param {number} correct - Number of correct answers
 * @returns {number} Score percentage
 */
function calculateScore(correct) { ... }
```

### HTML/CSS
```css
/* Use kebab-case for CSS classes */
.race-track {
  background-color: #333;
}

/* Use CSS variables for theming */
:root {
  --primary-color: #ff4444;
  --secondary-color: #333333;
}
```

```html
<!-- Use semantic HTML -->
<nav class="main-menu">
  <button class="menu-btn">Start Game</button>
</nav>

<section class="quiz-container">
  <!-- Content here -->
</section>
```

## Testing Checklist

Before creating a PR, ensure:

- [ ] **Functionality**
  - [ ] Game loads without errors
  - [ ] All game states work (Menu → Quiz → Shop → Race → Results)
  - [ ] No console errors or warnings

- [ ] **Cross-browser Testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest, if on macOS)
  - [ ] Edge (latest)

- [ ] **Device Testing**
  - [ ] Desktop (keyboard + mouse)
  - [ ] Tablet (touch controls)
  - [ ] Mobile (touch controls)

- [ ] **Performance**
  - [ ] Smooth frame rate (60 FPS)
  - [ ] No memory leaks
  - [ ] Fast loading time

- [ ] **Edge Cases**
  - [ ] Rapid key presses
  - [ ] Touch events while racing
  - [ ] LocalStorage full
  - [ ] Network disconnection (if applicable)

## Release Process

### 1. Version Numbering

Follow **Semantic Versioning** (SemVer):
- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (1.x.0): New features (backward compatible)
- **PATCH** (1.0.x): Bug fixes (backward compatible)

Examples:
- `1.0.0`: Initial release
- `1.1.0`: Added new quiz difficulty levels
- `1.1.1`: Fixed crash when answering quickly

### 2. Creating a Release

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create a version tag
git tag -a v1.1.0 -m "Release v1.1.0: Added difficulty levels"

# Push the tag
git push origin v1.1.0
```

### 3. GitHub Release

1. Go to GitHub → Releases → Create new release
2. Choose the tag (e.g., `v1.1.0`)
3. Add release notes (what's new, bug fixes, etc.)
4. Attach build artifacts (if any)
5. Publish release

## Emergency Procedures

### Reverting a Bad Commit

```bash
# Option 1: Revert (creates a new commit that undoes changes)
git revert HEAD
git push origin main

# Option 2: Reset (DANGEROUS - rewrites history)
# Only use if commit hasn't been pulled by others
git reset --hard HEAD~1
git push origin main --force
```

### Hotfix Process

For critical production bugs:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Make minimal fix
# ... edit files ...

# 3. Commit with clear message
git add .
git commit -m "hotfix: fix critical crash when..."

# 4. Create PR with "urgent" label
# 5. After expedited review, merge to main
# 6. Tag a patch release
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin v1.0.1
```

## Useful Git Commands

```bash
# See commit history
git log --oneline --graph

# See changes in a file
git diff HEAD~1 -- js/game.js

# Temporarily stash changes
git stash
git stash pop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes - DANGEROUS)
git reset --hard HEAD~1

# See who changed a line
git blame js/game.js

# Clean up merged branches
git branch --merged | grep -v "\*\|main" | xargs -n 1 git branch -d
```

## Questions?

Open an issue with the "question" label or contact the maintainers.

Happy coding! 🏎️💨

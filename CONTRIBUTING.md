# Contributing to Word Racing Game

Thank you for your interest in contributing! This guide will help you get started.

## Development Process

This project follows **GitHub Flow**:

### 1. Branch Naming Convention

- **Feature**: `feature/description` (e.g., `feature/add-sound-effects`)
- **Bug Fix**: `fix/description` (e.g., `fix/quiz-timer-issue`)
- **Documentation**: `docs/description` (e.g., `docs/update-readme`)
- **Refactor**: `refactor/description` (e.g., `refactor/game-loop`)

### 2. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(quiz): add difficulty levels for vocabulary
fix(game): resolve car physics collision detection
docs(readme): update installation instructions
```

### 3. Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit regularly
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Test your changes** thoroughly
   - Test on both desktop and mobile browsers
   - Ensure no console errors
   - Check that the game flow works end-to-end

4. **Push to your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use the PR template
   - Fill in all relevant sections
   - Link any related issues
   - Request review from maintainers

6. **Address review feedback**
   - Make requested changes
   - Push updates to the same branch
   - Respond to comments

7. **Merge after approval**
   - Use "Squash and merge" for clean history
   - Delete the feature branch after merging

## Code Style Guidelines

### JavaScript
- Use **2 spaces** for indentation
- Use **camelCase** for variables and functions
- Use **PascalCase** for class names
- Add **JSDoc comments** for functions
- Keep functions **small and focused**

### HTML/CSS
- Use **semantic HTML** elements
- Use **kebab-case** for CSS classes
- Follow **mobile-first** responsive design
- Use CSS variables for theming

### Example Function Documentation
```javascript
/**
 * Calculate player's score based on quiz performance
 * @param {number} correct - Number of correct answers
 * @param {number} total - Total number of questions
 * @returns {number} Calculated score
 */
function calculateScore(correct, total) {
  return Math.round((correct / total) * 100);
}
```

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Game loads without console errors
- [ ] Quiz flow works correctly
- [ ] Shop transactions work properly
- [ ] Racing mechanics are smooth
- [ ] Leaderboard saves and displays correctly
- [ ] Mobile touch controls work
- [ ] Keyboard controls work
- [ ] No regression in existing features

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue.

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser and device information

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) when creating an issue.

Include:
- Clear description of the feature
- Use case and motivation
- Possible implementation approach
- Mockups or examples if available

## Questions?

Feel free to open an issue with the "question" label, or contact the maintainers.

Thank you for contributing to Word Racing Game! 🏎️

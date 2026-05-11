# Branch Protection Rules

This document describes the recommended branch protection rules for the `main` branch to ensure code quality and stability.

## Recommended Settings (for GitHub repository)

When you push this repository to GitHub, configure these branch protection rules:

### 1. Enable Branch Protection

Navigate to: **Settings → Branches → Add rule**

### 2. Configure Rules

**Branch name pattern:** `main`

**Required settings:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1` (at least 1 reviewer)
  - ✅ Dismiss stale reviews when new commits are pushed
  - ✅ Require review from code owners (optional)

- ✅ **Require status checks to pass before merging**
  - Wait for status checks to pass before merging

- ✅ **Require conversation resolution before merging**
  - All review comments must be resolved

- ✅ **Restrict pushes that create files greater than 100MB**
  - Prevent large files from being committed

- ❌ **Allow force pushes**: DISABLED
- ❌ **Allow deletions**: DISABLED

### 3. Additional Recommendations

**For collaborative projects:**
- Enable **Require signed commits** (if using GPG)
- Enable **Require linear history** (prevent merge commits)
- Add **Restrict pushes** to specific users/teams

## Benefits

- Prevents direct pushes to `main`
- Ensures all changes are reviewed
- Maintains a clean commit history
- Protects against accidental breaks
- Enforces code quality standards

## Local Development Workflow

With branch protection enabled, developers should:

1. **Never commit directly to `main`**
   ```bash
   # WRONG
   git checkout main
   git add .
   git commit -m "my changes"
   git push origin main  # This will fail!
   
   # RIGHT
   git checkout -b feature/my-feature
   git add .
   git commit -m "feat: my changes"
   git push origin feature/my-feature
   # Then create a Pull Request on GitHub
   ```

2. **Always use feature branches**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/feature-name
   # Make changes...
   git add .
   git commit -m "feat(scope): description"
   git push origin feature/feature-name
   ```

3. **Keep branches up to date**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/my-feature
   git rebase main  # or merge main
   ```

## Emergency Hotfix Process

For critical production bugs:

1. Create hotfix branch from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. Make minimal changes and test thoroughly

3. Create PR with **urgent** label

4. After approval, merge to `main`

5. Tag a new release
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.1 -m "Hotfix: Critical bug fix"
   git push origin v1.0.1
   ```

## Questions?

Contact the repository maintainers or open an issue with the "question" label.

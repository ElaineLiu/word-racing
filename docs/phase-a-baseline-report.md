# Phase A0 Baseline Report

Date: 2026-09-01  
Branch: `chore/phase-a-baseline`  
Remote baseline: `origin/main@a816e3e4fe2956451e611a586f7bf86eeb7cba9c`

## Environment

- Node.js: 24.18.0 LTS
- npm: 11.16.0
- Vitest: 4.1.11
- Build tool: esbuild 0.25.x
- Dependency lock: `package-lock.json`

## Automated verification

- Wordset validation: passed with 3 known missing-file warnings (`f1-racing`, `raz-h`, `raz-i`); Phase A1 removes these invalid runtime entries.
- Test files: 55 passed.
- Tests: 763 passed.
- Production build: passed.
- Built bundle: approximately 2.1 MB before Phase A1 wordset cleanup.
- npm audit after the Vitest upgrade: 0 vulnerabilities.
- `git diff --check`: passed; Git only reported expected Windows line-ending notices.

## Browser smoke test

- URL: `http://localhost:3000/`
- Page title loaded correctly.
- Home, Quiz, Garage, Race, Report, and Settings navigation controls rendered.
- Home learning and race-readiness panels rendered.
- Browser console warnings/errors after initialization: none.

## Known baseline items

- The current build still includes the Shanghai Grade 6 wordset.
- The wordset config still references three missing future wordsets.
- These are intentionally deferred to Phase A1 and are not hidden test failures.
- GitHub Actions can only be fully exercised after the branch is explicitly approved and pushed.

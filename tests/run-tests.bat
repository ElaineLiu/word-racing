@echo off
REM test-runner.bat - Run tests before and after each change
REM Usage: tests\run-tests.bat [file]

echo ═══════════════════════════════════════════════════════════
echo   Word Racing Test Runner
echo ═══════════════════════════════════════════════════════════

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

echo.
echo 🧪 Running tests...
echo.

if "%~1"=="" (
    npx vitest run --reporter=verbose
) else (
    npx vitest run "%~1" --reporter=verbose
)

echo.
echo ═══════════════════════════════════════════════════════════
if %ERRORLEVEL% EQU 0 (
    echo ✅ All tests passed! Safe to proceed.
) else (
    echo ❌ Tests failed! Fix issues before committing.
)
echo ═══════════════════════════════════════════════════════════

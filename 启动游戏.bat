@echo off
cd /d "%~dp0"

echo ========================================
echo      Word Racing Launcher
echo ========================================
echo.

set PORT=3000

:: Try Python first (Windows default)
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Using Python
    echo Open http://localhost:%PORT%
    echo Press Ctrl+C to stop
    echo.
    start "" http://localhost:%PORT%
    python -m http.server %PORT%
    exit /b 0
)

:: Try Python 3
where python3 >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Using Python 3
    echo Open http://localhost:%PORT%
    echo Press Ctrl+C to stop
    echo.
    start "" http://localhost:%PORT%
    python3 -m http.server %PORT%
    exit /b 0
)

:: Try npx (Node.js)
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Using Node.js (npx serve)
    echo Open http://localhost:%PORT%
    echo Press Ctrl+C to stop
    echo.
    start "" http://localhost:%PORT%
    npx serve . -l %PORT%
    exit /b 0
)

:: Fallback: PowerShell (built into Windows 10/11, no admin required)
echo [OK] Using PowerShell (built-in)
echo Open http://localhost:%PORT%
echo Press Ctrl+C to stop
echo.
start "" http://localhost:%PORT%
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause

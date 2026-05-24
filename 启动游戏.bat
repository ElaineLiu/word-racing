@echo off
cd /d "%~dp0"
echo Starting Word Racing...
start "" http://localhost:3000
npx serve . -l 3000

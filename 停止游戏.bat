@echo off
echo Stopping Word Racing...
taskkill /f /im node.exe 2>nul
echo Done.
pause

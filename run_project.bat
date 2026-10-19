@echo off
cd /d "%~dp0"
echo Starting BioCover...
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_project.ps1"
set "launcherExit=%errorlevel%"
if not "%launcherExit%"=="0" (
    echo.
    echo BioCover failed to start. See the error above.
    pause
)
exit /b %launcherExit%

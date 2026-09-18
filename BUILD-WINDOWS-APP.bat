@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer to build the app.
 pause
 exit /b 1
)
call npm ci
if errorlevel 1 goto failed
call npm run app:windows
if errorlevel 1 goto failed
echo Installer output: dist\windows
echo For automatic updates, configure apps\release-config.json before release.
pause
exit /b 0
:failed
echo App build failed. See the error above.
pause
exit /b 1

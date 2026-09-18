@echo off
cd /d "%~dp0"
call npm ci
if errorlevel 1 goto failed
call npm run mobile:android
if errorlevel 1 goto failed
call npm run mobile:android:open
if errorlevel 1 goto failed
echo Use Android Studio to test, then Generate Signed App Bundle for Google Play.
pause
exit /b 0
:failed
echo Build preparation failed. Install Node.js 22+ and Android Studio.
pause
exit /b 1

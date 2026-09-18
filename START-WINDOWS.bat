@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 or later is required on the host PC.
 echo Install Node.js, then double-click this file again.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<20)process.exit(1)"
if errorlevel 1 (
 echo Please update Node.js to version 20 or later.
 pause
 exit /b 1
)
start "Ability Front LAN Server" cmd /k node server.mjs
node -e "setTimeout(()=>{},900)"
start "" http://localhost:8787

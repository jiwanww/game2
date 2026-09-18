@echo off
chcp 65001 >nul
cd /d "%~dp0"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=20?0:1)" >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 이상이 방장 PC에 필요합니다. 설치 후 다시 실행하세요.
 pause
 exit /b 1
)
node internet.mjs
pause

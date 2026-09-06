@echo off
cd /d "%~dp0"
node --experimental-sqlite src/server.js
pause

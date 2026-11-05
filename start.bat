@echo off
cd /d "%~dp0"
start "" http://localhost:8480/
node server.js

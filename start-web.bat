@echo off
cd /d "%~dp0"
start "ScholarFlow v1.34 local server" cmd /k "py -3 local_server.py"
timeout /t 2 >nul
start "" "http://127.0.0.1:8765"

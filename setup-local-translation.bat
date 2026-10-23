@echo off
cd /d "%~dp0"
py -3 setup_local_translation.py
if errorlevel 1 echo Installation failed. Check network access and Python environment.
pause

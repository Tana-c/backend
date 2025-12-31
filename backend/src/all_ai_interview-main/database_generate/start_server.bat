@echo off
echo Starting Database API Server...
echo.
echo Make sure you have installed Python dependencies:
echo   pip install -r requirements.txt
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"
python run_api.py

pause


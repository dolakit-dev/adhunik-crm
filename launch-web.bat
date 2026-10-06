@echo off
title Adhunik Pest Control - Web Server
echo.
echo   ====================================
echo     Adhunik Pest Control - Web Server
echo   ====================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Start the web server
echo Starting web server at http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Run the server
node server.js

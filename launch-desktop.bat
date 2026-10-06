@echo off
title Adhunik Pest Control CRM
echo.
echo   ====================================
echo     Adhunik Pest Control - Starting...
echo   ====================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Launch the desktop app
echo Launching PestShield Pro Desktop...
npx electron . --no-sandbox

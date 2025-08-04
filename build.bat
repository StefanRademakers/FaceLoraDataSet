@echo off

REM Build the React application
npm run build:react
if %errorlevel% neq 0 (
    echo React build failed.
    exit /b %errorlevel%
)

REM Build the Electron main process
npm run build:electron
if %errorlevel% neq 0 (
    echo Electron build failed.
    exit /b %errorlevel%
)

REM Package the application into a Windows installer
npx electron-builder --win
if %errorlevel% neq 0 (
    echo Electron Builder packaging failed.
    exit /b %errorlevel%
)

echo Build and packaging completed successfully.

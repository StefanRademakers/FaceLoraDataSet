@echo off
setlocal ENABLEDELAYEDEXPANSION

echo ==========================================
echo  Mediavibe Face Lora DataSet - Build Start
echo ==========================================

REM Clean previous release artifacts
if exist release (
  echo Cleaning existing release directory...
  rmdir /s /q release
)

echo.
echo === Step 1: Build React (renderer) ===
npm run build:react
if %errorlevel% neq 0 (
    echo [FAIL] React build failed with code %errorlevel%
    goto :fail
)

echo.
echo === Step 2: Build Electron (main/preload) ===
npm run build:electron
if %errorlevel% neq 0 (
    echo [FAIL] Electron (tsc) build failed with code %errorlevel%
    goto :fail
)

echo.
echo === Step 3: Package with electron-builder ===
call npx electron-builder --win --config electron-builder.json
if %errorlevel% neq 0 (
    echo [FAIL] electron-builder packaging failed with code %errorlevel%
    goto :fail
)

echo.
echo ==========================================
echo  SUCCESS: Installer created in .\release
echo  Look for: *.exe and win-unpacked/ folder
echo ==========================================
goto :eof

:fail
echo.
echo Build process aborted.
exit /b %errorlevel%

endlocal

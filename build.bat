@echo off
REM Simplified build script (removed delayed expansion to avoid parsing issues)

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
call npm run build:react
IF ERRORLEVEL 1 GOTO failReact
echo React build OK.

echo.
echo === Step 2: Build Electron (main & preload) ===
call npm run build:electron
IF ERRORLEVEL 1 GOTO failElectron
echo Electron TypeScript build OK.

IF NOT EXIST dist-electron\electron\main.js (
    echo [FAIL] Compiled main process entry NOT found: dist-electron\electron\main.js
    GOTO fail
)
echo Verified main process bundle exists.

echo.
echo === Step 3: Package with electron-builder ===
call npx electron-builder --win --config electron-builder.json
IF ERRORLEVEL 1 GOTO failBuilder
echo electron-builder packaging OK.

echo.
echo ==========================================
echo  SUCCESS: Installer created in .\release
echo.
dir /b release
echo.
echo Opening release folder...
start "" "%cd%\release"
echo  Look for: *.exe and win-unpacked/ folder
echo ==========================================
GOTO end

:failReact
echo [FAIL] React build failed.
GOTO fail
:failElectron
echo [FAIL] Electron build failed.
GOTO fail
:failBuilder
echo [FAIL] electron-builder packaging failed.
GOTO fail

:fail
echo Build process aborted.
exit /b 1

:end
exit /b 0

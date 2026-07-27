@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

echo [1/5] Checking Node.js and pnpm...
call "%~dp0_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/5] Installing dependencies...
call pnpm.cmd install --frozen-lockfile
if errorlevel 1 goto fail

echo [3/5] Starting Firebase emulators in a new window...
start "ML Path Firebase Emulators" cmd /k "cd /d ""%CD%"" && pnpm.cmd firebase:emulators:start"

echo Waiting for emulators to boot...
timeout /t 12 /nobreak >nul

echo [4/5] Seeding local emulator data...
call pnpm.cmd firebase:emulators:seed
if errorlevel 1 (
  echo WARNING: Seeding failed. If the emulator window is still starting, wait 20 seconds and run this script again.
  goto fail
)

echo [5/5] Starting web dev server in a new window...
start "ML Path Web Dev" cmd /k "cd /d ""%CD%"" && pnpm.cmd dev"

echo.
echo Open this URL after the web server prints ready:
echo http://localhost:5173
start "" "http://localhost:5173"

popd
pause
exit /b 0

:fail
echo.
echo FAILED: Local demo did not start cleanly.
popd
pause
exit /b 1

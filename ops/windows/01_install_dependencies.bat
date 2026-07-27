@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

echo [1/3] Checking Node.js and pnpm...
call "%~dp0_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/3] Installing dependencies with pnpm...
call pnpm.cmd install --frozen-lockfile
if errorlevel 1 goto fail

echo [3/3] Installing Playwright browsers for E2E tests...
call pnpm.cmd --filter @ml-path/web exec playwright install
if errorlevel 1 goto fail

echo.
echo DONE: Dependencies are ready.
popd
pause
exit /b 0

:fail
echo.
echo FAILED: Dependency setup did not complete.
popd
pause
exit /b 1

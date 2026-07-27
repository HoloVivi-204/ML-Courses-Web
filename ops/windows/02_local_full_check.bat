@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

echo [0/14] Checking Node.js and pnpm...
call "%~dp0_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [1/14] Git status...
git status --short --branch
if errorlevel 1 goto fail

echo [2/14] Release candidate commit...
git rev-parse HEAD
if errorlevel 1 goto fail

echo [3/14] Installing dependencies...
call pnpm.cmd install --frozen-lockfile
if errorlevel 1 goto fail

echo [4/14] Installing Playwright browsers...
call pnpm.cmd --filter @ml-path/web exec playwright install
if errorlevel 1 goto fail

echo [5/14] Unit and integration tests...
call pnpm.cmd test
if errorlevel 1 goto fail

echo [6/14] Coverage...
call pnpm.cmd test:coverage
if errorlevel 1 goto fail

echo [7/14] Typecheck...
call pnpm.cmd typecheck
if errorlevel 1 goto fail

echo [8/14] Lint...
call pnpm.cmd lint
if errorlevel 1 goto fail

echo [9/14] Format check...
call pnpm.cmd format:check
if errorlevel 1 goto fail

echo [10/14] Build...
call pnpm.cmd build
if errorlevel 1 goto fail

echo [11/14] Performance budget...
call pnpm.cmd test:performance
if errorlevel 1 goto fail

echo [12/14] Firebase Emulator verification...
call pnpm.cmd firebase:emulators:verify
if errorlevel 1 goto fail

echo [13/14] E2E tests...
call pnpm.cmd test:e2e
if errorlevel 1 goto fail

echo [14/14] Production dependency audit...
call pnpm.cmd audit --prod --audit-level high
if errorlevel 1 goto fail

echo.
echo PASSED: Local release gate is green.
popd
pause
exit /b 0

:fail
echo.
echo FAILED: Fix the error above before staging deploy.
popd
pause
exit /b 1

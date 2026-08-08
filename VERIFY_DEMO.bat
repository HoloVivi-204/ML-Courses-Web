@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0" || exit /b 1

set "ML_PATH_NONINTERACTIVE=true"

echo ML Path local release gate
echo [1/13] Checking Node.js 22 and pnpm...
call "ops\windows\_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/13] Checking Java 21...
call "ops\windows\_ensure_java_21.bat"
if errorlevel 1 goto fail

if not exist "node_modules\.pnpm" (
  echo [3/13] Installing project packages...
  call "ops\windows\_run_pnpm.bat" install --frozen-lockfile
  if errorlevel 1 goto fail
) else (
  echo [3/13] Project packages are ready.
)

echo [4/13] Unit and integration tests...
call "ops\windows\_run_pnpm.bat" test
if errorlevel 1 goto fail

echo [5/13] Coverage...
call "ops\windows\_run_pnpm.bat" test:coverage
if errorlevel 1 goto fail

echo [6/13] Typecheck...
call "ops\windows\_run_pnpm.bat" typecheck
if errorlevel 1 goto fail

echo [7/13] Lint...
call "ops\windows\_run_pnpm.bat" lint
if errorlevel 1 goto fail

echo [8/13] Format check...
call "ops\windows\_run_pnpm.bat" format:check
if errorlevel 1 goto fail

echo [9/13] Production build...
call "ops\windows\_run_pnpm.bat" build
if errorlevel 1 goto fail

echo [10/13] Performance budget...
call "ops\windows\_run_pnpm.bat" test:performance
if errorlevel 1 goto fail

echo [11/13] Emulator verification...
call "ops\windows\_run_pnpm.bat" firebase:emulators:verify
if errorlevel 1 goto fail

echo [12/13] Authenticated browser journeys...
call "ops\windows\_run_pnpm.bat" test:e2e
if errorlevel 1 goto fail

echo [13/13] Production dependency audit and diff whitespace check...
call "ops\windows\_run_pnpm.bat" audit --prod --audit-level high
if errorlevel 1 goto fail
git diff --check
if errorlevel 1 goto fail

echo.
echo PASSED: The local release gate is green.
popd
exit /b 0

:fail
echo.
echo FAILED: Fix the first error above before presenting or publishing.
popd
exit /b 1

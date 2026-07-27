@echo off
setlocal EnableExtensions
pushd "%~dp0" || exit /b 1

if not exist "apps\web\.env.friend-demo" goto missing_config

echo ML Path friend demo
echo.
echo [1/6] Checking Node.js and pnpm...
call "ops\windows\_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/6] Checking Java 21...
call "ops\windows\_ensure_java_21.bat"
if errorlevel 1 goto fail

if not exist "node_modules\.pnpm" (
  echo [3/6] Downloading project packages. This can take a few minutes the first time...
  call pnpm.cmd install --frozen-lockfile
  if errorlevel 1 goto fail
) else (
  echo [3/6] Project packages are ready.
)

set "FIREBASE_PROJECT_ID=ml-courses-staging-01-40939"
set "GCLOUD_PROJECT=%FIREBASE_PROJECT_ID%"
set "GOOGLE_CLOUD_PROJECT=%FIREBASE_PROJECT_ID%"
set "LOCAL_CLOUD_AUTH_DEMO=true"
set "APP_ENV=local"
set "APPCHECK_ENFORCEMENT_MODE=disabled"
set "FIREBASE_AUTH_EMULATOR_HOST="

echo.
echo Optional: type the same email you will use to sign in if you want to try Admin pages.
echo Leave this blank for normal learner testing.
set /p LOCAL_DEMO_ADMIN_EMAIL=Admin email (optional):

echo [4/6] Starting local services...
start "ML Path Local Services" /D "%CD%" cmd /k "pnpm.cmd firebase:friend-demo:start"

echo Waiting for local services...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; for($attempt=0; $attempt -lt 45; $attempt++){ if((Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4400/emulators').StatusCode -eq 200){ exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 goto services_not_ready

echo [5/6] Preparing fresh demo data...
call pnpm.cmd firebase:friend-demo:seed
if errorlevel 1 goto fail

echo [6/6] Opening the web app...
start "ML Path Web" /D "%CD%" cmd /k "pnpm.cmd --filter @ml-path/web dev --mode friend-demo"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; for($attempt=0; $attempt -lt 45; $attempt++){ if((Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5173').StatusCode -eq 200){ exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 goto web_not_ready

start "" "http://localhost:5173"
echo.
echo DONE: The demo is open in your browser.
echo Keep the two black ML Path windows open while testing.
echo Close those two windows when you are finished.
popd
pause
exit /b 0

:missing_config
echo ERROR: apps\web\.env.friend-demo is missing. Clone the complete friend-demo branch again.
goto fail

:services_not_ready
echo ERROR: Local services did not start. Read the window named ML Path Local Services.
goto fail

:web_not_ready
echo ERROR: The web app did not start. Read the window named ML Path Web.
goto fail

:fail
echo.
echo The demo did not start. Do not edit code; read the message above and send a screenshot to the project owner.
popd
pause
exit /b 1

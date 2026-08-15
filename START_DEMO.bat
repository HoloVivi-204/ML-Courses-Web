@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0" || exit /b 1

set "ML_PATH_NONINTERACTIVE=false"
if /i "%~1"=="--non-interactive" set "ML_PATH_NONINTERACTIVE=true"

if not exist "apps\web\friend-demo.config" goto missing_config

call :prepare_friend_demo_environment
if errorlevel 1 goto runtime_config_failed

call :read_friend_demo_project
if errorlevel 1 goto invalid_config

echo ML Path local demo
echo Firebase Auth uses real Google OAuth; Firestore, Functions, and Storage run locally.
echo.
echo [1/8] Checking Node.js 22 and pnpm...
call "ops\windows\_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/8] Checking Java 21...
call "ops\windows\_ensure_java_21.bat"
if errorlevel 1 goto fail

if not exist "node_modules\.pnpm" (
  echo [3/8] Installing project packages for the first time...
  call "ops\windows\_run_pnpm.bat" install --frozen-lockfile
  if errorlevel 1 goto fail
) else (
  echo [3/8] Project packages are ready.
)

set "CLOUDSDK_AUTH_ACCESS_TOKEN="
set "FIREBASE_SERVICE_ACCOUNT="
set "FIREBASE_TOKEN="
set "GOOGLE_APPLICATION_CREDENTIALS="
set "GOOGLE_APPLICATION_CREDENTIALS_JSON="
set "GOOGLE_OAUTH_ACCESS_TOKEN="
set "GCLOUD_PROJECT=%FIREBASE_PROJECT_ID%"
set "GOOGLE_CLOUD_PROJECT=%FIREBASE_PROJECT_ID%"
set "LOCAL_CLOUD_AUTH_DEMO=true"
set "APP_ENV=local"
set "APPCHECK_ENFORCEMENT_MODE=disabled"
set "FIREBASE_AUTH_EMULATOR_HOST="
set "FIRESTORE_EMULATOR_HOST=localhost:8080"
set "FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199"
set "METADATA_SERVER_DETECTION=none"

if not defined XDG_CONFIG_HOME set "XDG_CONFIG_HOME=%CD%\.runtime\firebase-tools-config"

if defined LOCAL_DEMO_ADMIN_EMAIL (
  echo Optional Admin email is configured for this local Functions session.
) else if /i "%ML_PATH_NONINTERACTIVE%"=="true" (
  echo Optional Admin pages are disabled because no LOCAL_DEMO_ADMIN_EMAIL was provided.
) else (
  echo.
  echo Optional: enter the Gmail address that should have local Admin access.
  echo Leave it blank for learner-only testing.
  set /p "LOCAL_DEMO_ADMIN_EMAIL=Admin Gmail (optional): "
)
set "VITE_LOCAL_CLOUD_AUTH_DEMO=true"
set "VITE_LOCAL_DEMO_ADMIN_EMAIL=%LOCAL_DEMO_ADMIN_EMAIL%"

echo [4/8] Building local Functions and demo tooling...
call "ops\windows\_run_pnpm.bat" firebase:build
if errorlevel 1 goto fail

echo [5/8] Checking Node runtime and required demo ports...
"%ML_PATH_NODE_EXE%" "firebase\emulator-seed\dist\demo-readiness-cli.js" check-runtime
if errorlevel 1 goto fail
"%ML_PATH_NODE_EXE%" "firebase\emulator-seed\dist\demo-readiness-cli.js" check-ports launch
if errorlevel 1 goto port_conflict

echo Starting local Functions, Firestore, and Storage in a new window...
start "ML Path Local Services" /D "%CD%" cmd.exe /d /k "call ops\windows\_run_pnpm.bat firebase:friend-demo:start"

echo Waiting for the Emulator Hub and local API health endpoint...
"%ML_PATH_NODE_EXE%" "firebase\emulator-seed\dist\demo-readiness-cli.js" wait-for-http "http://localhost:4400/emulators" 60
if errorlevel 1 goto services_not_ready
"%ML_PATH_NODE_EXE%" "firebase\emulator-seed\dist\demo-readiness-cli.js" wait-for-http "http://localhost:5001/%FIREBASE_PROJECT_ID%/asia-southeast1/api/api/v1/health" 60
if errorlevel 1 goto services_not_ready

echo [6/8] Resetting and seeding fresh local Firestore and Storage data...
call "ops\windows\_run_pnpm.bat" firebase:friend-demo:seed
if errorlevel 1 goto seed_failed

echo [7/8] Generating the local analytics snapshot...
call "ops\windows\_run_pnpm.bat" analytics:aggregate
if errorlevel 1 goto aggregation_failed

echo [8/8] Starting the web app in a new window...
start "ML Path Web" /D "%CD%" cmd.exe /d /k "call ops\windows\_run_pnpm.bat --filter @ml-path/web dev --mode friend-demo --host localhost"
"%ML_PATH_NODE_EXE%" "firebase\emulator-seed\dist\demo-readiness-cli.js" wait-for-http "http://localhost:5173" 45
if errorlevel 1 goto web_not_ready

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process 'http://localhost:5173' -ErrorAction Stop; exit 0 } catch { exit 1 }"
if errorlevel 1 echo NOTICE: Windows could not open the default browser. Open http://localhost:5173 manually.
echo.
echo DONE: The fresh local demo is ready at http://localhost:5173.
echo Sign in with the Gmail account entered above to open local Admin flows.
echo Keep the ML Path Local Services and ML Path Web windows open while presenting.
goto success

:read_friend_demo_project
set "FIREBASE_PROJECT_ID="
for /f "tokens=1,* delims==" %%A in ('findstr /r /c:"^[ ]*VITE_FIREBASE_PROJECT_ID=" "apps\web\friend-demo.config"') do set "FIREBASE_PROJECT_ID=%%B"
set "FIREBASE_PROJECT_ID=%FIREBASE_PROJECT_ID:"=%"
if defined FIREBASE_PROJECT_ID exit /b 0
exit /b 1

:prepare_friend_demo_environment
if not exist ".runtime\friend-demo-web\" mkdir ".runtime\friend-demo-web"
if errorlevel 1 exit /b 1
copy /y "apps\web\friend-demo.config" ".runtime\friend-demo-web\.env.friend-demo" >nul
if errorlevel 1 exit /b 1
exit /b 0

:missing_config
echo ERROR: apps\web\friend-demo.config is missing. Restore the versioned public friend-demo configuration, then retry.
goto fail

:invalid_config
echo ERROR: VITE_FIREBASE_PROJECT_ID is missing from apps\web\friend-demo.config.
goto fail

:runtime_config_failed
echo ERROR: Could not prepare .runtime\friend-demo-web\.env.friend-demo. Check that the project folder is writable, then retry.
goto fail

:port_conflict
echo ERROR: A required demo port is occupied. Close the process named by the readiness message, then retry.
goto fail

:services_not_ready
echo ERROR: Local services did not become healthy. Read the ML Path Local Services window for the first failure.
goto fail

:seed_failed
echo ERROR: Fresh local data could not be seeded. Read the ML Path Local Services window, then retry.
goto fail

:aggregation_failed
echo ERROR: The local analytics snapshot could not be generated. Read the command output, then retry.
goto fail

:web_not_ready
echo ERROR: The web app did not become ready. Read the ML Path Web window for the first failure.
goto fail

:success
set "ML_PATH_EXIT_CODE=0"
goto finish

:fail
set "ML_PATH_EXIT_CODE=1"

:finish
popd
if "%ML_PATH_EXIT_CODE%"=="0" exit /b 0
if /i "%ML_PATH_NONINTERACTIVE%"=="true" exit /b %ML_PATH_EXIT_CODE%
echo.
echo The demo could not start. This window will close in 15 seconds.
timeout /t 15 /nobreak >nul
exit /b %ML_PATH_EXIT_CODE%

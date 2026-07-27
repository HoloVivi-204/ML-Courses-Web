@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

echo This script deploys STAGING only.
echo Do not enter a production project ID here.
echo.

set /p STAGING_PROJECT_ID=Enter STAGING Firebase project ID:
if "%STAGING_PROJECT_ID%"=="" goto missing_project
if /i "%STAGING_PROJECT_ID%"=="demo-ml-learning-local" goto bad_project
echo %STAGING_PROJECT_ID% | findstr /i "prod production" >nul
if not errorlevel 1 goto bad_project

set /p CONFIRM_PROJECT_ID=Type the same STAGING project ID again:
if not "%CONFIRM_PROJECT_ID%"=="%STAGING_PROJECT_ID%" goto mismatch_project

echo [1/8] Checking Node.js and pnpm...
call "%~dp0_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/8] Installing dependencies...
call pnpm.cmd install --frozen-lockfile
if errorlevel 1 goto fail

echo [3/8] Writing apps/functions/.env.%STAGING_PROJECT_ID% for staging runtime...
(
  echo APP_ENV=staging
  echo APPCHECK_ENFORCEMENT_MODE=enforced
  echo API_RATE_LIMIT_WINDOW_SECONDS=60
  echo API_RATE_LIMIT_ACCOUNT_DELETION_MAX=3
  echo API_RATE_LIMIT_ADMIN_MUTATION_MAX=10
  echo API_RATE_LIMIT_COMPLETION_MAX=20
  echo API_RATE_LIMIT_ENROLLMENT_MAX=10
  echo API_RATE_LIMIT_PLAYGROUND_CONFIG_MAX=20
  echo API_RATE_LIMIT_PLAYGROUND_RUN_MAX=10
  echo API_RATE_LIMIT_PLAYGROUND_SESSION_MAX=10
  echo API_RATE_LIMIT_QUIZ_ATTEMPT_MAX=10
  echo API_RATE_LIMIT_QUIZ_SUBMISSION_MAX=5
) > "apps\functions\.env.%STAGING_PROJECT_ID%"
if errorlevel 1 goto fail

echo [4/8] Enter Firebase Web App config for STAGING.
set "VITE_FIREBASE_USE_EMULATOR=false"
set "VITE_APP_ENV=staging"
set /p VITE_FIREBASE_API_KEY=VITE_FIREBASE_API_KEY:
set /p VITE_FIREBASE_APP_ID=VITE_FIREBASE_APP_ID:
set /p VITE_FIREBASE_AUTH_DOMAIN=VITE_FIREBASE_AUTH_DOMAIN [%STAGING_PROJECT_ID%.firebaseapp.com]:
if "%VITE_FIREBASE_AUTH_DOMAIN%"=="" set "VITE_FIREBASE_AUTH_DOMAIN=%STAGING_PROJECT_ID%.firebaseapp.com"
set "VITE_FIREBASE_PROJECT_ID=%STAGING_PROJECT_ID%"
set /p VITE_FIREBASE_APPCHECK_SITE_KEY=VITE_FIREBASE_APPCHECK_SITE_KEY:

if "%VITE_FIREBASE_API_KEY%"=="" goto missing_web_config
if "%VITE_FIREBASE_APP_ID%"=="" goto missing_web_config
if "%VITE_FIREBASE_APPCHECK_SITE_KEY%"=="" goto missing_web_config

echo [5/8] Building staging bundle...
call pnpm.cmd build
if errorlevel 1 goto fail

echo [6/8] Firebase login and project list...
call pnpm.cmd exec firebase login
if errorlevel 1 goto fail
call pnpm.cmd exec firebase projects:list
if errorlevel 1 goto fail

echo [7/8] Deploying rules, indexes, storage, functions, and hosting to STAGING...
call pnpm.cmd exec firebase deploy --only "firestore:rules,firestore:indexes,storage" --project "%STAGING_PROJECT_ID%"
if errorlevel 1 goto fail
call pnpm.cmd exec firebase deploy --only "functions:api" --project "%STAGING_PROJECT_ID%"
if errorlevel 1 goto fail
call pnpm.cmd exec firebase deploy --only "hosting" --project "%STAGING_PROJECT_ID%"
if errorlevel 1 goto fail

echo [8/8] Health check...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-RestMethod -Uri 'https://%STAGING_PROJECT_ID%.web.app/api/v1/health' | ConvertTo-Json -Depth 5"
if errorlevel 1 goto fail

echo.
echo DONE: Staging deploy finished.
echo URL: https://%STAGING_PROJECT_ID%.web.app
echo NEXT: Configure Firestore TTL for apiRateLimitBuckets.expireAt and adminContentPublishIdempotency.expireAt.
popd
pause
exit /b 0

:missing_project
echo ERROR: Missing staging project ID.
goto fail

:bad_project
echo ERROR: This does not look like a staging project ID.
goto fail

:mismatch_project
echo ERROR: Project confirmation does not match.
goto fail

:missing_web_config
echo ERROR: Missing required Firebase Web App config.
goto fail

:fail
echo.
echo FAILED: Staging deploy did not complete.
popd
pause
exit /b 1

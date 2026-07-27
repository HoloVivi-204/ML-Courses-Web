@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

echo This script grants one staging Admin claim and imports draft content to STAGING.
echo It does not publish content.
echo.

set /p STAGING_PROJECT_ID=Enter STAGING Firebase project ID:
if "%STAGING_PROJECT_ID%"=="" goto missing_project
if /i "%STAGING_PROJECT_ID%"=="demo-ml-learning-local" goto bad_project
echo %STAGING_PROJECT_ID% | findstr /i "prod production" >nul
if not errorlevel 1 goto bad_project

set /p CONFIRM_PROJECT_ID=Type the same STAGING project ID again:
if not "%CONFIRM_PROJECT_ID%"=="%STAGING_PROJECT_ID%" goto mismatch_project

if defined FIREBASE_SERVICE_ACCOUNT goto service_account_env
if defined GOOGLE_APPLICATION_CREDENTIALS goto service_account_env
if defined GOOGLE_APPLICATION_CREDENTIALS_JSON goto service_account_env

echo [1/6] Checking Node.js and pnpm...
call "%~dp0_ensure_pnpm.bat"
if errorlevel 1 goto fail

echo [2/6] Installing dependencies...
call pnpm.cmd install --frozen-lockfile
if errorlevel 1 goto fail

where gcloud >nul 2>nul
if errorlevel 1 (
  echo WARNING: gcloud was not found. If Firebase Admin auth fails, install Google Cloud CLI
  echo and run: gcloud auth application-default login
) else (
  set /p RUN_ADC=Run gcloud auth application-default login now? [y/N]:
  if /i "%RUN_ADC%"=="Y" call gcloud auth application-default login
)

echo [3/6] Enter the Auth UID that should become Admin on STAGING.
set /p ADMIN_UID=Admin UID:
if "%ADMIN_UID%"=="" goto missing_uid

echo [4/6] Granting one-time Admin claim...
call pnpm.cmd --filter @ml-path/release-tooling admin:claim -- --env staging --project "%STAGING_PROJECT_ID%" --confirm-project "%STAGING_PROJECT_ID%" --uid "%ADMIN_UID%" --apply
if errorlevel 1 goto fail

echo [5/6] Running draft content import dry-run...
call pnpm.cmd --filter @ml-path/release-tooling content:import -- --env staging --project "%STAGING_PROJECT_ID%" --dry-run
if errorlevel 1 goto fail

echo.
echo Review the dry-run output above.
set /p APPLY_IMPORT=Type APPLY to write draft content to STAGING:
if /i not "%APPLY_IMPORT%"=="APPLY" (
  echo Canceled before content apply.
  popd
  pause
  exit /b 0
)

echo [6/6] Applying draft content import...
call pnpm.cmd --filter @ml-path/release-tooling content:import -- --env staging --project "%STAGING_PROJECT_ID%" --apply
if errorlevel 1 goto fail

echo.
echo DONE: Admin claim and draft import finished.
echo NEXT: Sign out and sign in again so Firebase issues a fresh ID token with the Admin claim.
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

:service_account_env
echo ERROR: Service account environment variables are not accepted by trusted release tooling.
echo Clear FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, and GOOGLE_APPLICATION_CREDENTIALS_JSON.
goto fail

:missing_uid
echo ERROR: Missing Admin UID.
goto fail

:fail
echo.
echo FAILED: Admin claim or content import did not complete.
popd
pause
exit /b 1

@echo off
setlocal EnableExtensions
pushd "%~dp0..\.." || exit /b 1

set /p STAGING_PROJECT_ID=Enter STAGING Firebase project ID:
if "%STAGING_PROJECT_ID%"=="" goto fail

echo [1/3] Health check. Expected: success true, status ok.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-RestMethod -Uri 'https://%STAGING_PROJECT_ID%.web.app/api/v1/health' | ConvertTo-Json -Depth 5"
if errorlevel 1 goto fail

echo.
echo [2/3] Manual API request without App Check token.
echo Expected after enforcement: HTTP 401 or 403 for protected routes.
curl.exe -i "https://%STAGING_PROJECT_ID%.web.app/api/v1/system/features"

echo.
echo [3/3] Opening staging site for browser UAT.
echo URL: https://%STAGING_PROJECT_ID%.web.app
start "" "https://%STAGING_PROJECT_ID%.web.app"

popd
pause
exit /b 0

:fail
echo.
echo FAILED: Smoke test did not complete.
popd
pause
exit /b 1

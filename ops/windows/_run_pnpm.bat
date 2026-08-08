@echo off
setlocal EnableExtensions

if not defined ML_PATH_PNPM_CMD (
  call "%~dp0_ensure_pnpm.bat"
  if errorlevel 1 exit /b 1
)

call "%ML_PATH_PNPM_CMD%" %*
set "ML_PATH_EXIT_CODE=%ERRORLEVEL%"

endlocal & exit /b %ML_PATH_EXIT_CODE%

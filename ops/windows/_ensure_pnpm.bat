@echo off
setlocal EnableExtensions

set "ML_PATH_NODE_EXE="
call :find_node_22
if defined ML_PATH_NODE_EXE goto node_ready

where winget >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 22 was not found and Windows App Installer is unavailable.
  echo Install Node.js 22 LTS, then run this script again.
  exit /b 1
)

if /i "%ML_PATH_NONINTERACTIVE%"=="true" (
  echo ERROR: Node.js 22 is required, but no Node.js 22 runtime was found.
  echo Install Node.js 22 LTS, then run this command again.
  exit /b 1
)

echo Node.js 22 is needed the first time the demo runs.
set /p INSTALL_NODE=Install Node.js 22 now? [Y/n]:
if /i "%INSTALL_NODE%"=="N" (
  echo Node.js 22 is required before the demo can start.
  exit /b 1
)

winget install --id OpenJS.NodeJS.22 --exact --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo ERROR: Node.js 22 installation did not finish.
  exit /b 1
)

echo Node.js 22 was installed. Close this window, then run the command again.
exit /b 1

:node_ready
for %%N in ("%ML_PATH_NODE_EXE%") do set "ML_PATH_NODE_DIR=%%~dpN"
for %%R in ("%~dp0..\..") do set "ML_PATH_REPO_ROOT=%%~fR"
set "ML_PATH_COREPACK_CMD=%ML_PATH_NODE_DIR%corepack.cmd"
set "ML_PATH_COREPACK_SHIM_DIR=%ML_PATH_REPO_ROOT%\.runtime\corepack-node22"
set "ML_PATH_PNPM_CMD=%ML_PATH_COREPACK_SHIM_DIR%\pnpm.cmd"

if not exist "%ML_PATH_COREPACK_CMD%" (
  echo ERROR: Corepack was not found next to the selected Node.js 22 runtime.
  echo Reinstall Node.js 22 LTS, then run this script again.
  exit /b 1
)

"%ML_PATH_NODE_EXE%" -e "const major=Number(process.versions.node.split('.')[0]); process.exit(major === 22 ? 0 : 1)"
if errorlevel 1 (
  echo ERROR: Node.js 22 is required for this repository.
  "%ML_PATH_NODE_EXE%" --version
  exit /b 1
)

if not exist "%ML_PATH_COREPACK_SHIM_DIR%\" mkdir "%ML_PATH_COREPACK_SHIM_DIR%"
if errorlevel 1 (
  echo ERROR: Could not create the local Node.js 22 package-manager shim.
  exit /b 1
)

call "%ML_PATH_COREPACK_CMD%" enable --install-directory "%ML_PATH_COREPACK_SHIM_DIR%"
if errorlevel 1 (
  echo ERROR: Could not create the local pnpm shim for Node.js 22.
  exit /b 1
)

set "PATH=%ML_PATH_COREPACK_SHIM_DIR%;%ML_PATH_NODE_DIR%;%PATH%"

call "%ML_PATH_COREPACK_CMD%" prepare pnpm@11.9.0 --activate
if errorlevel 1 (
  echo ERROR: Could not prepare pnpm 11.9.0 with Node.js 22.
  exit /b 1
)

if not exist "%ML_PATH_PNPM_CMD%" (
  echo ERROR: The local pnpm shim was not created.
  exit /b 1
)

call "%ML_PATH_PNPM_CMD%" --version >nul 2>nul
if errorlevel 1 (
  echo ERROR: pnpm 11.9.0 could not start with Node.js 22.
  exit /b 1
)

endlocal & (
  set "PATH=%ML_PATH_COREPACK_SHIM_DIR%;%ML_PATH_NODE_DIR%;%PATH%"
  set "ML_PATH_COREPACK_CMD=%ML_PATH_COREPACK_CMD%"
  set "ML_PATH_NODE_EXE=%ML_PATH_NODE_EXE%"
  set "ML_PATH_PNPM_CMD=%ML_PATH_PNPM_CMD%"
)
exit /b 0

:find_node_22
for /f "delims=" %%N in ('where node 2^>nul') do (
  if not defined ML_PATH_NODE_EXE call :select_node_22 "%%~fN"
)

if defined ML_PATH_NODE_EXE exit /b 0

for %%R in ("%~dp0..\..\.runtime") do set "ML_PATH_RUNTIME_DIR=%%~fR"
if not exist "%ML_PATH_RUNTIME_DIR%\" exit /b 0

for /r "%ML_PATH_RUNTIME_DIR%" %%N in (node.exe) do (
  if not defined ML_PATH_NODE_EXE call :select_node_22 "%%~fN"
)
exit /b 0

:select_node_22
"%~1" -e "process.exit(Number(process.versions.node.split('.')[0]) === 22 ? 0 : 1)" >nul 2>nul
if not errorlevel 1 set "ML_PATH_NODE_EXE=%~f1"
exit /b 0

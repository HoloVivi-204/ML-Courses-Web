@echo off
setlocal EnableExtensions

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js 22 LTS, then run this script again.
  exit /b 1
)

node -e "const major=Number(process.versions.node.split('.')[0]); process.exit(major>=22&&major<25?0:1)"
if errorlevel 1 (
  echo ERROR: This repo expects Node.js major version 22, 23, or 24.
  echo Current version:
  node --version
  exit /b 1
)

where corepack >nul 2>nul
if errorlevel 1 (
  echo ERROR: Corepack is not available.
  echo Install Node.js 22 LTS from nodejs.org, then run this script again.
  exit /b 1
)

call corepack enable
if errorlevel 1 (
  echo ERROR: corepack enable failed.
  exit /b 1
)

call corepack prepare pnpm@11.9.0 --activate
if errorlevel 1 (
  echo ERROR: Could not activate pnpm 11.9.0.
  exit /b 1
)

call pnpm.cmd --version >nul 2>nul
if errorlevel 1 (
  echo ERROR: pnpm.cmd is still not available after Corepack setup.
  exit /b 1
)

exit /b 0

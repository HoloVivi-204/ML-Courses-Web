@echo off
setlocal EnableExtensions

set "JAVA_MAJOR="
for /f "tokens=3" %%J in ('java -version 2^>^&1 ^| findstr /c:"version"') do set "JAVA_VERSION=%%J"
set "JAVA_VERSION=%JAVA_VERSION:"=%"
for /f "tokens=1 delims=." %%J in ("%JAVA_VERSION%") do set "JAVA_MAJOR=%%J"

if defined JAVA_MAJOR if %JAVA_MAJOR% GEQ 21 exit /b 0

echo Java 21 is needed the first time Firebase local services run.
where winget >nul 2>nul
if errorlevel 1 (
  echo ERROR: Java 21 was not found and Windows App Installer is unavailable.
  echo Install Temurin Java 21, then run START_DEMO.bat again.
  exit /b 1
)

if /i "%ML_PATH_NONINTERACTIVE%"=="true" (
  echo ERROR: Java 21 is required, but no compatible runtime was found.
  echo Install Temurin Java 21, then run this command again.
  exit /b 1
)

set /p INSTALL_JAVA=Install Java 21 now? [Y/n]:
if /i "%INSTALL_JAVA%"=="N" (
  echo Java 21 is required before the demo can start.
  exit /b 1
)

winget install --id EclipseAdoptium.Temurin.21.JRE --exact --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo ERROR: Java 21 installation did not finish.
  exit /b 1
)

echo Java 21 was installed. Close this window, then run the demo command again.
exit /b 1

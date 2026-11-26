@echo off
rem Opens Snowtune in its own window. Closing the window stops it.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Snowtune needs Python 3.9 or newer.
  echo Get it from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
where pythonw >nul 2>nul
if %errorlevel%==0 (
  start "" pythonw "%~dp0Snowtune.pyw"
) else (
  start "Snowtune" /min python "%~dp0Snowtune.pyw"
)

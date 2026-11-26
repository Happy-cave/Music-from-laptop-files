@echo off
rem Puts a Snowtune shortcut (with its icon) on the Desktop and in the Start menu.
cd /d "%~dp0"
for /f "delims=" %%P in ('python -c "import sys,os;print(os.path.join(os.path.dirname(sys.executable),'pythonw.exe'))"') do set "PYW=%%P"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$targets = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''));" ^
  "foreach ($dir in $targets) {" ^
  "  $s = $ws.CreateShortcut((Join-Path $dir 'Snowtune.lnk'));" ^
  "  $s.TargetPath = '%PYW%';" ^
  "  $s.Arguments = '\"%~dp0Snowtune.pyw\"';" ^
  "  $s.WorkingDirectory = '%~dp0';" ^
  "  $s.IconLocation = '%~dp0snowtune.ico,0';" ^
  "  $s.Description = 'Snowtune music player';" ^
  "  $s.Save(); Write-Host ('Made ' + $s.FullName) }"

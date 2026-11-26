@echo off
powershell -NoProfile -Command "try { Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8765/api/shutdown -TimeoutSec 5 | Out-Null; Write-Host 'Snowtune stopped.' } catch { Write-Host 'Snowtune was not running.' }"
timeout /t 2 /nobreak >nul

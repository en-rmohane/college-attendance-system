$env:Path = "C:\Program Files\nodejs;C:\Users\ravik\AppData\Roaming\npm;" + $env:Path
Set-Location -Path "$PSScriptRoot\college_attendance_mobile"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting College Attendance Mobile App (Expo 57)..." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
npx expo start -c

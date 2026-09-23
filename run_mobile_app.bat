@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\ravik\AppData\Roaming\npm;%PATH%"
cd /d "%~dp0college_attendance_mobile"
echo ===================================================
echo   Starting College Attendance Mobile App (Expo 57)
echo ===================================================
npx expo start -c
pause

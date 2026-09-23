@echo off
set "PATH=C:\Program Files\nodejs;C:\Users\ravik\AppData\Roaming\npm;%PATH%"
cd /d "%~dp0college_attendance_mobile"
echo ===================================================
echo   Opening College Mobile App in Laptop Browser
echo ===================================================
echo.
echo 1. Launching Expo in Web Mode...
echo 2. Open your Chrome browser at: http://localhost:8081
echo 3. In Chrome, press F12 and click Mobile Device icon (Ctrl+Shift+M)
echo.
start "" "http://localhost:8081"
npx expo start --web
pause

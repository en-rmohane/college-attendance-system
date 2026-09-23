@echo off
setlocal
set "PATH=C:\Program Files\nodejs;C:\Users\ravik\AppData\Roaming\npm;%PATH%"
title Build College Attendance Android APK
echo ===================================================
echo   Building College Attendance Standalone APK
echo ===================================================
echo.
cd /d "%~dp0college_attendance_mobile"

echo 1. Checking EAS Build tools...
echo.
echo 2. Starting Android APK Cloud Build (Free)...
echo    (Note: If prompted, login with your free Expo account or create one at expo.dev)
echo.

call npx -y eas-cli build -p android --profile preview

echo.
echo ===================================================
echo   Build process completed!
echo   Download and install the generated .apk file on your phone.
echo ===================================================
pause

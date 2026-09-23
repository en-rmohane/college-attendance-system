@echo off
set PATH=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Roaming\npm;%PATH%
cd /d "%~dp0"
echo ========================================================
echo     Building SBITM ERP Mobile APK (Android Preview)
echo ========================================================
npx eas-cli build -p android --profile preview
pause

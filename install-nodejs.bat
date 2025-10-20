@echo off
echo Node.js Yukleniyor...
echo.

REM Node.js LTS versiyonunu indir
echo Node.js LTS versiyonu indiriliyor...
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'nodejs-installer.msi'"

echo.
echo Node.js installer indirildi. Simdi yukleniyor...
echo.

REM Node.js'i sessizce yükle
msiexec /i nodejs-installer.msi /quiet /norestart

echo.
echo Node.js yukleniyor, lutfen bekleyin...
timeout /t 30 /nobreak

echo.
echo Node.js yuklendi! Simdi sistemi baslatiyoruz...
echo.

REM Node.js yüklendikten sonra npm install ve start
call npm install
call npm start

pause



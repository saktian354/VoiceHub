@echo off
title VoiceHub
cd /d "%~dp0"

:: Cek apakah Node.js terinstall
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ============================================
    echo   Node.js belum terinstall!
    echo   Download di: https://nodejs.org/
    echo   Install versi LTS, lalu jalankan ulang file ini.
    echo ============================================
    pause
    exit /b 1
)

echo ============================================
echo   VoiceHub - Starting Application...
echo ============================================
echo.

:: Install dependencies jika belum ada
if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Gagal install dependencies. Cek koneksi internet.
        pause
        exit /b 1
    )
    echo.
)

:: Jalankan aplikasi
echo [2/2] Launching VoiceHub...
echo.
call npm run electron:dev

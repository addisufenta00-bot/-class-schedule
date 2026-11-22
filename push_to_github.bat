@echo off
title Push Project to GitHub (-class-schedule)
color 0A
cd /d "%~dp0"

echo ========================================================
echo   University Timetable System - GitHub Upload Script
echo   Target: https://github.com/addisufenta00-bot/-class-schedule.git
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=%PATH%;C:\Program Files\Git\cmd"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Git\cmd"
    ) else (
        echo [ERROR] Git is not installed or not in PATH yet.
        pause
        exit /b 1
    )
)

echo [OK] Git found:
git --version
echo.

echo [1/3] Checking Git repository...
if not exist ".git" (
    git init
)
git branch -M main

echo [2/3] Setting remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/addisufenta00-bot/-class-schedule.git

echo [3/3] Uploading all project files to GitHub (main branch)...
echo.
echo --------------------------------------------------------
echo NOTE: If a browser window or GitHub login popup appears,
echo simply click 'Sign in with your browser' / 'Authorize'!
echo --------------------------------------------------------
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Your project has been uploaded to GitHub!
    echo Visit: https://github.com/addisufenta00-bot/-class-schedule
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo If push failed, please make sure you completed the GitHub login popup.
    echo ========================================================
)

echo.
pause

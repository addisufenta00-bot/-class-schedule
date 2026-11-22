@echo off
title Push Project to GitHub
color 0A
cd /d "%~dp0"

echo ========================================================
echo   University Timetable System - GitHub Upload Script
echo ========================================================
echo.
echo [INFO] Working Directory: %CD%
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=%PATH%;C:\Program Files\Git\cmd"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Git\cmd"
    ) else (
        echo [ERROR] Git is not installed or not in PATH yet.
        echo Please install Git from https://git-scm.com/download/win and rerun.
        pause
        exit /b 1
    )
)

echo [OK] Git found:
git --version
echo.

echo [1/4] Initializing Git repository...
if not exist ".git" (
    git init
)
git branch -M main

echo.
echo [2/4] Staging project files (excluding node_modules)...
git add .

echo.
echo [3/4] Committing changes...
git commit -m "University Timetable Management System - Complete conflict-free academic scheduling platform"

echo.
echo ========================================================
echo Step to connect with your GitHub:
echo 1. Go to https://github.com/new in your browser
echo 2. Repository name: university-timetable-system (or any name)
echo 3. Click 'Create repository'
echo 4. Copy the repository URL (e.g. https://github.com/YOUR_USERNAME/YOUR_REPO.git)
echo ========================================================
echo.

set /p REPO_URL="Paste your GitHub repository URL here: "

if "%REPO_URL%"=="" (
    echo.
    echo [NOTICE] No URL entered. Changes are saved locally in Git.
    echo When you are ready, run:
    echo   git remote add origin YOUR_GITHUB_URL
    echo   git push -u origin main
    echo.
    pause
    exit /b 0
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo [4/4] Pushing to GitHub (main branch)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Your project is now safely backed up on GitHub!
    echo ========================================================
) else (
    echo.
    echo [NOTE] If GitHub asks for login or credentials, please sign in.
    echo Alternatively, push using GitHub Desktop or VS Code.
)

echo.
pause

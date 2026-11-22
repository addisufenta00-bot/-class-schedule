@echo off
echo ==========================================================
echo  University Timetable Management System Launcher
echo ==========================================================

echo Starting Backend API on http://localhost:5000...
start "Timetable Backend" cmd /k "cd /d %~dp0backend && node src/server.js"

echo Starting Frontend UI on http://localhost:3000...
start "Timetable Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Services launched successfully!
echo Please open http://localhost:3000 in your browser.

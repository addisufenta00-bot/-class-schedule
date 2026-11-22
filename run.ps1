Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " University Timetable Management System (Start Services) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check PostgreSQL service
$pgService = Get-Service postgresql-x64-16 -ErrorAction SilentlyContinue
if ($pgService.Status -ne 'Running') {
    Write-Host "Starting PostgreSQL Service..." -ForegroundColor Yellow
    Start-Service postgresql-x64-16
}
Write-Host "PostgreSQL is running." -ForegroundColor Green

# 2. Start Backend
Write-Host "Starting Backend API on http://localhost:5000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d backend && npm run dev"

# 3. Start Frontend
Write-Host "Starting Frontend UI on http://localhost:3000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d frontend && npm run dev"

Write-Host "All services started!" -ForegroundColor Green
Write-Host "Open http://localhost:3000 in your browser." -ForegroundColor Cyan

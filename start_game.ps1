Write-Host "Starting Ouroboro Game System..." -ForegroundColor Cyan

# Start Infrastructure (Redis & Postgres)
Write-Host "Starting Docker Containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker containers. Please ensure Docker Desktop is running." -ForegroundColor Red
    Pause
    Exit
}

# Start Server
Write-Host "Launching Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# Wait a moment for server to initialize
Start-Sleep -Seconds 5

# Start Client
Write-Host "Launching Client..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host "Game System Launched!" -ForegroundColor Cyan
Write-Host "Server running on http://localhost:3000"
Write-Host "Client running on http://localhost:5173"

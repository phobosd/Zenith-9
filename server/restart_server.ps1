Write-Host "Restarting Ouroboro server..." -ForegroundColor Yellow

# Kill existing server
Write-Host "Stopping existing server..." -ForegroundColor Red
$port = 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -gt 0) {
            Write-Host "Killing process $procId on port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}
else {
    Write-Host "No process found on port $port"
}

# Start server
Write-Host "Starting server..." -ForegroundColor Green
npm run dev

$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "Killed process on port $port"
}
else {
    Write-Host "No process found on port $port"
}
Start-Sleep -Seconds 1
npm run dev

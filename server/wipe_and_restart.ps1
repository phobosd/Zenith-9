$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "Killed running server process ($process)"
}
else {
    Write-Host "No server process found on port $port"
}

Start-Sleep -Seconds 2

Write-Host "Cleaning up generated data..."
# Remove generated NPCs
if (Test-Path "data\generated\npcs") {
    Remove-Item -Path "data\generated\npcs\*.json" -Force -ErrorAction SilentlyContinue
    Write-Host " - Removed generated NPCs"
}

# Remove generated Items
if (Test-Path "data\generated\items") {
    Remove-Item -Path "data\generated\items\*.json" -Force -ErrorAction SilentlyContinue
    Write-Host " - Removed generated Items"
}

# Remove generated World Expansions (Rooms)
if (Test-Path "data\generated\world_expansions") {
    Remove-Item -Path "data\generated\world_expansions\*.json" -Force -ErrorAction SilentlyContinue
    Write-Host " - Removed generated World Expansions"
}

# Remove generated Quests
if (Test-Path "data\generated\quests") {
    Remove-Item -Path "data\generated\quests\*.json" -Force -ErrorAction SilentlyContinue
    Write-Host " - Removed generated Quests"
}

Write-Host "Resetting Database (world_entities)..."
if (Test-Path "reset_world.js") {
    node reset_world.js
}
else {
    Write-Host "Error: reset_world.js not found!" -ForegroundColor Red
}

Write-Host "Starting Server..."
npm run dev

@echo off
echo Starting Ouroboro Game System...

echo Starting Docker Containers...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start Docker containers. Please ensure Docker Desktop is running.
    pause
    exit /b
)

start "Ouroboro Server" powershell -NoExit -Command "cd server; npm run dev"
timeout /t 5
start "Ouroboro Client" powershell -NoExit -Command "cd client; npm run dev"

echo Game System Launched!
echo Server running on http://localhost:3000
echo Client running on http://localhost:5173
pause

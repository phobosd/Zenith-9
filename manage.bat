@echo off
setlocal

:: Zenith-9 Management Script (Windows)
:: Usage: manage.bat [start|stop|restart|status]

set ACTION=%1
set SERVER_PORT=3000
set CLIENT_PORT=5173

if "%ACTION%"=="" goto usage
if "%ACTION%"=="start" goto start
if "%ACTION%"=="stop" goto stop
if "%ACTION%"=="restart" goto restart
if "%ACTION%"=="status" goto status
goto usage

:start
echo Starting Zenith-9 Services...

:: Ensure logs directory exists
if not exist logs mkdir logs

:: SERVER
echo --------------------------------
echo Setting up Server...
cd server
if not exist node_modules (
    echo Installing server dependencies...
    call npm install
)
echo Building server...
call npm run build
echo Starting Server...

:: Rotate log
if exist ..\logs\server.log (
    move /Y ..\logs\server.log ..\logs\server.old.log
)

start "Zenith-9 Server" /B npm start > ..\logs\server.log 2>&1
echo Server started in background. Logs at logs\server.log
cd ..

:: CLIENT
echo --------------------------------
echo Setting up Client...
cd client
if not exist node_modules (
    echo Installing client dependencies...
    call npm install
)
echo Starting Client...

:: Rotate log
if exist ..\logs\client.log (
    move /Y ..\logs\client.log ..\logs\client.old.log
)

start "Zenith-9 Client" /B npm run dev > ..\logs\client.log 2>&1
echo Client started in background. Logs at logs\client.log
cd ..

echo --------------------------------
echo Zenith-9 Started!
goto end

:stop
echo Stopping Zenith-9 Services...

:: Stop Process on Server Port
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%SERVER_PORT%" ^| find "LISTENING"') do (
    echo Killing Server process PID %%a
    taskkill /F /PID %%a
)

:: Stop Process on Client Port
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%CLIENT_PORT%" ^| find "LISTENING"') do (
    echo Killing Client process PID %%a
    taskkill /F /PID %%a
)

echo Services stopped.
goto end

:restart
call :stop
timeout /t 2 /nobreak >nul
call :start
goto end

:status
echo Checking Status...
netstat -aon | find ":%SERVER_PORT%" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo Server is RUNNING
) else (
    echo Server is STOPPED
)

netstat -aon | find ":%CLIENT_PORT%" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo Client is RUNNING
) else (
    echo Client is STOPPED
)
goto end

:usage
echo Usage: manage.bat {start|stop|restart|status}
goto end

:end
endlocal

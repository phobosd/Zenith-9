#!/bin/bash

# Zenith-9 Management Script
# Usage: ./manage.sh [start|stop|restart|status]

cd "$(dirname "$0")"
ACTION=$1

SERVER_PORT=3000
CLIENT_PORT=5173

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "Detected OS: $MACHINE"

get_pids() {
    PORT=$1
    if [ "$MACHINE" == "Mac" ] || [ "$MACHINE" == "Linux" ]; then
        lsof -ti:$PORT
    elif [[ "$MACHINE" == *"MinGw"* ]] || [[ "$MACHINE" == *"Cygwin"* ]]; then
        # Windows via Git Bash usually supports netstat -ano
        netstat -ano | grep ":$PORT" | grep "LISTENING" | awk '{print $5}'
    else
        echo ""
    fi
}

start_services() {
    echo "Starting Zenith-9 Services..."
    
    # Ensure logs directory exists
    LOG_DIR="logs"
    mkdir -p "$LOG_DIR"

    # REDIS
    echo "--------------------------------"
    echo "Starting Redis..."
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d redis
    else
         echo "Error: docker-compose not found. Cannot start Redis."
    fi

    # CLOUDFLARE TUNNEL (Named Tunnel)
    echo "--------------------------------"
    echo "Starting Cloudflare Tunnel..."
    if ! command -v cloudflared &> /dev/null; then
        echo "Error: cloudflared is not installed or not in PATH."
    else
        # Check if already running
        if pgrep -f "cloudflared tunnel" > /dev/null; then
             echo "Cloudflare Tunnel is already running."
        else
            echo "Starting Tunnel 'zenith-host'..."
            # Rotate log
            if [ -f "$LOG_DIR/cloudflared.log" ]; then
                mv "$LOG_DIR/cloudflared.log" "$LOG_DIR/cloudflared.old.log"
            fi
            cloudflared --config tunnel-config.yml tunnel run > "$LOG_DIR/cloudflared.log" 2>&1 &
            TUNNEL_PID=$!
            sleep 2
            if kill -0 $TUNNEL_PID > /dev/null 2>&1; then
                echo "Tunnel started successfully (PID: $TUNNEL_PID). Logging to $LOG_DIR/cloudflared.log"
            else
                echo "Error: Tunnel failed to start. Check $LOG_DIR/cloudflared.log for details:"
                cat "$LOG_DIR/cloudflared.log"
            fi
        fi
    fi

    # SERVER
    echo "--------------------------------"
    echo "Setting up Server..."
    cd server
    if [ ! -d "node_modules" ]; then
        echo "Installing server dependencies..."
        npm install
    fi
    echo "Building server..."
    npm run build
    echo "Starting Server on Port $SERVER_PORT..."
    
    # Rotate log
    if [ -f "../$LOG_DIR/server.log" ]; then
        mv "../$LOG_DIR/server.log" "../$LOG_DIR/server.old.log"
    fi
    
    npm start > "../$LOG_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    echo "Server process started (PID: $SERVER_PID). Logging to $LOG_DIR/server.log"
    cd ..

    # CLIENT
    echo "--------------------------------"
    echo "Setting up Client..."
    cd client
    if [ ! -d "node_modules" ]; then
        echo "Installing client dependencies..."
        npm install
    fi

    # Get Firebase Project ID for URL display
    if command -v jq &> /dev/null; then
        if [ -f ".firebaserc" ]; then
            FIREBASE_PROJECT_ID=$(jq -r '.projects.default' .firebaserc)
            FIREBASE_URL="https://${FIREBASE_PROJECT_ID}.web.app"
        fi
    fi

    echo "Starting Client on Port $CLIENT_PORT..."
    
    # Rotate log
    if [ -f "../$LOG_DIR/client.log" ]; then
        mv "../$LOG_DIR/client.log" "../$LOG_DIR/client.old.log"
    fi

    npm run dev > "../$LOG_DIR/client.log" 2>&1 &
    CLIENT_PID=$!
    echo "Client process started (PID: $CLIENT_PID). Logging to $LOG_DIR/client.log"
    cd ..

    echo "--------------------------------"
    echo "Zenith-9 Started!"
    echo "Server: http://localhost:$SERVER_PORT"
    echo "Client: http://localhost:$CLIENT_PORT"
    if [ ! -z "$FIREBASE_URL" ]; then
        echo "Firebase: $FIREBASE_URL"
    fi
}

stop_services() {
    echo "Stopping Zenith-9 Services..."
    
    # Stop Server
    PIDS=$(get_pids $SERVER_PORT)
    if [ ! -z "$PIDS" ]; then
        echo "Killing Server process(es): $PIDS"
        echo $PIDS | xargs kill -9
    else
        echo "No server found on port $SERVER_PORT"
    fi

    # Stop Client
    PIDS=$(get_pids $CLIENT_PORT)
    if [ ! -z "$PIDS" ]; then
        echo "Killing Client process(es): $PIDS"
        echo $PIDS | xargs kill -9
    else
        echo "No client found on port $CLIENT_PORT"
    fi

    # Stop Cloudflare Tunnel
    TUNNEL_PIDS=$(pgrep -f "cloudflared tunnel")
    if [ ! -z "$TUNNEL_PIDS" ]; then
         echo "Killing Cloudflare Tunnel process(es): $TUNNEL_PIDS"
         echo $TUNNEL_PIDS | xargs kill -9
         # Wait for it to actually die
         while pgrep -f "cloudflared tunnel" > /dev/null; do
             echo "Waiting for tunnel to exit..."
             sleep 1
         done
    else
         echo "No Cloudflare Tunnel 'zenith-host' found running."
    fi

    # Stop Redis
    echo "--------------------------------"
    echo "Stopping Redis..."
    if command -v docker-compose &> /dev/null; then
        docker-compose stop redis
    fi
    
    echo "Services stopped."
}

check_status() {
    echo "Checking Status..."
    
    # Check Redis
    if command -v docker-compose &> /dev/null; then
        if docker-compose ps redis | grep "Up"; then
            echo "Redis is RUNNING"
        else
            echo "Redis is STOPPED"
        fi
    else
        echo "Redis status unknown (docker-compose not found)"
    fi

    SERVER_PIDS=$(get_pids $SERVER_PORT)
    if [ ! -z "$SERVER_PIDS" ]; then
        echo "Server is RUNNING (PID: $SERVER_PIDS)"
    else
        echo "Server is STOPPED"
    fi

    CLIENT_PIDS=$(get_pids $CLIENT_PORT)
    if [ ! -z "$CLIENT_PIDS" ]; then
        echo "Client is RUNNING (PID: $CLIENT_PIDS)"
    else
        echo "Client is STOPPED"
    fi

    TUNNEL_PIDS=$(pgrep -f "cloudflared tunnel")
    if [ ! -z "$TUNNEL_PIDS" ]; then
        echo "Cloudflare Tunnel is RUNNING (PID: $TUNNEL_PIDS)"
    else
        echo "Cloudflare Tunnel is STOPPED"
    fi
}

case "$ACTION" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    status)
        check_status
        ;;
    test)
        ./run_tests.sh
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        exit 1
        ;;
esac

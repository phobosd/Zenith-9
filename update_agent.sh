#!/bin/bash

# Usage: ./update_agent.sh <agent> <status> <task>
# Example: ./update_agent.sh Forge working "Refactoring Database"

AGENT=$1
STATUS=$2
TASK=$3

if [ -z "$AGENT" ] || [ -z "$STATUS" ] || [ -z "$TASK" ]; then
    echo "Usage: ./update_agent.sh <agent> <status> <task>"
    exit 1
fi

# Determine Agent ID
case $AGENT in
    "Arch"|"Architect") ID="architect" ;;
    "Pixel") ID="pixel" ;;
    "Forge") ID="forge" ;;
    "Bug") ID="bug" ;;
    "Scanner") ID="scanner" ;;
    "Conduit") ID="conduit" ;;
    "Suit") ID="suit" ;;
    "Scribe") ID="scribe" ;;
    *) ID=$AGENT ;;
esac

# Create a small node script to emit the event
cd client && node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3000/admin');

socket.on('connect', () => {
    socket.emit('office:update_agent', {
        id: '$ID',
        status: '$STATUS',
        task: '$TASK'
    });
    setTimeout(() => process.exit(0), 100);
});
"

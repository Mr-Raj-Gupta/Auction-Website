#!/bin/bash

# Get current script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"

echo "=========================================================="
echo "Starting AetherBid Online Auction Portal"
echo "=========================================================="

# 1. Start MongoDB
echo "Checking MongoDB status..."
if pgrep -x "mongod" > /dev/null; then
    echo "MongoDB (mongod) is already running."
else
    echo "Starting local MongoDB instance..."
    mkdir -p data/db
    mongod --dbpath ./data/db --port 27017 --logpath ./data/mongodb.log --fork
    
    # Wait a moment
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        echo "MongoDB started successfully in the background."
    else
        echo "WARNING: Could not start MongoDB. If it is already running under a service, the server will still connect."
    fi
fi

# 2. Start Backend Server
echo "Starting Node.js Backend Server..."
cd backend
npm start

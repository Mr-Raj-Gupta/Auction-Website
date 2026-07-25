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
    echo "✓ MongoDB (mongod) is already running."
else
    echo "Starting local MongoDB instance..."
    mkdir -p data/db
    
    # Start mongod in background without fork (more reliable)
    mongod --dbpath ./data/db --port 27017 --logpath ./data/mongodb.log > /dev/null 2>&1 &
    
    # Wait for MongoDB to be ready
    sleep 3
    
    if pgrep -x "mongod" > /dev/null; then
        echo "✓ MongoDB started successfully in the background."
    else
        echo "⚠ WARNING: Could not start MongoDB. Make sure MongoDB is installed."
        echo "  Install with: brew install mongodb-community"
        exit 1
    fi
fi

# 2. Start Backend Server
echo "Starting Node.js Backend Server..."
cd backend
npm start

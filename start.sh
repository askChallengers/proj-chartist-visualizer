#!/bin/sh

# Start server.js and put it in the background
node server.js &

# Wait for server.js to be fully up (you might need to adjust this)
sleep 10

# Start record.js
node record.js
#!/bin/sh

# Start the backend in the background
cd /var/www/backend
node ./ & 

# Start Nginx in the foreground
exec nginx -g 'daemon off;'

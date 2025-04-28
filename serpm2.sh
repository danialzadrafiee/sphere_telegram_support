#!/bin/bash

# serpm2.sh - PM2 service management script
# Usage: ./serpm2.sh [restart|stop|log]

# Configuration
SERVER="157.90.149.206"
USER="root"
APP_PATH="/var/www/sphere-telegram.developerpie.com"
PM2_APP_ID="4000-sphere-telegram-prod"

# Validate arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [restart|stop|log]"
    exit 1
fi

ACTION=$1

case "$ACTION" in
    restart)
        echo "Restarting PM2 application $PM2_APP_ID..."
        ssh $USER@$SERVER "source ~/.nvm/nvm.sh && cd $APP_PATH && pm2 restart $PM2_APP_ID"
        ;;
    stop)
        echo "Stopping PM2 application $PM2_APP_ID..."
        ssh $USER@$SERVER "source ~/.nvm/nvm.sh && cd $APP_PATH && pm2 stop $PM2_APP_ID"
        ;;
    log)
        echo "Showing logs for PM2 application $PM2_APP_ID..."
        ssh $USER@$SERVER "source ~/.nvm/nvm.sh && cd $APP_PATH && pm2 logs $PM2_APP_ID"
        ;;
    *)
        echo "Invalid action. Use: restart, stop, or log"
        exit 1
        ;;
esac

echo "Done!"
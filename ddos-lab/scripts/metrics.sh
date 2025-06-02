#!/bin/bash

# Создание директории для метрик
mkdir -p ~/metrics

echo "Starting metrics collection..."

# Функция для сбора метрик
collect_metrics() {
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Системная нагрузка
    echo "[$timestamp] === SYSTEM LOAD ===" >> ~/metrics/load.log
    uptime >> ~/metrics/load.log
    echo "" >> ~/metrics/load.log
    
    # CPU и память
    echo "[$timestamp] === CPU & MEMORY ===" >> ~/metrics/cpu_memory.log
    top -b -n 1 | head -n 15 >> ~/metrics/cpu_memory.log
    echo "" >> ~/metrics/cpu_memory.log
    
    # Сетевые соединения
    echo "[$timestamp] === NETWORK CONNECTIONS ===" >> ~/metrics/network.log
    netstat_count=$(netstat -an | grep :8080 | wc -l)
    echo "Active connections on port 8080: $netstat_count" >> ~/metrics/network.log
    ss -tuln | grep :8080 >> ~/metrics/network.log
    echo "" >> ~/metrics/network.log
    
    # Детальная информация о соединениях
    echo "[$timestamp] === CONNECTION DETAILS ===" >> ~/metrics/connections_detailed.log
    netstat -an | grep :8080 >> ~/metrics/connections_detailed.log
    echo "" >> ~/metrics/connections_detailed.log
    
    # Статистика трафика
    echo "[$timestamp] === NETWORK TRAFFIC ===" >> ~/metrics/traffic.log
    cat /proc/net/dev | grep -E "(eth|enp)" >> ~/metrics/traffic.log
    echo "" >> ~/metrics/traffic.log
    
    # Дисковая активность
    echo "[$timestamp] === DISK IO ===" >> ~/metrics/disk.log
    iostat -d 1 1 2>/dev/null >> ~/metrics/disk.log
    echo "" >> ~/metrics/disk.log
}

# Главный цикл мониторинга
while true; do
    collect_metrics
    sleep 5
done 
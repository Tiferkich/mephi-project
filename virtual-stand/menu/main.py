#!/usr/bin/env python3
import os
import sys
import time
from colorama import Fore, Style, init

# Добавляем корневую папку в путь для импортов
sys.path.append('/app')

from attacks import http_flood, post_flood, slowloris, smart_attack
from utils.metrics import metrics_collector
from utils.visualizer import visualizer
from utils.test_data import test_data_generator

# Инициализация colorama для цветного вывода
init(autoreset=True)

class DDoSLabMenu:
    """Главное меню лабораторного стенда DDoS-атак"""
    
    def __init__(self):
        self.target_url = os.getenv('TARGET_URL', 'http://localhost:8080')
        self.results_history = []
        
        # Создаем необходимые папки
        os.makedirs('metrics', exist_ok=True)
        os.makedirs('graphs', exist_ok=True)
    
    def print_banner(self):
        """Выводит красивый баннер"""
        banner = f"""
{Fore.RED}╔══════════════════════════════════════════════════════════════╗
{Fore.RED}║                                                              ║
{Fore.RED}║              🔥 ЛАБОРАТОРНЫЙ СТЕНД DDOS-АТАК 🔥              ║
{Fore.RED}║                                                              ║
{Fore.RED}║        Система для имитации и изучения DDoS-атак             ║
{Fore.RED}║           на базе Python и Docker контейнеров               ║
{Fore.RED}║                                                              ║
{Fore.RED}╚══════════════════════════════════════════════════════════════╝

{Fore.YELLOW}⚠️  ВНИМАНИЕ: Используйте только для тестирования собственных серверов!
{Fore.YELLOW}⚠️  Несанкционированные атаки на чужие ресурсы ЗАПРЕЩЕНЫ!

{Fore.CYAN}📋 Доступные типы атак:
{Fore.GREEN}  1. HTTP Flood (GET)    - Заваливание GET-запросами
{Fore.MAGENTA}  2. POST Flood          - Атака POST-запросами с данными  
{Fore.RED}  3. Slowloris           - Медленная атака удержанием соединений
{Fore.LIGHTMAGENTA_EX}  4. Smart Attack        - Умная адаптивная комбинированная атака

{Fore.CYAN}📊 Дополнительные функции:
{Fore.BLUE}  5. Создать отчет       - Графики и визуализация результатов
{Fore.BLUE}  6. История атак        - Просмотр предыдущих результатов
{Fore.BLUE}  7. Настройки           - Изменение целевого URL и параметров

{Fore.WHITE}Текущая цель: {Fore.YELLOW}{self.target_url}
"""
        print(banner)
    
    def get_user_input(self, prompt: str, default=None, input_type=str):
        """Получает ввод пользователя с валидацией"""
        while True:
            try:
                if default is not None:
                    user_input = input(f"{prompt} [{default}]: ").strip()
                    if not user_input:
                        return default
                else:
                    user_input = input(f"{prompt}: ").strip()
                
                if input_type == int:
                    return int(user_input)
                elif input_type == float:
                    return float(user_input)
                else:
                    return user_input
            except (ValueError, KeyboardInterrupt):
                print(f"{Fore.RED}❌ Неверный формат ввода. Попробуйте снова.")
                if input_type == int:
                    print(f"{Fore.YELLOW}💡 Введите целое число")
                elif input_type == float:
                    print(f"{Fore.YELLOW}💡 Введите число с плавающей точкой")
    
    def run_http_flood(self):
        """Запуск HTTP Flood атаки"""
        print(f"\n{Fore.CYAN}🌊 НАСТРОЙКА HTTP FLOOD АТАКИ")
        print("="*50)
        
        threads = self.get_user_input("Количество потоков", 10, int)
        requests_per_thread = self.get_user_input("Запросов на поток", 100, int)
        
        print(f"\n{Fore.YELLOW}📋 Параметры атаки:")
        print(f"  Цель: {self.target_url}")
        print(f"  Потоков: {threads}")
        print(f"  Запросов на поток: {requests_per_thread}")
        print(f"  Общее количество: {threads * requests_per_thread}")
        
        confirm = self.get_user_input("\nЗапустить атаку? (y/n)", "y")
        if confirm.lower() != 'y':
            print(f"{Fore.YELLOW}❌ Атака отменена")
            return
        
        result_file = http_flood.run(self.target_url, threads, requests_per_thread)
        if result_file:
            self.results_history.append({
                'type': 'HTTP_FLOOD',
                'file': result_file,
                'timestamp': time.time(),
                'params': {'threads': threads, 'requests_per_thread': requests_per_thread}
            })
            print(f"\n{Fore.GREEN}✅ HTTP Flood атака завершена! Результаты: {result_file}")
    
    def run_post_flood(self):
        """Запуск POST Flood атаки"""
        print(f"\n{Fore.MAGENTA}📮 НАСТРОЙКА POST FLOOD АТАКИ")
        print("="*50)
        
        threads = self.get_user_input("Количество потоков", 8, int)
        requests_per_thread = self.get_user_input("Запросов на поток", 50, int)
        
        print(f"\n{Fore.YELLOW}📋 Параметры атаки:")
        print(f"  Цель: {self.target_url}")
        print(f"  Потоков: {threads}")
        print(f"  Запросов на поток: {requests_per_thread}")
        print(f"  Эндпоинты: /auth/register, /auth/login, /api/passwords, /api/notes...")
        
        confirm = self.get_user_input("\nЗапустить атаку? (y/n)", "y")
        if confirm.lower() != 'y':
            print(f"{Fore.YELLOW}❌ Атака отменена")
            return
        
        result_file = post_flood.run(self.target_url, threads, requests_per_thread)
        if result_file:
            self.results_history.append({
                'type': 'POST_FLOOD',
                'file': result_file,
                'timestamp': time.time(),
                'params': {'threads': threads, 'requests_per_thread': requests_per_thread}
            })
            print(f"\n{Fore.GREEN}✅ POST Flood атака завершена! Результаты: {result_file}")
    
    def run_slowloris(self):
        """Запуск Slowloris атаки"""
        print(f"\n{Fore.RED}🐌 НАСТРОЙКА SLOWLORIS АТАКИ")
        print("="*50)
        
        connections = self.get_user_input("Количество соединений", 200, int)
        duration = self.get_user_input("Продолжительность (секунд)", 300, int)
        
        print(f"\n{Fore.YELLOW}📋 Параметры атаки:")
        print(f"  Цель: {self.target_url}")
        print(f"  Соединений: {connections}")
        print(f"  Продолжительность: {duration} секунд")
        print(f"  Стратегия: Медленная отправка HTTP заголовков")
        
        confirm = self.get_user_input("\nЗапустить атаку? (y/n)", "y")
        if confirm.lower() != 'y':
            print(f"{Fore.YELLOW}❌ Атака отменена")
            return
        
        result_file = slowloris.run(self.target_url, connections, duration)
        if result_file:
            self.results_history.append({
                'type': 'SLOWLORIS',
                'file': result_file,
                'timestamp': time.time(),
                'params': {'connections': connections, 'duration': duration}
            })
            print(f"\n{Fore.GREEN}✅ Slowloris атака завершена! Результаты: {result_file}")
    
    def run_smart_attack(self):
        """Запуск умной атаки"""
        print(f"\n{Fore.LIGHTMAGENTA_EX}🧠 НАСТРОЙКА УМНОЙ АДАПТИВНОЙ АТАКИ")
        print("="*50)
        
        threads = self.get_user_input("Количество потоков", 15, int)
        duration = self.get_user_input("Продолжительность (секунд)", 300, int)
        
        print(f"\n{Fore.YELLOW}📋 Параметры атаки:")
        print(f"  Цель: {self.target_url}")
        print(f"  Потоков: {threads}")
        print(f"  Продолжительность: {duration} секунд")
        print(f"  Стратегии: HTTP Flood + POST Flood + Slowloris + Hybrid")
        print(f"  Особенности: Адаптивный выбор стратегий на основе анализа цели")
        
        confirm = self.get_user_input("\nЗапустить атаку? (y/n)", "y")
        if confirm.lower() != 'y':
            print(f"{Fore.YELLOW}❌ Атака отменена")
            return
        
        result_file = smart_attack.run(self.target_url, threads, duration)
        if result_file:
            self.results_history.append({
                'type': 'SMART_ATTACK',
                'file': result_file,
                'timestamp': time.time(),
                'params': {'threads': threads, 'duration': duration}
            })
            print(f"\n{Fore.GREEN}✅ Умная атака завершена! Результаты: {result_file}")
    
    def create_report(self):
        """Создание отчета с графиками"""
        print(f"\n{Fore.BLUE}📊 СОЗДАНИЕ ОТЧЕТА")
        print("="*50)
        
        if not self.results_history:
            print(f"{Fore.YELLOW}⚠️  Нет результатов для создания отчета")
            print(f"{Fore.YELLOW}💡 Сначала выполните одну или несколько атак")
            return
        
        print(f"{Fore.CYAN}📋 Доступные результаты:")
        for i, result in enumerate(self.results_history):
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(result['timestamp']))
            print(f"  {i+1}. {result['type']} - {timestamp} - {result['file']}")
        
        if len(self.results_history) == 1:
            choice = 1
        else:
            choice = self.get_user_input(f"Выберите результат для отчета (1-{len(self.results_history)})", 1, int)
            if choice < 1 or choice > len(self.results_history):
                print(f"{Fore.RED}❌ Неверный выбор")
                return
        
        result = self.results_history[choice - 1]
        
        print(f"\n{Fore.YELLOW}🎨 Создание графиков для {result['type']}...")
        visualizer.create_attack_report(result['file'], result['type'])
        
        # Сравнительный анализ если есть несколько результатов
        if len(self.results_history) > 1:
            create_comparison = self.get_user_input("Создать сравнительный анализ всех атак? (y/n)", "n")
            if create_comparison.lower() == 'y':
                files = [r['file'] for r in self.results_history if os.path.exists(r['file'])]
                names = [r['type'] for r in self.results_history if os.path.exists(r['file'])]
                if files:
                    visualizer.plot_attack_comparison(files, names)
    
    def view_history(self):
        """Просмотр истории атак"""
        print(f"\n{Fore.BLUE}📚 ИСТОРИЯ АТАК")
        print("="*50)
        
        if not self.results_history:
            print(f"{Fore.YELLOW}⚠️  История пуста")
            return
        
        for i, result in enumerate(self.results_history):
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(result['timestamp']))
            print(f"\n{Fore.CYAN}📍 Атака #{i+1}")
            print(f"  Тип: {result['type']}")
            print(f"  Время: {timestamp}")
            print(f"  Файл: {result['file']}")
            print(f"  Параметры: {result['params']}")
            
            if os.path.exists(result['file']):
                print(f"  {Fore.GREEN}✅ Файл существует")
            else:
                print(f"  {Fore.RED}❌ Файл не найден")
    
    def settings(self):
        """Настройки системы"""
        print(f"\n{Fore.BLUE}⚙️  НАСТРОЙКИ")
        print("="*50)
        
        print(f"Текущий URL: {Fore.YELLOW}{self.target_url}")
        
        new_url = self.get_user_input("Новый URL цели (или Enter для сохранения текущего)", self.target_url)
        if new_url != self.target_url:
            self.target_url = new_url
            print(f"{Fore.GREEN}✅ URL изменен на: {self.target_url}")
        
        # Дополнительные настройки
        print(f"\n{Fore.CYAN}📋 Дополнительные действия:")
        print(f"1. Очистить историю атак")
        print(f"2. Очистить файлы метрик")
        print(f"3. Очистить графики")
        print(f"4. Тест соединения с целью")
        
        action = self.get_user_input("Выберите действие (1-4 или Enter для пропуска)", "")
        
        if action == "1":
            self.results_history.clear()
            print(f"{Fore.GREEN}✅ История очищена")
        elif action == "2":
            import glob
            for file in glob.glob("metrics/*.csv") + glob.glob("metrics/*.json"):
                try:
                    os.remove(file)
                    print(f"{Fore.GREEN}🗑️  Удален: {file}")
                except:
                    pass
        elif action == "3":
            import glob
            for file in glob.glob("graphs/*.png"):
                try:
                    os.remove(file)
                    print(f"{Fore.GREEN}🗑️  Удален: {file}")
                except:
                    pass
        elif action == "4":
            self.test_connection()
    
    def test_connection(self):
        """Тестирует соединение с целью"""
        print(f"\n{Fore.YELLOW}🔗 Тестирование соединения с {self.target_url}...")
        
        try:
            import requests
            start_time = time.time()
            response = requests.get(f"{self.target_url}/auth/health", timeout=5)
            response_time = time.time() - start_time
            
            print(f"{Fore.GREEN}✅ Соединение успешно!")
            print(f"  Статус: {response.status_code}")
            print(f"  Время ответа: {response_time:.3f}с")
            print(f"  Размер ответа: {len(response.content)} байт")
            
            server = response.headers.get('Server', 'Unknown')
            print(f"  Сервер: {server}")
            
        except Exception as e:
            print(f"{Fore.RED}❌ Ошибка соединения: {str(e)}")
    
    def run(self):
        """Главный цикл программы"""
        while True:
            try:
                self.print_banner()
                
                choice = self.get_user_input(f"\n{Fore.WHITE}Выберите опцию (1-7 или 0 для выхода)", "1")
                
                if choice == "0":
                    print(f"\n{Fore.CYAN}👋 До свидания!")
                    break
                elif choice == "1":
                    self.run_http_flood()
                elif choice == "2":
                    self.run_post_flood()
                elif choice == "3":
                    self.run_slowloris()
                elif choice == "4":
                    self.run_smart_attack()
                elif choice == "5":
                    self.create_report()
                elif choice == "6":
                    self.view_history()
                elif choice == "7":
                    self.settings()
                else:
                    print(f"{Fore.RED}❌ Неверный выбор. Попробуйте снова.")
                
                if choice != "0":
                    input(f"\n{Fore.CYAN}Нажмите Enter для продолжения...")
                
            except KeyboardInterrupt:
                print(f"\n\n{Fore.YELLOW}⏹️  Программа прервана пользователем")
                confirm_exit = self.get_user_input("Действительно выйти? (y/n)", "n")
                if confirm_exit.lower() == 'y':
                    break
            except Exception as e:
                print(f"\n{Fore.RED}💥 Неожиданная ошибка: {str(e)}")
                print(f"{Fore.YELLOW}🔄 Перезапуск меню...")
                time.sleep(2)


if __name__ == "__main__":
    print(f"{Fore.GREEN}🚀 Запуск лабораторного стенда DDoS-атак...")
    menu = DDoSLabMenu()
    menu.run() 
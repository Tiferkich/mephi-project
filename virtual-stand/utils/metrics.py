import csv
import json
import time
import threading
from datetime import datetime
from typing import List, Dict, Any


class MetricsCollector:
    """Класс для сбора и сохранения метрик атак"""
    
    def __init__(self):
        self.metrics = []
        self.lock = threading.Lock()
    
    def add_metric(self, response_time: float, status_code: int, size: int, 
                   attack_type: str, endpoint: str = None, error: str = None):
        """Добавляет метрику в коллекцию"""
        metric = {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            'response_time': response_time,
            'status_code': status_code,
            'size': size,
            'attack_type': attack_type,
            'endpoint': endpoint,
            'error': error
        }
        
        with self.lock:
            self.metrics.append(metric)
    
    def save_to_csv(self, filename: str = None):
        """Сохраняет метрики в CSV файл"""
        if filename is None:
            filename = f"metrics/results_{int(time.time())}.csv"
        
        with self.lock:
            if not self.metrics:
                print("⚠️  Нет метрик для сохранения")
                return
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                fieldnames = ['timestamp', 'response_time', 'status_code', 
                             'size', 'attack_type', 'endpoint', 'error']
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.metrics)
            
            print(f"📊 Метрики сохранены в {filename} ({len(self.metrics)} записей)")
    
    def save_to_json(self, filename: str = None):
        """Сохраняет метрики в JSON файл"""
        if filename is None:
            filename = f"metrics/results_{int(time.time())}.json"
        
        with self.lock:
            if not self.metrics:
                print("⚠️  Нет метрик для сохранения")
                return
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.metrics, f, indent=2, ensure_ascii=False)
            
            print(f"📊 Метрики сохранены в {filename} ({len(self.metrics)} записей)")
    
    def get_stats(self) -> Dict[str, Any]:
        """Возвращает базовую статистику"""
        with self.lock:
            if not self.metrics:
                return {}
            
            response_times = [m['response_time'] for m in self.metrics if m['response_time'] is not None]
            status_codes = [m['status_code'] for m in self.metrics if m['status_code'] is not None]
            
            stats = {
                'total_requests': len(self.metrics),
                'successful_requests': len([m for m in self.metrics if m['status_code'] and 200 <= m['status_code'] < 300]),
                'failed_requests': len([m for m in self.metrics if m['error'] or (m['status_code'] and m['status_code'] >= 400)]),
                'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
                'min_response_time': min(response_times) if response_times else 0,
                'max_response_time': max(response_times) if response_times else 0,
                'status_codes': {}
            }
            
            # Подсчет статус кодов
            for code in status_codes:
                stats['status_codes'][code] = stats['status_codes'].get(code, 0) + 1
            
            return stats
    
    def print_stats(self):
        """Выводит статистику в консоль"""
        stats = self.get_stats()
        if not stats:
            print("⚠️  Нет данных для отображения статистики")
            return
        
        print("\n" + "="*50)
        print("📈 СТАТИСТИКА АТАКИ")
        print("="*50)
        print(f"Всего запросов: {stats['total_requests']}")
        print(f"Успешных: {stats['successful_requests']}")
        print(f"Неудачных: {stats['failed_requests']}")
        print(f"Среднее время ответа: {stats['avg_response_time']:.3f}с")
        print(f"Мин. время ответа: {stats['min_response_time']:.3f}с")
        print(f"Макс. время ответа: {stats['max_response_time']:.3f}с")
        
        if stats['status_codes']:
            print("\nСтатус-коды:")
            for code, count in sorted(stats['status_codes'].items()):
                print(f"  {code}: {count} раз")
        print("="*50)
    
    def clear(self):
        """Очищает собранные метрики"""
        with self.lock:
            self.metrics.clear()
            print("🧹 Метрики очищены")


# Глобальный экземпляр коллектора метрик
metrics_collector = MetricsCollector() 
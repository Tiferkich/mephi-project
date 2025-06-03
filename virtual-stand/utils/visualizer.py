import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
from datetime import datetime
from typing import List, Dict, Any


class AttackVisualizer:
    """Класс для создания графиков результатов атак"""
    
    def __init__(self, output_dir: str = "graphs"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Настройка стиля графиков
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
    
    def plot_response_times(self, csv_file: str, save_name: str = None):
        """Строит график времени ответа во времени"""
        try:
            df = pd.read_csv(csv_file)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            plt.figure(figsize=(12, 6))
            plt.plot(df['timestamp'], df['response_time'], marker='o', markersize=2, alpha=0.7)
            plt.title('Время ответа сервера во времени', fontsize=14, fontweight='bold')
            plt.xlabel('Время')
            plt.ylabel('Время ответа (сек)')
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            if save_name is None:
                save_name = f"response_time_ts_{int(datetime.now().timestamp())}.png"
            
            save_path = os.path.join(self.output_dir, save_name)
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"📊 График времени ответа сохранен: {save_path}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании графика времени ответа: {e}")
    
    def plot_response_time_histogram(self, csv_file: str, save_name: str = None):
        """Строит гистограмму распределения времени ответа"""
        try:
            df = pd.read_csv(csv_file)
            
            plt.figure(figsize=(10, 6))
            plt.hist(df['response_time'], bins=30, color='skyblue', alpha=0.7, edgecolor='black')
            plt.title('Распределение времени ответа', fontsize=14, fontweight='bold')
            plt.xlabel('Время ответа (сек)')
            plt.ylabel('Количество запросов')
            plt.grid(True, alpha=0.3)
            
            # Добавляем статистику
            mean_time = df['response_time'].mean()
            plt.axvline(mean_time, color='red', linestyle='--', 
                       label=f'Среднее: {mean_time:.3f}с')
            plt.legend()
            plt.tight_layout()
            
            if save_name is None:
                save_name = f"response_time_hist_{int(datetime.now().timestamp())}.png"
            
            save_path = os.path.join(self.output_dir, save_name)
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"📊 Гистограмма времени ответа сохранена: {save_path}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании гистограммы: {e}")
    
    def plot_status_codes(self, csv_file: str, save_name: str = None):
        """Строит график распределения статус-кодов"""
        try:
            df = pd.read_csv(csv_file)
            status_counts = df['status_code'].value_counts().sort_index()
            
            plt.figure(figsize=(10, 6))
            bars = plt.bar(status_counts.index.astype(str), status_counts.values, 
                          color=['green' if int(x) < 400 else 'red' for x in status_counts.index])
            
            plt.title('Распределение HTTP статус-кодов', fontsize=14, fontweight='bold')
            plt.xlabel('Статус-код')
            plt.ylabel('Количество запросов')
            plt.grid(True, alpha=0.3, axis='y')
            
            # Добавляем значения на столбцы
            for bar in bars:
                height = bar.get_height()
                plt.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(height)}',
                        ha='center', va='bottom')
            
            plt.tight_layout()
            
            if save_name is None:
                save_name = f"status_codes_{int(datetime.now().timestamp())}.png"
            
            save_path = os.path.join(self.output_dir, save_name)
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"📊 График статус-кодов сохранен: {save_path}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании графика статус-кодов: {e}")
    
    def plot_attack_comparison(self, csv_files: List[str], attack_names: List[str], save_name: str = None):
        """Сравнивает результаты разных типов атак"""
        try:
            plt.figure(figsize=(15, 10))
            
            # График 1: Время ответа по типам атак
            plt.subplot(2, 2, 1)
            all_data = []
            for i, csv_file in enumerate(csv_files):
                if os.path.exists(csv_file):
                    df = pd.read_csv(csv_file)
                    df['attack_name'] = attack_names[i]
                    all_data.append(df)
            
            if all_data:
                combined_df = pd.concat(all_data, ignore_index=True)
                sns.boxplot(data=combined_df, x='attack_name', y='response_time')
                plt.title('Сравнение времени ответа по типам атак')
                plt.xticks(rotation=45)
                
                # График 2: Количество запросов по типам
                plt.subplot(2, 2, 2)
                request_counts = combined_df['attack_name'].value_counts()
                plt.bar(request_counts.index, request_counts.values)
                plt.title('Количество запросов по типам атак')
                plt.xticks(rotation=45)
                
                # График 3: Успешность атак
                plt.subplot(2, 2, 3)
                success_rates = []
                for attack in attack_names:
                    attack_data = combined_df[combined_df['attack_name'] == attack]
                    if not attack_data.empty:
                        success_rate = len(attack_data[attack_data['status_code'] < 400]) / len(attack_data) * 100
                        success_rates.append(success_rate)
                    else:
                        success_rates.append(0)
                
                plt.bar(attack_names, success_rates)
                plt.title('Процент успешных запросов по типам атак')
                plt.ylabel('Успешность (%)')
                plt.xticks(rotation=45)
                
                # График 4: Средняя нагрузка
                plt.subplot(2, 2, 4)
                avg_response_times = combined_df.groupby('attack_name')['response_time'].mean()
                plt.bar(avg_response_times.index, avg_response_times.values)
                plt.title('Среднее время ответа по типам атак')
                plt.ylabel('Время (сек)')
                plt.xticks(rotation=45)
            
            plt.tight_layout()
            
            if save_name is None:
                save_name = f"attack_comparison_{int(datetime.now().timestamp())}.png"
            
            save_path = os.path.join(self.output_dir, save_name)
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            plt.close()
            print(f"📊 Сравнительный график сохранен: {save_path}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании сравнительного графика: {e}")
    
    def create_attack_report(self, csv_file: str, attack_type: str):
        """Создает полный отчет по атаке"""
        try:
            timestamp = int(datetime.now().timestamp())
            report_prefix = f"{attack_type}_{timestamp}"
            
            print(f"\n🎨 Создание графиков для атаки '{attack_type}'...")
            
            # Создаем все типы графиков
            self.plot_response_times(csv_file, f"{report_prefix}_response_time.png")
            self.plot_response_time_histogram(csv_file, f"{report_prefix}_histogram.png")
            self.plot_status_codes(csv_file, f"{report_prefix}_status_codes.png")
            
            print(f"✅ Отчет по атаке '{attack_type}' создан в папке {self.output_dir}")
            
        except Exception as e:
            print(f"❌ Ошибка при создании отчета: {e}")


# Глобальный экземпляр визуализатора
visualizer = AttackVisualizer() 
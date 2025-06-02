#!/usr/bin/env python3

import os
import re
import json
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime
import seaborn as sns

class DDoSReportGenerator:
    def __init__(self, metrics_dir="~/metrics"):
        self.metrics_dir = os.path.expanduser(metrics_dir)
        self.report_data = {
            'attack_summary': {},
            'system_metrics': {},
            'network_metrics': {},
            'timeline': []
        }
    
    def parse_load_metrics(self):
        """Парсинг метрик нагрузки системы"""
        load_file = os.path.join(self.metrics_dir, "load.log")
        if not os.path.exists(load_file):
            return
        
        load_averages = []
        timestamps = []
        
        with open(load_file, 'r') as f:
            content = f.read()
            
        # Поиск данных о нагрузке
        load_pattern = r'load average: ([\d.]+), ([\d.]+), ([\d.]+)'
        timestamp_pattern = r'\[([\d-]+ [\d:]+)\]'
        
        for match in re.finditer(load_pattern, content):
            load_1min = float(match.group(1))
            load_5min = float(match.group(2))
            load_15min = float(match.group(3))
            load_averages.append({
                '1min': load_1min,
                '5min': load_5min,
                '15min': load_15min
            })
        
        self.report_data['system_metrics']['load_averages'] = load_averages
    
    def parse_network_metrics(self):
        """Парсинг сетевых метрик"""
        network_file = os.path.join(self.metrics_dir, "network.log")
        if not os.path.exists(network_file):
            return
        
        connections_count = []
        timestamps = []
        
        with open(network_file, 'r') as f:
            lines = f.readlines()
        
        for line in lines:
            if "Active connections on port 8080:" in line:
                count = int(re.search(r'(\d+)', line).group(1))
                connections_count.append(count)
        
        self.report_data['network_metrics']['connection_counts'] = connections_count
        
        if connections_count:
            self.report_data['network_metrics']['max_connections'] = max(connections_count)
            self.report_data['network_metrics']['avg_connections'] = sum(connections_count) / len(connections_count)
    
    def parse_cpu_memory_metrics(self):
        """Парсинг метрик CPU и памяти"""
        cpu_memory_file = os.path.join(self.metrics_dir, "cpu_memory.log")
        if not os.path.exists(cpu_memory_file):
            return
        
        cpu_usage = []
        memory_usage = []
        
        with open(cpu_memory_file, 'r') as f:
            content = f.read()
        
        # Поиск данных о CPU
        cpu_pattern = r'%Cpu\(s\):\s+([\d.]+)\s+us'
        for match in re.finditer(cpu_pattern, content):
            cpu_usage.append(float(match.group(1)))
        
        # Поиск данных о памяти
        memory_pattern = r'KiB Mem :\s+(\d+)\s+total,\s+(\d+)\s+free,\s+(\d+)\s+used'
        for match in re.finditer(memory_pattern, content):
            total_mem = int(match.group(1))
            used_mem = int(match.group(3))
            memory_usage.append((used_mem / total_mem) * 100)
        
        self.report_data['system_metrics']['cpu_usage'] = cpu_usage
        self.report_data['system_metrics']['memory_usage'] = memory_usage
    
    def generate_plots(self):
        """Генерация графиков"""
        plt.style.use('seaborn-v0_8')
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('DDoS Attack Analysis Report', fontsize=16, fontweight='bold')
        
        # График соединений
        if self.report_data['network_metrics'].get('connection_counts'):
            connections = self.report_data['network_metrics']['connection_counts']
            axes[0, 0].plot(connections, 'r-', linewidth=2)
            axes[0, 0].set_title('Network Connections Over Time')
            axes[0, 0].set_xlabel('Time Intervals')
            axes[0, 0].set_ylabel('Active Connections')
            axes[0, 0].grid(True, alpha=0.3)
        
        # График CPU
        if self.report_data['system_metrics'].get('cpu_usage'):
            cpu_usage = self.report_data['system_metrics']['cpu_usage']
            axes[0, 1].plot(cpu_usage, 'b-', linewidth=2)
            axes[0, 1].set_title('CPU Usage Over Time')
            axes[0, 1].set_xlabel('Time Intervals')
            axes[0, 1].set_ylabel('CPU Usage (%)')
            axes[0, 1].grid(True, alpha=0.3)
        
        # График памяти
        if self.report_data['system_metrics'].get('memory_usage'):
            memory_usage = self.report_data['system_metrics']['memory_usage']
            axes[1, 0].plot(memory_usage, 'g-', linewidth=2)
            axes[1, 0].set_title('Memory Usage Over Time')
            axes[1, 0].set_xlabel('Time Intervals')
            axes[1, 0].set_ylabel('Memory Usage (%)')
            axes[1, 0].grid(True, alpha=0.3)
        
        # График средней нагрузки
        if self.report_data['system_metrics'].get('load_averages'):
            load_data = self.report_data['system_metrics']['load_averages']
            load_1min = [item['1min'] for item in load_data]
            load_5min = [item['5min'] for item in load_data]
            load_15min = [item['15min'] for item in load_data]
            
            axes[1, 1].plot(load_1min, 'r-', label='1 min', linewidth=2)
            axes[1, 1].plot(load_5min, 'g-', label='5 min', linewidth=2)
            axes[1, 1].plot(load_15min, 'b-', label='15 min', linewidth=2)
            axes[1, 1].set_title('System Load Average')
            axes[1, 1].set_xlabel('Time Intervals')
            axes[1, 1].set_ylabel('Load Average')
            axes[1, 1].legend()
            axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('ddos_analysis_report.png', dpi=300, bbox_inches='tight')
        print("Report graph saved as 'ddos_analysis_report.png'")
    
    def generate_summary_report(self):
        """Генерация текстового отчета"""
        report = []
        report.append("=" * 60)
        report.append("DDoS ATTACK ANALYSIS REPORT")
        report.append("=" * 60)
        report.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Сетевые метрики
        if self.report_data['network_metrics']:
            report.append("NETWORK METRICS:")
            report.append("-" * 20)
            if 'max_connections' in self.report_data['network_metrics']:
                report.append(f"Maximum concurrent connections: {self.report_data['network_metrics']['max_connections']}")
            if 'avg_connections' in self.report_data['network_metrics']:
                report.append(f"Average connections: {self.report_data['network_metrics']['avg_connections']:.2f}")
            report.append("")
        
        # Системные метрики
        if self.report_data['system_metrics']:
            report.append("SYSTEM METRICS:")
            report.append("-" * 20)
            
            if 'cpu_usage' in self.report_data['system_metrics']:
                cpu_data = self.report_data['system_metrics']['cpu_usage']
                report.append(f"Maximum CPU usage: {max(cpu_data):.2f}%")
                report.append(f"Average CPU usage: {sum(cpu_data)/len(cpu_data):.2f}%")
            
            if 'memory_usage' in self.report_data['system_metrics']:
                mem_data = self.report_data['system_metrics']['memory_usage']
                report.append(f"Maximum memory usage: {max(mem_data):.2f}%")
                report.append(f"Average memory usage: {sum(mem_data)/len(mem_data):.2f}%")
            
            if 'load_averages' in self.report_data['system_metrics']:
                load_data = self.report_data['system_metrics']['load_averages']
                if load_data:
                    max_load_1min = max([item['1min'] for item in load_data])
                    report.append(f"Maximum 1-minute load average: {max_load_1min:.2f}")
            
            report.append("")
        
        # Анализ атаки
        report.append("ATTACK ANALYSIS:")
        report.append("-" * 20)
        
        if self.report_data['network_metrics'].get('max_connections', 0) > 100:
            report.append("⚠️  HIGH CONNECTION COUNT DETECTED - Possible DDoS attack")
        
        if self.report_data['system_metrics'].get('cpu_usage'):
            max_cpu = max(self.report_data['system_metrics']['cpu_usage'])
            if max_cpu > 80:
                report.append("⚠️  HIGH CPU USAGE DETECTED - Server under stress")
        
        if self.report_data['system_metrics'].get('load_averages'):
            load_data = self.report_data['system_metrics']['load_averages']
            if load_data:
                max_load = max([item['1min'] for item in load_data])
                if max_load > 2.0:
                    report.append("⚠️  HIGH SYSTEM LOAD DETECTED - Server overloaded")
        
        report.append("")
        report.append("RECOMMENDATIONS:")
        report.append("-" * 20)
        report.append("1. Implement rate limiting on the web server")
        report.append("2. Use a reverse proxy (nginx, Cloudflare) for DDoS protection")
        report.append("3. Configure firewall rules to block suspicious IPs")
        report.append("4. Monitor network traffic for anomalies")
        report.append("5. Consider using a CDN for traffic distribution")
        
        report_text = "\n".join(report)
        
        with open('ddos_analysis_report.txt', 'w') as f:
            f.write(report_text)
        
        print("Text report saved as 'ddos_analysis_report.txt'")
        print("\n" + report_text)
    
    def run_analysis(self):
        """Запуск полного анализа"""
        print("Starting DDoS attack analysis...")
        
        if not os.path.exists(self.metrics_dir):
            print(f"Metrics directory {self.metrics_dir} not found!")
            return
        
        self.parse_load_metrics()
        self.parse_network_metrics() 
        self.parse_cpu_memory_metrics()
        
        # Сохранение данных в JSON
        with open('metrics_data.json', 'w') as f:
            json.dump(self.report_data, f, indent=2)
        
        self.generate_plots()
        self.generate_summary_report()
        
        print("Analysis complete!")

if __name__ == "__main__":
    import sys
    
    metrics_dir = sys.argv[1] if len(sys.argv) > 1 else "~/metrics"
    
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("Installing required packages...")
        os.system("pip3 install matplotlib seaborn pandas")
        import matplotlib.pyplot as plt
        import seaborn as sns
    
    generator = DDoSReportGenerator(metrics_dir)
    generator.run_analysis()
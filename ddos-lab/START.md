# 🚀 Быстрый старт DDoS Lab на Windows

## 📋 Предварительные требования

1. **VirtualBox** - скачать с [virtualbox.org](https://www.virtualbox.org/)
2. **Vagrant** - скачать с [vagrantup.com](https://www.vagrantup.com/)
3. **Docker Desktop** - скачать с [docker.com](https://www.docker.com/products/docker-desktop/)

## 🛠️ Установка и запуск

### 1. Запуск Vagrant окружения

```powershell
# Переход в директорию проекта
cd ddos-lab

# Запуск всех виртуальных машин
vagrant up

# Проверка статуса
vagrant status
```

### 2. Проверка работы целевого сервера

```powershell
# Подключение к целевому серверу
vagrant ssh target

# В терминале Ubuntu выполнить:
curl http://localhost:8080/
systemctl status simple-server
```

### 3. Сборка Docker образов для атак

```powershell
# Сборка образов атакующих контейнеров
bash manage_attacks.sh build
```

### 4. Запуск атак

```powershell
# HTTP flood атака (10 контейнеров)
bash manage_attacks.sh http 10

# Slowloris атака (5 контейнеров) 
bash manage_attacks.sh slowloris 5

# Массовая атака (50 контейнеров)
bash manage_attacks.sh massive 50

# Просмотр статуса атак
bash manage_attacks.sh status

# Остановка всех атак
bash manage_attacks.sh stop
```

### 5. Мониторинг

```powershell
# Мониторинг целевого сервера
bash manage_attacks.sh monitor

# Подключение к серверу для просмотра метрик
vagrant ssh target
tail -f ~/metrics/network.log
```

### 6. Генерация отчета

```powershell
# Установка Python зависимостей
pip install matplotlib seaborn pandas

# Генерация отчета
python generate_report.py
```

## 🎯 Пример сценария тестирования

```powershell
# 1. Запуск окружения
vagrant up

# 2. Сборка атакующих образов
bash manage_attacks.sh build

# 3. Базовая нагрузка
bash manage_attacks.sh http 5

# Ждем 2-3 минуты

# 4. Увеличение нагрузки
bash manage_attacks.sh http 20

# 5. Добавление Slowloris атаки
bash manage_attacks.sh slowloris 10

# 6. Финальная массовая атака
bash manage_attacks.sh massive 100

# Ждем 5-10 минут для сбора метрик

# 7. Остановка атак
bash manage_attacks.sh stop

# 8. Генерация отчета
python generate_report.py
```

## 📊 Результаты

После выполнения тестов вы получите:
- `ddos_analysis_report.png` - графики анализа
- `ddos_analysis_report.txt` - текстовый отчет
- `metrics_data.json` - сырые данные метрик

## 🔧 Устранение проблем

### Проблема с портами
```powershell
# Проверка занятых портов
netstat -an | findstr :8080
```

### Проблема с Vagrant
```powershell
# Перезапуск проблемной машины
vagrant reload target
```

### Проблема с Docker
```powershell
# Очистка контейнеров
docker container prune -f
docker image prune -f
```

## ⚠️ Важные замечания

- Используйте только в учебных целях
- Не направляйте атаки на реальные серверы
- Убедитесь в изоляции тестовой среды
- Соблюдайте законодательство вашей страны 
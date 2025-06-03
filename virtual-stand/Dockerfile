FROM python:3.9-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Установка Python библиотек
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода атак
COPY attacks/ ./attacks/
COPY menu/ ./menu/
COPY utils/ ./utils/

# Создание папок для данных
RUN mkdir -p /app/metrics /app/graphs

CMD ["python", "/app/menu/main.py"] 
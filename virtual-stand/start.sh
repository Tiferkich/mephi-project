#!/bin/bash

# Скрипт быстрого запуска лабораторного стенда DDoS-атак

echo "🔥 Лабораторный стенд DDoS-атак"
echo "================================"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "📖 Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    echo "📖 Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker и Docker Compose найдены"

# Получаем параметры
SCALE=${1:-1}
TARGET_URL=${2:-"http://host.docker.internal:8080"}

echo "🎯 Цель атаки: $TARGET_URL"
echo "🔢 Количество атакующих контейнеров: $SCALE"
echo ""

# Проверяем доступность цели
echo "🔗 Проверка доступности цели..."
if curl -s --max-time 5 "${TARGET_URL}/auth/health" > /dev/null; then
    echo "✅ Цель доступна"
else
    echo "⚠️  Предупреждение: Цель недоступна или не отвечает"
    echo "💡 Убедитесь, что ManagmentServer запущен на $TARGET_URL"
    read -p "Продолжить? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Отменено пользователем"
        exit 1
    fi
fi

# Создаем папки если их нет
mkdir -p metrics graphs

# Билдим и запускаем контейнеры
echo "🏗️  Сборка контейнеров..."
if docker-compose build; then
    echo "✅ Контейнеры собраны успешно"
else
    echo "❌ Ошибка сборки контейнеров"
    exit 1
fi

echo "🚀 Запуск $SCALE атакующих контейнеров..."
if docker-compose up --scale attacker=$SCALE -d; then
    echo "✅ Контейнеры запущены"
else
    echo "❌ Ошибка запуска контейнеров"
    exit 1
fi

# Ждем загрузки контейнеров
echo "⏳ Ожидание загрузки контейнеров..."
sleep 3

# Показываем статус
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "🎮 Для подключения к интерактивному меню:"
echo "docker exec -it virtual-stand_attacker_1 python /app/menu/main.py"
echo ""
echo "📋 Полезные команды:"
echo "  Просмотр логов:     docker-compose logs -f"
echo "  Остановка:          docker-compose down"
echo "  Перезапуск:         docker-compose restart"
echo ""
echo "⚠️  ПОМНИТЕ: Используйте только на собственных серверах!"
echo "✅ Стенд готов к использованию!" 
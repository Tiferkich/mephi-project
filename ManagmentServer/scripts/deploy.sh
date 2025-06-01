#!/bin/bash

# Скрипт для деплоя ManagementServer
# Использование: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Проверка аргументов
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Неверное окружение. Используйте: staging или production"
fi

log "Начинаем деплой для окружения: $ENVIRONMENT"

# Загрузка переменных окружения
ENV_FILE="$PROJECT_DIR/.env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
    log "Загружаем переменные из $ENV_FILE"
    source "$ENV_FILE"
else
    warn "Файл $ENV_FILE не найден. Используем переменные окружения."
fi

# Проверка обязательных переменных
required_vars=("DOCKER_IMAGE_NAME" "DEPLOY_HOST" "DEPLOY_USER")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        error "Переменная $var не установлена"
    fi
done

# Получение версии из Git
if [[ -n "$CI_COMMIT_SHORT_SHA" ]]; then
    VERSION="$CI_COMMIT_SHORT_SHA"
else
    VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
fi

IMAGE_TAG="${DOCKER_IMAGE_NAME}:${VERSION}"
log "Используем образ: $IMAGE_TAG"

# Функция для выполнения команд на удаленном сервере
remote_exec() {
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" "$1"
}

# Проверка доступности сервера
log "Проверяем доступность сервера $DEPLOY_HOST"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" "echo 'Сервер доступен'"; then
    error "Не удается подключиться к серверу $DEPLOY_HOST"
fi

# Создание резервной копии текущего контейнера
CONTAINER_NAME="managementserver-$ENVIRONMENT"
BACKUP_NAME="managementserver-$ENVIRONMENT-backup-$(date +%Y%m%d-%H%M%S)"

log "Создаем резервную копию текущего контейнера"
remote_exec "
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker commit $CONTAINER_NAME $BACKUP_NAME
        echo 'Резервная копия создана: $BACKUP_NAME'
    else
        echo 'Текущий контейнер не найден, пропускаем создание резервной копии'
    fi
"

# Загрузка нового образа
log "Загружаем новый образ Docker"
remote_exec "docker pull $IMAGE_TAG"

# Остановка и удаление старого контейнера
log "Останавливаем старый контейнер"
remote_exec "
    docker stop $CONTAINER_NAME 2>/dev/null || echo 'Контейнер уже остановлен'
    docker rm $CONTAINER_NAME 2>/dev/null || echo 'Контейнер уже удален'
"

# Определение портов и переменных окружения
if [[ "$ENVIRONMENT" == "production" ]]; then
    PORT_MAPPING="80:8080"
    SPRING_PROFILE="production"
else
    PORT_MAPPING="8080:8080"
    SPRING_PROFILE="staging"
fi

# Запуск нового контейнера
log "Запускаем новый контейнер"
remote_exec "
    docker run -d \
        --name $CONTAINER_NAME \
        --restart unless-stopped \
        -p $PORT_MAPPING \
        -e SPRING_PROFILES_ACTIVE=$SPRING_PROFILE \
        -e SPRING_DATASOURCE_URL=\${${ENVIRONMENT^^}_DB_URL} \
        -e SPRING_DATASOURCE_USERNAME=\${${ENVIRONMENT^^}_DB_USER} \
        -e SPRING_DATASOURCE_PASSWORD=\${${ENVIRONMENT^^}_DB_PASSWORD} \
        -e JWT_SECRET=\${${ENVIRONMENT^^}_JWT_SECRET} \
        -e TZ=Europe/Minsk \
        --health-cmd='curl -f http://localhost:8080/actuator/health || exit 1' \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        $IMAGE_TAG
"

# Проверка здоровья приложения
log "Проверяем здоровье приложения"
HEALTH_CHECK_URL="http://$DEPLOY_HOST"
if [[ "$ENVIRONMENT" == "staging" ]]; then
    HEALTH_CHECK_URL="$HEALTH_CHECK_URL:8080"
fi
HEALTH_CHECK_URL="$HEALTH_CHECK_URL/actuator/health"

# Ждем запуска приложения
sleep 30

for i in {1..10}; do
    log "Попытка $i/10: Проверяем здоровье приложения"
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        log "✅ Приложение успешно запущено и отвечает на запросы"
        break
    fi
    
    if [[ $i -eq 10 ]]; then
        error "❌ Приложение не отвечает после 10 попыток. Откатываемся к предыдущей версии"
        
        # Откат к резервной копии
        log "Выполняем откат к резервной копии"
        remote_exec "
            docker stop $CONTAINER_NAME || true
            docker rm $CONTAINER_NAME || true
            if docker images -q $BACKUP_NAME | grep -q .; then
                docker run -d \
                    --name $CONTAINER_NAME \
                    --restart unless-stopped \
                    -p $PORT_MAPPING \
                    $BACKUP_NAME
                echo 'Откат выполнен успешно'
            else
                echo 'Резервная копия не найдена'
            fi
        "
        exit 1
    fi
    
    sleep 10
done

# Очистка старых образов и контейнеров
log "Очищаем старые образы и контейнеры"
remote_exec "
    # Удаляем старые резервные копии (оставляем только последние 3)
    docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}' | \
    grep 'managementserver-$ENVIRONMENT-backup' | \
    tail -n +4 | \
    awk '{print \$2}' | \
    xargs -r docker rmi || true
    
    # Очищаем неиспользуемые образы
    docker image prune -f || true
"

# Показываем статус
log "Статус деплоя:"
remote_exec "
    echo '=== Статус контейнера ==='
    docker ps --filter name=$CONTAINER_NAME --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    
    echo '=== Логи контейнера (последние 10 строк) ==='
    docker logs --tail 10 $CONTAINER_NAME
"

log "🎉 Деплой завершен успешно!"
log "🌐 Приложение доступно по адресу: $HEALTH_CHECK_URL"

# Отправка уведомления (если настроено)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ ManagementServer успешно развернут в окружении $ENVIRONMENT\nВерсия: $VERSION\nURL: $HEALTH_CHECK_URL\"}" \
        "$SLACK_WEBHOOK_URL" || warn "Не удалось отправить уведомление в Slack"
fi 
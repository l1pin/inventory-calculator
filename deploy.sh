#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Проверка что скрипт запущен с правами root
if [ "$EUID" -ne 0 ]; then
    error "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

log "Начинаем развертывание приложения Калькулятор себестоимости v2.1..."

# Проверка миграции
check_migration() {
    info "Проверка необходимости миграции..."
    
    # Проверяем новую структуру
    if [ -d "/opt/inventory-calculator/data/tables" ] && [ -d "/opt/inventory-calculator/data/global" ]; then
        log "✅ Новая структура данных уже существует"
        return 0
    fi
    
    # Проверяем старый файл
    if [ -f "/opt/inventory-calculator/data/app_data.json" ]; then
        warn "Обнаружен старый файл app_data.json - требуется миграция!"
        echo -e "${YELLOW}Хотите запустить миграцию сейчас? (y/n)${NC}"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log "Запуск миграции..."
            docker run --rm \
                -v /opt/inventory-calculator/data:/app/data \
                inventory-calculator:latest \
                node migrate.js
            
            if [ $? -eq 0 ]; then
                log "✅ Миграция завершена успешно"
            else
                error "❌ Ошибка миграции"
                exit 1
            fi
        else
            warn "Миграция пропущена. Убедитесь, что данные корректны."
        fi
    else
        info "Старые данные не найдены, создается новая структура"
    fi
}

# Остановка предыдущего контейнера
log "Остановка предыдущего контейнера..."
docker stop inventory-calculator 2>/dev/null || true
docker rm inventory-calculator 2>/dev/null || true

# Удаление старого образа
log "Удаление старого образа..."
docker rmi inventory-calculator:latest 2>/dev/null || true

# Сборка нового образа
log "Сборка Docker образа..."
if ! docker build -t inventory-calculator:latest .; then
    error "Ошибка при сборке Docker образа"
    exit 1
fi

# Создание новой структуры папок для данных
log "Создание новой структуры папок для данных..."
mkdir -p /opt/inventory-calculator/data/tables
mkdir -p /opt/inventory-calculator/data/global
mkdir -p /opt/inventory-calculator/data/backups/tables
mkdir -p /opt/inventory-calculator/data/backups/global

# Установка правильных прав
chown -R 1000:1000 /opt/inventory-calculator/data
chmod -R 755 /opt/inventory-calculator/data

log "📁 Структура папок создана:"
log "   📋 /opt/inventory-calculator/data/tables/"
log "   🌐 /opt/inventory-calculator/data/global/"
log "   💾 /opt/inventory-calculator/data/backups/"

# Проверка миграции
check_migration

# Запуск нового контейнера
log "Запуск нового контейнера..."
if ! docker run -d \
    --name inventory-calculator \
    --restart unless-stopped \
    -p 3001:3001 \
    -v /opt/inventory-calculator/data:/app/data \
    inventory-calculator:latest; then
    error "Ошибка при запуске контейнера"
    exit 1
fi

# Ожидание запуска приложения
log "Ожидание запуска приложения..."
sleep 15

# Проверка здоровья приложения
log "Проверка состояния приложения..."
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
    log "✅ Приложение успешно развернуто!"
    log "🌐 Доступно по адресу: http://twtichcsgo.shop"
    log "📊 API здоровья: http://twtichcsgo.shop/api/health"
    log "📋 Версия: $(echo $HEALTH_RESPONSE | grep -o '"version":"[^"]*"' | cut -d'"' -f4)"
    log "💾 Хранилище: $(echo $HEALTH_RESPONSE | grep -o '"storage":"[^"]*"' | cut -d'"' -f4)"
else
    warn "Приложение может еще не полностью загрузиться. Проверяем логи..."
    docker logs --tail 10 inventory-calculator
fi

# Проверка структуры данных
log "Проверка структуры данных..."
if [ -d "/opt/inventory-calculator/data/tables" ] && [ -d "/opt/inventory-calculator/data/global" ]; then
    TABLES_COUNT=$(find /opt/inventory-calculator/data/tables -name "table_*" -type d | wc -l)
    GLOBAL_FILES=$(find /opt/inventory-calculator/data/global -name "*.json" -type f | wc -l)
    
    log "📊 Структура данных:"
    log "   📋 Таблиц: $TABLES_COUNT"
    log "   🌐 Глобальных файлов: $GLOBAL_FILES"
    log "   💾 Папки бэкапов: ✅"
else
    warn "Структура данных может быть неполной"
fi

# Показ информации о системе
log "Получение системной информации..."
if curl -f http://localhost:3001/api/system/info >/dev/null 2>&1; then
    SYSTEM_INFO=$(curl -s http://localhost:3001/api/system/info)
    log "📊 Системная информация:"
    log "   🏃 Время работы: $(echo $SYSTEM_INFO | grep -o '"serverUptime":[0-9.]*' | cut -d':' -f2) сек"
    log "   📋 Таблиц в системе: $(echo $SYSTEM_INFO | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)"
    log "   🌐 Глобальных файлов: $(echo $SYSTEM_INFO | grep -o '"files":[0-9]*' | cut -d':' -f2)"
fi

# Показ последних логов
log "Последние логи приложения:"
docker logs --tail 15 inventory-calculator

# Создание тестового бэкапа
log "Создание тестового бэкапа..."
if curl -f -X POST http://localhost:3001/api/system/backup >/dev/null 2>&1; then
    log "✅ Тестовый бэкап создан успешно"
else
    warn "Не удалось создать тестовый бэкап (возможно, данных еще нет)"
fi

echo ""
log "==============================================="
log "🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО!"
log "==============================================="
log "🌐 Веб-интерфейс: http://twtichcsgo.shop"
log "📊 API здоровья: http://twtichcsgo.shop/api/health"
log "📈 Системная информация: http://twtichcsgo.shop/api/system/info"
log "📂 Данные сохраняются в: /opt/inventory-calculator/data/"
log ""
log "🔧 Полезные команды:"
log "   Просмотр логов: docker logs -f inventory-calculator"
log "   Остановка: docker stop inventory-calculator"
log "   Перезапуск: docker restart inventory-calculator"
log "   Мониторинг: ./monitor.sh"
log "   Создание бэкапа: curl -X POST http://localhost:3001/api/system/backup"
log ""
log "💾 Структура данных (новая):"
log "   📋 Таблицы: /opt/inventory-calculator/data/tables/"
log "   🌐 Глобальные данные: /opt/inventory-calculator/data/global/"
log "   💾 Бэкапы: /opt/inventory-calculator/data/backups/"

# Предупреждение о миграции
if [ -f "/opt/inventory-calculator/data/app_data.json.migrated"* ]; then
    warn "⚠️ ВАЖНО: Найдены файлы миграции!"
    warn "   Убедитесь, что все данные корректно мигрированы"
    warn "   Старые файлы можно удалить после проверки"
fi

log "==============================================="
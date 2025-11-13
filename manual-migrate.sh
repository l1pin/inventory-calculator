#!/bin/bash

# Скрипт ручной миграции данных
# Запускать ПЕРЕД обновлением контейнера

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

# Проверка прав
if [ "$EUID" -ne 0 ]; then
    error "Запустите с правами root: sudo $0"
    exit 1
fi

DATA_DIR="/opt/inventory-calculator/data"
OLD_FILE="$DATA_DIR/app_data.json"

log "🔄 Начало ручной миграции данных..."

# Проверяем существование старого файла
if [ ! -f "$OLD_FILE" ]; then
    warn "Файл app_data.json не найден. Возможно, миграция уже выполнена."
    
    # Проверяем новую структуру
    if [ -d "$DATA_DIR/tables" ] && [ -d "$DATA_DIR/global" ]; then
        log "✅ Новая структура данных уже существует"
        exit 0
    else
        info "Создается новая структура для свежей установки"
        mkdir -p "$DATA_DIR/tables" "$DATA_DIR/global" "$DATA_DIR/backups/tables" "$DATA_DIR/backups/global"
        chown -R 1000:1000 "$DATA_DIR"
        log "✅ Структура создана"
        exit 0
    fi
fi

# Останавливаем контейнер для безопасности
log "🛑 Остановка контейнера для безопасной миграции..."
docker stop inventory-calculator 2>/dev/null || true

# Создаем супер-бэкап
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/inventory-calculator/migration_backup_$BACKUP_DATE"

log "💾 Создание полного бэкапа в $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r "$DATA_DIR" "$BACKUP_DIR/"
log "✅ Бэкап создан"

# Проверяем размер файла
FILE_SIZE=$(stat -f%z "$OLD_FILE" 2>/dev/null || stat -c%s "$OLD_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -gt 104857600 ]; then  # 100MB
    warn "⚠️ Файл данных очень большой ($(echo "$FILE_SIZE" | awk '{printf "%.2f MB", $1/1024/1024}'))"
    warn "Миграция может занять некоторое время..."
fi

# Запускаем миграцию через временный контейнер
log "🔄 Запуск миграции..."

# Сначала собираем новый образ с поддержкой миграции
log "🏗️ Сборка нового образа с поддержкой миграции..."
docker build -t inventory-calculator:migration .

if [ $? -ne 0 ]; then
    error "❌ Ошибка сборки образа"
    exit 1
fi

# Запускаем миграцию
log "▶️ Выполнение миграции..."
docker run --rm \
    -v "$DATA_DIR:/app/data" \
    inventory-calculator:migration \
    node migrate.js

MIGRATION_RESULT=$?

if [ $MIGRATION_RESULT -eq 0 ]; then
    log "✅ Миграция завершена успешно!"
    
    # Проверяем результат
    log "🔍 Проверка результатов миграции..."
    
    TABLES_COUNT=$(find "$DATA_DIR/tables" -name "table_*" -type d 2>/dev/null | wc -l)
    GLOBAL_FILES=$(find "$DATA_DIR/global" -name "*.json" -type f 2>/dev/null | wc -l)
    
    log "📊 Результаты:"
    log "   📋 Мигрировано таблиц: $TABLES_COUNT"
    log "   🌐 Создано глобальных файлов: $GLOBAL_FILES"
    
    # Переименовываем старый файл
    if [ -f "$OLD_FILE" ]; then
        RENAMED_FILE="${OLD_FILE}.migrated_${BACKUP_DATE}"
        mv "$OLD_FILE" "$RENAMED_FILE"
        log "📁 Старый файл переименован: $(basename "$RENAMED_FILE")"
    fi
    
    # Устанавливаем правильные права
    chown -R 1000:1000 "$DATA_DIR"
    log "🔐 Права доступа установлены"
    
    log "🎉 Миграция завершена! Можно запускать новую версию."
    
else
    error "❌ Ошибка миграции!"
    error "🔄 Восстановление из бэкапа..."
    
    # Восстанавливаем из бэкапа
    rm -rf "$DATA_DIR"
    cp -r "$BACKUP_DIR/data" "$(dirname "$DATA_DIR")/"
    chown -R 1000:1000 "$DATA_DIR"
    
    error "📂 Данные восстановлены из бэкапа"
    error "🔧 Проверьте логи и попробуйте снова"
    exit 1
fi

log "==============================================="
log "🎊 РУЧНАЯ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!"
log "==============================================="
log "📂 Новая структура данных:"
log "   📋 Таблицы: $DATA_DIR/tables/"
log "   🌐 Глобальные: $DATA_DIR/global/"
log "   💾 Бэкапы: $DATA_DIR/backups/"
log ""
log "💾 Полный бэкап сохранен в: $BACKUP_DIR"
log "🚀 Теперь можно запустить: ./deploy.sh"
log "==============================================="
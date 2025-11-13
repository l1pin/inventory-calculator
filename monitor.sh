#!/bin/bash

# Скрипт мониторинга приложения Калькулятор себестоимости v2.1
# Автор: Система мониторинга
# Версия: 2.1 (поддержка изолированных файлов)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Функции для логирования
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

success() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 $1${NC}"
}

# Пути к данным
DATA_DIR="/opt/inventory-calculator/data"
TABLES_DIR="$DATA_DIR/tables"
GLOBAL_DIR="$DATA_DIR/global"
BACKUPS_DIR="$DATA_DIR/backups"

# Проверка Docker контейнера
check_container() {
    info "Проверка Docker контейнера..."
    
    if docker ps | grep -q "inventory-calculator"; then
        log "Контейнер запущен"
        
        # Получаем информацию о контейнере
        CONTAINER_STATUS=$(docker inspect inventory-calculator --format='{{.State.Status}}')
        CONTAINER_UPTIME=$(docker inspect inventory-calculator --format='{{.State.StartedAt}}')
        CONTAINER_HEALTH=$(docker inspect inventory-calculator --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
        
        echo "  📊 Статус: $CONTAINER_STATUS"
        echo "  🕐 Запущен: $CONTAINER_UPTIME"
        echo "  💚 Здоровье: $CONTAINER_HEALTH"
        
        return 0
    else
        error "Контейнер не запущен"
        return 1
    fi
}

# Проверка здоровья API
check_api() {
    info "Проверка API здоровья..."
    
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        log "API отвечает корректно"
        
        # Получаем детальную информацию
        API_RESPONSE=$(curl -s http://localhost:3001/api/health)
        
        if [ $? -eq 0 ]; then
            VERSION=$(echo "$API_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
            STORAGE=$(echo "$API_RESPONSE" | grep -o '"storage":"[^"]*"' | cut -d'"' -f4)
            UPTIME=$(echo "$API_RESPONSE" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
            
            echo "  📋 Версия: ${VERSION:-"неизвестна"}"
            echo "  💾 Хранилище: ${STORAGE:-"неизвестно"}"
            echo "  ⏱️ Время работы: ${UPTIME:-"неизвестно"} сек"
        fi
        
        return 0
    else
        error "API не отвечает"
        return 1
    fi
}

# Проверка веб-сайта
check_website() {
    info "Проверка доступности сайта..."
    
    if curl -f -s -I http://twtichcsgo.shop > /dev/null; then
        log "Сайт доступен"
        
        # Получаем статус код
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://twtichcsgo.shop)
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://twtichcsgo.shop)
        
        echo "  🌐 HTTP статус: $STATUS_CODE"
        echo "  ⚡ Время ответа: ${RESPONSE_TIME}s"
        
        return 0
    else
        error "Сайт недоступен"
        return 1
    fi
}

# Проверка структуры данных
check_data_structure() {
    info "Проверка структуры данных..."
    
    local errors=0
    local warnings=0
    
    # Проверяем основные папки
    for dir in "$TABLES_DIR" "$GLOBAL_DIR" "$BACKUPS_DIR"; do
        if [ -d "$dir" ]; then
            log "Папка существует: $(basename "$dir")"
        else
            error "Папка отсутствует: $(basename "$dir")"
            ((errors++))
        fi
    done
    
    # Проверяем таблицы
    if [ -d "$TABLES_DIR" ]; then
        TABLES_COUNT=$(find "$TABLES_DIR" -name "table_*" -type d | wc -l)
        echo "  📋 Таблиц найдено: $TABLES_COUNT"
        
        if [ "$TABLES_COUNT" -gt 0 ]; then
            # Проверяем структуру каждой таблицы
            local table_errors=0
            for table_dir in "$TABLES_DIR"/table_*; do
                if [ -d "$table_dir" ]; then
                    local table_id=$(basename "$table_dir" | sed 's/table_//')
                    
                    # Проверяем обязательные файлы
                    for file in "table.json" "xml_data.json" "metadata.json"; do
                        if [ -f "$table_dir/$file" ]; then
                            # Проверяем валидность JSON
                            if ! python3 -m json.tool "$table_dir/$file" > /dev/null 2>&1; then
                                warn "Невалидный JSON: таблица $table_id, файл $file"
                                ((warnings++))
                            fi
                        else
                            warn "Отсутствует файл: таблица $table_id, файл $file"
                            ((table_errors++))
                        fi
                    done
                fi
            done
            
            if [ "$table_errors" -eq 0 ]; then
                log "Все таблицы имеют корректную структуру"
            else
                warn "Найдены проблемы в $table_errors файлах таблиц"
            fi
        fi
    fi
    
    # Проверяем глобальные файлы
    if [ -d "$GLOBAL_DIR" ]; then
        local global_files=("commissions.json" "item_changes.json" "crm_data.json" "prom_data.json" "categories.json" "xml_status.json")
        local global_count=0
        
        for file in "${global_files[@]}"; do
            if [ -f "$GLOBAL_DIR/$file" ]; then
                ((global_count++))
                
                # Проверяем валидность JSON
                if ! python3 -m json.tool "$GLOBAL_DIR/$file" > /dev/null 2>&1; then
                    warn "Невалидный JSON: глобальный файл $file"
                    ((warnings++))
                fi
            fi
        done
        
        echo "  🌐 Глобальных файлов: $global_count/${#global_files[@]}"
    fi
    
    # Проверяем бэкапы
    if [ -d "$BACKUPS_DIR" ]; then
        local table_backups=$(find "$BACKUPS_DIR/tables" -mindepth 1 -type d 2>/dev/null | wc -l)
        local global_backups=$(find "$BACKUPS_DIR/global" -mindepth 1 -type d 2>/dev/null | wc -l)
        
        echo "  💾 Бэкапов таблиц: $table_backups"
        echo "  💾 Бэкапов глобальных данных: $global_backups"
        
        if [ "$table_backups" -eq 0 ] && [ "$global_backups" -eq 0 ]; then
            warn "Бэкапы отсутствуют"
            ((warnings++))
        fi
    fi
    
    echo "  ❌ Ошибок: $errors"
    echo "  ⚠️ Предупреждений: $warnings"
    
    return $((errors + warnings))
}

# Проверка использования ресурсов
check_resources() {
    info "Проверка использования ресурсов..."
    
    if docker ps | grep -q "inventory-calculator"; then
        # CPU и память контейнера
        STATS=$(docker stats inventory-calculator --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}")
        echo "  📊 Ресурсы контейнера:"
        echo "$STATS" | tail -n +2 | while read -r line; do
            echo "    $line"
        done
        
        # Размер данных по категориям
        if [ -d "$DATA_DIR" ]; then
            TOTAL_SIZE=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)
            TABLES_SIZE=$(du -sh "$TABLES_DIR" 2>/dev/null | cut -f1)
            GLOBAL_SIZE=$(du -sh "$GLOBAL_DIR" 2>/dev/null | cut -f1)
            BACKUPS_SIZE=$(du -sh "$BACKUPS_DIR" 2>/dev/null | cut -f1)
            
            echo "  📂 Размер данных:"
            echo "    📋 Таблицы: ${TABLES_SIZE:-"0B"}"
            echo "    🌐 Глобальные: ${GLOBAL_SIZE:-"0B"}"
            echo "    💾 Бэкапы: ${BACKUPS_SIZE:-"0B"}"
            echo "    📊 Всего: ${TOTAL_SIZE:-"0B"}"
        fi
        
        # Свободное место на диске
        DISK_USAGE=$(df -h "$DATA_DIR" | tail -1 | awk '{print $4 " свободно из " $2 " (" $5 " использовано)"}')
        echo "  💿 Диск: $DISK_USAGE"
    fi
}

# Проверка логов на ошибки
check_logs() {
    info "Проверка последних логов на ошибки..."
    
    if docker ps | grep -q "inventory-calculator"; then
        ERROR_COUNT=$(docker logs inventory-calculator --since 1h 2>&1 | grep -i error | wc -l)
        WARNING_COUNT=$(docker logs inventory-calculator --since 1h 2>&1 | grep -i warning | wc -l)
        
        if [ "$ERROR_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ]; then
            log "Ошибок и предупреждений в логах за последний час не найдено"
        else
            if [ "$ERROR_COUNT" -gt 0 ]; then
                warn "Найдено $ERROR_COUNT ошибок в логах за последний час"
            fi
            if [ "$WARNING_COUNT" -gt 0 ]; then
                warn "Найдено $WARNING_COUNT предупреждений в логах за последний час"
            fi
            
            echo "  📜 Последние проблемы:"
            docker logs inventory-calculator --since 1h 2>&1 | grep -i -E "(error|warning)" | tail -5 | while read -r line; do
                echo "    $line"
            done
        fi
    fi
}

# Проверка системной информации через API
check_system_api() {
    info "Получение системной информации..."
    
    if curl -f -s http://localhost:3001/api/system/info > /dev/null; then
        SYSTEM_INFO=$(curl -s http://localhost:3001/api/system/info)
        
        if [ $? -eq 0 ]; then
            # Парсим JSON ответ
            TABLES_COUNT=$(echo "$SYSTEM_INFO" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
            TABLES_SIZE=$(echo "$SYSTEM_INFO" | grep -o '"totalSize":[0-9]*' | head -1 | cut -d':' -f2)
            GLOBAL_FILES=$(echo "$SYSTEM_INFO" | grep -o '"files":[0-9]*' | cut -d':' -f2)
            GLOBAL_SIZE=$(echo "$SYSTEM_INFO" | grep -o '"totalSize":[0-9]*' | tail -1 | cut -d':' -f2)
            TABLE_BACKUPS=$(echo "$SYSTEM_INFO" | grep -o '"tables":[0-9]*' | tail -1 | cut -d':' -f2)
            GLOBAL_BACKUPS=$(echo "$SYSTEM_INFO" | grep -o '"global":[0-9]*' | tail -1 | cut -d':' -f2)
            
            echo "  📋 Таблиц в системе: ${TABLES_COUNT:-"0"}"
            echo "  📊 Размер таблиц: $(echo "$TABLES_SIZE" | awk '{printf "%.2f MB", $1/1024/1024}')"
            echo "  🌐 Глобальных файлов: ${GLOBAL_FILES:-"0"}"
            echo "  📊 Размер глобальных: $(echo "$GLOBAL_SIZE" | awk '{printf "%.2f MB", $1/1024/1024}')"
            echo "  💾 Бэкапов таблиц: ${TABLE_BACKUPS:-"0"}"
            echo "  💾 Бэкапов глобальных: ${GLOBAL_BACKUPS:-"0"}"
        fi
    else
        warn "Не удалось получить системную информацию через API"
    fi
}

# Проверка Nginx
check_nginx() {
    info "Проверка Nginx..."
    
    if systemctl is-active --quiet nginx; then
        log "Nginx активен"
        
        # Проверяем конфигурацию
        if nginx -t 2>/dev/null; then
            log "Конфигурация Nginx корректна"
        else
            error "Ошибка в конфигурации Nginx"
        fi
        
        # Проверяем SSL сертификат
        if openssl s_client -connect twtichcsgo.shop:443 -servername twtichcsgo.shop < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            log "SSL сертификат валиден"
        else
            warn "Проблемы с SSL сертификатом"
        fi
    else
        error "Nginx не запущен"
    fi
}

# Автоматическое восстановление
auto_recovery() {
    info "Попытка автоматического восстановления..."
    
    # Перезапуск контейнера
    if ! check_container; then
        warn "Перезапуск контейнера..."
        docker restart inventory-calculator
        sleep 15
        
        if check_container && check_api; then
            log "Контейнер успешно восстановлен"
        else
            error "Не удалось восстановить контейнер"
        fi
    fi
    
    # Перезапуск Nginx если нужно
    if ! check_nginx; then
        warn "Перезапуск Nginx..."
        systemctl restart nginx
        sleep 5
        
        if check_nginx; then
            log "Nginx успешно восстановлен"
        else
            error "Не удалось восстановить Nginx"
        fi
    fi
    
    # Создание бэкапа если проблемы с данными
    warn "Создание защитного бэкапа..."
    if curl -f -X POST http://localhost:3001/api/system/backup >/dev/null 2>&1; then
        log "Защитный бэкап создан"
    else
        warn "Не удалось создать защитный бэкап"
    fi
}

# Создание отчета
generate_report() {
    echo ""
    echo "======================================"
    echo "📊 ОТЧЕТ О СОСТОЯНИИ СИСТЕМЫ v2.1"
    echo "======================================"
    echo "🕐 Время проверки: $(date)"
    echo "📊 Структура данных: Изолированные файлы"
    echo ""
    
    # Общий статус
    local overall_status="✅ ВСЕ В ПОРЯДКЕ"
    local has_errors=false
    
    check_container || { overall_status="❌ ПРОБЛЕМЫ ОБНАРУЖЕНЫ"; has_errors=true; }
    check_api || { overall_status="❌ ПРОБЛЕМЫ ОБНАРУЖЕНЫ"; has_errors=true; }
    check_website || { overall_status="❌ ПРОБЛЕМЫ ОБНАРУЖЕНЫ"; has_errors=true; }
    check_nginx || { overall_status="❌ ПРОБЛЕМЫ ОБНАРУЖЕНЫ"; has_errors=true; }
    
    echo ""
    check_data_structure || { 
        if [ $? -gt 5 ]; then
            overall_status="❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ С ДАННЫМИ"
            has_errors=true
        else
            warn "Незначительные проблемы с данными"
        fi
    }
    
    echo ""
    check_system_api
    
    echo ""
    check_resources
    
    echo ""
    check_logs
    
    echo ""
    echo "======================================"
    if [ "$has_errors" = true ]; then
        echo -e "${RED}📈 ОБЩИЙ СТАТУС: $overall_status${NC}"
        echo ""
        echo -e "${YELLOW}🔧 Рекомендуется запустить восстановление:${NC}"
        echo -e "${YELLOW}   $0 recover${NC}"
    else
        echo -e "${GREEN}📈 ОБЩИЙ СТАТУС: $overall_status${NC}"
    fi
    echo "======================================"
}

# Создание бэкапа через API
create_backup() {
    info "Создание бэкапа через API..."
    
    if curl -f -X POST http://localhost:3001/api/system/backup >/dev/null 2>&1; then
        success "Бэкап создан успешно"
        
        # Показываем статистику бэкапов
        if [ -d "$BACKUPS_DIR" ]; then
            local table_backups=$(find "$BACKUPS_DIR/tables" -mindepth 1 -type d 2>/dev/null | wc -l)
            local global_backups=$(find "$BACKUPS_DIR/global" -mindepth 1 -type d 2>/dev/null | wc -l)
            
            echo "  💾 Всего бэкапов таблиц: $table_backups"
            echo "  💾 Всего бэкапов глобальных данных: $global_backups"
        fi
    else
        error "Не удалось создать бэкап"
    fi
}

# Мониторинг в реальном времени
real_time_monitoring() {
    info "Мониторинг в реальном времени (Ctrl+C для выхода)..."
    
    while true; do
        clear
        echo "🔄 Обновление каждые 10 секунд..."
        echo "======================================"
        
        # Краткий статус
        if check_container >/dev/null 2>&1 && check_api >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Система работает нормально${NC}"
        else
            echo -e "${RED}❌ Обнаружены проблемы${NC}"
        fi
        
        echo ""
        
        # Ресурсы
        if docker ps | grep -q "inventory-calculator"; then
            echo "📊 Ресурсы:"
            docker stats inventory-calculator --no-stream --format "  CPU: {{.CPUPerc}} | RAM: {{.MemUsage}} | NET: {{.NetIO}}"
        fi
        
        # Данные
        if [ -d "$DATA_DIR" ]; then
            local tables_count=$(find "$TABLES_DIR" -name "table_*" -type d 2>/dev/null | wc -l)
            local global_files=$(find "$GLOBAL_DIR" -name "*.json" -type f 2>/dev/null | wc -l)
            local total_size=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)
            
            echo "📂 Данные:"
            echo "  📋 Таблиц: $tables_count"
            echo "  🌐 Глобальных файлов: $global_files"
            echo "  📊 Размер: $total_size"
        fi
        
        echo ""
        echo "======================================"
        
        sleep 10
    done
}

# Основная функция
main() {
    echo "🔍 Мониторинг приложения Калькулятор себестоимости v2.1"
    echo "==========================================================="
    
    case "${1:-status}" in
        "status")
            generate_report
            ;;
        "recover")
            auto_recovery
            ;;
        "logs")
            info "Последние 50 строк логов:"
            docker logs inventory-calculator --tail 50
            ;;
        "stats")
            real_time_monitoring
            ;;
        "data")
            check_data_structure
            ;;
        "backup")
            create_backup
            ;;
        "system")
            check_system_api
            ;;
        "help")
            echo "Использование: $0 [команда]"
            echo ""
            echo "Команды:"
            echo "  status  - Показать полный статус системы (по умолчанию)"
            echo "  recover - Попытка автоматического восстановления"
            echo "  logs    - Показать последние логи"
            echo "  stats   - Мониторинг в реальном времени"
            echo "  data    - Проверить структуру данных"
            echo "  backup  - Создать бэкап через API"
            echo "  system  - Показать системную информацию"
            echo "  help    - Показать эту справку"
            echo ""
            echo "🔧 Новые возможности v2.1:"
            echo "  - Мониторинг изолированной структуры данных"
            echo "  - Проверка валидности JSON файлов"
            echo "  - Детальная статистика по таблицам и глобальным данным"
            echo "  - Мониторинг бэкапов по категориям"
            ;;
        *)
            error "Неизвестная команда: $1"
            echo "Используйте '$0 help' для справки"
            exit 1
            ;;
    esac
}

# Запуск основной функции
main "$@"
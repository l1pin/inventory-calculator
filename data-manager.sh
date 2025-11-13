#!/bin/bash

# Менеджер данных для Калькулятора себестоимости v2.1
# Управление изолированными файлами данных

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"; }
success() { echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 $1${NC}"; }

DATA_DIR="/opt/inventory-calculator/data"
TABLES_DIR="$DATA_DIR/tables"
GLOBAL_DIR="$DATA_DIR/global"
BACKUPS_DIR="$DATA_DIR/backups"

# Показать структуру данных
show_structure() {
    info "📊 Структура данных:"
    echo ""
    
    if [ -d "$DATA_DIR" ]; then
        # Общая информация
        TOTAL_SIZE=$(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)
        echo "📂 Общий размер данных: ${TOTAL_SIZE:-"0B"}"
        echo ""
        
        # Таблицы
        if [ -d "$TABLES_DIR" ]; then
            TABLES_COUNT=$(find "$TABLES_DIR" -name "table_*" -type d 2>/dev/null | wc -l)
            TABLES_SIZE=$(du -sh "$TABLES_DIR" 2>/dev/null | cut -f1)
            
            echo "📋 Таблицы ($TABLES_COUNT шт., ${TABLES_SIZE:-"0B"}):"
            
            if [ "$TABLES_COUNT" -gt 0 ]; then
                for table_dir in "$TABLES_DIR"/table_*; do
                    if [ -d "$table_dir" ]; then
                        TABLE_ID=$(basename "$table_dir" | sed 's/table_//')
                        TABLE_SIZE=$(du -sh "$table_dir" 2>/dev/null | cut -f1)
                        
                        # Читаем метаданные
                        if [ -f "$table_dir/metadata.json" ]; then
                            TABLE_NAME=$(python3 -c "
import json, sys
try:
    with open('$table_dir/table.json') as f:
        data = json.load(f)
        print(data.get('name', 'Unnamed'))
except:
    print('Unknown')
" 2>/dev/null)
                            ITEMS_COUNT=$(python3 -c "
import json, sys
try:
    with open('$table_dir/metadata.json') as f:
        data = json.load(f)
        print(data.get('itemsCount', 0))
except:
    print(0)
" 2>/dev/null)
                        else
                            TABLE_NAME="Unknown"
                            ITEMS_COUNT="0"
                        fi
                        
                        echo "  📄 ID:$TABLE_ID \"$TABLE_NAME\" ($ITEMS_COUNT позиций, $TABLE_SIZE)"
                    fi
                done
            else
                echo "  (нет таблиц)"
            fi
        else
            echo "📋 Таблицы: папка отсутствует"
        fi
        
        echo ""
        
        # Глобальные данные
        if [ -d "$GLOBAL_DIR" ]; then
            GLOBAL_SIZE=$(du -sh "$GLOBAL_DIR" 2>/dev/null | cut -f1)
            GLOBAL_FILES=$(find "$GLOBAL_DIR" -name "*.json" -type f 2>/dev/null | wc -l)
            
            echo "🌐 Глобальные данные ($GLOBAL_FILES файлов, ${GLOBAL_SIZE:-"0B"}):"
            
            # Детализация по файлам
            for file in "commissions.json" "item_changes.json" "crm_data.json" "prom_data.json" "categories.json" "xml_status.json"; do
                if [ -f "$GLOBAL_DIR/$file" ]; then
                    FILE_SIZE=$(du -sh "$GLOBAL_DIR/$file" 2>/dev/null | cut -f1)
                    
                    # Получаем количество элементов
                    ITEMS=$(python3 -c "
import json, sys
try:
    with open('$GLOBAL_DIR/$file') as f:
        data = json.load(f)
        if 'data' in data:
            if isinstance(data['data'], dict):
                print(len(data['data']))
            elif isinstance(data['data'], list):
                print(len(data['data']))
            else:
                print('1')
        else:
            print('unknown')
except:
    print('error')
" 2>/dev/null)
                    
                    echo "  📄 $file ($ITEMS элементов, $FILE_SIZE)"
                else
                    echo "  📄 $file (отсутствует)"
                fi
            done
        else
            echo "🌐 Глобальные данные: папка отсутствует"
        fi
        
        echo ""
        
        # Бэкапы
        if [ -d "$BACKUPS_DIR" ]; then
            BACKUPS_SIZE=$(du -sh "$BACKUPS_DIR" 2>/dev/null | cut -f1)
            TABLE_BACKUPS=$(find "$BACKUPS_DIR/tables" -mindepth 1 -type d 2>/dev/null | wc -l)
            GLOBAL_BACKUPS=$(find "$BACKUPS_DIR/global" -mindepth 1 -type d 2>/dev/null | wc -l)
            
            echo "💾 Бэкапы (${BACKUPS_SIZE:-"0B"}):"
            echo "  📋 Бэкапов таблиц: $TABLE_BACKUPS"
            echo "  🌐 Бэкапов глобальных данных: $GLOBAL_BACKUPS"
            
            # Последние бэкапы
            LATEST_TABLE_BACKUP=$(find "$BACKUPS_DIR/tables" -mindepth 1 -type d 2>/dev/null | sort | tail -1)
            LATEST_GLOBAL_BACKUP=$(find "$BACKUPS_DIR/global" -mindepth 1 -type d 2>/dev/null | sort | tail -1)
            
            if [ -n "$LATEST_TABLE_BACKUP" ]; then
                echo "  🕐 Последний бэкап таблиц: $(basename "$LATEST_TABLE_BACKUP")"
            fi
            
            if [ -n "$LATEST_GLOBAL_BACKUP" ]; then
                echo "  🕐 Последний глобальный бэкап: $(basename "$LATEST_GLOBAL_BACKUP")"
            fi
        else
            echo "💾 Бэкапы: папка отсутствует"
        fi
        
    else
        error "Директория данных не найдена: $DATA_DIR"
    fi
}

# Проверка целостности данных
check_integrity() {
    info "🔍 Проверка целостности данных..."
    
    local errors=0
    local warnings=0
    
    # Проверка структуры папок
    for dir in "$TABLES_DIR" "$GLOBAL_DIR" "$BACKUPS_DIR"; do
        if [ ! -d "$dir" ]; then
            error "Отсутствует папка: $dir"
            ((errors++))
        fi
    done
    
    # Проверка таблиц
    if [ -d "$TABLES_DIR" ]; then
        for table_dir in "$TABLES_DIR"/table_*; do
            if [ -d "$table_dir" ]; then
                TABLE_ID=$(basename "$table_dir" | sed 's/table_//')
                
                # Проверяем обязательные файлы
                for file in "table.json" "xml_data.json" "metadata.json"; do
                    if [ -f "$table_dir/$file" ]; then
                        # Проверяем валидность JSON
                        if ! python3 -m json.tool "$table_dir/$file" >/dev/null 2>&1; then
                            error "Невалидный JSON: таблица $TABLE_ID, файл $file"
                            ((errors++))
                        fi
                    else
                        warn "Отсутствует файл: таблица $TABLE_ID, файл $file"
                        ((warnings++))
                    fi
                done
                
                # Проверяем согласованность данных
                if [ -f "$table_dir/table.json" ] && [ -f "$table_dir/metadata.json" ]; then
                    TABLE_ITEMS=$(python3 -c "
import json
try:
    with open('$table_dir/table.json') as f:
        data = json.load(f)
        print(len(data.get('data', [])))
except:
    print(-1)
" 2>/dev/null)
                    
                    META_ITEMS=$(python3 -c "
import json
try:
    with open('$table_dir/metadata.json') as f:
        data = json.load(f)
        print(data.get('itemsCount', -1))
except:
    print(-1)
" 2>/dev/null)
                    
                    if [ "$TABLE_ITEMS" != "$META_ITEMS" ] && [ "$TABLE_ITEMS" != "-1" ] && [ "$META_ITEMS" != "-1" ]; then
                        warn "Несоответствие количества элементов в таблице $TABLE_ID: данные=$TABLE_ITEMS, метаданные=$META_ITEMS"
                        ((warnings++))
                    fi
                fi
            fi
        done
    fi
    
    # Проверка глобальных файлов
    if [ -d "$GLOBAL_DIR" ]; then
        for file in "commissions.json" "item_changes.json" "crm_data.json" "prom_data.json" "categories.json" "xml_status.json"; do
            if [ -f "$GLOBAL_DIR/$file" ]; then
                if ! python3 -m json.tool "$GLOBAL_DIR/$file" >/dev/null 2>&1; then
                    error "Невалидный JSON: глобальный файл $file"
                    ((errors++))
                fi
            fi
        done
    fi
    
    echo ""
    if [ "$errors" -eq 0 ] && [ "$warnings" -eq 0 ]; then
        success "✅ Все данные в порядке!"
    else
        echo "📊 Результаты проверки:"
        echo "  ❌ Ошибок: $errors"
        echo "  ⚠️ Предупреждений: $warnings"
        
        if [ "$errors" -gt 0 ]; then
            error "Обнаружены критические ошибки!"
        elif [ "$warnings" -gt 0 ]; then
            warn "Обнаружены предупреждения"
        fi
    fi
}

# Очистка данных
cleanup_data() {
    warn "🧹 Очистка данных..."
    
    echo "Выберите что очистить:"
    echo "1) Старые бэкапы (старше 30 дней)"
    echo "2) Временные файлы"
    echo "3) Пустые папки таблиц"
    echo "4) Всё вышеперечисленное"
    echo "5) Отмена"
    
    read -p "Введите номер (1-5): " choice
    
    case $choice in
        1|4)
            info "Очистка старых бэкапов..."
            find "$BACKUPS_DIR" -type d -mtime +30 -name "20*" -exec rm -rf {} + 2>/dev/null
            log "✅ Старые бэкапы очищены"
            ;&
        2|4)
            info "Очистка временных файлов..."
            find "$DATA_DIR" -name "*.tmp" -delete 2>/dev/null
            find "$DATA_DIR" -name "*.bak" -delete 2>/dev/null
            log "✅ Временные файлы очищены"
            ;&
        3|4)
            info "Поиск пустых папок таблиц..."
            for table_dir in "$TABLES_DIR"/table_*; do
                if [ -d "$table_dir" ]; then
                    if [ -z "$(ls -A "$table_dir" 2>/dev/null)" ]; then
                        warn "Удаление пустой папки: $(basename "$table_dir")"
                        rmdir "$table_dir"
                    fi
                fi
            done
            log "✅ Пустые папки очищены"
            ;;
        5)
            info "Очистка отменена"
            ;;
        *)
            error "Неверный выбор"
            ;;
    esac
}

# Экспорт данных
export_data() {
    info "📤 Экспорт данных..."
    
    local export_dir="/tmp/inventory-export-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$export_dir"
    
    # Копируем структуру данных
    cp -r "$TABLES_DIR" "$export_dir/" 2>/dev/null || true
    cp -r "$GLOBAL_DIR" "$export_dir/" 2>/dev/null || true
    
    # Создаем архив
    local archive_name="inventory-data-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "/tmp/$archive_name" -C "$export_dir" .
    
    # Удаляем временную папку
    rm -rf "$export_dir"
    
    success "✅ Данные экспортированы в: /tmp/$archive_name"
    
    # Показываем размер
    local size=$(du -sh "/tmp/$archive_name" | cut -f1)
    echo "📊 Размер архива: $size"
}

# Восстановление из бэкапа
restore_backup() {
    warn "🔄 Восстановление из бэкапа..."
    
    echo "Доступные бэкапы:"
    echo ""
    
    # Показываем бэкапы таблиц
    echo "📋 Бэкапы таблиц:"
    local table_backups=($(find "$BACKUPS_DIR/tables" -mindepth 1 -type d 2>/dev/null | sort -r))
    for i in "${!table_backups[@]}"; do
        local backup_name=$(basename "${table_backups[$i]}")
        echo "  $((i+1))) $backup_name"
    done
    
    echo ""
    
    # Показываем глобальные бэкапы
    echo "🌐 Глобальные бэкапы:"
    local global_backups=($(find "$BACKUPS_DIR/global" -mindepth 1 -type d 2>/dev/null | sort -r))
    for i in "${!global_backups[@]}"; do
        local backup_name=$(basename "${global_backups[$i]}")
        echo "  $((i+1))) $backup_name"
    done
    
    echo ""
    warn "⚠️ Восстановление заменит текущие данные!"
    echo "Продолжить? (y/N)"
    read -r confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        info "Восстановление отменено"
        return
    fi
    
    echo "Выберите тип восстановления:"
    echo "1) Только таблицы"
    echo "2) Только глобальные данные"
    echo "3) Всё"
    echo "4) Отмена"
    
    read -p "Введите номер (1-4): " restore_type
    
    case $restore_type in
        1|3)
            if [ ${#table_backups[@]} -gt 0 ]; then
                read -p "Введите номер бэкапа таблиц: " table_num
                if [[ "$table_num" =~ ^[0-9]+$ ]] && [ "$table_num" -le "${#table_backups[@]}" ] && [ "$table_num" -gt 0 ]; then
                    local selected_backup="${table_backups[$((table_num-1))]}"
                    warn "Восстановление таблиц из: $(basename "$selected_backup")"
                    
                    # Создаем бэкап текущих данных
                    local current_backup="$BACKUPS_DIR/tables/before-restore-$(date +%Y%m%d_%H%M%S)"
                    mkdir -p "$current_backup"
                    cp -r "$TABLES_DIR"/* "$current_backup/" 2>/dev/null || true
                    
                    # Восстанавливаем
                    rm -rf "$TABLES_DIR"/*
                    cp -r "$selected_backup"/* "$TABLES_DIR/" 2>/dev/null || true
                    
                    log "✅ Таблицы восстановлены"
                fi
            fi
            ;&
        2|3)
            if [ ${#global_backups[@]} -gt 0 ]; then
                read -p "Введите номер глобального бэкапа: " global_num
                if [[ "$global_num" =~ ^[0-9]+$ ]] && [ "$global_num" -le "${#global_backups[@]}" ] && [ "$global_num" -gt 0 ]; then
                    local selected_backup="${global_backups[$((global_num-1))]}"
                    warn "Восстановление глобальных данных из: $(basename "$selected_backup")"
                    
                    # Создаем бэкап текущих данных
                    local current_backup="$BACKUPS_DIR/global/before-restore-$(date +%Y%m%d_%H%M%S)"
                    mkdir -p "$current_backup"
                    cp -r "$GLOBAL_DIR"/* "$current_backup/" 2>/dev/null || true
                    
                    # Восстанавливаем
                    rm -rf "$GLOBAL_DIR"/*
                    cp -r "$selected_backup"/* "$GLOBAL_DIR/" 2>/dev/null || true
                    
                    log "✅ Глобальные данные восстановлены"
                fi
            fi
            ;;
        4)
            info "Восстановление отменено"
            ;;
    esac
}

# Создание бэкапа
create_backup() {
    info "💾 Создание ручного бэкапа..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Бэкап таблиц
    local table_backup_dir="$BACKUPS_DIR/tables/manual-$timestamp"
    mkdir -p "$table_backup_dir"
    
    if [ -d "$TABLES_DIR" ] && [ "$(ls -A "$TABLES_DIR" 2>/dev/null)" ]; then
        cp -r "$TABLES_DIR"/* "$table_backup_dir/" 2>/dev/null || true
        log "✅ Бэкап таблиц создан: manual-$timestamp"
    else
        warn "Таблицы отсутствуют, бэкап не создан"
        rmdir "$table_backup_dir" 2>/dev/null || true
    fi
    
    # Бэкап глобальных данных
    local global_backup_dir="$BACKUPS_DIR/global/manual-$timestamp"
    mkdir -p "$global_backup_dir"
    
    if [ -d "$GLOBAL_DIR" ] && [ "$(ls -A "$GLOBAL_DIR" 2>/dev/null)" ]; then
        cp -r "$GLOBAL_DIR"/* "$global_backup_dir/" 2>/dev/null || true
        log "✅ Бэкап глобальных данных создан: manual-$timestamp"
    else
        warn "Глобальные данные отсутствуют, бэкап не создан"
        rmdir "$global_backup_dir" 2>/dev/null || true
    fi
    
    success "💾 Ручной бэкап завершен!"
}

# Основная функция
main() {
    echo "📊 Менеджер данных Калькулятора себестоимости v2.1"
    echo "=================================================="
    
    case "${1:-menu}" in
        "structure"|"struct")
            show_structure
            ;;
        "check"|"integrity")
            check_integrity
            ;;
        "cleanup"|"clean")
            cleanup_data
            ;;
        "export")
            export_data
            ;;
        "restore")
            restore_backup
            ;;
        "backup")
            create_backup
            ;;
        "menu")
            echo "Выберите действие:"
            echo "1) Показать структуру данных"
            echo "2) Проверить целостность"
            echo "3) Очистить старые данные"
            echo "4) Создать бэкап"
            echo "5) Восстановить из бэкапа"
            echo "6) Экспортировать данные"
            echo "7) Выход"
            
            read -p "Введите номер (1-7): " choice
            
            case $choice in
                1) show_structure ;;
                2) check_integrity ;;
                3) cleanup_data ;;
                4) create_backup ;;
                5) restore_backup ;;
                6) export_data ;;
                7) info "До свидания!" ;;
                *) error "Неверный выбор" ;;
            esac
            ;;
        "help")
            echo "Использование: $0 [команда]"
            echo ""
            echo "Команды:"
            echo "  structure  - Показать структуру данных"
            echo "  check      - Проверить целостность данных"
            echo "  cleanup    - Очистить старые данные"
            echo "  backup     - Создать ручной бэкап"
            echo "  restore    - Восстановить из бэкапа"
            echo "  export     - Экспортировать данные"
            echo "  menu       - Показать интерактивное меню (по умолчанию)"
            echo "  help       - Показать эту справку"
            ;;
        *)
            error "Неизвестная команда: $1"
            echo "Используйте '$0 help' для справки"
            exit 1
            ;;
    esac
}

# Проверка прав доступа
if [ ! -d "$DATA_DIR" ]; then
    error "Директория данных не найдена: $DATA_DIR"
    error "Убедитесь, что приложение установлено корректно"
    exit 1
fi

# Запуск
main "$@"
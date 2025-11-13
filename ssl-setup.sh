#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
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

# Установка Certbot
info "Установка Certbot..."
apt update
apt install certbot python3-certbot-nginx -y

# Получение сертификата
info "Получение SSL сертификата..."
read -p "Введите email для уведомлений: " email

certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$email" \
    --domains "twtichcsgo.shop" \
    --domains "www.twtichcsgo.shop" \
    --redirect

if [ $? -eq 0 ]; then
    log "SSL сертификат установлен!"
    log "Сайт доступен: https://twtichcsgo.shop"
    
    # Настройка автообновления
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -
    log "Автообновление SSL настроено"
else
    error "Ошибка установки SSL"
fi

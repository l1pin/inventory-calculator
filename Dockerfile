# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем дополнительные пакеты для работы с JSON
RUN apk add --no-cache python3 py3-pip curl

# Копируем package.json файлы
COPY package*.json ./

# Устанавливаем зависимости сервера
RUN npm install

# Копируем исходный код сервера
COPY server.js ./

# Копируем скрипт миграции
COPY migrate.js ./

# Создаем директорию для React приложения
RUN mkdir client

# Копируем файлы React приложения
COPY client/package*.json ./client/
COPY client/public ./client/public/
COPY client/src ./client/src/

# Переходим в директорию клиента и устанавливаем зависимости
WORKDIR /app/client
RUN npm install

# Собираем React приложение
RUN npm run build

# Возвращаемся в корневую директорию
WORKDIR /app

# Копируем собранное приложение
RUN cp -r client/build .

# Создаем директорию для данных с правильной структурой
RUN mkdir -p data/tables data/global data/backups/tables data/backups/global

# Создаем скрипт проверки миграции
RUN echo '#!/bin/sh' > /app/check-migration.sh && \
    echo 'if [ -f "/app/data/app_data.json" ] && [ ! -d "/app/data/tables" ]; then' >> /app/check-migration.sh && \
    echo '  echo "🔄 Обнаружен старый формат данных, запуск миграции..."' >> /app/check-migration.sh && \
    echo '  node /app/migrate.js' >> /app/check-migration.sh && \
    echo '  echo "✅ Миграция завершена"' >> /app/check-migration.sh && \
    echo 'fi' >> /app/check-migration.sh && \
    chmod +x /app/check-migration.sh

# Создаем основной скрипт запуска
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Запуск приложения Калькулятор себестоимости v2.1..."' >> /app/start.sh && \
    echo 'echo "📂 Проверка структуры данных..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Проверяем и выполняем миграцию если нужно' >> /app/start.sh && \
    echo '/app/check-migration.sh' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Создаем структуру папок если их нет' >> /app/start.sh && \
    echo 'mkdir -p /app/data/tables /app/data/global /app/data/backups/tables /app/data/backups/global' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "✅ Структура данных готова"' >> /app/start.sh && \
    echo 'echo "🌐 Запуск сервера..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Запускаем сервер' >> /app/start.sh && \
    echo 'exec node /app/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Открываем порт
EXPOSE 3001

# Указываем пользователя (для безопасности)
USER node

# Запускаем через скрипт
CMD ["/app/start.sh"]
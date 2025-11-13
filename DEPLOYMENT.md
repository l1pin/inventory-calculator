# Инструкция по развертыванию Inventory Calculator

## Платформы для развертывания

### ✅ 1. Render.com (Рекомендуется)

**Преимущества:**
- Бесплатный тариф
- Автоматические деплои из GitHub
- Поддержка постоянного хранилища (persistent disk)
- Простая настройка

**Шаги развертывания:**

1. Зарегистрируйтесь на https://render.com
2. Подключите GitHub репозиторий
3. Создайте новый Web Service:
   - **Build Command:** `npm run install:all && npm run build:client`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Добавьте Disk для хранения данных:
   - Name: `data`
   - Mount Path: `/opt/render/project/src/data`
   - Size: 1GB
5. Добавьте переменную окружения:
   - `PORT=3001`
6. Deploy!

**Важно:** Render автоматически использует `render.yaml` если он есть в репозитории.

---

### ✅ 2. Railway.app

**Преимущества:**
- $5 бесплатных кредитов в месяц
- Автодеплой из GitHub
- Поддержка volumes для данных
- Очень простой интерфейс

**Шаги развертывания:**

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект из GitHub репозитория
3. Railway автоматически определит Node.js приложение
4. Добавьте Volume:
   - Mount Path: `/app/data`
5. Deploy автоматически запустится

---

### ✅ 3. Heroku

**Преимущества:**
- Известная платформа
- Простая настройка
- Бесплатный тариф (ограниченный)

**Шаги развертывания:**

1. Установите Heroku CLI:
   ```bash
   npm install -g heroku
   ```

2. Войдите в аккаунт:
   ```bash
   heroku login
   ```

3. Создайте приложение:
   ```bash
   heroku create your-app-name
   ```

4. Добавьте buildpack:
   ```bash
   heroku buildpacks:add heroku/nodejs
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

**Важно:** Для постоянного хранения данных нужен платный аддон (Heroku Postgres или S3).

---

### ✅ 4. DigitalOcean App Platform

**Преимущества:**
- $5/месяц
- Хорошая производительность
- Поддержка volumes

**Шаги развертывания:**

1. Зарегистрируйтесь на https://cloud.digitalocean.com
2. Создайте App из GitHub репозитория
3. Настройте:
   - **Build Command:** `npm run install:all && npm run build:client`
   - **Run Command:** `npm start`
4. Добавьте Volume для `/data`
5. Deploy!

---

### ✅ 5. Самостоятельный VPS (Полный контроль)

**Платформы:** DigitalOcean, Linode, Vultr, Hetzner

**Преимущества:**
- Полный контроль
- От $4/месяц
- SSH доступ

**Шаги развертывания:**

1. Создайте Droplet/VPS (Ubuntu 22.04)

2. Подключитесь по SSH:
   ```bash
   ssh root@your-server-ip
   ```

3. Установите Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. Установите PM2:
   ```bash
   npm install -g pm2
   ```

5. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/l1pin/inventory-calculator.git
   cd inventory-calculator
   ```

6. Установите зависимости и соберите:
   ```bash
   npm run install:all
   npm run build:client
   ```

7. Запустите с PM2:
   ```bash
   pm2 start server.js --name inventory-calculator
   pm2 startup
   pm2 save
   ```

8. Настройте Nginx как reverse proxy:
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/inventory-calculator
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/inventory-calculator /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. Настройте SSL с Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Что НЕ подходит

### ❌ Netlify
- Только для статических сайтов
- Нет поддержки постоянного сервера
- Нельзя сохранять файлы на диск

### ❌ Vercel  
- Ограниченная поддержка файловой системы
- Serverless функции имеют таймауты
- Нет persistent storage

### ❌ GitHub Pages
- Только статический контент
- Нет backend

---

## Рекомендация

**Для начала:** Используйте **Render.com** или **Railway.app**
- Бесплатный тариф
- Простая настройка
- Поддержка хранилища для данных

**Для продакшена:** VPS с PM2 и Nginx
- Полный контроль
- Лучшая производительность
- Дешевле при масштабировании

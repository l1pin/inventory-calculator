# План миграции Inventory Calculator на базу данных

## Текущее состояние
- Express.js сервер с хранением данных в JSON файлах
- React клиент
- ~80MB данных в JSON файлах
- Множественные таблицы с товарами, категории, глобальные данные

## Цель миграции
Перейти от JSON файлов к PostgreSQL базе данных с использованием Supabase и развернуть на выбранной платформе (Netlify/собственный сервер).

---

## Вариант 1: Supabase (Рекомендуемый)

### Преимущества:
- ✅ Managed PostgreSQL база данных
- ✅ Бесплатный tier (500MB БД, 50,000 запросов/месяц)
- ✅ Real-time subscriptions
- ✅ Автоматические API
- ✅ Встроенная аутентификация
- ✅ Резервное копирование
- ✅ Простое масштабирование

### Недостатки:
- ❌ Ограничения на бесплатном плане
- ❌ Зависимость от внешнего сервиса

---

## Вариант 2: Собственный сервер

### Преимущества:
- ✅ Полный контроль
- ✅ Нет ограничений по объему
- ✅ Можно использовать любую БД (PostgreSQL, MySQL)

### Недостатки:
- ❌ Нужно настраивать и обслуживать сервер
- ❌ Нужно настраивать резервное копирование
- ❌ Дополнительные расходы на хостинг

---

## Вариант 3: Netlify

**ВАЖНО:** Netlify - это платформа для статических сайтов и serverless функций.
- ✅ Отлично подходит для frontend (React)
- ✅ Serverless функции для API
- ❌ **НЕТ встроенной базы данных** - нужно использовать внешнюю БД (Supabase, MongoDB Atlas, Firebase)

**Рекомендация:** Netlify (frontend) + Supabase (база данных) = Идеальная комбинация!

---

# ПОШАГОВЫЙ ПЛАН МИГРАЦИИ

## Этап 1: Подготовка базы данных на Supabase

### Шаг 1.1: Создание аккаунта Supabase
1. Зайдите на https://supabase.com
2. Нажмите "Start your project"
3. Зарегистрируйтесь через GitHub или email
4. Создайте новую организацию (если требуется)

### Шаг 1.2: Создание проекта
1. Нажмите "New Project"
2. Заполните:
   - **Project name:** `inventory-calculator`
   - **Database Password:** (сохраните надежный пароль!)
   - **Region:** выберите ближайший к вам регион
   - **Pricing Plan:** Free (для начала)
3. Нажмите "Create new project"
4. Дождитесь создания проекта (~2 минуты)

### Шаг 1.3: Получение учетных данных
1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **API Key (anon, public)** - для клиента
   - **API Key (service_role, secret)** - для сервера (⚠️ храните в секрете!)
3. Перейдите в **Settings** → **Database**
4. Скопируйте **Connection string** (понадобится для миграции)

---

## Этап 2: Проектирование схемы базы данных

### Структура таблиц:

```sql
-- Таблица: tables (метаданные таблиц)
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_name TEXT,
  upload_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: table_items (товары в таблицах)
CREATE TABLE table_items (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  base_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  commission INTEGER,
  stock INTEGER,
  days_stock INTEGER,
  sales_month INTEGER,
  applications_month INTEGER,
  sales_2weeks INTEGER,
  applications_2weeks INTEGER,
  markup50_12 DECIMAL(10, 2),
  new_price TEXT,
  price_history JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  crm_price DECIMAL(10, 2),
  crm_stock INTEGER,
  crm_category_id TEXT,
  crm_category_name TEXT,
  prom_price DECIMAL(10, 2),
  markup10 DECIMAL(10, 2),
  markup20 DECIMAL(10, 2),
  markup30 DECIMAL(10, 2),
  markup40 DECIMAL(10, 2),
  markup50 DECIMAL(10, 2),
  markup60 DECIMAL(10, 2),
  markup70 DECIMAL(10, 2),
  markup80 DECIMAL(10, 2),
  markup90 DECIMAL(10, 2),
  markup100 DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, item_id)
);

-- Таблица: crm_categories (CRM категории)
CREATE TABLE crm_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: item_categories (категоризация товаров)
CREATE TABLE item_categories (
  id SERIAL PRIMARY KEY,
  category_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_type, item_id)
);

-- Таблица: global_commissions (глобальные комиссии)
CREATE TABLE global_commissions (
  key TEXT PRIMARY KEY,
  value DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: global_item_changes (глобальные изменения товаров)
CREATE TABLE global_item_changes (
  item_id TEXT PRIMARY KEY,
  changes JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: xml_status (статус загрузки XML)
CREATE TABLE xml_status (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_update TIMESTAMPTZ,
  data_count INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: table_xml_data (XML данные таблиц)
CREATE TABLE table_xml_data (
  table_id TEXT PRIMARY KEY REFERENCES tables(id) ON DELETE CASCADE,
  xml_data JSONB NOT NULL,
  loading_status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица: global_xml_data (глобальные XML данные)
CREATE TABLE global_xml_data (
  data_type TEXT PRIMARY KEY, -- 'crm' или 'prom'
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_table_items_table_id ON table_items(table_id);
CREATE INDEX idx_table_items_item_id ON table_items(item_id);
CREATE INDEX idx_item_categories_type ON item_categories(category_type);
CREATE INDEX idx_item_categories_item ON item_categories(item_id);
```

---

## Этап 3: Выполнение миграции схемы

### Шаг 3.1: Создание таблиц в Supabase
1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Скопируйте SQL схему выше
4. Нажмите "Run" для выполнения
5. Проверьте в **Table Editor**, что все таблицы созданы

### Шаг 3.2: Настройка Row Level Security (RLS)
```sql
-- Временно отключаем RLS для упрощения (включим после тестирования)
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_item_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE xml_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_xml_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_xml_data DISABLE ROW LEVEL SECURITY;
```

---

## Этап 4: Миграция существующих данных

### Шаг 4.1: Установка зависимостей
```bash
npm install @supabase/supabase-js dotenv
```

### Шаг 4.2: Создание .env файла
Создайте файл `.env` в корне проекта:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

### Шаг 4.3: Запуск скрипта миграции данных
Скрипт будет создан автоматически на следующем этапе.
```bash
node migrate-data.js
```

---

## Этап 5: Обновление серверного кода

### Шаг 5.1: Обновление package.json
Добавить зависимости:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1"
  }
}
```

### Шаг 5.2: Создание клиента Supabase
Создается файл `db.js` с подключением к Supabase.

### Шаг 5.3: Обновление API endpoints
Все endpoints `/api/*` будут переписаны для работы с PostgreSQL через Supabase.

---

## Этап 6: Развертывание

### Вариант A: Netlify (Frontend) + Supabase (Backend)

#### Шаг 6.1: Подготовка к деплою на Netlify
1. Зарегистрируйтесь на https://netlify.com
2. Установите Netlify CLI:
```bash
npm install -g netlify-cli
```

3. Создайте `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "client/build"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Шаг 6.2: Создание Serverless Functions
Netlify Functions будут созданы в `netlify/functions/`

#### Шаг 6.3: Деплой на Netlify
```bash
netlify init
netlify env:set SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set SUPABASE_SERVICE_KEY "your_service_key"
netlify deploy --prod
```

### Вариант B: Собственный сервер (VPS)

#### Шаг 6.1: Подключение к серверу
```bash
ssh user@your-server-ip
```

#### Шаг 6.2: Установка Node.js и PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

#### Шаг 6.3: Клонирование и настройка проекта
```bash
git clone https://github.com/your-username/inventory-calculator.git
cd inventory-calculator
npm install
cd client && npm install && npm run build && cd ..
```

#### Шаг 6.4: Настройка .env
```bash
nano .env
# Добавьте SUPABASE_URL и SUPABASE_SERVICE_KEY
```

#### Шаг 6.5: Запуск с PM2
```bash
pm2 start server.js --name inventory-calculator
pm2 save
pm2 startup
```

#### Шаг 6.6: Настройка Nginx (опционально)
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

---

## Этап 7: Тестирование

### Шаг 7.1: Проверка миграции данных
1. Откройте Supabase Dashboard → Table Editor
2. Проверьте количество записей в каждой таблице
3. Сверьте с количеством записей в JSON файлах

### Шаг 7.2: Тестирование API
1. Проверьте GET /api/data
2. Проверьте POST /api/data (сохранение)
3. Проверьте GET /api/categories
4. Проверьте DELETE /api/tables/:id

### Шаг 7.3: Тестирование frontend
1. Откройте приложение в браузере
2. Проверьте загрузку таблиц
3. Проверьте редактирование данных
4. Проверьте удаление таблиц
5. Проверьте работу категорий

---

## Этап 8: Финализация

### Шаг 8.1: Резервное копирование
```bash
# Создайте финальный backup JSON файлов
cp -r data data_backup_$(date +%Y%m%d)
```

### Шаг 8.2: Настройка автоматических бэкапов Supabase
1. В Supabase Dashboard → Settings → Database
2. Включите автоматические бэкапы (доступно на платных планах)
3. Или настройте cron job для pg_dump

### Шаг 8.3: Очистка
После успешного тестирования можно удалить JSON файлы:
```bash
# НЕ ДЕЛАЙТЕ ЭТО СРАЗУ! Подождите минимум неделю!
rm -rf data/tables
```

---

## Рекомендуемый стек

### 🏆 Лучший вариант для вашего проекта:

**Frontend:** Netlify
**Backend API:** Netlify Functions (serverless)
**База данных:** Supabase (PostgreSQL)

### Почему?
- ✅ **Бесплатно** на старте (оба сервиса имеют generous free tier)
- ✅ **Простое масштабирование** без настройки серверов
- ✅ **Автоматический SSL**
- ✅ **CDN** для быстрой загрузки
- ✅ **Автоматические резервные копии** (Supabase)
- ✅ **Git-based deployments** (Netlify)

---

## Стоимость

### Supabase Free Tier:
- 500MB база данных
- 1GB файлового хранилища
- 2GB bandwidth
- 50,000 monthly active users

### Netlify Free Tier:
- 100GB bandwidth
- 300 build minutes
- Unlimited сайтов
- Автоматический SSL

### Когда нужен платный план?
- Supabase Pro ($25/мес): если нужно >500MB БД или >2GB bandwidth
- Netlify Pro ($19/мес): если нужно >100GB bandwidth

---

## Следующие шаги

1. Выбрать вариант развертывания
2. Создать аккаунт на Supabase
3. Выполнить миграцию схемы (Этап 3)
4. Запустить скрипт миграции данных (Этап 4)
5. Обновить код сервера (Этап 5)
6. Развернуть на выбранной платформе (Этап 6)
7. Протестировать (Этап 7)

---

## Нужна помощь?

Я готов помочь с любым этапом миграции! Просто скажите, с какого шага начнем.

# Исправление ошибок миграции

## Проблемы

При запуске `node migrate-data.js` возникали ошибки:

### Ошибка 1: item_id
```
invalid input syntax for type integer: "c26cdac3-8249-11f0-9bae-b894ff1469bf#f2d8c768-8249-11f0-9bae-b894ff1469bf"
```
**Причина:** В схеме БД поле `item_id` было определено как `INTEGER`, но в ваших данных есть строковые ID (UUID, коды типа "KA00439-2").

### Ошибка 2: commission
```
invalid input syntax for type integer: "10.8"
invalid input syntax for type integer: "14.000000000000002"
```
**Причина:** В схеме БД поле `commission` было определено как `INTEGER`, но в ваших данных есть дробные значения комиссий.

## Решение

### Вариант 1: У вас еще НЕ запущена первая миграция

Если вы еще НЕ выполняли миграцию схемы (001_initial_schema.sql) в Supabase, просто:

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое обновленного файла `migrations/001_initial_schema.sql`
3. Выполните SQL
4. Запустите миграцию данных: `node migrate-data.js`

✅ Готово!

---

### Вариант 2: Вы УЖЕ запустили первую миграцию

Если вы уже выполнили 001_initial_schema.sql и получили ошибку при миграции данных:

#### Шаг 1: Выполните скрипт исправления

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла `migrations/002_fix_item_id_type.sql`
3. Выполните SQL

Этот скрипт:
- Изменит тип `item_id` с `INTEGER` на `TEXT`
- Пересоздаст индекс

#### Шаг 2: Очистите данные (опционально)

Если при миграции уже были вставлены некоторые записи, можете очистить таблицы:

```sql
-- В Supabase SQL Editor выполните:
TRUNCATE TABLE table_items CASCADE;
TRUNCATE TABLE tables CASCADE;
```

#### Шаг 3: Повторно запустите миграцию данных

```bash
node migrate-data.js
```

✅ Теперь миграция должна пройти успешно!

---

## Что было исправлено

### В файле `migrations/001_initial_schema.sql`:

#### Исправление 1: item_id (строка 39)
**Было:**
```sql
item_id INTEGER NOT NULL,
```
**Стало:**
```sql
item_id TEXT NOT NULL,
```

#### Исправление 2: commission (строка 42)
**Было:**
```sql
commission INTEGER,
```
**Стало:**
```sql
commission DECIMAL(10, 2),
```

### Обновлен файл `migrations/002_fix_item_id_type.sql`

Скрипт для исправления уже существующей БД (исправляет оба поля).

---

## Проверка результата

После успешной миграции:

1. Откройте Supabase Dashboard → Table Editor
2. Перейдите в таблицу `table_items`
3. Проверьте, что данные присутствуют
4. Проверьте, что `item_id` содержит строковые значения (UUID, коды)

---

## Следующие шаги

После успешной миграции данных:

1. Проверьте все таблицы в Supabase Dashboard
2. Обновите серверный код (см. MIGRATION_PLAN.md)
3. Протестируйте приложение
4. Создайте backup JSON файлов

---

## Нужна помощь?

Если проблема не решена:

1. Проверьте логи в консоли при запуске `node migrate-data.js`
2. Проверьте Supabase Dashboard → Logs для ошибок БД
3. Убедитесь, что `.env` файл настроен правильно
4. Убедитесь, что установлены зависимости: `npm install @supabase/supabase-js dotenv`

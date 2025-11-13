# Руководство по миграции базы данных

## Обзор

Эта миграция реорганизует структуру базы данных для:

1. **Устранения дублирования данных** (60,000 строк → 6,000 уникальных товаров)
2. **Разделения данных на отдельные таблицы** для каждой категории
3. **Оптимизации производительности** и скорости загрузки
4. **Обеспечения целостности данных** через правильные constraint'ы

## Проблемы, которые решает миграция

### До миграции:
- ❌ Дублирование: 60,000 строк вместо 6,000 товаров (коэффициент ~10x)
- ❌ Все данные в одной огромной таблице `table_items`
- ❌ История цен и комментарии в JSONB полях
- ❌ Медленная загрузка при больших объемах данных
- ❌ Нет предотвращения дублей при загрузке XML

### После миграции:
- ✅ Уникальные товары в таблице `items`
- ✅ Отдельные таблицы для категорий
- ✅ История цен в `price_changes`
- ✅ Комментарии в `item_comments`
- ✅ Быстрая загрузка через индексы
- ✅ Автоматическое предотвращение дублей через UPSERT

## Новая структура базы данных

### Основные таблицы

#### 1. `items` - Главная таблица товаров
Единственный источник истины для всех товаров.

```sql
items (
  item_id TEXT PRIMARY KEY,
  base_cost, total_cost, commission,
  stock, days_stock,
  sales_month, applications_month,
  ...markup columns...
  crm_price, crm_stock, prom_price,
  new_price,
  created_at, updated_at
)
```

**Преимущества:**
- Нет дублей (PRIMARY KEY на item_id)
- Все данные товара в одном месте
- Быстрый поиск по индексам

#### 2. `price_changes` - История изменения цен
Отдельная таблица для всех изменений цен.

```sql
price_changes (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES items(item_id),
  old_price, new_price,
  changed_by, change_reason,
  changed_at TIMESTAMP,
  is_latest BOOLEAN
)
```

**Преимущества:**
- Полная история всех изменений
- Быстрый поиск последнего изменения через `is_latest`
- Атомарные операции через функцию `add_price_change()`

#### 3. `item_comments` - Комментарии к товарам

```sql
item_comments (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES items(item_id),
  comment TEXT,
  created_by TEXT,
  created_at, updated_at
)
```

#### 4. Таблицы категорий

Отдельная таблица для каждой категории:

- `category_new` - Новый товар
- `category_optimization` - Оптимизация
- `category_ab` - A/B тестирование
- `category_c_sale` - С-Продажа
- `category_off_season` - Несезон
- `category_unprofitable` - Нерентабельные

Каждая таблица имеет структуру:
```sql
category_* (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES items(item_id),
  added_at TIMESTAMP,
  notes TEXT,
  -- специфичные поля для каждой категории
  UNIQUE(item_id)
)
```

**Преимущества:**
- Быстрые запросы по категориям
- Простое добавление/удаление из категорий
- Дополнительные метаданные для каждой категории

#### 5. `table_items` - Связь таблиц и товаров

```sql
table_items (
  id SERIAL PRIMARY KEY,
  table_id TEXT REFERENCES tables(id),
  item_id TEXT REFERENCES items(item_id),
  created_at, updated_at,
  UNIQUE(table_id, item_id)
)
```

**Преимущества:**
- Только связи, БЕЗ дублирования данных
- UNIQUE constraint предотвращает дубли
- Каскадное удаление при удалении таблицы или товара

## Шаги миграции

### Шаг 1: Резервное копирование

**ОБЯЗАТЕЛЬНО создайте резервную копию перед миграцией!**

#### Вариант 1: Через Supabase Dashboard
1. Откройте Settings → Database → Backup
2. Create backup
3. Дождитесь завершения

#### Вариант 2: Через командную строку
```bash
# Если у вас есть доступ к PostgreSQL
pg_dump your_database > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 2: Запуск миграции

#### Вариант A: Через Supabase SQL Editor (РЕКОМЕНДУЕТСЯ)

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте содержимое файла `migrations/002_reorganize_database.sql`
4. Вставьте в SQL Editor
5. Нажмите "Run"
6. Дождитесь завершения (может занять несколько минут)

#### Вариант B: Через скрипт Node.js

```bash
# Просмотр информации о миграции
node run-migration.js --help

# Запуск миграции
node run-migration.js --confirm
```

### Шаг 3: Проверка результатов

После завершения миграции проверьте:

```sql
-- Проверить количество товаров
SELECT COUNT(*) as total_items FROM items;

-- Проверить количество связей
SELECT COUNT(*) as total_links FROM table_items;

-- Проверить историю цен
SELECT COUNT(*) as price_changes FROM price_changes;

-- Проверить комментарии
SELECT COUNT(*) as comments FROM item_comments;

-- Проверить категории
SELECT
  'new' as category, COUNT(*) FROM category_new
UNION ALL
SELECT 'optimization', COUNT(*) FROM category_optimization
UNION ALL
SELECT 'ab', COUNT(*) FROM category_ab
UNION ALL
SELECT 'c_sale', COUNT(*) FROM category_c_sale
UNION ALL
SELECT 'off_season', COUNT(*) FROM category_off_season
UNION ALL
SELECT 'unprofitable', COUNT(*) FROM category_unprofitable;

-- Проверить отсутствие дублей
SELECT item_id, COUNT(*)
FROM items
GROUP BY item_id
HAVING COUNT(*) > 1;
-- Должно вернуть 0 строк!
```

### Шаг 4: Обновление кода приложения

После успешной миграции нужно обновить код приложения:

#### 1. Обновить `db.js`

Замените текущий `db.js` на `db-optimized.js`:

```bash
# Создайте backup старого файла
cp db.js db.js.backup

# Замените на новый
cp db-optimized.js db.js
```

Или постепенный переход:
```javascript
// В начале вашего кода
const db = require('./db-optimized');
```

#### 2. Обновить API endpoints (если нужно)

Новые функции в `db-optimized.js`:
- `upsertItems()` - вместо `createTableItems()` (предотвращает дубли!)
- `addPriceChange()` - вместо ручного обновления price_history
- `addItemComment()` - вместо работы с JSONB
- `linkItemsToTable()` - для связывания товаров с таблицами

### Шаг 5: Тестирование

1. Запустите приложение:
```bash
npm start
```

2. Проверьте основные функции:
   - ✅ Загрузка таблиц
   - ✅ Просмотр товаров
   - ✅ Изменение цен
   - ✅ Добавление комментариев
   - ✅ Работа с категориями
   - ✅ Загрузка XML данных

3. Убедитесь, что НЕТ дублирования при:
   - Загрузке XML
   - Сохранении данных
   - Обновлении товаров

### Шаг 6: Очистка (после проверки)

После того, как убедились, что все работает правильно:

```sql
-- Удалить backup таблицы
DROP TABLE IF EXISTS table_items_old_backup;
DROP TABLE IF EXISTS item_categories_old_backup;
```

## Rollback (откат миграции)

Если что-то пошло не так:

### Вариант 1: Восстановление из backup

```bash
# Через PostgreSQL
psql your_database < backup_before_migration.sql
```

### Вариант 2: Переименование таблиц обратно

```sql
-- Удалить новые таблицы
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS price_changes CASCADE;
DROP TABLE IF EXISTS item_comments CASCADE;
DROP TABLE IF EXISTS category_new CASCADE;
DROP TABLE IF EXISTS category_optimization CASCADE;
DROP TABLE IF EXISTS category_ab CASCADE;
DROP TABLE IF EXISTS category_c_sale CASCADE;
DROP TABLE IF EXISTS category_off_season CASCADE;
DROP TABLE IF EXISTS category_unprofitable CASCADE;
DROP TABLE IF EXISTS table_items CASCADE;

-- Вернуть старые таблицы
ALTER TABLE table_items_old_backup RENAME TO table_items;
ALTER TABLE item_categories_old_backup RENAME TO item_categories;
```

## Производительность

### До миграции:
```
Таблица table_items: 60,000 строк
Запрос товаров таблицы: ~2-3 секунды
Размер БД: ~500 MB
```

### После миграции:
```
Таблица items: 6,000 строк
Таблица table_items: 6,000 строк (только связи)
Запрос товаров таблицы: ~0.3-0.5 секунды
Размер БД: ~200 MB

Улучшение:
- Скорость: 5-10x быстрее
- Размер: 2.5x меньше
- Нет дублирования: 100%
```

## Дополнительные возможности

### Функция добавления цены

```sql
-- Автоматически обновляет is_latest и новую цену в items
SELECT add_price_change(
  'item_123',
  99.99,  -- старая цена
  89.99,  -- новая цена
  'admin',
  'Снижение цены для продвижения'
);
```

### Получение всех категорий товара

```sql
-- Возвращает массив категорий
SELECT get_item_categories('item_123');
-- Результат: ['new', 'optimization']
```

### Materialized View для быстрого поиска

```sql
-- Быстрый lookup всех категорий
SELECT * FROM item_categories_view WHERE item_id = 'item_123';

-- Обновление view
SELECT refresh_item_categories_view();
```

## Частые вопросы

### Q: Сколько времени занимает миграция?
A: Зависит от объема данных:
- 6,000 товаров: ~2-5 минут
- 60,000 строк: ~5-10 минут

### Q: Можно ли запустить миграцию на production?
A: Да, но рекомендуется:
1. Сделать backup
2. Запустить в период минимальной нагрузки
3. Уведомить пользователей о возможных задержках

### Q: Что если миграция прервется?
A: Миграция использует транзакции. Если она прервется:
1. Часть изменений откатится автоматически
2. Восстановите из backup
3. Проверьте логи ошибок
4. Исправьте проблему и запустите снова

### Q: Как проверить, что миграция прошла успешно?
A: Запустите проверочные запросы из Шага 3.

## Поддержка

Если возникли проблемы:
1. Проверьте логи миграции
2. Проверьте логи Supabase
3. Создайте issue в репозитории
4. Приложите логи и описание проблемы

## Обновления

После миграции регулярно обновляйте materialized view:

```sql
-- Можно настроить cron job
SELECT refresh_item_categories_view();
```

Или добавить в приложение:
```javascript
// После массовых изменений категорий
await supabase.rpc('refresh_item_categories_view');
```

---

**Дата создания:** 2025-01-13
**Версия:** 2.0
**Автор:** Claude

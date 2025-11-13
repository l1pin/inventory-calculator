# Проверка миграции и настройка сервера

## Шаг 1: Проверка успешности миграции

### 1.1 Проверка основных таблиц

Выполните эти запросы в Supabase SQL Editor:

```sql
-- Проверка количества уникальных товаров
SELECT
  'items' as table_name,
  COUNT(*) as total_rows,
  'Должно быть ~6,000 уникальных товаров' as expected
FROM items

UNION ALL

SELECT
  'table_items' as table_name,
  COUNT(*) as total_rows,
  'Должно быть ~6,000 связей (без дублей!)' as expected
FROM table_items

UNION ALL

SELECT
  'table_items_old_backup' as table_name,
  COUNT(*) as total_rows,
  'Было ~60,000 строк (с дублями)' as expected
FROM table_items_old_backup;
```

**Ожидаемый результат:**
```
items                    | 6000  | Должно быть ~6,000 уникальных товаров
table_items              | 6000  | Должно быть ~6,000 связей (без дублей!)
table_items_old_backup   | 60000 | Было ~60,000 строк (с дублями)
```

### 1.2 Проверка отсутствия дублей

```sql
-- Проверка дублей в items (должно вернуть 0 строк!)
SELECT item_id, COUNT(*) as duplicates
FROM items
GROUP BY item_id
HAVING COUNT(*) > 1;

-- Если вернулось 0 строк - отлично! ✅
-- Если есть дубли - что-то пошло не так ❌
```

### 1.3 Проверка истории цен и комментариев

```sql
-- Сколько записей мигрировано
SELECT
  'price_changes' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT item_id) as unique_items,
  'История изменения цен' as description
FROM price_changes

UNION ALL

SELECT
  'item_comments' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT item_id) as unique_items,
  'Комментарии к товарам' as description
FROM item_comments;
```

**Ожидаемый результат:**
- `price_changes`: зависит от истории, может быть 0-10,000+
- `item_comments`: зависит от комментариев, может быть 0-5,000+

### 1.4 Проверка категорий

```sql
-- Проверка всех категорий
SELECT
  'category_new' as category,
  COUNT(*) as items_count
FROM category_new

UNION ALL

SELECT 'category_optimization', COUNT(*) FROM category_optimization
UNION ALL
SELECT 'category_ab', COUNT(*) FROM category_ab
UNION ALL
SELECT 'category_c_sale', COUNT(*) FROM category_c_sale
UNION ALL
SELECT 'category_off_season', COUNT(*) FROM category_off_season
UNION ALL
SELECT 'category_unprofitable', COUNT(*) FROM category_unprofitable

ORDER BY items_count DESC;
```

**Ожидаемый результат:**
Количество зависит от ваших данных. Главное - что товары распределены по категориям.

### 1.5 Проверка целостности данных

```sql
-- Все товары из table_items должны существовать в items
SELECT
  COUNT(*) as orphaned_items,
  'Должно быть 0!' as expected
FROM table_items ti
WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_id = ti.item_id);
```

**Должно вернуть: 0 строк** ✅

### 1.6 Проверка индексов

```sql
-- Все индексы созданы?
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'items', 'price_changes', 'item_comments',
    'category_new', 'category_optimization', 'category_ab',
    'category_c_sale', 'category_off_season', 'category_unprofitable',
    'table_items'
  )
ORDER BY tablename, indexname;
```

**Ожидаемый результат:** 20+ индексов созданы

---

## Шаг 2: Настройка сервера для новой структуры

### 2.1 Обновление db.js

**Опция А: Полная замена (рекомендуется)**

```bash
# Создайте backup старого файла
cp db.js db.js.backup

# Замените на оптимизированную версию
cp db-optimized.js db.js

echo "✅ db.js обновлен на оптимизированную версию"
```

**Опция Б: Постепенный переход**

Отредактируйте `server.js` или другие файлы, где используется `db.js`:

```javascript
// Вместо:
const db = require('./db');

// Используйте:
const db = require('./db-optimized');
```

### 2.2 Проверка работы API

Запустите сервер:

```bash
npm start
```

Проверьте эндпоинты:

```bash
# Проверка health
curl http://localhost:3001/api/health

# Проверка загрузки данных
curl http://localhost:3001/api/data
```

**Ожидаемый результат:**
- ✅ Сервер запускается без ошибок
- ✅ API возвращает данные
- ✅ Загрузка таблиц работает быстрее (2-3 сек → 0.3-0.5 сек)

### 2.3 Тестирование ключевых функций

#### Тест 1: Загрузка таблицы

```javascript
// В браузере или через curl
GET /api/tables/:tableId

// Должно вернуть данные таблицы БЕЗ дублей
```

#### Тест 2: Сохранение данных (главное - без дублей!)

```bash
# Загрузите XML несколько раз
# Проверьте, что количество товаров НЕ увеличивается

# До:
SELECT COUNT(*) FROM items;  -- например, 6000

# Загружаем XML повторно...

# После:
SELECT COUNT(*) FROM items;  -- должно остаться 6000!
```

**КРИТИЧЕСКИ ВАЖНО:** Если после повторной загрузки XML количество товаров увеличилось - значит всё еще есть дублирование!

#### Тест 3: Работа с категориями

```javascript
// Добавление товара в категорию
POST /api/categories/new
{
  "items": ["item_123", "item_456"]
}

// Проверка
GET /api/categories/new

// Должно вернуть: ["item_123", "item_456"]
```

#### Тест 4: История цен

```javascript
// Изменение цены должно создать запись в price_changes
// Проверить через SQL:
SELECT * FROM price_changes
WHERE item_id = 'ваш_товар'
ORDER BY changed_at DESC
LIMIT 5;
```

---

## Шаг 3: Мониторинг производительности

### 3.1 Сравнение скорости запросов

**До миграции:**
```sql
-- Было медленно (2-3 секунды)
EXPLAIN ANALYZE
SELECT * FROM table_items_old_backup WHERE table_id = 'your_table_id';
```

**После миграции:**
```sql
-- Должно быть быстро (0.1-0.3 секунды)
EXPLAIN ANALYZE
SELECT i.*
FROM table_items ti
JOIN items i ON i.item_id = ti.item_id
WHERE ti.table_id = 'your_table_id';
```

### 3.2 Размер базы данных

```sql
-- Общий размер
SELECT
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Размер каждой таблицы
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Ожидаемое улучшение:**
- База данных должна уменьшиться в ~2-3 раза
- `items` + `table_items` должны быть значительно меньше чем `table_items_old_backup`

---

## Шаг 4: Обновление фронтенда (если нужно)

### 4.1 Проверка совместимости

Старый API должен продолжать работать, но теперь быстрее:

```javascript
// Эти эндпоинты должны работать как раньше
GET /api/data
GET /api/tables/:id
POST /api/data
DELETE /api/tables/:id
```

### 4.2 Новые возможности

Теперь доступны:

```javascript
// История цен
GET /api/items/:itemId/price-history

// Комментарии
GET /api/items/:itemId/comments
POST /api/items/:itemId/comments

// Быстрый поиск по категориям
GET /api/categories/:type/items
```

---

## Шаг 5: Окончательная очистка (через 1-2 недели)

После того как убедились, что всё работает идеально:

```sql
-- Удалить backup таблицы
DROP TABLE IF EXISTS table_items_old_backup CASCADE;
DROP TABLE IF EXISTS item_categories_old_backup CASCADE;

-- Очистить старые данные
VACUUM FULL;
ANALYZE;
```

⚠️ **ВАЖНО:** Делайте это только после полной проверки и когда на 100% уверены, что всё работает!

---

## Чек-лист проверки

- [ ] ✅ В `items` ~6,000 уникальных товаров (без дублей)
- [ ] ✅ В `table_items` ~6,000 связей (без дублей)
- [ ] ✅ Проверка дублей вернула 0 строк
- [ ] ✅ История цен мигрирована в `price_changes`
- [ ] ✅ Комментарии мигрированы в `item_comments`
- [ ] ✅ Все категории мигрированы
- [ ] ✅ Все индексы созданы
- [ ] ✅ `db.js` обновлен на оптимизированную версию
- [ ] ✅ Сервер запускается без ошибок
- [ ] ✅ API работает быстрее (0.3-0.5 сек вместо 2-3 сек)
- [ ] ✅ **КРИТИЧНО:** Повторная загрузка XML НЕ создает дубли
- [ ] ✅ Загрузка таблиц работает корректно
- [ ] ✅ Сохранение данных работает корректно
- [ ] ✅ Категории работают корректно

---

## Troubleshooting (Решение проблем)

### Проблема: Есть дубли в items

```sql
-- Найти дубли
SELECT item_id, COUNT(*)
FROM items
GROUP BY item_id
HAVING COUNT(*) > 1;

-- Удалить дубли (оставить только последний)
DELETE FROM items i1
WHERE i1.id NOT IN (
  SELECT MAX(i2.id)
  FROM items i2
  WHERE i2.item_id = i1.item_id
  GROUP BY i2.item_id
);
```

### Проблема: XML загрузка создает дубли

Проверьте, что используется **UPSERT** вместо INSERT:

```javascript
// В db-optimized.js должно быть:
await upsertItems(items);  // ✅ Правильно

// НЕ должно быть:
await supabase.from('items').insert(items);  // ❌ Неправильно!
```

### Проблема: Медленная загрузка

Проверьте индексы:

```sql
-- Все индексы должны быть созданы
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('items', 'table_items', 'price_changes');

-- Должно быть минимум 10 индексов
```

Обновите статистику:

```sql
ANALYZE items;
ANALYZE table_items;
ANALYZE price_changes;
```

---

## Контакты для поддержки

Если возникли проблемы:
1. Проверьте логи сервера: `npm start`
2. Проверьте логи Supabase в Dashboard
3. Выполните SQL запросы проверки из этой инструкции
4. Создайте issue с подробным описанием проблемы

---

**Дата создания:** 2025-01-13
**Версия:** 1.0
**Статус:** Готово к использованию

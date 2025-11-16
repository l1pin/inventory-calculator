-- ============================================================================
-- ИСПРАВЛЕНИЕ ТОЛЬКО table_items (БЕЗ КАТЕГОРИЙ)
-- ============================================================================
-- Этот скрипт удаляет дубли из table_items
-- Запустите в Supabase SQL Editor
-- ============================================================================

-- ШАГ 1: Удаляем старую table_items
DROP TABLE IF EXISTS table_items CASCADE;

-- ШАГ 2: Создаем новую table_items с UNIQUE constraint
CREATE TABLE table_items (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, item_id)  -- Это предотвращает дубли!
);

-- ШАГ 3: Создаем индексы
CREATE INDEX idx_table_items_table_id ON table_items(table_id);
CREATE INDEX idx_table_items_item_id ON table_items(item_id);
CREATE INDEX idx_table_items_created_at ON table_items(created_at);

-- ШАГ 4: Заполняем БЕЗ ДУБЛЕЙ из старого backup
INSERT INTO table_items (table_id, item_id, created_at, updated_at)
SELECT DISTINCT ON (table_id, item_id)
  table_id,
  item_id,
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW())
FROM table_items_old_backup
WHERE item_id IS NOT NULL
  AND table_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = table_items_old_backup.item_id)
  AND EXISTS (SELECT 1 FROM tables t WHERE t.id = table_items_old_backup.table_id)
ORDER BY table_id, item_id, updated_at DESC NULLS LAST
ON CONFLICT (table_id, item_id) DO NOTHING;

-- ШАГ 5: Создаем триггер для updated_at
DROP TRIGGER IF EXISTS update_table_items_updated_at ON table_items;
CREATE TRIGGER update_table_items_updated_at
  BEFORE UPDATE ON table_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ШАГ 6: Обновляем materialized view (если есть)
REFRESH MATERIALIZED VIEW CONCURRENTLY item_categories_view;

-- ============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================================

-- Проверка 1: Количество строк
SELECT
  'items' as table_name,
  COUNT(*) as count
FROM items
UNION ALL
SELECT 'table_items', COUNT(*) FROM table_items
UNION ALL
SELECT 'table_items_old_backup', COUNT(*) FROM table_items_old_backup;

-- Проверка 2: Коэффициент дублирования
SELECT
  (SELECT COUNT(*) FROM items) as items_count,
  (SELECT COUNT(*) FROM table_items) as table_items_count,
  ROUND(
    (SELECT COUNT(*)::NUMERIC FROM table_items) /
    NULLIF((SELECT COUNT(*)::NUMERIC FROM items), 0),
    2
  ) as duplication_ratio,
  CASE
    WHEN ROUND((SELECT COUNT(*)::NUMERIC FROM table_items) / NULLIF((SELECT COUNT(*)::NUMERIC FROM items), 0), 2) <= 1.2
      THEN '✅ ОТЛИЧНО! Дублей нет!'
    ELSE '❌ Все еще есть дубли'
  END as status;

-- Проверка 3: Проверка на дубли
SELECT
  table_id,
  item_id,
  COUNT(*) as duplicates
FROM table_items
GROUP BY table_id, item_id
HAVING COUNT(*) > 1;

-- Если последний запрос вернул 0 строк - ВСЕ ОТЛИЧНО! Дублей нет!

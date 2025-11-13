-- Диагностика проблемы с миграцией
-- Проверяем какие таблицы существуют

SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('table_items', 'table_items_new', 'table_items_old_backup', 'item_categories', 'item_categories_old_backup')
ORDER BY tablename;

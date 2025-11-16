-- ============================================================================
-- ДИАГНОСТИКА: Проверка исходных данных для миграции
-- ============================================================================

-- Проверяем какие таблицы существуют
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '        ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

SELECT
  tablename,
  CASE
    WHEN tablename = 'item_categories' THEN '✅ Основная таблица категорий'
    WHEN tablename = 'item_categories_old_backup' THEN '✅ Backup таблица категорий'
    WHEN tablename = 'table_items_old_backup' THEN '✅ Backup table_items'
    ELSE '📋 Другая таблица'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('item_categories', 'item_categories_old_backup', 'table_items_old_backup')
ORDER BY tablename;

-- ============================================================================
-- Проверяем количество записей в item_categories
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  total_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '     ПРОВЕРКА ДАННЫХ В item_categories';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  -- Проверяем существование таблицы
  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'item_categories' AND schemaname = 'public'
  ) INTO table_exists;

  IF table_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM item_categories' INTO total_count;
    RAISE NOTICE 'Всего записей в item_categories: %', total_count;
  ELSE
    RAISE WARNING '❌ Таблица item_categories не существует!';
  END IF;
END $$;

-- Проверяем детальную статистику по категориям
SELECT
  category_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT item_id) as unique_items,
  CASE
    WHEN category_type = 'new' THEN 'Должно быть ~68'
    WHEN category_type = 'optimization' THEN 'Должно быть ~43'
    WHEN category_type = 'ab' THEN 'Должно быть ~3'
    WHEN category_type = 'c_sale' THEN 'Должно быть ~46'
    WHEN category_type = 'off_season' THEN 'Должно быть ~42'
    WHEN category_type = 'unprofitable' THEN 'Должно быть ~13'
    ELSE 'Неизвестная категория'
  END as expected
FROM item_categories
GROUP BY category_type
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- Проверяем сколько item_id из item_categories есть в items
-- ============================================================================

DO $$
DECLARE
  items_in_both INTEGER;
  items_only_in_categories INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '     ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  -- Считаем сколько item_id из categories есть в items
  SELECT COUNT(DISTINCT ic.item_id) INTO items_in_both
  FROM item_categories ic
  WHERE EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id);

  -- Считаем сколько item_id из categories НЕТ в items
  SELECT COUNT(DISTINCT ic.item_id) INTO items_only_in_categories
  FROM item_categories ic
  WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id);

  RAISE NOTICE 'item_id из categories, которые ЕСТЬ в items: %', items_in_both;
  RAISE NOTICE 'item_id из categories, которых НЕТ в items: %', items_only_in_categories;

  IF items_only_in_categories > 0 THEN
    RAISE WARNING '❌ % товаров из категорий отсутствуют в items!', items_only_in_categories;
    RAISE WARNING 'Это может быть причиной малого количества мигрированных категорий';
  END IF;
END $$;

-- Показываем примеры item_id, которых нет в items
SELECT
  ic.item_id,
  ic.category_type,
  'Этот item_id есть в categories, но отсутствует в items!' as warning
FROM item_categories ic
WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
LIMIT 10;

-- ============================================================================
-- Проверяем структуру items
-- ============================================================================

DO $$
DECLARE
  items_count INTEGER;
  items_with_nulls INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '          ПРОВЕРКА ТАБЛИЦЫ items';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO items_with_nulls FROM items WHERE item_id IS NULL;

  RAISE NOTICE 'Всего товаров в items: %', items_count;
  RAISE NOTICE 'Товаров с NULL item_id: %', items_with_nulls;
END $$;

-- Проверяем дубли в items
SELECT
  item_id,
  COUNT(*) as duplicates
FROM items
GROUP BY item_id
HAVING COUNT(*) > 1
LIMIT 10;

-- ============================================================================
-- Проверяем что есть в table_items_old_backup
-- ============================================================================

DO $$
DECLARE
  backup_exists BOOLEAN;
  backup_count INTEGER;
  unique_items INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '     ПРОВЕРКА table_items_old_backup';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'table_items_old_backup' AND schemaname = 'public'
  ) INTO backup_exists;

  IF backup_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM table_items_old_backup' INTO backup_count;
    EXECUTE 'SELECT COUNT(DISTINCT item_id) FROM table_items_old_backup' INTO unique_items;

    RAISE NOTICE 'Всего записей в backup: %', backup_count;
    RAISE NOTICE 'Уникальных item_id: %', unique_items;
    RAISE NOTICE 'Коэффициент дублирования: %', ROUND(backup_count::NUMERIC / NULLIF(unique_items, 0), 2);
  ELSE
    RAISE WARNING '❌ Таблица table_items_old_backup не существует!';
  END IF;
END $$;

-- ============================================================================
-- ИТОГИ И РЕКОМЕНДАЦИИ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '              ИТОГИ ДИАГНОСТИКИ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'После просмотра результатов выше:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Если item_categories существует - значит источник данных есть';
  RAISE NOTICE '2. Если много item_id отсутствуют в items - нужно сначала';
  RAISE NOTICE '   мигрировать items из table_items_old_backup';
  RAISE NOTICE '3. Затем запустить fix-migration-radical.sql';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

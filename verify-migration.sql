-- ============================================================================
-- ПРОВЕРКА УСПЕШНОСТИ МИГРАЦИИ
-- ============================================================================
-- Скопируйте и выполните эти запросы в Supabase SQL Editor
-- для проверки что миграция прошла успешно

-- ============================================================================
-- ПРОВЕРКА 1: Количество строк (ГЛАВНОЕ!)
-- ============================================================================

SELECT
  'items' as table_name,
  COUNT(*) as total_rows,
  'Уникальные товары' as description
FROM items

UNION ALL

SELECT
  'table_items',
  COUNT(*),
  'Связи таблиц с товарами (должно быть ≈ как в items!)'
FROM table_items

UNION ALL

SELECT
  'table_items_old_backup' as table_name,
  COUNT(*) as total_rows,
  'Старая таблица с дублями (для сравнения)'
FROM table_items_old_backup;

-- ✅ УСПЕХ если:
-- - items: ~5,492
-- - table_items: ~5,492 (почти 1:1, без дублей!)
-- - table_items_old_backup: ~62,959 (старые данные с дублями)

-- ❌ ПРОБЛЕМА если:
-- - table_items намного больше чем items (значит есть дубли!)

-- ============================================================================
-- ПРОВЕРКА 2: Коэффициент дублирования
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM items) as items_count,
  (SELECT COUNT(*) FROM table_items) as table_items_count,
  ROUND(
    (SELECT COUNT(*)::NUMERIC FROM table_items) /
    NULLIF((SELECT COUNT(*)::NUMERIC FROM items), 0),
    2
  ) as duplication_ratio,
  CASE
    WHEN ROUND((SELECT COUNT(*)::NUMERIC FROM table_items) / NULLIF((SELECT COUNT(*)::NUMERIC FROM items), 0), 2) > 1.5
      THEN '❌ ЕСТЬ ДУБЛИ! Запустите fix-migration-radical.sql'
    WHEN ROUND((SELECT COUNT(*)::NUMERIC FROM table_items) / NULLIF((SELECT COUNT(*)::NUMERIC FROM items), 0), 2) BETWEEN 0.8 AND 1.2
      THEN '✅ Отлично! Дублей нет!'
    ELSE '⚠️ Проверьте данные'
  END as status;

-- ✅ УСПЕХ если: duplication_ratio = 1.00 (или 0.8-1.2)
-- ❌ ПРОБЛЕМА если: duplication_ratio > 1.5

-- ============================================================================
-- ПРОВЕРКА 3: Отсутствие дублей в items
-- ============================================================================

SELECT
  item_id,
  COUNT(*) as duplicates,
  '❌ ДУБЛЬ НАЙДЕН!' as warning
FROM items
GROUP BY item_id
HAVING COUNT(*) > 1;

-- ✅ УСПЕХ если: вернулось 0 строк
-- ❌ ПРОБЛЕМА если: есть строки (значит есть дубли в items)

-- ============================================================================
-- ПРОВЕРКА 4: Отсутствие дублей в table_items
-- ============================================================================

SELECT
  table_id,
  item_id,
  COUNT(*) as duplicates,
  '❌ ДУБЛЬ НАЙДЕН!' as warning
FROM table_items
GROUP BY table_id, item_id
HAVING COUNT(*) > 1;

-- ✅ УСПЕХ если: вернулось 0 строк
-- ❌ ПРОБЛЕМА если: есть строки (значит UNIQUE constraint не работает)

-- ============================================================================
-- ПРОВЕРКА 5: Категории (правильное количество)
-- ============================================================================

SELECT
  'category_new' as category,
  COUNT(*) as items_count,
  'Должно быть ~68' as expected
FROM category_new

UNION ALL

SELECT 'category_optimization', COUNT(*), 'Должно быть ~43' FROM category_optimization
UNION ALL
SELECT 'category_ab', COUNT(*), 'Должно быть ~3' FROM category_ab
UNION ALL
SELECT 'category_c_sale', COUNT(*), 'Должно быть ~46' FROM category_c_sale
UNION ALL
SELECT 'category_off_season', COUNT(*), 'Должно быть ~42' FROM category_off_season
UNION ALL
SELECT 'category_unprofitable', COUNT(*), 'Должно быть ~13' FROM category_unprofitable

ORDER BY items_count DESC;

-- ✅ УСПЕХ если:
-- - new: 68
-- - optimization: 43
-- - c_sale: 46
-- - off_season: 42
-- - unprofitable: 13
-- - ab: 3

-- ❌ ПРОБЛЕМА если: количество намного меньше ожидаемого

-- ============================================================================
-- ПРОВЕРКА 6: Целостность данных (orphaned records)
-- ============================================================================

-- Проверяем что все связи указывают на существующие товары
SELECT
  COUNT(*) as orphaned_items,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Все связи корректны'
    ELSE '❌ Найдены orphaned records!'
  END as status
FROM table_items ti
WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_id = ti.item_id);

-- ✅ УСПЕХ если: orphaned_items = 0
-- ❌ ПРОБЛЕМА если: orphaned_items > 0

-- ============================================================================
-- ПРОВЕРКА 7: История цен и комментарии
-- ============================================================================

SELECT
  'price_changes' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT item_id) as unique_items,
  'История изменения цен' as description
FROM price_changes

UNION ALL

SELECT
  'item_comments',
  COUNT(*),
  COUNT(DISTINCT item_id),
  'Комментарии к товарам'
FROM item_comments;

-- Количество зависит от ваших данных, главное что таблицы не пустые

-- ============================================================================
-- ПРОВЕРКА 8: Индексы созданы
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  '✅ Создан' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'items', 'table_items', 'price_changes', 'item_comments',
    'category_new', 'category_optimization', 'category_ab',
    'category_c_sale', 'category_off_season', 'category_unprofitable'
  )
ORDER BY tablename, indexname;

-- ✅ УСПЕХ если: возвращается 20+ индексов

-- ============================================================================
-- ИТОГОВАЯ ПРОВЕРКА: Все в одном запросе
-- ============================================================================

DO $$
DECLARE
  items_count INTEGER;
  table_items_count INTEGER;
  ratio NUMERIC;
  duplicates_in_items INTEGER;
  duplicates_in_table_items INTEGER;
  orphaned_count INTEGER;
  cat_new INTEGER;
  cat_opt INTEGER;
  cat_ab INTEGER;
  cat_cs INTEGER;
  cat_os INTEGER;
  cat_unp INTEGER;
  all_good BOOLEAN := TRUE;
BEGIN
  -- Считаем
  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO table_items_count FROM table_items;
  ratio := table_items_count::NUMERIC / NULLIF(items_count::NUMERIC, 0);

  SELECT COUNT(*) INTO duplicates_in_items FROM (
    SELECT item_id FROM items GROUP BY item_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO duplicates_in_table_items FROM (
    SELECT table_id, item_id FROM table_items GROUP BY table_id, item_id HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO orphaned_count FROM table_items ti
  WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.item_id = ti.item_id);

  SELECT COUNT(*) INTO cat_new FROM category_new;
  SELECT COUNT(*) INTO cat_opt FROM category_optimization;
  SELECT COUNT(*) INTO cat_ab FROM category_ab;
  SELECT COUNT(*) INTO cat_cs FROM category_c_sale;
  SELECT COUNT(*) INTO cat_os FROM category_off_season;
  SELECT COUNT(*) INTO cat_unp FROM category_unprofitable;

  -- Выводим результат
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '           ИТОГОВАЯ ПРОВЕРКА МИГРАЦИИ';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '1. Количество товаров:';
  RAISE NOTICE '   - items: %', items_count;
  RAISE NOTICE '   - table_items: %', table_items_count;
  RAISE NOTICE '   - Коэффициент: %', ROUND(ratio, 2);

  IF ratio > 1.5 THEN
    RAISE NOTICE '   ❌ ПРОБЛЕМА: Есть дубли в table_items!';
    all_good := FALSE;
  ELSIF ratio BETWEEN 0.8 AND 1.2 THEN
    RAISE NOTICE '   ✅ OK: Дублей нет';
  ELSE
    RAISE NOTICE '   ⚠️  ВНИМАНИЕ: Проверьте соотношение';
    all_good := FALSE;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '2. Дубликаты:';
  RAISE NOTICE '   - в items: %', duplicates_in_items;
  RAISE NOTICE '   - в table_items: %', duplicates_in_table_items;

  IF duplicates_in_items > 0 OR duplicates_in_table_items > 0 THEN
    RAISE NOTICE '   ❌ ПРОБЛЕМА: Найдены дубликаты!';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '   ✅ OK: Дубликатов нет';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '3. Целостность данных:';
  RAISE NOTICE '   - Orphaned records: %', orphaned_count;

  IF orphaned_count > 0 THEN
    RAISE NOTICE '   ❌ ПРОБЛЕМА: Найдены orphaned records!';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '   ✅ OK: Все связи корректны';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '4. Категории:';
  RAISE NOTICE '   - new: % (ожидается ~68)', cat_new;
  RAISE NOTICE '   - optimization: % (ожидается ~43)', cat_opt;
  RAISE NOTICE '   - ab: % (ожидается ~3)', cat_ab;
  RAISE NOTICE '   - c_sale: % (ожидается ~46)', cat_cs;
  RAISE NOTICE '   - off_season: % (ожидается ~42)', cat_os;
  RAISE NOTICE '   - unprofitable: % (ожидается ~13)', cat_unp;

  IF cat_new < 60 OR cat_opt < 40 OR cat_cs < 40 OR cat_os < 40 THEN
    RAISE NOTICE '   ⚠️  ВНИМАНИЕ: Некоторые категории имеют меньше товаров чем ожидалось';
    all_good := FALSE;
  ELSE
    RAISE NOTICE '   ✅ OK: Категории мигрированы корректно';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  IF all_good THEN
    RAISE NOTICE '         ✅ ✅ ✅ МИГРАЦИЯ УСПЕШНА! ✅ ✅ ✅';
  ELSE
    RAISE NOTICE '         ❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ!';
    RAISE NOTICE '         Запустите fix-migration-radical.sql';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Если нашли проблемы - запустите исправление
-- ============================================================================

-- Скопируйте и выполните файл: fix-migration-radical.sql

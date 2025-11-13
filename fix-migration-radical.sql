-- ============================================================================
-- РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ МИГРАЦИИ
-- ============================================================================
-- Этот скрипт полностью пересоздает table_items и категории
-- БЕЗ использования старых данных с дублями

-- ============================================================================
-- ШАГ 1: Полная очистка
-- ============================================================================

DO $$
BEGIN
  -- Удаляем все связанные таблицы и индексы
  DROP TABLE IF EXISTS table_items CASCADE;
  DROP TABLE IF EXISTS table_items_new CASCADE;

  RAISE NOTICE '✅ Старые table_items удалены';
END $$;

-- ============================================================================
-- ШАГ 2: Создаем правильную table_items
-- ============================================================================

CREATE TABLE table_items (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, item_id)
);

CREATE INDEX idx_table_items_table_id ON table_items(table_id);
CREATE INDEX idx_table_items_item_id ON table_items(item_id);

DO $$
BEGIN
  RAISE NOTICE '✅ Создана новая table_items';
END $$;

-- ============================================================================
-- ШАГ 3: Заполняем table_items из старого backup
-- ============================================================================

-- Берем DISTINCT связи из backup
-- Используем DISTINCT ON для устранения дублей
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

-- Проверяем результат
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inserted_count FROM table_items;
  RAISE NOTICE '✅ Добавлено % связей (без дублей!)', inserted_count;
END $$;

-- ============================================================================
-- ШАГ 4: Очищаем и перезаполняем категории
-- ============================================================================

DO $$
BEGIN
  -- Очищаем все категории
  TRUNCATE TABLE category_new CASCADE;
  TRUNCATE TABLE category_optimization CASCADE;
  TRUNCATE TABLE category_ab CASCADE;
  TRUNCATE TABLE category_c_sale CASCADE;
  TRUNCATE TABLE category_off_season CASCADE;
  TRUNCATE TABLE category_unprofitable CASCADE;

  RAISE NOTICE '✅ Категории очищены';
END $$;

-- Ищем исходную таблицу категорий
DO $$
DECLARE
  source_table TEXT;
  new_count INTEGER;
  opt_count INTEGER;
  ab_count INTEGER;
  cs_count INTEGER;
  os_count INTEGER;
  unp_count INTEGER;
BEGIN
  -- Ищем таблицу с категориями
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'item_categories_old_backup' AND schemaname = 'public') THEN
    source_table := 'item_categories_old_backup';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'item_categories' AND schemaname = 'public') THEN
    source_table := 'item_categories';
  ELSE
    RAISE WARNING '⚠️ Не найдена таблица item_categories для миграции';
    RETURN;
  END IF;

  RAISE NOTICE 'Мигрируем категории из %...', source_table;

  -- Мигрируем каждую категорию
  EXECUTE format('
    INSERT INTO category_new (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''new''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO new_count FROM category_new;

  EXECUTE format('
    INSERT INTO category_optimization (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''optimization''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO opt_count FROM category_optimization;

  EXECUTE format('
    INSERT INTO category_ab (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''ab''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO ab_count FROM category_ab;

  EXECUTE format('
    INSERT INTO category_c_sale (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''c_sale''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO cs_count FROM category_c_sale;

  EXECUTE format('
    INSERT INTO category_off_season (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''off_season''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO os_count FROM category_off_season;

  EXECUTE format('
    INSERT INTO category_unprofitable (item_id, added_at)
    SELECT DISTINCT ic.item_id, COALESCE(ic.created_at, NOW())
    FROM %I ic
    WHERE ic.category_type = ''unprofitable''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);
  SELECT COUNT(*) INTO unp_count FROM category_unprofitable;

  RAISE NOTICE '✅ Категории мигрированы:';
  RAISE NOTICE '  - new: %', new_count;
  RAISE NOTICE '  - optimization: %', opt_count;
  RAISE NOTICE '  - ab: %', ab_count;
  RAISE NOTICE '  - c_sale: %', cs_count;
  RAISE NOTICE '  - off_season: %', os_count;
  RAISE NOTICE '  - unprofitable: %', unp_count;
END $$;

-- ============================================================================
-- ШАГ 5: Обновляем триггеры
-- ============================================================================

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_table_items_updated_at ON table_items;

  RAISE NOTICE '✅ Создаем триггер для table_items';
END $$;

CREATE TRIGGER update_table_items_updated_at BEFORE UPDATE ON table_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ШАГ 6: Обновляем materialized view
-- ============================================================================

DO $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY item_categories_view;

  RAISE NOTICE '✅ Materialized view обновлен';
END $$;

-- ============================================================================
-- ШАГ 7: Финальная проверка и статистика
-- ============================================================================

DO $$
DECLARE
  items_count INTEGER;
  table_items_count INTEGER;
  tables_count INTEGER;
  ratio NUMERIC;
BEGIN
  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO table_items_count FROM table_items;
  SELECT COUNT(*) INTO tables_count FROM tables;

  IF items_count > 0 THEN
    ratio := table_items_count::NUMERIC / items_count::NUMERIC;
  ELSE
    ratio := 0;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '         РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ МИГРАЦИИ';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Товаров в items: %', items_count;
  RAISE NOTICE 'Связей в table_items: %', table_items_count;
  RAISE NOTICE 'Таблиц в tables: %', tables_count;
  RAISE NOTICE 'Коэффициент дублирования: %', ROUND(ratio, 2);
  RAISE NOTICE '';

  IF ratio > 1.5 THEN
    RAISE WARNING '❌ В table_items все еще есть дубли!';
    RAISE WARNING 'Попробуйте запустить скрипт еще раз';
  ELSIF ratio >= 0.8 AND ratio <= 1.2 THEN
    RAISE NOTICE '✅ ✅ ✅ ОТЛИЧНО! Дублей нет! ✅ ✅ ✅';
  ELSE
    RAISE NOTICE '⚠️ Коэффициент %.2f - проверьте данные', ratio;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Категории:';
  RAISE NOTICE '  - new: %', (SELECT COUNT(*) FROM category_new);
  RAISE NOTICE '  - optimization: %', (SELECT COUNT(*) FROM category_optimization);
  RAISE NOTICE '  - ab: %', (SELECT COUNT(*) FROM category_ab);
  RAISE NOTICE '  - c_sale: %', (SELECT COUNT(*) FROM category_c_sale);
  RAISE NOTICE '  - off_season: %', (SELECT COUNT(*) FROM category_off_season);
  RAISE NOTICE '  - unprofitable: %', (SELECT COUNT(*) FROM category_unprofitable);
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

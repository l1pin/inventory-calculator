-- ============================================================================
-- ИСПРАВЛЕНИЕ МИГРАЦИИ
-- ============================================================================
-- Эта миграция исправляет проблему, когда table_items не была переименована
-- и все еще содержит старые данные с дублями

-- ШАГИ:
-- 1. Проверяем существование таблиц
-- 2. Если table_items_new существует - используем её
-- 3. Если нет - создаем связи заново из items
-- 4. Исправляем категории

-- ============================================================================
-- Шаг 1: Проверка и очистка
-- ============================================================================

-- Если table_items содержит старые данные (много строк), переименовываем её
DO $$
DECLARE
  table_items_count INTEGER;
  items_count INTEGER;
BEGIN
  -- Считаем записи
  SELECT COUNT(*) INTO table_items_count FROM table_items;
  SELECT COUNT(*) INTO items_count FROM items;

  RAISE NOTICE 'table_items имеет % строк', table_items_count;
  RAISE NOTICE 'items имеет % строк', items_count;

  -- Если table_items имеет намного больше строк чем items - это старая таблица с дублями
  IF table_items_count > items_count * 1.5 THEN
    RAISE NOTICE 'ОБНАРУЖЕНО: table_items содержит дубли! Переименовываем в backup...';

    -- Удаляем старый backup если существует
    DROP TABLE IF EXISTS table_items_old_backup_2 CASCADE;

    -- Переименовываем текущую table_items (с дублями)
    ALTER TABLE table_items RENAME TO table_items_old_backup_2;

    RAISE NOTICE '✅ Старая table_items переименована в table_items_old_backup_2';
  ELSE
    RAISE NOTICE '✅ table_items уже содержит правильные данные';
  END IF;
END $$;

-- ============================================================================
-- Шаг 2: Создаем правильную table_items
-- ============================================================================

-- Проверяем, существует ли table_items_new
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'table_items_new' AND schemaname = 'public') THEN
    RAISE NOTICE 'Найдена table_items_new, переименовываем в table_items...';
    ALTER TABLE table_items_new RENAME TO table_items;

    -- Переименовываем индексы
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_table_items_new_table_id' AND schemaname = 'public') THEN
      ALTER INDEX idx_table_items_new_table_id RENAME TO idx_table_items_table_id;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_table_items_new_item_id' AND schemaname = 'public') THEN
      ALTER INDEX idx_table_items_new_item_id RENAME TO idx_table_items_item_id;
    END IF;

    RAISE NOTICE '✅ table_items_new переименована в table_items';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'table_items' AND schemaname = 'public') THEN
    -- table_items не существует - создаем заново
    RAISE NOTICE 'table_items не существует, создаем заново...';

    CREATE TABLE table_items (
      id SERIAL PRIMARY KEY,
      table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(table_id, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_table_items_table_id ON table_items(table_id);
    CREATE INDEX IF NOT EXISTS idx_table_items_item_id ON table_items(item_id);

    RAISE NOTICE '✅ table_items создана';
  END IF;
END $$;

-- ============================================================================
-- Шаг 3: Заполняем table_items из старых данных (если пустая)
-- ============================================================================

DO $$
DECLARE
  table_items_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_items_count FROM table_items;

  IF table_items_count = 0 THEN
    RAISE NOTICE 'table_items пустая, заполняем из backup...';

    -- Берем данные из backup (или из items)
    -- Используем DISTINCT ON для устранения дублей
    INSERT INTO table_items (table_id, item_id, created_at, updated_at)
    SELECT DISTINCT ON (table_id, item_id)
      table_id, item_id, created_at, updated_at
    FROM table_items_old_backup_2
    WHERE item_id IS NOT NULL
      AND table_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = table_items_old_backup_2.item_id)
    ORDER BY table_id, item_id, updated_at DESC
    ON CONFLICT (table_id, item_id) DO NOTHING;

    SELECT COUNT(*) INTO table_items_count FROM table_items;
    RAISE NOTICE '✅ Добавлено % связей в table_items', table_items_count;
  ELSE
    RAISE NOTICE 'table_items уже содержит % строк', table_items_count;
  END IF;
END $$;

-- ============================================================================
-- Шаг 4: Исправляем категории
-- ============================================================================

-- Проверяем, есть ли item_categories (старая таблица или backup)
DO $$
DECLARE
  source_table TEXT;
BEGIN
  -- Ищем исходную таблицу
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'item_categories_old_backup' AND schemaname = 'public') THEN
    source_table := 'item_categories_old_backup';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'item_categories' AND schemaname = 'public') THEN
    source_table := 'item_categories';
  ELSE
    RAISE NOTICE '⚠️ Не найдена таблица item_categories для миграции категорий';
    RETURN;
  END IF;

  RAISE NOTICE 'Мигрируем категории из %', source_table;

  -- Мигрируем категории заново
  EXECUTE format('
    INSERT INTO category_new (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''new''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  EXECUTE format('
    INSERT INTO category_optimization (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''optimization''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  EXECUTE format('
    INSERT INTO category_ab (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''ab''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  EXECUTE format('
    INSERT INTO category_c_sale (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''c_sale''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  EXECUTE format('
    INSERT INTO category_off_season (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''off_season''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  EXECUTE format('
    INSERT INTO category_unprofitable (item_id, added_at)
    SELECT DISTINCT ic.item_id, ic.created_at
    FROM %I ic
    WHERE ic.category_type = ''unprofitable''
      AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
    ON CONFLICT (item_id) DO NOTHING
  ', source_table);

  RAISE NOTICE '✅ Категории мигрированы';
END $$;

-- ============================================================================
-- Шаг 5: Обновляем materialized view
-- ============================================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY item_categories_view;

-- ============================================================================
-- Шаг 6: Финальная проверка
-- ============================================================================

DO $$
DECLARE
  items_count INTEGER;
  table_items_count INTEGER;
  ratio NUMERIC;
BEGIN
  SELECT COUNT(*) INTO items_count FROM items;
  SELECT COUNT(*) INTO table_items_count FROM table_items;

  IF items_count > 0 THEN
    ratio := table_items_count::NUMERIC / items_count::NUMERIC;
  ELSE
    ratio := 0;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'РЕЗУЛЬТАТЫ МИГРАЦИИ';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Товаров в items: %', items_count;
  RAISE NOTICE 'Связей в table_items: %', table_items_count;
  RAISE NOTICE 'Коэффициент: %', ROUND(ratio, 2);
  RAISE NOTICE '';

  IF ratio > 1.5 THEN
    RAISE WARNING '⚠️ В table_items все еще есть дубли!';
  ELSIF ratio >= 0.8 AND ratio <= 1.2 THEN
    RAISE NOTICE '✅ Дублей нет! Миграция успешна!';
  ELSE
    RAISE WARNING '⚠️ Количество связей подозрительно отличается от количества товаров';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Категории:';
  RAISE NOTICE '  - new: %', (SELECT COUNT(*) FROM category_new);
  RAISE NOTICE '  - optimization: %', (SELECT COUNT(*) FROM category_optimization);
  RAISE NOTICE '  - ab: %', (SELECT COUNT(*) FROM category_ab);
  RAISE NOTICE '  - c_sale: %', (SELECT COUNT(*) FROM category_c_sale);
  RAISE NOTICE '  - off_season: %', (SELECT COUNT(*) FROM category_off_season);
  RAISE NOTICE '  - unprofitable: %', (SELECT COUNT(*) FROM category_unprofitable);
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- Inventory Calculator - Database Reorganization Migration
-- This migration reorganizes the database structure to:
-- 1. Create separate tables for each category
-- 2. Normalize price history and comments
-- 3. Prevent data duplication
-- 4. Optimize for fast real-time updates

-- ============================================================================
-- BACKUP CURRENT DATA (commented out, but shows structure)
-- ============================================================================
-- Before running this migration, make sure to backup your data:
-- pg_dump your_database > backup_before_migration.sql

-- ============================================================================
-- Step 1: Create new normalized tables
-- ============================================================================

-- Items master table - единственный источник истины для товаров
CREATE TABLE IF NOT EXISTS items (
  item_id TEXT PRIMARY KEY,
  -- Basic cost data
  base_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  commission DECIMAL(10, 2),

  -- Stock data
  stock INTEGER DEFAULT 0,
  days_stock INTEGER DEFAULT 0,

  -- Sales data
  sales_month INTEGER DEFAULT 0,
  applications_month INTEGER,
  sales_2weeks INTEGER DEFAULT 0,
  applications_2weeks INTEGER,

  -- Markup calculations
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
  markup50_12 DECIMAL(10, 2),

  -- CRM and Prom data
  crm_price DECIMAL(10, 2),
  crm_stock INTEGER,
  crm_category_id TEXT,
  crm_category_name TEXT,
  prom_price DECIMAL(10, 2),

  -- Current price
  new_price TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE items IS 'Главная таблица товаров - единственный источник истины';
COMMENT ON COLUMN items.item_id IS 'Уникальный ID товара';

-- ============================================================================
-- Step 2: Price Changes - История изменения цен
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_changes (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  changed_by TEXT, -- пользователь или система
  change_reason TEXT, -- причина изменения
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Для быстрого поиска последних изменений
  is_latest BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_price_changes_item_id ON price_changes(item_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_changed_at ON price_changes(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_changes_latest ON price_changes(item_id, is_latest) WHERE is_latest = TRUE;

COMMENT ON TABLE price_changes IS 'История изменения цен товаров';
COMMENT ON COLUMN price_changes.is_latest IS 'Флаг последнего изменения цены для товара';

-- ============================================================================
-- Step 3: Item Comments - Комментарии к товарам
-- ============================================================================

CREATE TABLE IF NOT EXISTS item_comments (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by TEXT, -- автор комментария
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_comments_item_id ON item_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_comments_created_at ON item_comments(created_at DESC);

COMMENT ON TABLE item_comments IS 'Комментарии к товарам';

-- ============================================================================
-- Step 4: Category Tables - Отдельные таблицы для каждой категории
-- ============================================================================

-- Новый товар
CREATE TABLE IF NOT EXISTS category_new (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_new_item_id ON category_new(item_id);
CREATE INDEX IF NOT EXISTS idx_category_new_added_at ON category_new(added_at DESC);

COMMENT ON TABLE category_new IS 'Категория: Новый товар';

-- Оптимизация
CREATE TABLE IF NOT EXISTS category_optimization (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  optimization_target DECIMAL(10, 2), -- целевая цена/margin
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_optimization_item_id ON category_optimization(item_id);
CREATE INDEX IF NOT EXISTS idx_category_optimization_added_at ON category_optimization(added_at DESC);

COMMENT ON TABLE category_optimization IS 'Категория: Оптимизация';

-- A/B тестирование
CREATE TABLE IF NOT EXISTS category_ab (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  variant TEXT, -- A или B
  test_start_date TIMESTAMPTZ,
  test_end_date TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_ab_item_id ON category_ab(item_id);
CREATE INDEX IF NOT EXISTS idx_category_ab_added_at ON category_ab(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_ab_variant ON category_ab(variant);

COMMENT ON TABLE category_ab IS 'Категория: A/B тестирование';

-- С-Продажа
CREATE TABLE IF NOT EXISTS category_c_sale (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  discount_percent DECIMAL(5, 2),
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_c_sale_item_id ON category_c_sale(item_id);
CREATE INDEX IF NOT EXISTS idx_category_c_sale_added_at ON category_c_sale(added_at DESC);

COMMENT ON TABLE category_c_sale IS 'Категория: С-Продажа';

-- Несезон
CREATE TABLE IF NOT EXISTS category_off_season (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  season TEXT, -- зима, лето, и т.д.
  return_season_date TIMESTAMPTZ, -- когда вернуть в продажу
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_off_season_item_id ON category_off_season(item_id);
CREATE INDEX IF NOT EXISTS idx_category_off_season_added_at ON category_off_season(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_off_season_season ON category_off_season(season);

COMMENT ON TABLE category_off_season IS 'Категория: Несезон';

-- Нерентабельные
CREATE TABLE IF NOT EXISTS category_unprofitable (
  id SERIAL PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- причина нерентабельности
  action_plan TEXT, -- план действий
  notes TEXT,
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_category_unprofitable_item_id ON category_unprofitable(item_id);
CREATE INDEX IF NOT EXISTS idx_category_unprofitable_added_at ON category_unprofitable(added_at DESC);

COMMENT ON TABLE category_unprofitable IS 'Категория: Нерентабельные';

-- ============================================================================
-- Step 5: Update table_items to reference items table
-- ============================================================================

-- Создаем временную таблицу для новой структуры table_items
CREATE TABLE IF NOT EXISTS table_items_new (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальный constraint предотвращает дублирование
  UNIQUE(table_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_table_items_new_table_id ON table_items_new(table_id);
CREATE INDEX IF NOT EXISTS idx_table_items_new_item_id ON table_items_new(item_id);

COMMENT ON TABLE table_items_new IS 'Связь между таблицами и товарами (без дублирования данных)';

-- ============================================================================
-- Step 6: Migrate existing data
-- ============================================================================

-- Миграция данных из старой table_items в новую структуру
-- Используем DISTINCT ON для избежания дублей

-- Сначала мигрируем уникальные товары в items
INSERT INTO items (
  item_id, base_cost, total_cost, commission, stock, days_stock,
  sales_month, applications_month, sales_2weeks, applications_2weeks,
  markup10, markup20, markup30, markup40, markup50, markup60, markup70, markup80, markup90, markup100, markup50_12,
  crm_price, crm_stock, crm_category_id, crm_category_name, prom_price, new_price,
  created_at, updated_at
)
SELECT DISTINCT ON (item_id)
  item_id,
  base_cost, total_cost, commission, stock, days_stock,
  sales_month, applications_month, sales_2weeks, applications_2weeks,
  markup10, markup20, markup30, markup40, markup50, markup60, markup70, markup80, markup90, markup100, markup50_12,
  crm_price, crm_stock, crm_category_id, crm_category_name, prom_price, new_price,
  created_at, updated_at
FROM table_items
WHERE item_id IS NOT NULL
ORDER BY item_id, updated_at DESC
ON CONFLICT (item_id) DO UPDATE SET
  base_cost = EXCLUDED.base_cost,
  total_cost = EXCLUDED.total_cost,
  commission = EXCLUDED.commission,
  stock = EXCLUDED.stock,
  days_stock = EXCLUDED.days_stock,
  sales_month = EXCLUDED.sales_month,
  applications_month = EXCLUDED.applications_month,
  sales_2weeks = EXCLUDED.sales_2weeks,
  applications_2weeks = EXCLUDED.applications_2weeks,
  markup10 = EXCLUDED.markup10,
  markup20 = EXCLUDED.markup20,
  markup30 = EXCLUDED.markup30,
  markup40 = EXCLUDED.markup40,
  markup50 = EXCLUDED.markup50,
  markup60 = EXCLUDED.markup60,
  markup70 = EXCLUDED.markup70,
  markup80 = EXCLUDED.markup80,
  markup90 = EXCLUDED.markup90,
  markup100 = EXCLUDED.markup100,
  markup50_12 = EXCLUDED.markup50_12,
  crm_price = EXCLUDED.crm_price,
  crm_stock = EXCLUDED.crm_stock,
  crm_category_id = EXCLUDED.crm_category_id,
  crm_category_name = EXCLUDED.crm_category_name,
  prom_price = EXCLUDED.prom_price,
  new_price = EXCLUDED.new_price,
  updated_at = EXCLUDED.updated_at;

-- Мигрируем связи table_id <-> item_id
INSERT INTO table_items_new (table_id, item_id, created_at, updated_at)
SELECT DISTINCT ON (table_id, item_id)
  table_id, item_id, created_at, updated_at
FROM table_items
WHERE item_id IS NOT NULL AND table_id IS NOT NULL
ORDER BY table_id, item_id, updated_at DESC
ON CONFLICT (table_id, item_id) DO NOTHING;

-- Мигрируем историю цен из JSONB в price_changes
-- ВАЖНО: Только для товаров, которые существуют в items!
INSERT INTO price_changes (item_id, old_price, new_price, changed_at, is_latest)
SELECT
  ti.item_id,
  (history_entry->>'oldPrice')::DECIMAL(10, 2),
  (history_entry->>'newPrice')::DECIMAL(10, 2),
  (history_entry->>'timestamp')::TIMESTAMPTZ,
  FALSE -- пока все не latest, обновим позже
FROM table_items ti,
  LATERAL jsonb_array_elements(
    CASE
      WHEN ti.price_history IS NOT NULL AND jsonb_typeof(ti.price_history) = 'array'
      THEN ti.price_history
      ELSE '[]'::jsonb
    END
  ) AS history_entry
WHERE ti.price_history IS NOT NULL
  AND jsonb_typeof(ti.price_history) = 'array'
  AND jsonb_array_length(ti.price_history) > 0
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ti.item_id);

-- Обновляем is_latest для последних изменений цен
WITH latest_prices AS (
  SELECT DISTINCT ON (item_id)
    id, item_id
  FROM price_changes
  ORDER BY item_id, changed_at DESC
)
UPDATE price_changes pc
SET is_latest = TRUE
FROM latest_prices lp
WHERE pc.id = lp.id;

-- Мигрируем комментарии из JSONB в item_comments
-- ВАЖНО: Только для товаров, которые существуют в items!
INSERT INTO item_comments (item_id, comment, created_at)
SELECT
  ti.item_id,
  comment_entry->>'text',
  COALESCE(
    (comment_entry->>'timestamp')::TIMESTAMPTZ,
    NOW()
  )
FROM table_items ti,
  LATERAL jsonb_array_elements(
    CASE
      WHEN ti.comments IS NOT NULL AND jsonb_typeof(ti.comments) = 'array'
      THEN ti.comments
      ELSE '[]'::jsonb
    END
  ) AS comment_entry
WHERE ti.comments IS NOT NULL
  AND jsonb_typeof(ti.comments) = 'array'
  AND jsonb_array_length(ti.comments) > 0
  AND comment_entry->>'text' IS NOT NULL
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ti.item_id);

-- Мигрируем категории из item_categories в новые таблицы
-- ВАЖНО: Мигрируем только те товары, которые существуют в items!
INSERT INTO category_new (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'new'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO category_optimization (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'optimization'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO category_ab (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'ab'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO category_c_sale (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'c_sale'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO category_off_season (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'off_season'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO category_unprofitable (item_id, added_at)
SELECT ic.item_id, ic.created_at
FROM item_categories ic
WHERE ic.category_type = 'unprofitable'
  AND EXISTS (SELECT 1 FROM items i WHERE i.item_id = ic.item_id)
ON CONFLICT (item_id) DO NOTHING;

-- ============================================================================
-- Step 7: Replace old tables with new structure
-- ============================================================================

-- Переименовываем старые таблицы для backup (если еще не переименованы)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'table_items' AND schemaname = 'public') THEN
    ALTER TABLE table_items RENAME TO table_items_old_backup;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'item_categories' AND schemaname = 'public') THEN
    ALTER TABLE item_categories RENAME TO item_categories_old_backup;
  END IF;
END $$;

-- Переименовываем новую таблицу (если еще не переименована)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'table_items_new' AND schemaname = 'public') THEN
    ALTER TABLE table_items_new RENAME TO table_items;
  END IF;
END $$;

-- Переименовываем индексы (если еще не переименованы)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_table_items_new_table_id' AND schemaname = 'public') THEN
    ALTER INDEX idx_table_items_new_table_id RENAME TO idx_table_items_table_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_table_items_new_item_id' AND schemaname = 'public') THEN
    ALTER INDEX idx_table_items_new_item_id RENAME TO idx_table_items_item_id;
  END IF;
END $$;

-- ============================================================================
-- Step 8: Create triggers for automatic timestamp updates
-- ============================================================================

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_table_items_updated_at ON table_items;
CREATE TRIGGER update_table_items_updated_at BEFORE UPDATE ON table_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_comments_updated_at ON item_comments;
CREATE TRIGGER update_item_comments_updated_at BEFORE UPDATE ON item_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 9: Create helper functions for real-time updates
-- ============================================================================

-- Function to add price change and mark as latest
CREATE OR REPLACE FUNCTION add_price_change(
  p_item_id TEXT,
  p_old_price DECIMAL(10, 2),
  p_new_price DECIMAL(10, 2),
  p_changed_by TEXT DEFAULT 'system',
  p_change_reason TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_change_id INTEGER;
BEGIN
  -- Снимаем флаг is_latest со всех предыдущих изменений
  UPDATE price_changes
  SET is_latest = FALSE
  WHERE item_id = p_item_id AND is_latest = TRUE;

  -- Добавляем новое изменение
  INSERT INTO price_changes (item_id, old_price, new_price, changed_by, change_reason, is_latest)
  VALUES (p_item_id, p_old_price, p_new_price, p_changed_by, p_change_reason, TRUE)
  RETURNING id INTO v_change_id;

  -- Обновляем цену в items
  UPDATE items SET new_price = p_new_price::TEXT WHERE item_id = p_item_id;

  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_price_change IS 'Добавить изменение цены и обновить товар';

-- Function to get all categories for an item
CREATE OR REPLACE FUNCTION get_item_categories(p_item_id TEXT)
RETURNS TEXT[] AS $$
DECLARE
  v_categories TEXT[];
BEGIN
  v_categories := ARRAY[]::TEXT[];

  IF EXISTS (SELECT 1 FROM category_new WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'new');
  END IF;

  IF EXISTS (SELECT 1 FROM category_optimization WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'optimization');
  END IF;

  IF EXISTS (SELECT 1 FROM category_ab WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'ab');
  END IF;

  IF EXISTS (SELECT 1 FROM category_c_sale WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'c_sale');
  END IF;

  IF EXISTS (SELECT 1 FROM category_off_season WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'off_season');
  END IF;

  IF EXISTS (SELECT 1 FROM category_unprofitable WHERE item_id = p_item_id) THEN
    v_categories := array_append(v_categories, 'unprofitable');
  END IF;

  RETURN v_categories;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_item_categories IS 'Получить все категории товара';

-- ============================================================================
-- Step 10: Create materialized view for fast category lookups
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS item_categories_view AS
SELECT
  i.item_id,
  CASE WHEN cn.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_new,
  CASE WHEN co.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_optimization,
  CASE WHEN cab.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_ab,
  CASE WHEN ccs.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_c_sale,
  CASE WHEN cof.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_off_season,
  CASE WHEN cup.item_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_unprofitable
FROM items i
LEFT JOIN category_new cn ON i.item_id = cn.item_id
LEFT JOIN category_optimization co ON i.item_id = co.item_id
LEFT JOIN category_ab cab ON i.item_id = cab.item_id
LEFT JOIN category_c_sale ccs ON i.item_id = ccs.item_id
LEFT JOIN category_off_season cof ON i.item_id = cof.item_id
LEFT JOIN category_unprofitable cup ON i.item_id = cup.item_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_categories_view_item_id ON item_categories_view(item_id);

COMMENT ON MATERIALIZED VIEW item_categories_view IS 'Быстрый lookup категорий товаров';

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_item_categories_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY item_categories_view;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 11: Grant permissions
-- ============================================================================

-- Disable RLS for new tables (enable after implementing authentication)
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_optimization DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_ab DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_c_sale DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_off_season DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_unprofitable DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 12: Verification queries (for manual check)
-- ============================================================================

-- Подсчет товаров после миграции
DO $$
DECLARE
  v_items_count INTEGER;
  v_table_items_old_count INTEGER;
  v_table_items_new_count INTEGER;
  v_unique_items_old INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_items_count FROM items;
  SELECT COUNT(*) INTO v_table_items_old_count FROM table_items_old_backup;
  SELECT COUNT(*) INTO v_table_items_new_count FROM table_items;
  SELECT COUNT(DISTINCT item_id) INTO v_unique_items_old FROM table_items_old_backup;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Items in new items table: %', v_items_count;
  RAISE NOTICE 'Old table_items count: %', v_table_items_old_count;
  RAISE NOTICE 'Unique items in old table: %', v_unique_items_old;
  RAISE NOTICE 'New table_items count: %', v_table_items_new_count;
  RAISE NOTICE '===========================================';

  IF v_items_count >= v_unique_items_old THEN
    RAISE NOTICE 'SUCCESS: Migration completed successfully!';
  ELSE
    RAISE WARNING 'WARNING: Some items may not have been migrated!';
  END IF;
END $$;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- После проверки работы системы можно удалить backup таблицы:
-- DROP TABLE table_items_old_backup;
-- DROP TABLE item_categories_old_backup;

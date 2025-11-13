-- Скрипт для исправления типов данных в таблице table_items
-- Запустите этот скрипт ТОЛЬКО если вы уже выполнили 001_initial_schema.sql

-- Шаг 1: Удалить индекс для item_id
DROP INDEX IF EXISTS idx_table_items_item_id;

-- Шаг 2: Изменить тип столбца item_id с INTEGER на TEXT
ALTER TABLE table_items ALTER COLUMN item_id TYPE TEXT USING item_id::TEXT;

-- Шаг 3: Изменить тип столбца commission с INTEGER на DECIMAL
ALTER TABLE table_items ALTER COLUMN commission TYPE DECIMAL(10, 2) USING commission::DECIMAL(10, 2);

-- Шаг 4: Восстановить индекс для item_id
CREATE INDEX idx_table_items_item_id ON table_items(item_id);

-- Готово!
SELECT 'item_id и commission успешно исправлены' as status;

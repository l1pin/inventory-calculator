-- Скрипт для исправления типа item_id с INTEGER на TEXT
-- Запустите этот скрипт ТОЛЬКО если вы уже выполнили 001_initial_schema.sql

-- Шаг 1: Удалить foreign key constraints и индексы, связанные с item_id
DROP INDEX IF EXISTS idx_table_items_item_id;

-- Шаг 2: Изменить тип столбца item_id
ALTER TABLE table_items ALTER COLUMN item_id TYPE TEXT USING item_id::TEXT;

-- Шаг 3: Восстановить индекс
CREATE INDEX idx_table_items_item_id ON table_items(item_id);

-- Готово!
SELECT 'item_id успешно изменен на TEXT' as status;

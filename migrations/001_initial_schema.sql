-- Inventory Calculator - Initial Database Schema
-- This migration creates all necessary tables for the application

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS global_xml_data CASCADE;
DROP TABLE IF EXISTS table_xml_data CASCADE;
DROP TABLE IF EXISTS xml_status CASCADE;
DROP TABLE IF EXISTS global_item_changes CASCADE;
DROP TABLE IF EXISTS global_commissions CASCADE;
DROP TABLE IF EXISTS item_categories CASCADE;
DROP TABLE IF EXISTS crm_categories CASCADE;
DROP TABLE IF EXISTS table_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- ============================================================================
-- Tables: Main table metadata
-- ============================================================================
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_name TEXT,
  upload_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tables IS 'Метаданные таблиц с товарами';
COMMENT ON COLUMN tables.id IS 'Уникальный идентификатор таблицы (например: table_1749644093570.0361)';
COMMENT ON COLUMN tables.name IS 'Название таблицы (отображаемое имя)';
COMMENT ON COLUMN tables.file_name IS 'Имя исходного файла Excel';
COMMENT ON COLUMN tables.upload_time IS 'Время загрузки таблицы';

-- ============================================================================
-- Table Items: Individual items within tables
-- ============================================================================
CREATE TABLE table_items (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  base_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  commission DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  days_stock INTEGER DEFAULT 0,
  sales_month INTEGER DEFAULT 0,
  applications_month INTEGER,
  sales_2weeks INTEGER DEFAULT 0,
  applications_2weeks INTEGER,
  markup50_12 DECIMAL(10, 2),
  new_price TEXT,
  price_history JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  crm_price DECIMAL(10, 2),
  crm_stock INTEGER,
  crm_category_id TEXT,
  crm_category_name TEXT,
  prom_price DECIMAL(10, 2),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, item_id)
);

COMMENT ON TABLE table_items IS 'Товары в таблицах';
COMMENT ON COLUMN table_items.table_id IS 'ID таблицы, к которой относится товар';
COMMENT ON COLUMN table_items.item_id IS 'ID товара в рамках таблицы';
COMMENT ON COLUMN table_items.base_cost IS 'Базовая себестоимость';
COMMENT ON COLUMN table_items.total_cost IS 'Полная себестоимость';
COMMENT ON COLUMN table_items.commission IS 'Комиссия маркетплейса (%)';
COMMENT ON COLUMN table_items.stock IS 'Остаток на складе';
COMMENT ON COLUMN table_items.price_history IS 'История изменения цен (JSON массив)';
COMMENT ON COLUMN table_items.comments IS 'Комментарии к товару (JSON массив)';

-- ============================================================================
-- CRM Categories: Categories from CRM system
-- ============================================================================
CREATE TABLE crm_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE crm_categories IS 'Категории из CRM системы';
COMMENT ON COLUMN crm_categories.id IS 'ID категории в CRM';
COMMENT ON COLUMN crm_categories.name IS 'Название категории';

-- ============================================================================
-- Item Categories: Item categorization (new, optimization, etc.)
-- ============================================================================
CREATE TABLE item_categories (
  id SERIAL PRIMARY KEY,
  category_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_type, item_id)
);

COMMENT ON TABLE item_categories IS 'Категоризация товаров по типам';
COMMENT ON COLUMN item_categories.category_type IS 'Тип категории: new, optimization, ab, c_sale, off_season, unprofitable';
COMMENT ON COLUMN item_categories.item_id IS 'ID товара';

-- ============================================================================
-- Global Commissions: Global commission rates
-- ============================================================================
CREATE TABLE global_commissions (
  key TEXT PRIMARY KEY,
  value DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE global_commissions IS 'Глобальные ставки комиссий';
COMMENT ON COLUMN global_commissions.key IS 'Ключ комиссии (например, ID товара или категории)';
COMMENT ON COLUMN global_commissions.value IS 'Значение комиссии (%)';

-- ============================================================================
-- Global Item Changes: Global changes to items
-- ============================================================================
CREATE TABLE global_item_changes (
  item_id TEXT PRIMARY KEY,
  changes JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE global_item_changes IS 'Глобальные изменения товаров';
COMMENT ON COLUMN global_item_changes.item_id IS 'ID товара';
COMMENT ON COLUMN global_item_changes.changes IS 'Изменения в формате JSON';

-- ============================================================================
-- XML Status: XML loading status for CRM and Prom
-- ============================================================================
CREATE TABLE xml_status (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_update TIMESTAMPTZ,
  data_count INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE xml_status IS 'Статус загрузки XML данных';
COMMENT ON COLUMN xml_status.key IS 'Ключ: crm, prom, или table_id';
COMMENT ON COLUMN xml_status.status IS 'Статус: not_loaded, loading, loaded, error';
COMMENT ON COLUMN xml_status.last_update IS 'Время последнего обновления';
COMMENT ON COLUMN xml_status.data_count IS 'Количество загруженных записей';

-- ============================================================================
-- Table XML Data: XML data for specific tables
-- ============================================================================
CREATE TABLE table_xml_data (
  table_id TEXT PRIMARY KEY REFERENCES tables(id) ON DELETE CASCADE,
  xml_data JSONB NOT NULL,
  loading_status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE table_xml_data IS 'XML данные для конкретных таблиц';
COMMENT ON COLUMN table_xml_data.table_id IS 'ID таблицы';
COMMENT ON COLUMN table_xml_data.xml_data IS 'XML данные в формате JSON';
COMMENT ON COLUMN table_xml_data.loading_status IS 'Статус загрузки';

-- ============================================================================
-- Global XML Data: Global XML data from CRM and Prom
-- ============================================================================
CREATE TABLE global_xml_data (
  data_type TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE global_xml_data IS 'Глобальные XML данные из CRM и Prom';
COMMENT ON COLUMN global_xml_data.data_type IS 'Тип данных: crm или prom';
COMMENT ON COLUMN global_xml_data.data IS 'XML данные в формате JSON';

-- ============================================================================
-- Indexes for performance optimization
-- ============================================================================
CREATE INDEX idx_table_items_table_id ON table_items(table_id);
CREATE INDEX idx_table_items_item_id ON table_items(item_id);
CREATE INDEX idx_table_items_crm_category ON table_items(crm_category_id);
CREATE INDEX idx_item_categories_type ON item_categories(category_type);
CREATE INDEX idx_item_categories_item ON item_categories(item_id);
CREATE INDEX idx_tables_created ON tables(created_at);
CREATE INDEX idx_table_items_updated ON table_items(updated_at);

-- ============================================================================
-- Functions for automatic timestamp updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_items_updated_at BEFORE UPDATE ON table_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_categories_updated_at BEFORE UPDATE ON crm_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_commissions_updated_at BEFORE UPDATE ON global_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_item_changes_updated_at BEFORE UPDATE ON global_item_changes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xml_status_updated_at BEFORE UPDATE ON xml_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_table_xml_data_updated_at BEFORE UPDATE ON table_xml_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_xml_data_updated_at BEFORE UPDATE ON global_xml_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS (Row Level Security) - Disabled for now
-- ============================================================================
-- Temporarily disable RLS for development
-- Enable after implementing authentication

ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_item_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE xml_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_xml_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_xml_data DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Grant permissions (adjust for your needs)
-- ============================================================================
-- Grant all privileges to the service role
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant read/write to authenticated users
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- Run this script in Supabase SQL Editor to create all tables

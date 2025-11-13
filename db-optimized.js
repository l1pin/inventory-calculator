require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase клиент инициализирован (оптимизированная версия)');

// ============================================================================
// Items API - Главная таблица товаров
// ============================================================================

/**
 * Получить товар по ID
 */
async function getItem(itemId) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('item_id', itemId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Получить несколько товаров по ID
 */
async function getItems(itemIds) {
  if (!itemIds || itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('item_id', itemIds);

  if (error) throw error;
  return data || [];
}

/**
 * Создать или обновить товары (UPSERT - предотвращает дублирование)
 */
async function upsertItems(items) {
  if (!items || items.length === 0) return [];

  const batchSize = 100;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('items')
      .upsert(batch, {
        onConflict: 'item_id',
        ignoreDuplicates: false // обновляем существующие
      })
      .select();

    if (error) throw error;
    results.push(...(data || []));
  }

  console.log(`✅ Upserted ${results.length} items (предотвращено дублирование)`);
  return results;
}

/**
 * Обновить товар
 */
async function updateItem(itemId, updates) {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('item_id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Удалить товар
 */
async function deleteItem(itemId) {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('item_id', itemId);

  if (error) throw error;
  return true;
}

// ============================================================================
// Price Changes API - История изменения цен
// ============================================================================

/**
 * Добавить изменение цены
 */
async function addPriceChange(itemId, oldPrice, newPrice, changedBy = 'system', changeReason = null) {
  // Используем функцию БД для атомарного добавления
  const { data, error } = await supabase.rpc('add_price_change', {
    p_item_id: itemId,
    p_old_price: oldPrice,
    p_new_price: newPrice,
    p_changed_by: changedBy,
    p_change_reason: changeReason
  });

  if (error) throw error;
  return data;
}

/**
 * Получить историю изменения цен товара
 */
async function getPriceHistory(itemId, limit = 100) {
  const { data, error } = await supabase
    .from('price_changes')
    .select('*')
    .eq('item_id', itemId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Получить последнее изменение цены
 */
async function getLatestPriceChange(itemId) {
  const { data, error } = await supabase
    .from('price_changes')
    .select('*')
    .eq('item_id', itemId)
    .eq('is_latest', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================================
// Item Comments API - Комментарии к товарам
// ============================================================================

/**
 * Добавить комментарий к товару
 */
async function addItemComment(itemId, comment, createdBy = 'system') {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({
      item_id: itemId,
      comment: comment,
      created_by: createdBy
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Получить комментарии товара
 */
async function getItemComments(itemId, limit = 100) {
  const { data, error } = await supabase
    .from('item_comments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Обновить комментарий
 */
async function updateItemComment(commentId, comment) {
  const { data, error } = await supabase
    .from('item_comments')
    .update({ comment: comment })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Удалить комментарий
 */
async function deleteItemComment(commentId) {
  const { error } = await supabase
    .from('item_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
  return true;
}

// ============================================================================
// Categories API - Работа с категориями
// ============================================================================

const CATEGORY_TABLES = {
  new: 'category_new',
  optimization: 'category_optimization',
  ab: 'category_ab',
  c_sale: 'category_c_sale',
  off_season: 'category_off_season',
  unprofitable: 'category_unprofitable'
};

/**
 * Добавить товар в категорию
 */
async function addItemToCategory(categoryType, itemId, additionalData = {}) {
  const tableName = CATEGORY_TABLES[categoryType];
  if (!tableName) throw new Error(`Неизвестный тип категории: ${categoryType}`);

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      item_id: itemId,
      ...additionalData
    })
    .select()
    .single();

  if (error && error.code !== '23505') throw error; // Игнорируем дубликаты
  return data;
}

/**
 * Удалить товар из категории
 */
async function removeItemFromCategory(categoryType, itemId) {
  const tableName = CATEGORY_TABLES[categoryType];
  if (!tableName) throw new Error(`Неизвестный тип категории: ${categoryType}`);

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('item_id', itemId);

  if (error) throw error;
  return true;
}

/**
 * Получить товары категории
 */
async function getItemsByCategory(categoryType, limit = 1000, offset = 0) {
  const tableName = CATEGORY_TABLES[categoryType];
  if (!tableName) throw new Error(`Неизвестный тип категории: ${categoryType}`);

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      item_id,
      added_at,
      notes,
      items (*)
    `)
    .range(offset, offset + limit - 1)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Получить количество товаров в категории
 */
async function getCategoryItemCount(categoryType) {
  const tableName = CATEGORY_TABLES[categoryType];
  if (!tableName) throw new Error(`Неизвестный тип категории: ${categoryType}`);

  const { count, error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

/**
 * Получить все категории товара
 */
async function getItemCategories(itemId) {
  const { data, error } = await supabase.rpc('get_item_categories', {
    p_item_id: itemId
  });

  if (error) throw error;
  return data || [];
}

/**
 * Сохранить товары в категорию (массовая операция)
 */
async function saveItemsToCategory(categoryType, itemIds, additionalData = {}) {
  const tableName = CATEGORY_TABLES[categoryType];
  if (!tableName) throw new Error(`Неизвестный тип категории: ${categoryType}`);

  // Сначала удаляем все существующие записи
  await supabase
    .from(tableName)
    .delete()
    .neq('id', 0); // Удаляем все

  // Затем вставляем новые
  if (itemIds.length === 0) return [];

  const items = itemIds.map(itemId => ({
    item_id: String(itemId),
    ...additionalData
  }));

  const batchSize = 500;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from(tableName)
      .insert(batch)
      .select();

    if (error) throw error;
    results.push(...(data || []));
  }

  // Обновляем materialized view
  await supabase.rpc('refresh_item_categories_view');

  return results;
}

// ============================================================================
// Tables API - Работа с таблицами
// ============================================================================

/**
 * Получить все таблицы
 */
async function getAllTables() {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Получить таблицу по ID
 */
async function getTableById(tableId) {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Создать новую таблицу
 */
async function createTable(tableData) {
  const { data, error } = await supabase
    .from('tables')
    .insert({
      id: tableData.id,
      name: tableData.name,
      file_name: tableData.fileName,
      upload_time: tableData.uploadTime || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Удалить таблицу
 */
async function deleteTable(tableId) {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId);

  if (error) throw error;
  return true;
}

/**
 * Получить товары таблицы (оптимизировано - без дублей)
 */
async function getTableItems(tableId) {
  const { data, error } = await supabase
    .from('table_items')
    .select(`
      id,
      created_at,
      updated_at,
      items (*)
    `)
    .eq('table_id', tableId);

  if (error) throw error;

  // Возвращаем только данные товаров без дублей
  return data?.map(ti => ti.items).filter(Boolean) || [];
}

/**
 * Связать товары с таблицей (БЕЗ дублирования данных)
 */
async function linkItemsToTable(tableId, itemIds) {
  if (!itemIds || itemIds.length === 0) return [];

  // Создаем связи table_id <-> item_id
  const links = itemIds.map(itemId => ({
    table_id: tableId,
    item_id: String(itemId)
  }));

  const batchSize = 500;
  const results = [];

  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('table_items')
      .upsert(batch, {
        onConflict: 'table_id,item_id',
        ignoreDuplicates: true
      })
      .select();

    if (error) throw error;
    results.push(...(data || []));
  }

  console.log(`✅ Связано ${results.length} товаров с таблицей ${tableId} (без дублей)`);
  return results;
}

/**
 * Получить данные конкретной таблицы с товарами
 */
async function getTableData(tableId) {
  try {
    const [table, items] = await Promise.all([
      getTableById(tableId),
      getTableItems(tableId)
    ]);

    if (!table) {
      throw new Error(`Table ${tableId} not found`);
    }

    return {
      id: table.id,
      name: table.name,
      fileName: table.file_name,
      uploadTime: table.upload_time,
      data: items.map(item => ({
        id: item.item_id,
        baseCost: item.base_cost,
        totalCost: item.total_cost,
        commission: item.commission,
        stock: item.stock,
        daysStock: item.days_stock,
        salesMonth: item.sales_month,
        applicationsMonth: item.applications_month,
        sales2Weeks: item.sales_2weeks,
        applications2Weeks: item.applications_2weeks,
        markup50_12: item.markup50_12,
        newPrice: item.new_price,
        crmPrice: item.crm_price,
        crmStock: item.crm_stock,
        crmCategoryId: item.crm_category_id,
        crmCategoryName: item.crm_category_name,
        promPrice: item.prom_price,
        markup10: item.markup10,
        markup20: item.markup20,
        markup30: item.markup30,
        markup40: item.markup40,
        markup50: item.markup50,
        markup60: item.markup60,
        markup70: item.markup70,
        markup80: item.markup80,
        markup90: item.markup90,
        markup100: item.markup100
      }))
    };
  } catch (error) {
    console.error('Ошибка загрузки данных таблицы:', error);
    throw error;
  }
}

// ============================================================================
// Global Data API (сохраняем совместимость)
// ============================================================================

/**
 * Получить глобальные комиссии
 */
async function getGlobalCommissions() {
  const { data, error } = await supabase
    .from('global_commissions')
    .select('*');

  if (error) throw error;

  const commissions = {};
  (data || []).forEach(item => {
    commissions[item.key] = parseFloat(item.value);
  });

  return commissions;
}

/**
 * Сохранить глобальные комиссии
 */
async function saveGlobalCommissions(commissions) {
  const entries = Object.entries(commissions).map(([key, value]) => ({
    key,
    value: parseFloat(value) || 0
  }));

  const { data, error } = await supabase
    .from('global_commissions')
    .upsert(entries, { onConflict: 'key' })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Получить глобальные изменения товаров
 */
async function getGlobalItemChanges() {
  const { data, error } = await supabase
    .from('global_item_changes')
    .select('*');

  if (error) throw error;

  const itemChanges = {};
  (data || []).forEach(item => {
    itemChanges[item.item_id] = item.changes;
  });

  return itemChanges;
}

/**
 * Сохранить глобальные изменения товаров
 */
async function saveGlobalItemChanges(itemChanges) {
  const entries = Object.entries(itemChanges).map(([itemId, changes]) => ({
    item_id: itemId,
    changes: changes
  }));

  if (entries.length === 0) return [];

  const { data, error } = await supabase
    .from('global_item_changes')
    .upsert(entries, { onConflict: 'item_id' })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Получить глобальные XML данные
 */
async function getGlobalXmlData(dataType) {
  const { data, error } = await supabase
    .from('global_xml_data')
    .select('*')
    .eq('data_type', dataType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.data || {};
}

/**
 * Сохранить глобальные XML данные
 */
async function saveGlobalXmlData(dataType, xmlData) {
  const { data, error } = await supabase
    .from('global_xml_data')
    .upsert({
      data_type: dataType,
      data: xmlData
    }, { onConflict: 'data_type' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Получить CRM категории
 */
async function getCrmCategories() {
  const { data, error } = await supabase
    .from('crm_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Комплексные операции с оптимизацией
// ============================================================================

/**
 * Сохранить все данные приложения (оптимизированная версия)
 */
async function saveAllAppData(appData) {
  try {
    console.log('💾 Начало сохранения данных...');

    // Сохраняем глобальные данные
    await Promise.all([
      saveGlobalCommissions(appData.globalCommissions || {}),
      saveGlobalItemChanges(appData.globalItemChanges || {})
    ]);

    // Сохраняем таблицы с товарами (ОПТИМИЗИРОВАНО)
    if (appData.tables && Array.isArray(appData.tables)) {
      for (const table of appData.tables) {
        if (table.data && Array.isArray(table.data) && table.data.length > 0) {
          console.log(`💾 Сохранение таблицы ${table.id}: ${table.data.length} товаров`);

          // Преобразуем данные товаров
          const items = table.data.map(item => ({
            item_id: item.id,
            base_cost: item.baseCost,
            total_cost: item.totalCost,
            commission: item.commission,
            stock: item.stock,
            days_stock: item.daysStock,
            sales_month: item.salesMonth,
            applications_month: item.applicationsMonth,
            sales_2weeks: item.sales2Weeks,
            applications_2weeks: item.applications2Weeks,
            markup50_12: item.markup50_12,
            new_price: item.newPrice,
            crm_price: item.crmPrice,
            crm_stock: item.crmStock,
            crm_category_id: item.crmCategoryId,
            crm_category_name: item.crmCategoryName,
            prom_price: item.promPrice,
            markup10: item.markup10,
            markup20: item.markup20,
            markup30: item.markup30,
            markup40: item.markup40,
            markup50: item.markup50,
            markup60: item.markup60,
            markup70: item.markup70,
            markup80: item.markup80,
            markup90: item.markup90,
            markup100: item.markup100
          }));

          // UPSERT товаров (предотвращает дублирование!)
          await upsertItems(items);

          // Связываем товары с таблицей
          const itemIds = items.map(i => i.item_id);
          await linkItemsToTable(table.id, itemIds);

          // Сохраняем историю цен и комментарии
          for (const item of table.data) {
            // История цен
            if (item.priceHistory && Array.isArray(item.priceHistory)) {
              for (const ph of item.priceHistory) {
                try {
                  await addPriceChange(
                    item.id,
                    ph.oldPrice,
                    ph.newPrice,
                    ph.changedBy || 'system',
                    ph.reason
                  );
                } catch (err) {
                  // Игнорируем ошибки дублирования
                }
              }
            }

            // Комментарии
            if (item.comments && Array.isArray(item.comments)) {
              for (const comment of item.comments) {
                try {
                  await addItemComment(
                    item.id,
                    comment.text,
                    comment.author || 'system'
                  );
                } catch (err) {
                  // Игнорируем ошибки
                }
              }
            }
          }
        }
      }
    }

    // Сохраняем XML данные
    if (appData.globalCrmData && Object.keys(appData.globalCrmData).length > 0) {
      await saveGlobalXmlData('crm', appData.globalCrmData);
    }
    if (appData.globalPromData && Object.keys(appData.globalPromData).length > 0) {
      await saveGlobalXmlData('prom', appData.globalPromData);
    }

    console.log('✅ Все данные успешно сохранены (оптимизированная версия)');
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    throw error;
  }
}

/**
 * Получить все данные приложения
 */
async function getAllAppData() {
  try {
    const [
      tables,
      globalCommissions,
      globalItemChanges,
      crmCategories,
      crmData,
      promData
    ] = await Promise.all([
      getAllTables(),
      getGlobalCommissions(),
      getGlobalItemChanges(),
      getCrmCategories(),
      getGlobalXmlData('crm'),
      getGlobalXmlData('prom')
    ]);

    // Возвращаем метаданные таблиц без данных
    const tablesMetadata = tables.map(table => ({
      id: table.id,
      name: table.name,
      fileName: table.file_name,
      uploadTime: table.upload_time,
      data: []
    }));

    return {
      tables: tablesMetadata,
      globalCommissions,
      globalItemChanges,
      availableCrmCategories: crmCategories,
      globalCrmData: crmData,
      globalPromData: promData,
      lastSaved: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    throw error;
  }
}

// ============================================================================
// Экспорт
// ============================================================================

module.exports = {
  supabase,

  // Items
  getItem,
  getItems,
  upsertItems,
  updateItem,
  deleteItem,

  // Price Changes
  addPriceChange,
  getPriceHistory,
  getLatestPriceChange,

  // Comments
  addItemComment,
  getItemComments,
  updateItemComment,
  deleteItemComment,

  // Categories
  addItemToCategory,
  removeItemFromCategory,
  getItemsByCategory,
  getCategoryItemCount,
  getItemCategories,
  saveItemsToCategory,

  // Tables
  getAllTables,
  getTableById,
  getTableData,
  createTable,
  deleteTable,
  getTableItems,
  linkItemsToTable,

  // Global Data
  getGlobalCommissions,
  saveGlobalCommissions,
  getGlobalItemChanges,
  saveGlobalItemChanges,
  getGlobalXmlData,
  saveGlobalXmlData,
  getCrmCategories,

  // Complex Operations
  saveAllAppData,
  getAllAppData
};

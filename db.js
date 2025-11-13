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

console.log('✅ Supabase клиент инициализирован');

// ============================================================================
// Tables API
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
  return data;
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

// ============================================================================
// Table Items API
// ============================================================================

/**
 * Получить все товары таблицы (с параллельной пагинацией для больших таблиц)
 */
async function getTableItems(tableId) {
  // Сначала получаем общее количество записей
  const { count, error: countError } = await supabase
    .from('table_items')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', tableId);

  if (countError) throw countError;

  if (count === 0) {
    return [];
  }

  console.log(`📊 Таблица ${tableId}: найдено ${count} записей`);

  // Определяем размер страницы и количество страниц
  const pageSize = 1000;
  const totalPages = Math.ceil(count / pageSize);

  // Создаем массив промисов для параллельной загрузки всех страниц
  const pagePromises = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const promise = supabase
      .from('table_items')
      .select('*')
      .eq('table_id', tableId)
      .range(from, to);

    pagePromises.push(promise);
  }

  // Загружаем все страницы параллельно
  const results = await Promise.all(pagePromises);

  // Проверяем ошибки и собираем данные
  let allData = [];
  for (const result of results) {
    if (result.error) throw result.error;
    allData = allData.concat(result.data);
  }

  console.log(`📦 Загружено ${allData.length} товаров для таблицы ${tableId}`);
  return allData;
}

/**
 * Создать товары в таблице (пакетная вставка)
 */
async function createTableItems(items) {
  // Supabase имеет ограничение на количество записей за один запрос
  const batchSize = 100;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('table_items')
      .upsert(batch, { onConflict: 'table_id,item_id' })
      .select();

    if (error) throw error;
    results.push(...data);
  }

  return results;
}

/**
 * Обновить товар
 */
async function updateTableItem(tableId, itemId, updates) {
  const { data, error } = await supabase
    .from('table_items')
    .update(updates)
    .eq('table_id', tableId)
    .eq('item_id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Удалить все товары таблицы
 */
async function deleteTableItems(tableId) {
  const { error } = await supabase
    .from('table_items')
    .delete()
    .eq('table_id', tableId);

  if (error) throw error;
  return true;
}

// ============================================================================
// Categories API
// ============================================================================

/**
 * Получить все CRM категории
 */
async function getCrmCategories() {
  const { data, error } = await supabase
    .from('crm_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Получить товары по типу категории (с параллельной пагинацией)
 */
async function getItemsByCategory(categoryType) {
  // Получаем общее количество
  const { count, error: countError } = await supabase
    .from('item_categories')
    .select('*', { count: 'exact', head: true })
    .eq('category_type', categoryType);

  if (countError) throw countError;
  if (count === 0) return [];

  const pageSize = 1000;
  const totalPages = Math.ceil(count / pageSize);

  // Параллельная загрузка всех страниц
  const pagePromises = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    pagePromises.push(
      supabase
        .from('item_categories')
        .select('item_id')
        .eq('category_type', categoryType)
        .range(from, to)
    );
  }

  const results = await Promise.all(pagePromises);
  let allData = [];
  for (const result of results) {
    if (result.error) throw result.error;
    allData = allData.concat(result.data);
  }

  return allData.map(item => item.item_id);
}

/**
 * Сохранить товары в категорию
 */
async function saveItemsToCategory(categoryType, itemIds) {
  // Сначала удаляем все существующие записи для этой категории
  await supabase
    .from('item_categories')
    .delete()
    .eq('category_type', categoryType);

  // Затем вставляем новые
  if (itemIds.length === 0) return [];

  const items = itemIds.map(itemId => ({
    category_type: categoryType,
    item_id: String(itemId)
  }));

  const batchSize = 500;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('item_categories')
      .insert(batch)
      .select();

    if (error) throw error;
    results.push(...data);
  }

  return results;
}

/**
 * Добавить товар в категорию
 */
async function addItemToCategory(categoryType, itemId) {
  const { data, error } = await supabase
    .from('item_categories')
    .insert({
      category_type: categoryType,
      item_id: String(itemId)
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
  const { error } = await supabase
    .from('item_categories')
    .delete()
    .eq('category_type', categoryType)
    .eq('item_id', String(itemId));

  if (error) throw error;
  return true;
}

// ============================================================================
// Global Commissions API
// ============================================================================

/**
 * Получить все глобальные комиссии (с параллельной пагинацией)
 */
async function getGlobalCommissions() {
  // Получаем общее количество
  const { count, error: countError } = await supabase
    .from('global_commissions')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (count === 0) return {};

  const pageSize = 1000;
  const totalPages = Math.ceil(count / pageSize);

  // Параллельная загрузка всех страниц
  const pagePromises = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    pagePromises.push(
      supabase
        .from('global_commissions')
        .select('*')
        .range(from, to)
    );
  }

  const results = await Promise.all(pagePromises);
  let allData = [];
  for (const result of results) {
    if (result.error) throw result.error;
    allData = allData.concat(result.data);
  }

  // Преобразуем в объект {key: value}
  const commissions = {};
  allData.forEach(item => {
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

// ============================================================================
// Global Item Changes API
// ============================================================================

/**
 * Получить все глобальные изменения товаров (с параллельной пагинацией)
 */
async function getGlobalItemChanges() {
  // Получаем общее количество
  const { count, error: countError } = await supabase
    .from('global_item_changes')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (count === 0) return {};

  const pageSize = 1000;
  const totalPages = Math.ceil(count / pageSize);

  // Параллельная загрузка всех страниц
  const pagePromises = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    pagePromises.push(
      supabase
        .from('global_item_changes')
        .select('*')
        .range(from, to)
    );
  }

  const results = await Promise.all(pagePromises);
  let allData = [];
  for (const result of results) {
    if (result.error) throw result.error;
    allData = allData.concat(result.data);
  }

  // Преобразуем в объект {itemId: changes}
  const itemChanges = {};
  allData.forEach(item => {
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

// ============================================================================
// XML Data API
// ============================================================================

/**
 * Получить глобальные XML данные
 */
async function getGlobalXmlData(dataType) {
  const { data, error } = await supabase
    .from('global_xml_data')
    .select('*')
    .eq('data_type', dataType)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
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
 * Получить XML данные таблицы
 */
async function getTableXmlData(tableId) {
  const { data, error } = await supabase
    .from('table_xml_data')
    .select('*')
    .eq('table_id', tableId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.xml_data || {};
}

/**
 * Сохранить XML данные таблицы
 */
async function saveTableXmlData(tableId, xmlData, loadingStatus) {
  const { data, error } = await supabase
    .from('table_xml_data')
    .upsert({
      table_id: tableId,
      xml_data: xmlData,
      loading_status: loadingStatus
    }, { onConflict: 'table_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Получить XML статус
 */
async function getXmlStatus(key) {
  const { data, error } = await supabase
    .from('xml_status')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Сохранить XML статус
 */
async function saveXmlStatus(key, status, lastUpdate, dataCount) {
  const { data, error } = await supabase
    .from('xml_status')
    .upsert({
      key,
      status,
      last_update: lastUpdate,
      data_count: dataCount
    }, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Комплексные операции
// ============================================================================

/**
 * Получить данные конкретной таблицы
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
            priceHistory: item.price_history,
            comments: item.comments,
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

/**
 * Получить все данные приложения БЕЗ данных таблиц (только метаданные)
 * Данные таблиц загружаются отдельно через getTableData()
 */
async function getAllAppData() {
  try {
    // Загружаем все данные параллельно
    const [
      tables,
      globalCommissions,
      globalItemChanges,
      crmCategories,
      crmData,
      promData,
      xmlStatusCrm,
      xmlStatusProm
    ] = await Promise.all([
      getAllTables(),
      getGlobalCommissions(),
      getGlobalItemChanges(),
      getCrmCategories(),
      getGlobalXmlData('crm'),
      getGlobalXmlData('prom'),
      getXmlStatus('global_crm'),
      getXmlStatus('global_prom')
    ]);

    // Возвращаем только метаданные таблиц (БЕЗ data)
    // Данные будут загружаться отдельно через GET /api/tables/:id
    const tablesMetadata = tables.map(table => ({
      id: table.id,
      name: table.name,
      fileName: table.file_name,
      uploadTime: table.upload_time,
      data: [] // Пустой массив - данные загружаются отдельно
    }));

    // Формируем структуру данных аналогичную JSON
    return {
      tables: tablesMetadata,
      globalCommissions,
      globalItemChanges,
      xmlLastUpdate: {
        crm: xmlStatusCrm?.last_update || null,
        prom: xmlStatusProm?.last_update || null
      },
      xmlDataCounts: {
        crm: xmlStatusCrm?.data_count || 0,
        prom: xmlStatusProm?.data_count || 0
      },
      availableCrmCategories: crmCategories,
      tableXmlData: {},
      tableXmlLoadingStatus: {},
      globalCrmData: crmData,
      globalPromData: promData,
      globalXmlLoadingStatus: {
        crm: xmlStatusCrm?.status || 'not_loaded',
        prom: xmlStatusProm?.status || 'not_loaded'
      },
      lastSaved: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка загрузки данных из БД:', error);
    throw error;
  }
}

/**
 * Сохранить все данные приложения (аналог POST /api/data)
 */
async function saveAllAppData(appData) {
  try {
    // Сохраняем глобальные данные
    await Promise.all([
      saveGlobalCommissions(appData.globalCommissions || {}),
      saveGlobalItemChanges(appData.globalItemChanges || {})
    ]);

    // Сохраняем XML данные
    if (appData.globalCrmData && Object.keys(appData.globalCrmData).length > 0) {
      await saveGlobalXmlData('crm', appData.globalCrmData);
    }
    if (appData.globalPromData && Object.keys(appData.globalPromData).length > 0) {
      await saveGlobalXmlData('prom', appData.globalPromData);
    }

    // Сохраняем XML статусы
    const xmlStatus = appData.globalXmlLoadingStatus || { crm: 'not_loaded', prom: 'not_loaded' };
    await Promise.all([
      saveXmlStatus(
        'global_crm',
        xmlStatus.crm,
        appData.xmlLastUpdate?.crm || null,
        appData.xmlDataCounts?.crm || 0
      ),
      saveXmlStatus(
        'global_prom',
        xmlStatus.prom,
        appData.xmlLastUpdate?.prom || null,
        appData.xmlDataCounts?.prom || 0
      )
    ]);

    console.log('✅ Данные успешно сохранены в БД');
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных в БД:', error);
    throw error;
  }
}

// ============================================================================
// Экспорт
// ============================================================================

module.exports = {
  supabase,
  // Tables
  getAllTables,
  getTableById,
  getTableData,
  createTable,
  deleteTable,
  // Table Items
  getTableItems,
  createTableItems,
  updateTableItem,
  deleteTableItems,
  // Categories
  getCrmCategories,
  getItemsByCategory,
  saveItemsToCategory,
  addItemToCategory,
  removeItemFromCategory,
  // Global Commissions
  getGlobalCommissions,
  saveGlobalCommissions,
  // Global Item Changes
  getGlobalItemChanges,
  saveGlobalItemChanges,
  // XML Data
  getGlobalXmlData,
  saveGlobalXmlData,
  getTableXmlData,
  saveTableXmlData,
  getXmlStatus,
  saveXmlStatus,
  // Complex operations
  getAllAppData,
  saveAllAppData
};

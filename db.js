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

    // Загружаем XML данные для каждой таблицы
    const tableXmlData = {};
    const tableXmlLoadingStatus = {};
    const xmlLastUpdateTable = {};
    const xmlDataCountsTable = {};

    for (const table of tables) {
      try {
        const xmlData = await getTableXmlData(table.id);
        if (xmlData && (Object.keys(xmlData).length > 0)) {
          tableXmlData[table.id] = xmlData;
        }

        const xmlStatus = await getXmlStatus(`table_${table.id}`);
        if (xmlStatus) {
          // Восстанавливаем статус загрузки
          tableXmlLoadingStatus[table.id] = {
            crm: xmlStatus.status || 'not_loaded',
            prom: xmlStatus.status || 'not_loaded'
          };
          // Восстанавливаем время последнего обновления
          if (xmlStatus.last_update) {
            xmlLastUpdateTable[`table_${table.id}`] = xmlStatus.last_update;
          }
          // Восстанавливаем счётчики
          if (xmlStatus.data_count) {
            xmlDataCountsTable[`table_${table.id}_crm`] = xmlStatus.data_count;
            xmlDataCountsTable[`table_${table.id}_prom`] = xmlStatus.data_count;
          }
        }
      } catch (err) {
        console.log(`⚠️ Не удалось загрузить XML данные для таблицы ${table.id}:`, err.message);
      }
    }

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
        prom: xmlStatusProm?.last_update || null,
        ...xmlLastUpdateTable // Добавляем данные таблиц
      },
      xmlDataCounts: {
        crm: xmlStatusCrm?.data_count || 0,
        prom: xmlStatusProm?.data_count || 0,
        ...xmlDataCountsTable // Добавляем счётчики таблиц
      },
      availableCrmCategories: crmCategories,
      tableXmlData, // Загруженные XML данные таблиц
      tableXmlLoadingStatus, // Статусы загрузки таблиц
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

    // Сохраняем изменения в таблицах (только если есть данные)
    // Это нужно для сохранения изменений цен, комментариев и т.д.
    if (appData.tables && Array.isArray(appData.tables)) {
      const savePromises = [];

      for (const table of appData.tables) {
        // Сохраняем только таблицы с данными (пропускаем пустые метаданные)
        if (table.data && Array.isArray(table.data) && table.data.length > 0) {
          console.log(`💾 Сохранение ${table.data.length} записей таблицы ${table.id}`);

          // Преобразуем данные в формат БД
          const items = table.data.map(item => ({
            table_id: table.id,
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
            price_history: item.priceHistory || [],
            comments: item.comments || [],
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

          // Сохраняем items пакетами
          savePromises.push(createTableItems(items));
        }
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        console.log(`✅ Сохранено ${savePromises.length} таблиц с данными`);
      }
    }

    // Сохраняем глобальные XML данные
    if (appData.globalCrmData && Object.keys(appData.globalCrmData).length > 0) {
      await saveGlobalXmlData('crm', appData.globalCrmData);
    }
    if (appData.globalPromData && Object.keys(appData.globalPromData).length > 0) {
      await saveGlobalXmlData('prom', appData.globalPromData);
    }

    // Сохраняем XML данные для каждой таблицы
    if (appData.tableXmlData && typeof appData.tableXmlData === 'object') {
      const tableXmlPromises = [];
      for (const [tableId, xmlData] of Object.entries(appData.tableXmlData)) {
        if (xmlData && (xmlData.crm || xmlData.prom)) {
          const loadingStatus = appData.tableXmlLoadingStatus?.[tableId] || { crm: 'not_loaded', prom: 'not_loaded' };
          tableXmlPromises.push(
            saveTableXmlData(tableId, xmlData, loadingStatus)
          );
        }
      }
      if (tableXmlPromises.length > 0) {
        await Promise.all(tableXmlPromises);
        console.log(`📋 Сохранены XML данные для ${tableXmlPromises.length} таблиц`);
      }
    }

    // Сохраняем XML статусы
    const xmlStatus = appData.globalXmlLoadingStatus || { crm: 'not_loaded', prom: 'not_loaded' };
    const xmlStatusPromises = [
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
    ];

    // Сохраняем XML статусы для каждой таблицы
    if (appData.xmlLastUpdate || appData.xmlDataCounts || appData.tableXmlLoadingStatus) {
      const tableKeys = new Set();

      // Собираем все ключи таблиц из разных источников
      if (appData.xmlLastUpdate) {
        Object.keys(appData.xmlLastUpdate).forEach(key => {
          if (key.startsWith('table_')) tableKeys.add(key.replace('table_', ''));
        });
      }

      if (appData.tableXmlLoadingStatus) {
        Object.keys(appData.tableXmlLoadingStatus).forEach(key => tableKeys.add(key));
      }

      // Сохраняем статус для каждой таблицы
      for (const tableId of tableKeys) {
        const tableKey = `table_${tableId}`;
        const loadingStatus = appData.tableXmlLoadingStatus?.[tableId] || { crm: 'not_loaded', prom: 'not_loaded' };
        const lastUpdate = appData.xmlLastUpdate?.[tableKey] || null;
        const crmCount = appData.xmlDataCounts?.[`${tableKey}_crm`] || 0;
        const promCount = appData.xmlDataCounts?.[`${tableKey}_prom`] || 0;

        // Определяем общий статус (loaded только если оба loaded)
        const overallStatus = (loadingStatus.crm === 'loaded' && loadingStatus.prom === 'loaded')
          ? 'loaded'
          : (loadingStatus.crm === 'loading' || loadingStatus.prom === 'loading')
          ? 'loading'
          : 'not_loaded';

        xmlStatusPromises.push(
          saveXmlStatus(
            tableKey,
            overallStatus,
            lastUpdate,
            crmCount + promCount
          )
        );
      }
    }

    await Promise.all(xmlStatusPromises);
    console.log('✅ Все данные успешно сохранены в БД');
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

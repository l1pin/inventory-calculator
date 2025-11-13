require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Константы
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'app_data.json');
const CATEGORIES_DIR = path.join(DATA_DIR, 'categories');
const GLOBAL_DIR = path.join(DATA_DIR, 'global');

// Утилиты
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Миграция CRM категорий
// ============================================================================
async function migrateCrmCategories() {
  console.log('\n📦 Миграция CRM категорий...');

  try {
    const categoriesFile = path.join(GLOBAL_DIR, 'categories.json');
    const categoriesData = JSON.parse(await fs.readFile(categoriesFile, 'utf8'));

    if (!categoriesData.data || !Array.isArray(categoriesData.data)) {
      console.log('⚠️  Нет CRM категорий для миграции');
      return;
    }

    const categories = categoriesData.data.map(cat => ({
      id: cat.id,
      name: cat.name
    }));

    console.log(`   Найдено категорий: ${categories.length}`);

    // Вставляем категории пакетами по 100
    const batchSize = 100;
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      const { error } = await supabase
        .from('crm_categories')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Ошибка при вставке категорий ${i}-${i + batch.length}:`, error);
      } else {
        console.log(`   ✅ Мигрировано ${Math.min(i + batchSize, categories.length)}/${categories.length} категорий`);
      }

      await delay(100); // Небольшая задержка между пакетами
    }

    console.log('✅ CRM категории мигрированы');
  } catch (error) {
    console.error('❌ Ошибка миграции CRM категорий:', error.message);
  }
}

// ============================================================================
// Миграция категорий товаров (new, optimization, etc.)
// ============================================================================
async function migrateItemCategories() {
  console.log('\n📦 Миграция категорий товаров...');

  const categoryTypes = ['new', 'optimization', 'ab', 'c_sale', 'off_season', 'unprofitable'];
  let totalItems = 0;

  for (const categoryType of categoryTypes) {
    try {
      const categoryFile = path.join(CATEGORIES_DIR, `${categoryType}.json`);
      const categoryData = JSON.parse(await fs.readFile(categoryFile, 'utf8'));

      if (!categoryData.items || !Array.isArray(categoryData.items)) {
        console.log(`   ⚠️  Нет данных для категории ${categoryType}`);
        continue;
      }

      const items = categoryData.items.map(itemId => ({
        category_type: categoryType,
        item_id: String(itemId)
      }));

      console.log(`   Категория ${categoryType}: ${items.length} товаров`);

      // Вставляем пакетами
      const batchSize = 500;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { error } = await supabase
          .from('item_categories')
          .upsert(batch, { onConflict: 'category_type,item_id', ignoreDuplicates: true });

        if (error) {
          console.error(`   ❌ Ошибка при вставке ${categoryType} ${i}-${i + batch.length}:`, error);
        }

        await delay(50);
      }

      totalItems += items.length;
      console.log(`   ✅ ${categoryType}: мигрировано ${items.length} товаров`);
    } catch (error) {
      console.error(`   ❌ Ошибка миграции категории ${categoryType}:`, error.message);
    }
  }

  console.log(`✅ Категории товаров мигрированы: ${totalItems} записей`);
}

// ============================================================================
// Миграция глобальных комиссий
// ============================================================================
async function migrateGlobalCommissions(appData) {
  console.log('\n📦 Миграция глобальных комиссий...');

  try {
    const commissions = appData.globalCommissions || {};
    const entries = Object.entries(commissions).map(([key, value]) => ({
      key,
      value: parseFloat(value) || 0
    }));

    console.log(`   Найдено комиссий: ${entries.length}`);

    if (entries.length === 0) {
      console.log('   ⚠️  Нет комиссий для миграции');
      return;
    }

    const { error } = await supabase
      .from('global_commissions')
      .upsert(entries, { onConflict: 'key' });

    if (error) {
      console.error('   ❌ Ошибка при вставке комиссий:', error);
    } else {
      console.log(`✅ Глобальные комиссии мигрированы: ${entries.length} записей`);
    }
  } catch (error) {
    console.error('❌ Ошибка миграции глобальных комиссий:', error.message);
  }
}

// ============================================================================
// Миграция глобальных изменений товаров
// ============================================================================
async function migrateGlobalItemChanges(appData) {
  console.log('\n📦 Миграция глобальных изменений товаров...');

  try {
    const itemChanges = appData.globalItemChanges || {};
    const entries = Object.entries(itemChanges).map(([itemId, changes]) => ({
      item_id: itemId,
      changes: changes
    }));

    console.log(`   Найдено изменений: ${entries.length}`);

    if (entries.length === 0) {
      console.log('   ⚠️  Нет изменений для миграции');
      return;
    }

    const { error } = await supabase
      .from('global_item_changes')
      .upsert(entries, { onConflict: 'item_id' });

    if (error) {
      console.error('   ❌ Ошибка при вставке изменений:', error);
    } else {
      console.log(`✅ Глобальные изменения мигрированы: ${entries.length} записей`);
    }
  } catch (error) {
    console.error('❌ Ошибка миграции глобальных изменений:', error.message);
  }
}

// ============================================================================
// Миграция XML статусов
// ============================================================================
async function migrateXmlStatus(appData) {
  console.log('\n📦 Миграция XML статусов...');

  try {
    const xmlStatus = [];

    // Глобальный статус загрузки
    const globalStatus = appData.globalXmlLoadingStatus || { crm: 'not_loaded', prom: 'not_loaded' };
    xmlStatus.push({
      key: 'global_crm',
      status: globalStatus.crm || 'not_loaded',
      last_update: appData.xmlLastUpdate?.crm ? new Date(appData.xmlLastUpdate.crm).toISOString() : null,
      data_count: appData.xmlDataCounts?.crm || 0
    });
    xmlStatus.push({
      key: 'global_prom',
      status: globalStatus.prom || 'not_loaded',
      last_update: appData.xmlLastUpdate?.prom ? new Date(appData.xmlLastUpdate.prom).toISOString() : null,
      data_count: appData.xmlDataCounts?.prom || 0
    });

    // Статусы загрузки таблиц
    const tableStatuses = appData.tableXmlLoadingStatus || {};
    Object.entries(tableStatuses).forEach(([tableId, status]) => {
      xmlStatus.push({
        key: `table_${tableId}`,
        status: status || 'not_loaded',
        last_update: null,
        data_count: 0
      });
    });

    console.log(`   Найдено статусов: ${xmlStatus.length}`);

    const { error } = await supabase
      .from('xml_status')
      .upsert(xmlStatus, { onConflict: 'key' });

    if (error) {
      console.error('   ❌ Ошибка при вставке статусов:', error);
    } else {
      console.log(`✅ XML статусы мигрированы: ${xmlStatus.length} записей`);
    }
  } catch (error) {
    console.error('❌ Ошибка миграции XML статусов:', error.message);
  }
}

// ============================================================================
// Миграция глобальных XML данных
// ============================================================================
async function migrateGlobalXmlData(appData) {
  console.log('\n📦 Миграция глобальных XML данных...');

  try {
    const xmlData = [];

    if (appData.globalCrmData && Object.keys(appData.globalCrmData).length > 0) {
      xmlData.push({
        data_type: 'crm',
        data: appData.globalCrmData
      });
      console.log(`   CRM данные: ${Object.keys(appData.globalCrmData).length} записей`);
    }

    if (appData.globalPromData && Object.keys(appData.globalPromData).length > 0) {
      xmlData.push({
        data_type: 'prom',
        data: appData.globalPromData
      });
      console.log(`   Prom данные: ${Object.keys(appData.globalPromData).length} записей`);
    }

    if (xmlData.length === 0) {
      console.log('   ⚠️  Нет глобальных XML данных для миграции');
      return;
    }

    const { error } = await supabase
      .from('global_xml_data')
      .upsert(xmlData, { onConflict: 'data_type' });

    if (error) {
      console.error('   ❌ Ошибка при вставке XML данных:', error);
    } else {
      console.log(`✅ Глобальные XML данные мигрированы: ${xmlData.length} типов`);
    }
  } catch (error) {
    console.error('❌ Ошибка миграции глобальных XML данных:', error.message);
  }
}

// ============================================================================
// Миграция таблиц и их данных
// ============================================================================
async function migrateTables(appData) {
  console.log('\n📦 Миграция таблиц...');

  try {
    const tables = appData.tables || [];
    console.log(`   Найдено таблиц: ${tables.length}`);

    if (tables.length === 0) {
      console.log('   ⚠️  Нет таблиц для миграции');
      return;
    }

    let totalItems = 0;

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      console.log(`\n   [${i + 1}/${tables.length}] Таблица: ${table.name} (ID: ${table.id})`);

      // Вставляем метаданные таблицы
      const { error: tableError } = await supabase
        .from('tables')
        .upsert({
          id: String(table.id),
          name: table.name,
          file_name: table.fileName,
          upload_time: table.uploadTime ? new Date(table.uploadTime).toISOString() : new Date().toISOString()
        }, { onConflict: 'id' });

      if (tableError) {
        console.error(`   ❌ Ошибка при вставке таблицы ${table.name}:`, tableError);
        continue;
      }

      // Вставляем товары таблицы
      if (table.data && Array.isArray(table.data)) {
        // Удаляем дубликаты по item_id (оставляем последнее вхождение)
        const uniqueItemsMap = new Map();
        table.data.forEach(item => {
          uniqueItemsMap.set(item.id, item);
        });
        const uniqueData = Array.from(uniqueItemsMap.values());

        if (uniqueData.length < table.data.length) {
          console.log(`      ⚠️  Найдено дубликатов: ${table.data.length - uniqueData.length}, оставлены уникальные: ${uniqueData.length}`);
        }

        const items = uniqueData.map(item => ({
          table_id: String(table.id),
          item_id: item.id,
          base_cost: item.baseCost,
          total_cost: item.totalCost,
          commission: item.commission,
          stock: item.stock || 0,
          days_stock: item.daysStock || 0,
          sales_month: item.salesMonth || 0,
          applications_month: item.applicationsMonth,
          sales_2weeks: item.sales2Weeks || 0,
          applications_2weeks: item.applications2Weeks,
          markup50_12: item.markup50_12,
          new_price: item.newPrice || null,
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

        console.log(`      Товаров: ${items.length}`);

        // Вставляем пакетами по 100 (Supabase ограничение)
        const batchSize = 100;
        for (let j = 0; j < items.length; j += batchSize) {
          const batch = items.slice(j, j + batchSize);
          const { error: itemsError } = await supabase
            .from('table_items')
            .insert(batch, { ignoreDuplicates: true });

          if (itemsError) {
            console.error(`      ❌ Ошибка при вставке товаров ${j}-${j + batch.length}:`, itemsError);
          } else {
            process.stdout.write(`\r      Прогресс: ${Math.min(j + batchSize, items.length)}/${items.length} товаров`);
          }

          await delay(50);
        }

        console.log(`\n      ✅ Мигрировано товаров: ${items.length}`);
        totalItems += items.length;
      }

      // Вставляем XML данные таблицы
      const tableXmlData = appData.tableXmlData?.[table.id];
      if (tableXmlData && Object.keys(tableXmlData).length > 0) {
        const { error: xmlError } = await supabase
          .from('table_xml_data')
          .upsert({
            table_id: String(table.id),
            xml_data: tableXmlData,
            loading_status: appData.tableXmlLoadingStatus?.[table.id] || 'not_loaded'
          }, { onConflict: 'table_id' });

        if (xmlError) {
          console.error(`      ❌ Ошибка при вставке XML данных:`, xmlError);
        } else {
          console.log(`      ✅ XML данные мигрированы`);
        }
      }
    }

    console.log(`\n✅ Таблицы мигрированы: ${tables.length} таблиц, ${totalItems} товаров`);
  } catch (error) {
    console.error('❌ Ошибка миграции таблиц:', error.message);
  }
}

// ============================================================================
// Главная функция миграции
// ============================================================================
async function migrate() {
  console.log('🚀 Начало миграции данных в Supabase...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📁 Директория данных: ${DATA_DIR}\n`);

  const startTime = Date.now();

  try {
    // Проверка подключения к Supabase
    const { error: healthError } = await supabase.from('tables').select('count').limit(0);
    if (healthError) {
      console.error('❌ Ошибка подключения к Supabase:', healthError);
      console.error('\nПроверьте:');
      console.error('1. SUPABASE_URL и SUPABASE_SERVICE_KEY в .env файле');
      console.error('2. Что миграция схемы выполнена (001_initial_schema.sql)');
      console.error('3. Что база данных доступна');
      process.exit(1);
    }
    console.log('✅ Подключение к Supabase установлено\n');

    // Загрузка основного файла данных
    console.log('📂 Загрузка данных из JSON файлов...');
    let appData = {};
    try {
      const appDataContent = await fs.readFile(DATA_FILE, 'utf8');
      appData = JSON.parse(appDataContent);
      console.log('✅ app_data.json загружен');
    } catch (error) {
      console.log('⚠️  app_data.json не найден или пуст, используем пустое состояние');
      appData = {
        tables: [],
        globalCommissions: {},
        globalItemChanges: {},
        xmlLastUpdate: {},
        xmlDataCounts: {},
        availableCrmCategories: [],
        tableXmlData: {},
        tableXmlLoadingStatus: {},
        globalCrmData: {},
        globalPromData: {},
        globalXmlLoadingStatus: { crm: 'not_loaded', prom: 'not_loaded' }
      };
    }

    // Выполнение миграций по порядку
    await migrateCrmCategories();
    await migrateItemCategories();
    await migrateGlobalCommissions(appData);
    await migrateGlobalItemChanges(appData);
    await migrateXmlStatus(appData);
    await migrateGlobalXmlData(appData);
    await migrateTables(appData);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Миграция завершена успешно! Время выполнения: ${duration}с`);
    console.log('\n📊 Следующие шаги:');
    console.log('1. Проверьте данные в Supabase Dashboard → Table Editor');
    console.log('2. Обновите серверный код для работы с БД (см. MIGRATION_PLAN.md)');
    console.log('3. Протестируйте приложение');
    console.log('4. Создайте backup JSON файлов перед удалением\n');

  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error);
    console.error('Стек ошибки:', error.stack);
    process.exit(1);
  }
}

// Запуск миграции
migrate();

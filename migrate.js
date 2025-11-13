const fs = require('fs').promises;
const path = require('path');

// Конфигурация путей
const OLD_DATA_FILE = path.join(__dirname, 'data', 'app_data.json');
const DATA_DIR = path.join(__dirname, 'data');
const TABLES_DIR = path.join(DATA_DIR, 'tables');
const GLOBAL_DIR = path.join(DATA_DIR, 'global');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}[${new Date().toISOString()}] ${message}${colors.reset}`);
};

// Создание структуры папок
async function createDirectoryStructure() {
  log('🏗️ Создание структуры папок...', 'blue');
  
  const directories = [
    TABLES_DIR,
    GLOBAL_DIR,
    path.join(BACKUPS_DIR, 'tables'),
    path.join(BACKUPS_DIR, 'global')
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      log(`✅ Создана папка: ${dir}`, 'green');
    } catch (error) {
      log(`❌ Ошибка создания папки ${dir}: ${error.message}`, 'red');
    }
  }
}

// Функция безопасного сохранения JSON
async function safeWriteJSON(filePath, data, description) {
  try {
    const tempFile = filePath + '.tmp';
    const jsonData = JSON.stringify(data, null, 2);
    
    await fs.writeFile(tempFile, jsonData, 'utf8');
    await fs.rename(tempFile, filePath);
    
    log(`✅ Сохранен ${description}: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Ошибка сохранения ${description}: ${error.message}`, 'red');
    return false;
  }
}

// Миграция таблиц
async function migrateTables(tables, tableXmlData, tableXmlLoadingStatus) {
  log('📋 Миграция таблиц...', 'blue');
  
  if (!Array.isArray(tables) || tables.length === 0) {
    log('⚠️ Таблицы не найдены или пусты', 'yellow');
    return;
  }
  
  for (const table of tables) {
    try {
      const tableId = table.id.toString();
      const tableDir = path.join(TABLES_DIR, `table_${tableId}`);
      
      // Создаем папку для таблицы
      await fs.mkdir(tableDir, { recursive: true });
      
      // Основные данные таблицы
      const tableData = {
        id: table.id,
        name: table.name,
        fileName: table.fileName,
        uploadTime: table.uploadTime,
        data: table.data || [],
        originalHeaders: table.originalHeaders || [],
        filters: table.filters || {}
      };
      
      // XML данные для таблицы
      const xmlData = {
        crm: tableXmlData[tableId]?.crm || {},
        prom: tableXmlData[tableId]?.prom || {},
        categories: tableXmlData[tableId]?.categories || [],
        lastUpdate: new Date().toISOString()
      };
      
      // Метаданные
      const metadata = {
        created: table.uploadTime || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        itemsCount: table.data ? table.data.length : 0,
        xmlLoadingStatus: tableXmlLoadingStatus[tableId] || { crm: 'not_loaded', prom: 'not_loaded' },
        version: '2.0'
      };
      
      // Сохраняем файлы
      await safeWriteJSON(
        path.join(tableDir, 'table.json'), 
        tableData, 
        `таблица ${table.name}`
      );
      
      await safeWriteJSON(
        path.join(tableDir, 'xml_data.json'), 
        xmlData, 
        `XML данные для ${table.name}`
      );
      
      await safeWriteJSON(
        path.join(tableDir, 'metadata.json'), 
        metadata, 
        `метаданные для ${table.name}`
      );
      
      log(`✅ Таблица "${table.name}" (ID: ${tableId}) мигрирована`, 'green');
      
    } catch (error) {
      log(`❌ Ошибка миграции таблицы ${table.name}: ${error.message}`, 'red');
    }
  }
}

// Миграция глобальных данных
async function migrateGlobalData(data) {
  log('🌐 Миграция глобальных данных...', 'blue');
  
  // Комиссии
  if (data.globalCommissions) {
    await safeWriteJSON(
      path.join(GLOBAL_DIR, 'commissions.json'),
      {
        data: data.globalCommissions,
        lastModified: new Date().toISOString(),
        itemsCount: Object.keys(data.globalCommissions).length
      },
      'глобальные комиссии'
    );
  }
  
  // Изменения товаров
  if (data.globalItemChanges) {
    await safeWriteJSON(
      path.join(GLOBAL_DIR, 'item_changes.json'),
      {
        data: data.globalItemChanges,
        lastModified: new Date().toISOString(),
        itemsCount: Object.keys(data.globalItemChanges).length
      },
      'глобальные изменения товаров'
    );
  }
  
  // CRM данные
  if (data.globalCrmData) {
    await safeWriteJSON(
      path.join(GLOBAL_DIR, 'crm_data.json'),
      {
        data: data.globalCrmData,
        lastModified: new Date().toISOString(),
        itemsCount: Object.keys(data.globalCrmData).length
      },
      'глобальные CRM данные'
    );
  }
  
  // PROM данные
  if (data.globalPromData) {
    await safeWriteJSON(
      path.join(GLOBAL_DIR, 'prom_data.json'),
      {
        data: data.globalPromData,
        lastModified: new Date().toISOString(),
        itemsCount: Object.keys(data.globalPromData).length
      },
      'глобальные PROM данные'
    );
  }
  
  // Категории
  if (data.availableCrmCategories) {
    await safeWriteJSON(
      path.join(GLOBAL_DIR, 'categories.json'),
      {
        data: data.availableCrmCategories,
        lastModified: new Date().toISOString(),
        itemsCount: data.availableCrmCategories.length
      },
      'CRM категории'
    );
  }
  
  // Статусы XML
  const xmlStatus = {
    global: data.globalXmlLoadingStatus || { crm: 'not_loaded', prom: 'not_loaded' },
    lastUpdate: data.xmlLastUpdate || {},
    dataCounts: data.xmlDataCounts || {},
    lastModified: new Date().toISOString()
  };
  
  await safeWriteJSON(
    path.join(GLOBAL_DIR, 'xml_status.json'),
    xmlStatus,
    'статусы XML'
  );
}

// Создание бэкапа старых данных
async function backupOldData() {
  log('💾 Создание бэкапа старых данных...', 'blue');
  
  try {
    const backupDate = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUPS_DIR, 'migration', backupDate);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Копируем старый файл
    const oldDataExists = await fs.access(OLD_DATA_FILE).then(() => true).catch(() => false);
    
    if (oldDataExists) {
      await fs.copyFile(
        OLD_DATA_FILE, 
        path.join(backupDir, 'app_data_backup.json')
      );
      log(`✅ Бэкап создан: ${backupDir}`, 'green');
    } else {
      log('⚠️ Старый файл данных не найден', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Ошибка создания бэкапа: ${error.message}`, 'red');
  }
}

// Проверка целостности миграции
async function verifyMigration() {
  log('🔍 Проверка целостности миграции...', 'blue');
  
  let errors = 0;
  let warnings = 0;
  
  // Проверяем структуру папок
  const requiredDirs = [TABLES_DIR, GLOBAL_DIR];
  for (const dir of requiredDirs) {
    try {
      await fs.access(dir);
      log(`✅ Папка существует: ${dir}`, 'green');
    } catch {
      log(`❌ Папка отсутствует: ${dir}`, 'red');
      errors++;
    }
  }
  
  // Проверяем глобальные файлы
  const globalFiles = [
    'commissions.json',
    'item_changes.json', 
    'crm_data.json',
    'prom_data.json',
    'categories.json',
    'xml_status.json'
  ];
  
  for (const file of globalFiles) {
    try {
      const filePath = path.join(GLOBAL_DIR, file);
      await fs.access(filePath);
      
      // Проверяем валидность JSON
      const content = await fs.readFile(filePath, 'utf8');
      JSON.parse(content);
      
      log(`✅ Глобальный файл OK: ${file}`, 'green');
    } catch (error) {
      log(`⚠️ Проблема с файлом ${file}: ${error.message}`, 'yellow');
      warnings++;
    }
  }
  
  // Проверяем таблицы
  try {
    const tableDirs = await fs.readdir(TABLES_DIR);
    const tableCount = tableDirs.filter(dir => dir.startsWith('table_')).length;
    
    log(`📊 Найдено таблиц: ${tableCount}`, 'cyan');
    
    for (const tableDir of tableDirs) {
      if (tableDir.startsWith('table_')) {
        const tablePath = path.join(TABLES_DIR, tableDir);
        const requiredFiles = ['table.json', 'xml_data.json', 'metadata.json'];
        
        for (const file of requiredFiles) {
          try {
            const filePath = path.join(tablePath, file);
            await fs.access(filePath);
            
            // Проверяем валидность JSON
            const content = await fs.readFile(filePath, 'utf8');
            JSON.parse(content);
            
          } catch (error) {
            log(`⚠️ Проблема с файлом ${tableDir}/${file}: ${error.message}`, 'yellow');
            warnings++;
          }
        }
      }
    }
  } catch (error) {
    log(`❌ Ошибка проверки таблиц: ${error.message}`, 'red');
    errors++;
  }
  
  // Итоги проверки
  log(`\n📈 Результаты проверки:`, 'cyan');
  log(`   ✅ Ошибок: ${errors}`, errors > 0 ? 'red' : 'green');
  log(`   ⚠️ Предупреждений: ${warnings}`, warnings > 0 ? 'yellow' : 'green');
  
  return { errors, warnings };
}

// Основная функция миграции
async function runMigration() {
  log('🚀 Начало миграции данных...', 'cyan');
  log('=====================================', 'cyan');
  
  try {
    // Проверяем существование старого файла
    const oldDataExists = await fs.access(OLD_DATA_FILE).then(() => true).catch(() => false);
    
    if (!oldDataExists) {
      log('❌ Файл app_data.json не найден!', 'red');
      log(`   Ожидается в: ${OLD_DATA_FILE}`, 'red');
      return;
    }
    
    // Читаем старые данные
    log('📖 Чтение старых данных...', 'blue');
    const oldDataContent = await fs.readFile(OLD_DATA_FILE, 'utf8');
    const oldData = JSON.parse(oldDataContent);
    
    log(`✅ Данные загружены. Размер: ${(oldDataContent.length / 1024 / 1024).toFixed(2)} MB`, 'green');
    
    // Создаем бэкап
    await backupOldData();
    
    // Создаем структуру папок
    await createDirectoryStructure();
    
    // Мигрируем таблицы
    await migrateTables(
      oldData.tables || [], 
      oldData.tableXmlData || {}, 
      oldData.tableXmlLoadingStatus || {}
    );
    
    // Мигрируем глобальные данные
    await migrateGlobalData(oldData);
    
    // Проверяем целостность
    const verification = await verifyMigration();
    
    log('\n🎉 Миграция завершена!', 'green');
    log('=====================================', 'cyan');
    
    if (verification.errors === 0) {
      log('✅ Миграция прошла успешно!', 'green');
      log(`📁 Новые данные находятся в: ${DATA_DIR}`, 'cyan');
      log(`💾 Бэкап создан в: ${BACKUPS_DIR}/migration/`, 'cyan');
      
      // Предлагаем переименовать старый файл
      const renamedFile = OLD_DATA_FILE + '.migrated_' + new Date().toISOString().replace(/[:.]/g, '-');
      await fs.rename(OLD_DATA_FILE, renamedFile);
      log(`🔄 Старый файл переименован в: ${path.basename(renamedFile)}`, 'yellow');
      
    } else {
      log('⚠️ Миграция завершена с ошибками. Проверьте логи выше.', 'yellow');
    }
    
  } catch (error) {
    log(`💥 Критическая ошибка миграции: ${error.message}`, 'red');
    log(`📚 Стек ошибки: ${error.stack}`, 'red');
  }
}

// Запуск миграции
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
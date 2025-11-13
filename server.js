const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'app_data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const CATEGORIES_DIR = path.join(DATA_DIR, 'categories');
const CATEGORY_FILES = {
  new: path.join(CATEGORIES_DIR, 'new.json'),
  optimization: path.join(CATEGORIES_DIR, 'optimization.json'),
  ab: path.join(CATEGORIES_DIR, 'ab.json'),
  c_sale: path.join(CATEGORIES_DIR, 'c_sale.json'),
  off_season: path.join(CATEGORIES_DIR, 'off_season.json'),
  unprofitable: path.join(CATEGORIES_DIR, 'unprofitable.json')
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Увеличиваем лимит для больших таблиц
app.use(express.static('build')); // Для статических файлов React

// Создаем папки для данных и бэкапов если их нет
async function ensureDirectories() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Создана папка для данных:', DATA_DIR);
  }
  
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('📁 Создана папка для бэкапов:', BACKUP_DIR);
  }
  
  try {
    await fs.access(CATEGORIES_DIR);
  } catch {
    await fs.mkdir(CATEGORIES_DIR, { recursive: true });
    console.log('📁 Создана папка для категорий:', CATEGORIES_DIR);
  }
}

// Функция создания резервной копии
async function createBackup() {
  try {
    const backupFileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Проверяем, существует ли основной файл
    try {
      await fs.access(DATA_FILE);
      const data = await fs.readFile(DATA_FILE, 'utf8');
      await fs.writeFile(backupPath, data);
      console.log(`💾 Создан бэкап: ${backupFileName}`);
      
      // Удаляем старые бэкапы (оставляем только последние 10)
      const backups = await fs.readdir(BACKUP_DIR);
      const sortedBackups = backups
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (sortedBackups.length > 10) {
        for (let i = 10; i < sortedBackups.length; i++) {
          await fs.unlink(path.join(BACKUP_DIR, sortedBackups[i]));
          console.log(`🗑️ Удален старый бэкап: ${sortedBackups[i]}`);
        }
      }
    } catch (error) {
      // Основной файл не существует, это нормально для первого запуска
      console.log('ℹ️ Основной файл данных еще не существует, бэкап не создан');
    }
  } catch (error) {
    console.error('❌ Ошибка создания бэкапа:', error);
  }
}

// Функция безопасного сохранения данных
async function safeWriteData(data) {
  const tempFile = DATA_FILE + '.tmp';
  
  try {
    // Создаем бэкап перед изменением
    await createBackup();
    
    // Безопасная сериализация с обработкой циклических ссылок
    // Безопасная сериализация с обработкой циклических ссылок
    let jsonData;
    try {
      const seen = new WeakSet();
      jsonData = JSON.stringify(data, (key, value) => {
        // Предотвращаем циклические ссылки
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
          
          // Проверяем на основные типы данных
          if (value instanceof Date) return value.toISOString();
          if (Array.isArray(value)) return value;
          
          // Для больших объектов логируем предупреждение
          if (Object.keys(value).length > 10000) {
            console.warn(`⚠️ Большой объект с ключом "${key}": ${Object.keys(value).length} свойств`);
          }
          
          // Проверяем на некорректные значения
          if (value.constructor && value.constructor.name && 
              !['Object', 'Array'].includes(value.constructor.name)) {
            console.warn(`⚠️ Необычный тип объекта "${value.constructor.name}" для ключа "${key}"`);
          }
        }
        
        // Фильтруем undefined и функции
        if (typeof value === 'undefined' || typeof value === 'function') {
          return null;
        }
        
        return value;
      }, 2);
    } catch (serError) {
      console.error('❌ Ошибка JSON.stringify:', serError);
      console.error('❌ Детали ошибки:', serError.stack);
      throw new Error(`Сериализация данных не удалась: ${serError.message}`);
    }
    
    // Записываем во временный файл
    await fs.writeFile(tempFile, jsonData, 'utf8');
    
    // Проверяем, что временный файл записался корректно
    const tempData = await fs.readFile(tempFile, 'utf8');
    JSON.parse(tempData); // Проверяем валидность JSON
    
    // Атомарно перемещаем временный файл в основной
    await fs.rename(tempFile, DATA_FILE);
    
    console.log(`✅ Данные безопасно сохранены в ${DATA_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка безопасного сохранения:', error);
    
    // Удаляем поврежденный временный файл если он существует
    try {
      await fs.unlink(tempFile);
    } catch {}
    
    throw error;
  }
}

// Функция восстановления данных из бэкапа
async function restoreFromBackup() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    const sortedBackups = backups
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (sortedBackups.length === 0) {
      console.log('📂 Нет доступных бэкапов');
      return null;
    }
    
    const latestBackup = path.join(BACKUP_DIR, sortedBackups[0]);
    const backupData = await fs.readFile(latestBackup, 'utf8');
    const parsedData = JSON.parse(backupData);
    
    console.log(`🔄 Восстановление из бэкапа: ${sortedBackups[0]}`);
    return parsedData;
  } catch (error) {
    console.error('❌ Ошибка восстановления из бэкапа:', error);
    return null;
  }
}

// Функция для сохранения категории
async function saveCategoryToFile(categoryType, itemIds) {
  try {
    const categoryFile = CATEGORY_FILES[categoryType];
    if (!categoryFile) {
      throw new Error(`Неизвестный тип категории: ${categoryType}`);
    }
    
    const categoryData = {
      categoryType,
      items: Array.isArray(itemIds) ? itemIds : [],
      lastUpdated: new Date().toISOString(),
      count: Array.isArray(itemIds) ? itemIds.length : 0
    };
    
    await fs.writeFile(categoryFile, JSON.stringify(categoryData, null, 2), 'utf8');
    console.log(`✅ Категория "${categoryType}" сохранена: ${categoryData.count} позиций`);
    
    return categoryData;
  } catch (error) {
    console.error(`❌ Ошибка сохранения категории "${categoryType}":`, error);
    throw error;
  }
}

// Функция для загрузки категории
async function loadCategoryFromFile(categoryType) {
  try {
    const categoryFile = CATEGORY_FILES[categoryType];
    if (!categoryFile) {
      throw new Error(`Неизвестный тип категории: ${categoryType}`);
    }
    
    try {
      const data = await fs.readFile(categoryFile, 'utf8');
      const categoryData = JSON.parse(data);
      
      // Валидация структуры
      if (!categoryData || !Array.isArray(categoryData.items)) {
        throw new Error('Неверная структура файла категории');
      }
      
      console.log(`📂 Загружена категория "${categoryType}": ${categoryData.items.length} позиций`);
      return categoryData.items;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📂 Файл категории "${categoryType}" не найден, возвращаем пустой массив`);
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error(`❌ Ошибка загрузки категории "${categoryType}":`, error);
    return [];
  }
}

// Функция для загрузки всех категорий
async function loadAllCategories() {
  const categories = {};
  
  for (const categoryType of Object.keys(CATEGORY_FILES)) {
    categories[categoryType] = await loadCategoryFromFile(categoryType);
  }
  
  console.log('📂 Загружены все категории:', Object.keys(categories).map(key => `${key}(${categories[key].length})`).join(', '));
  return categories;
}

// Загрузка данных с проверкой целостности
app.get('/api/data', async (req, res) => {
  try {
    await ensureDirectories();
    
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Проверяем структуру данных
const validData = {
  tables: Array.isArray(parsedData.tables) ? parsedData.tables : [],
  globalCommissions: parsedData.globalCommissions && typeof parsedData.globalCommissions === 'object' ? parsedData.globalCommissions : {},
  globalItemChanges: parsedData.globalItemChanges && typeof parsedData.globalItemChanges === 'object' ? parsedData.globalItemChanges : {},
  xmlLastUpdate: parsedData.xmlLastUpdate && typeof parsedData.xmlLastUpdate === 'object' ? parsedData.xmlLastUpdate : {},
  xmlDataCounts: parsedData.xmlDataCounts && typeof parsedData.xmlDataCounts === 'object' ? parsedData.xmlDataCounts : {},
  availableCrmCategories: Array.isArray(parsedData.availableCrmCategories) ? parsedData.availableCrmCategories : [],
  tableXmlData: parsedData.tableXmlData && typeof parsedData.tableXmlData === 'object' ? parsedData.tableXmlData : {},
  tableXmlLoadingStatus: parsedData.tableXmlLoadingStatus && typeof parsedData.tableXmlLoadingStatus === 'object' ? parsedData.tableXmlLoadingStatus : {},
  globalCrmData: parsedData.globalCrmData && typeof parsedData.globalCrmData === 'object' ? parsedData.globalCrmData : {},
  globalPromData: parsedData.globalPromData && typeof parsedData.globalPromData === 'object' ? parsedData.globalPromData : {},
  globalXmlLoadingStatus: parsedData.globalXmlLoadingStatus && typeof parsedData.globalXmlLoadingStatus === 'object' ? parsedData.globalXmlLoadingStatus : { crm: 'not_loaded', prom: 'not_loaded' },
  lastSaved: parsedData.lastSaved || null
};
      
      console.log(`📊 Загружены данные: ${validData.tables.length} таблиц, ${Object.keys(validData.globalCommissions).length} комиссий`);
      res.json(validData);
    } catch (error) {
      console.log('⚠️ Основной файл поврежден или не существует, пытаемся восстановить из бэкапа...');
      
      // Пытаемся восстановить из бэкапа
      const backupData = await restoreFromBackup();
      
      if (backupData) {
        // Сохраняем восстановленные данные
        await safeWriteData(backupData);
        res.json(backupData);
      } else {
        // Возвращаем пустое состояние
const emptyState = {
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
        
        console.log('📝 Создаем новое пустое состояние');
        res.json(emptyState);
      }
    }
  } catch (error) {
    console.error('❌ Критическая ошибка при загрузке данных:', error);
    res.status(500).json({ 
      error: 'Ошибка при загрузке данных',
      details: error.message 
    });
  }
});

// Удаление таблицы
app.delete('/api/tables/:id', async (req, res) => {
  try {
    await ensureDirectories();
    
    const tableId = req.params.id;
    
    if (!tableId) {
      return res.status(400).json({ error: 'ID таблицы не указан' });
    }
    
    console.log(`🗑️ Запрос на удаление таблицы: ${tableId}`);
    
    // Загружаем текущие данные
    let currentData = {};
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      currentData = JSON.parse(data);
    } catch (error) {
      console.log('📂 Основной файл не найден, используем пустое состояние');
      currentData = { tables: [] };
    }
    
    // Проверяем наличие таблицы
    if (!Array.isArray(currentData.tables)) {
      return res.status(400).json({ error: 'Некорректная структура данных' });
    }
    
    const tableIndex = currentData.tables.findIndex(table => table.id.toString() === tableId.toString());
    
    if (tableIndex === -1) {
      console.log(`⚠️ Таблица ${tableId} не найдена`);
      return res.json({ 
        success: true, 
        message: `Таблица ${tableId} уже не существует`,
        deletedTableId: tableId
      });
    }
    
    // Удаляем таблицу
    const deletedTable = currentData.tables.splice(tableIndex, 1)[0];
    
    // Очищаем связанные данные
    if (currentData.tableXmlData && currentData.tableXmlData[tableId]) {
      delete currentData.tableXmlData[tableId];
    }
    
    if (currentData.tableXmlLoadingStatus && currentData.tableXmlLoadingStatus[tableId]) {
      delete currentData.tableXmlLoadingStatus[tableId];
    }
    
    // Сохраняем обновленные данные
    currentData.lastSaved = new Date().toISOString();
    await safeWriteData(currentData);
    
    res.json({ 
      success: true, 
      message: `Таблица "${deletedTable.name}" успешно удалена`,
      deletedTableId: tableId,
      deletedTableName: deletedTable.name,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Таблица "${deletedTable.name}" удалена`);
    
  } catch (error) {
    console.error(`❌ Ошибка удаления таблицы ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Ошибка при удалении таблицы',
      details: error.message,
      tableId: req.params.id
    });
  }
});

// Сохранение данных с проверкой целостности
app.post('/api/data', async (req, res) => {
  try {
    await ensureDirectories();
    
    console.log('📥 Получен запрос на сохранение данных...');
    
    // Проверяем, что тело запроса существует
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ Пустое тело запроса');
      return res.status(400).json({ error: 'Пустое тело запроса' });
    }
    
    console.log('📦 Размер тела запроса:', JSON.stringify(req.body).length, 'символов');
    console.log('📦 Ключи в теле запроса:', Object.keys(req.body));
    
    // Валидация входящих данных
    // Валидация входящих данных с подробным логированием
const { 
  tables, 
  globalCommissions, 
  globalItemChanges, 
  xmlLastUpdate,
      xmlDataCounts, 
      availableCrmCategories, 
      tableXmlData,
      tableXmlLoadingStatus,
      globalCrmData, 
      globalPromData, 
      globalXmlLoadingStatus 
    } = req.body;

    console.log('🔍 Валидация полей:');
    console.log('  - tables:', Array.isArray(tables) ? `✅ массив (${tables.length})` : '❌ не массив');
    console.log('  - globalCommissions:', typeof globalCommissions === 'object' ? `✅ объект (${Object.keys(globalCommissions || {}).length})` : '❌ не объект');
    console.log('  - tableXmlData:', typeof tableXmlData === 'object' ? `✅ объект (${Object.keys(tableXmlData || {}).length})` : '❌ не объект');
    console.log('  - tableXmlLoadingStatus:', typeof tableXmlLoadingStatus === 'object' ? `✅ объект (${Object.keys(tableXmlLoadingStatus || {}).length})` : '❌ не объект');
    console.log('  - globalCrmData:', typeof globalCrmData === 'object' ? `✅ объект (${Object.keys(globalCrmData || {}).length})` : '❌ не объект');
    console.log('  - globalPromData:', typeof globalPromData === 'object' ? `✅ объект (${Object.keys(globalPromData || {}).length})` : '❌ не объект');
    console.log('  - globalXmlLoadingStatus:', typeof globalXmlLoadingStatus === 'object' ? '✅ объект' : '❌ не объект');

    if (!Array.isArray(tables)) {
      console.error('❌ Ошибка валидации: tables должно быть массивом');
      return res.status(400).json({ error: 'tables должно быть массивом' });
    }

    if (globalCommissions && typeof globalCommissions !== 'object') {
      console.error('❌ Ошибка валидации: globalCommissions должно быть объектом');
      return res.status(400).json({ error: 'globalCommissions должно быть объектом' });
    }

    if (globalItemChanges && typeof globalItemChanges !== 'object') {
      console.error('❌ Ошибка валидации: globalItemChanges должно быть объектом');
      return res.status(400).json({ error: 'globalItemChanges должно быть объектом' });
    }

    if (globalCrmData && typeof globalCrmData !== 'object') {
      console.error('❌ Ошибка валидации: globalCrmData должно быть объектом');
      return res.status(400).json({ error: 'globalCrmData должно быть объектом' });
    }

    if (globalPromData && typeof globalPromData !== 'object') {
      console.error('❌ Ошибка валидации: globalPromData должно быть объектом');
      return res.status(400).json({ error: 'globalPromData должно быть объектом' });
    }

    if (globalXmlLoadingStatus && typeof globalXmlLoadingStatus !== 'object') {
      console.error('❌ Ошибка валидации: globalXmlLoadingStatus должно быть объектом');
      return res.status(400).json({ error: 'globalXmlLoadingStatus должно быть объектом' });
    }

    // Дополнительная диагностика
console.log('🔍 Дополнительная проверка данных:');
console.log('  - xmlLastUpdate тип:', typeof xmlLastUpdate, xmlLastUpdate ? Object.keys(xmlLastUpdate).length : 'null/undefined');
console.log('  - xmlDataCounts тип:', typeof xmlDataCounts, xmlDataCounts ? Object.keys(xmlDataCounts).length : 'null/undefined');
console.log('  - availableCrmCategories тип:', Array.isArray(availableCrmCategories) ? `массив (${availableCrmCategories.length})` : typeof availableCrmCategories);
console.log('  - globalXmlLoadingStatus содержимое:', globalXmlLoadingStatus);
    
const dataToSave = {
  tables: Array.isArray(tables) ? tables : [],
  globalCommissions: (globalCommissions && typeof globalCommissions === 'object') ? globalCommissions : {},
  globalItemChanges: (globalItemChanges && typeof globalItemChanges === 'object') ? globalItemChanges : {},
  xmlLastUpdate: (xmlLastUpdate && typeof xmlLastUpdate === 'object') ? xmlLastUpdate : {},
  xmlDataCounts: (xmlDataCounts && typeof xmlDataCounts === 'object') ? xmlDataCounts : {},
  availableCrmCategories: Array.isArray(availableCrmCategories) ? availableCrmCategories : [],
  tableXmlData: (tableXmlData && typeof tableXmlData === 'object') ? tableXmlData : {},
  tableXmlLoadingStatus: (tableXmlLoadingStatus && typeof tableXmlLoadingStatus === 'object') ? tableXmlLoadingStatus : {},
  globalCrmData: (globalCrmData && typeof globalCrmData === 'object') ? globalCrmData : {},
  globalPromData: (globalPromData && typeof globalPromData === 'object') ? globalPromData : {},
  globalXmlLoadingStatus: (globalXmlLoadingStatus && typeof globalXmlLoadingStatus === 'object') ? globalXmlLoadingStatus : { crm: 'not_loaded', prom: 'not_loaded' },
  lastSaved: new Date().toISOString(),
  version: '2.2',
  savedAt: Date.now()
};

console.log('✅ Подготовленные данные для сохранения:');
console.log('  - tables: массив из', dataToSave.tables.length, 'элементов');
console.log('  - globalCommissions: объект с', Object.keys(dataToSave.globalCommissions).length, 'ключами');
console.log('  - tableXmlData: объект с', Object.keys(dataToSave.tableXmlData).length, 'ключами');
console.log('  - tableXmlLoadingStatus: объект с', Object.keys(dataToSave.tableXmlLoadingStatus).length, 'ключами');
console.log('  - globalCrmData: объект с', Object.keys(dataToSave.globalCrmData).length, 'ключами');
console.log('  - globalPromData: объект с', Object.keys(dataToSave.globalPromData).length, 'ключами');
console.log('  - globalXmlLoadingStatus:', JSON.stringify(dataToSave.globalXmlLoadingStatus));
    
    // Проверяем размер данных ПЕРЕД сериализацией
// Проверяем размер данных ПЕРЕД сериализацией
let dataSize = 0;
try {
  // Проверяем каждое поле отдельно для диагностики
  console.log('🔧 Проверка сериализации по частям:');
  JSON.stringify(dataToSave.tables);
  console.log('  ✅ tables - OK');
  JSON.stringify(dataToSave.globalCommissions);
  console.log('  ✅ globalCommissions - OK');
  JSON.stringify(dataToSave.globalItemChanges);
  console.log('  ✅ globalItemChanges - OK');
  JSON.stringify(dataToSave.xmlLastUpdate);
  console.log('  ✅ xmlLastUpdate - OK');
JSON.stringify(dataToSave.tableXmlData);
  console.log('  ✅ tableXmlData - OK');
  JSON.stringify(dataToSave.tableXmlLoadingStatus);
  console.log('  ✅ tableXmlLoadingStatus - OK');
  JSON.stringify(dataToSave.globalCrmData);
  console.log('  ✅ globalCrmData - OK');
  JSON.stringify(dataToSave.globalPromData);
  console.log('  ✅ globalPromData - OK');
  JSON.stringify(dataToSave.globalXmlLoadingStatus);
  console.log('  ✅ globalXmlLoadingStatus - OK');
  
  // Полная сериализация
  const serialized = JSON.stringify(dataToSave);
  dataSize = serialized.length;
  console.log(`💾 Размер данных для сохранения: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
} catch (serializationError) {
  console.error('❌ Ошибка сериализации данных:', serializationError);
  console.error('❌ Проблемное поле найдено, детали:', serializationError.message);
  return res.status(400).json({ 
    error: 'Ошибка сериализации данных',
    details: serializationError.message,
    field: 'Проверьте консоль сервера для определения проблемного поля'
  });
}
    
    await safeWriteData(dataToSave);
    
    res.json({ 
      success: true, 
      message: 'Данные успешно сохранены',
      size: dataSize,
      timestamp: dataToSave.lastSaved
    });
    
    console.log(`✅ Сохранение завершено: ${tables.length} таблиц, ${Object.keys(globalCommissions).length} комиссий`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка при сохранении данных:');
    console.error('   Тип ошибки:', error.constructor.name);
    console.error('   Сообщение:', error.message);
    console.error('   Стек:', error.stack);
    
    res.status(500).json({ 
      error: 'Ошибка при сохранении данных',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Получение информации о системе
app.get('/api/system/info', async (req, res) => {
  try {
    const stats = {
      dataFileExists: false,
      dataFileSize: 0,
      backupsCount: 0,
      lastBackup: null,
      serverUptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    // Проверяем основной файл
    try {
      const fileStat = await fs.stat(DATA_FILE);
      stats.dataFileExists = true;
      stats.dataFileSize = fileStat.size;
      stats.lastModified = fileStat.mtime;
    } catch {}
    
    // Проверяем бэкапы
    try {
      const backups = await fs.readdir(BACKUP_DIR);
      const backupFiles = backups.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      stats.backupsCount = backupFiles.length;
      
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles.sort().reverse()[0];
        const backupStat = await fs.stat(path.join(BACKUP_DIR, latestBackup));
        stats.lastBackup = {
          filename: latestBackup,
          created: backupStat.birthtime,
          size: backupStat.size
        };
      }
    } catch {}
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Ошибка получения системной информации:', error);
    res.status(500).json({ error: 'Ошибка получения системной информации' });
  }
});

// Принудительное создание бэкапа
app.post('/api/system/backup', async (req, res) => {
  try {
    await createBackup();
    res.json({ success: true, message: 'Бэкап создан успешно' });
  } catch (error) {
    console.error('❌ Ошибка создания бэкапа:', error);
    res.status(500).json({ error: 'Ошибка создания бэкапа' });
  }
});

// Восстановление из бэкапа
app.post('/api/system/restore', async (req, res) => {
  try {
    const backupData = await restoreFromBackup();
    
    if (backupData) {
      await safeWriteData(backupData);
      res.json({ success: true, message: 'Данные восстановлены из бэкапа' });
    } else {
      res.status(404).json({ error: 'Нет доступных бэкапов для восстановления' });
    }
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error);
    res.status(500).json({ error: 'Ошибка восстановления из бэкапа' });
  }
});

// Получение всех категорий
app.get('/api/categories', async (req, res) => {
  try {
    await ensureDirectories();
    const categories = await loadAllCategories();
    res.json({ 
      success: true, 
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки категорий:', error);
    res.status(500).json({ 
      error: 'Ошибка загрузки категорий',
      details: error.message 
    });
  }
});

// Получение конкретной категории
app.get('/api/categories/:categoryType', async (req, res) => {
  try {
    await ensureDirectories();
    const { categoryType } = req.params;
    
    if (!CATEGORY_FILES[categoryType]) {
      return res.status(404).json({ 
        error: 'Категория не найдена',
        availableCategories: Object.keys(CATEGORY_FILES)
      });
    }
    
    const items = await loadCategoryFromFile(categoryType);
    res.json({ 
      success: true, 
      categoryType,
      items,
      count: items.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка загрузки категории ${req.params.categoryType}:`, error);
    res.status(500).json({ 
      error: 'Ошибка загрузки категории',
      details: error.message 
    });
  }
});

// Сохранение категории
app.post('/api/categories/:categoryType', async (req, res) => {
  try {
    await ensureDirectories();
    const { categoryType } = req.params;
    const { items } = req.body;
    
    if (!CATEGORY_FILES[categoryType]) {
      return res.status(404).json({ 
        error: 'Категория не найдена',
        availableCategories: Object.keys(CATEGORY_FILES)
      });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'items должно быть массивом' 
      });
    }
    
    const categoryData = await saveCategoryToFile(categoryType, items);
    res.json({ 
      success: true, 
      message: `Категория "${categoryType}" сохранена`,
      categoryData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка сохранения категории ${req.params.categoryType}:`, error);
    res.status(500).json({ 
      error: 'Ошибка сохранения категории',
      details: error.message 
    });
  }
});

// Добавление позиции в категорию
app.post('/api/categories/:categoryType/items/:itemId', async (req, res) => {
  try {
    await ensureDirectories();
    const { categoryType, itemId } = req.params;
    
    if (!CATEGORY_FILES[categoryType]) {
      return res.status(404).json({ 
        error: 'Категория не найдена',
        availableCategories: Object.keys(CATEGORY_FILES)
      });
    }
    
    const currentItems = await loadCategoryFromFile(categoryType);
    
    if (!currentItems.includes(itemId)) {
      currentItems.push(itemId);
      await saveCategoryToFile(categoryType, currentItems);
    }
    
    res.json({ 
      success: true, 
      message: `Позиция "${itemId}" добавлена в категорию "${categoryType}"`,
      categoryType,
      itemId,
      totalItems: currentItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка добавления в категорию ${req.params.categoryType}:`, error);
    res.status(500).json({ 
      error: 'Ошибка добавления в категорию',
      details: error.message 
    });
  }
});

// Удаление позиции из категории
app.delete('/api/categories/:categoryType/items/:itemId', async (req, res) => {
  try {
    await ensureDirectories();
    const { categoryType, itemId } = req.params;
    
    if (!CATEGORY_FILES[categoryType]) {
      return res.status(404).json({ 
        error: 'Категория не найдена',
        availableCategories: Object.keys(CATEGORY_FILES)
      });
    }
    
    const currentItems = await loadCategoryFromFile(categoryType);
    const itemIndex = currentItems.indexOf(itemId);
    
    if (itemIndex !== -1) {
      currentItems.splice(itemIndex, 1);
      await saveCategoryToFile(categoryType, currentItems);
    }
    
    res.json({ 
      success: true, 
      message: `Позиция "${itemId}" удалена из категории "${categoryType}"`,
      categoryType,
      itemId,
      totalItems: currentItems.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка удаления из категории ${req.params.categoryType}:`, error);
    res.status(500).json({ 
      error: 'Ошибка удаления из категории',
      details: error.message 
    });
  }
});

// Очистка категории
app.delete('/api/categories/:categoryType', async (req, res) => {
  try {
    await ensureDirectories();
    const { categoryType } = req.params;
    
    if (!CATEGORY_FILES[categoryType]) {
      return res.status(404).json({ 
        error: 'Категория не найдена',
        availableCategories: Object.keys(CATEGORY_FILES)
      });
    }
    
    await saveCategoryToFile(categoryType, []);
    
    res.json({ 
      success: true, 
      message: `Категория "${categoryType}" очищена`,
      categoryType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Ошибка очистки категории ${req.params.categoryType}:`, error);
    res.status(500).json({ 
      error: 'Ошибка очистки категории',
      details: error.message 
    });
  }
});

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0'
  });
});

// Экспорт данных
app.get('/api/export', async (req, res) => {
  try {
    await ensureDirectories();
    
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_export_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(parsedData, null, 2));
    
    console.log('📤 Данные экспортированы');
  } catch (error) {
    console.error('❌ Ошибка экспорта:', error);
    res.status(500).json({ error: 'Ошибка экспорта данных' });
  }
});

// Импорт данных
app.post('/api/import', async (req, res) => {
  try {
    await ensureDirectories();
    
    const importedData = req.body;
    
    // Создаем бэкап перед импортом
    await createBackup();
    
    // Валидируем импортированные данные
    if (!importedData || typeof importedData !== 'object') {
      return res.status(400).json({ error: 'Неверный формат данных для импорта' });
    }
    
const dataToSave = {
  tables: Array.isArray(importedData.tables) ? importedData.tables : [],
  globalCommissions: importedData.globalCommissions || {},
  globalItemChanges: importedData.globalItemChanges || {},
  xmlLastUpdate: importedData.xmlLastUpdate || {},
  xmlDataCounts: importedData.xmlDataCounts || {},
  availableCrmCategories: importedData.availableCrmCategories || [],
  tableXmlData: importedData.tableXmlData || {},
  tableXmlLoadingStatus: importedData.tableXmlLoadingStatus || {},
  globalCrmData: importedData.globalCrmData || {},
  globalPromData: importedData.globalPromData || {},
  globalXmlLoadingStatus: importedData.globalXmlLoadingStatus || { crm: 'not_loaded', prom: 'not_loaded' },
  lastSaved: new Date().toISOString(),
  importedAt: new Date().toISOString()
};
    
    await safeWriteData(dataToSave);
    
    res.json({ 
      success: true, 
      message: 'Данные успешно импортированы',
      tablesCount: dataToSave.tables.length,
      commissionsCount: Object.keys(dataToSave.globalCommissions).length
    });
    
    console.log(`📥 Данные импортированы: ${dataToSave.tables.length} таблиц`);
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
    res.status(500).json({ error: 'Ошибка импорта данных' });
  }
});

// Все остальные запросы отправляем на React приложение
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('🚨 Необработанная ошибка:', error);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    timestamp: new Date().toISOString()
  });
});

// Периодическое создание бэкапов (каждые 6 часов)
setInterval(async () => {
  try {
    await createBackup();
    console.log('🕐 Автоматический бэкап создан');
  } catch (error) {
    console.error('❌ Ошибка автоматического бэкапа:', error);
  }
}, 6 * 60 * 60 * 1000); // 6 часов

// Запуск сервера
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📂 Данные сохраняются в: ${DATA_FILE}`);
  console.log(`💾 Бэкапы создаются в: ${BACKUP_DIR}`);
  console.log(`📋 Категории сохраняются в: ${CATEGORIES_DIR}`);
  console.log(`🌐 Приложение доступно: http://localhost:${PORT}`);
  
  // Создаем начальные директории
  await ensureDirectories();
  
  // Загружаем категории при запуске для проверки
  try {
    const categories = await loadAllCategories();
    const totalItems = Object.values(categories).reduce((total, items) => total + items.length, 0);
    console.log(`📂 Загружено категорий при запуске: ${totalItems} позиций`);
  } catch (error) {
    console.log('📂 Категории будут созданы при первом использовании');
  }
  
  // Создаем начальный бэкап если есть данные
  setTimeout(createBackup, 5000);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Получен сигнал ${signal}, завершение работы сервера...`);
  
  try {
    // Создаем финальный бэкап
    await createBackup();
    console.log('💾 Финальный бэкап создан');
  } catch (error) {
    console.error('❌ Ошибка создания финального бэкапа:', error);
  }
  
  console.log('✅ Сервер успешно остановлен');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('🚨 Необработанное исключение:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Необработанное отклонение промиса:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;
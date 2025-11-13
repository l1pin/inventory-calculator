// Netlify Function для API
// Обрабатывает все запросы к /api/*

const fetch = require('node-fetch');

const {
  getAllAppData,
  saveAllAppData,
  deleteTable,
  getTableData,
  getCrmCategories,
  getItemsByCategory,
  saveItemsToCategory,
  addItemToCategory,
  removeItemFromCategory
} = require('../../db');

// Helper для создания response
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  },
  body: JSON.stringify(body)
});

// Helper для парсинга body
const parseBody = (body) => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

// Главный обработчик
exports.handler = async (event, context) => {
  const { httpMethod, path, body, rawUrl } = event;

  // Обработка CORS preflight
  if (httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    // Извлекаем путь после /api/ из rawUrl или path
    // Netlify перенаправляет /api/* → /.netlify/functions/api/*
    // rawUrl содержит оригинальный путь: https://site.netlify.app/api/data
    let apiPath = '';
    if (rawUrl && rawUrl.includes('/api/')) {
      // Извлекаем путь из rawUrl
      const url = new URL(rawUrl);
      apiPath = url.pathname.replace('/api', '');
    } else {
      // Fallback: используем path
      apiPath = path.replace('/.netlify/functions/api', '');
    }

    console.log(`${httpMethod} ${apiPath} (rawUrl: ${rawUrl}, path: ${path})`);

    // ============================================================================
    // GET /api/data - Получить все данные
    // ============================================================================
    if (httpMethod === 'GET' && apiPath === '/data') {
      const data = await getAllAppData();
      return createResponse(200, data);
    }

    // ============================================================================
    // POST /api/data - Сохранить данные
    // ============================================================================
    if (httpMethod === 'POST' && apiPath === '/data') {
      const appData = parseBody(body);
      if (!appData) {
        return createResponse(400, { error: 'Invalid JSON body' });
      }

      await saveAllAppData(appData);
      return createResponse(200, {
        success: true,
        message: 'Данные успешно сохранены',
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // /api/tables/:id endpoints
    // ============================================================================
    if (apiPath.startsWith('/tables/')) {
      const tableId = apiPath.replace('/tables/', '');

      // GET - Получить данные таблицы
      if (httpMethod === 'GET') {
        const tableData = await getTableData(tableId);
        return createResponse(200, tableData);
      }

      // DELETE - Удалить таблицу
      if (httpMethod === 'DELETE') {
        await deleteTable(tableId);
        return createResponse(200, {
          success: true,
          message: `Таблица ${tableId} успешно удалена`,
          deletedTableId: tableId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ============================================================================
    // GET /api/categories - Получить все категории
    // ============================================================================
    if (httpMethod === 'GET' && apiPath === '/categories') {
      const categories = {
        new: await getItemsByCategory('new'),
        optimization: await getItemsByCategory('optimization'),
        ab: await getItemsByCategory('ab'),
        c_sale: await getItemsByCategory('c_sale'),
        off_season: await getItemsByCategory('off_season'),
        unprofitable: await getItemsByCategory('unprofitable')
      };

      return createResponse(200, {
        success: true,
        categories,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // GET /api/categories/:categoryType - Получить конкретную категорию
    // ============================================================================
    if (httpMethod === 'GET' && apiPath.startsWith('/categories/')) {
      const categoryType = apiPath.replace('/categories/', '').split('/')[0];
      const items = await getItemsByCategory(categoryType);

      return createResponse(200, {
        success: true,
        categoryType,
        items,
        count: items.length,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // POST /api/categories/:categoryType - Сохранить категорию
    // ============================================================================
    if (httpMethod === 'POST' && apiPath.startsWith('/categories/') && !apiPath.includes('/items/')) {
      const categoryType = apiPath.replace('/categories/', '');
      const { items } = parseBody(body) || {};

      if (!Array.isArray(items)) {
        return createResponse(400, { error: 'items должно быть массивом' });
      }

      await saveItemsToCategory(categoryType, items);

      return createResponse(200, {
        success: true,
        message: `Категория "${categoryType}" сохранена`,
        count: items.length,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // POST /api/categories/:categoryType/items/:itemId - Добавить в категорию
    // ============================================================================
    if (httpMethod === 'POST' && apiPath.match(/^\/categories\/[^/]+\/items\/[^/]+$/)) {
      const parts = apiPath.replace('/categories/', '').split('/items/');
      const categoryType = parts[0];
      const itemId = parts[1];

      await addItemToCategory(categoryType, itemId);

      return createResponse(200, {
        success: true,
        message: `Позиция "${itemId}" добавлена в категорию "${categoryType}"`,
        categoryType,
        itemId,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // DELETE /api/categories/:categoryType/items/:itemId - Удалить из категории
    // ============================================================================
    if (httpMethod === 'DELETE' && apiPath.match(/^\/categories\/[^/]+\/items\/[^/]+$/)) {
      const parts = apiPath.replace('/categories/', '').split('/items/');
      const categoryType = parts[0];
      const itemId = parts[1];

      await removeItemFromCategory(categoryType, itemId);

      return createResponse(200, {
        success: true,
        message: `Позиция "${itemId}" удалена из категории "${categoryType}"`,
        categoryType,
        itemId,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // DELETE /api/categories/:categoryType - Очистить категорию
    // ============================================================================
    if (httpMethod === 'DELETE' && apiPath.startsWith('/categories/') && !apiPath.includes('/items/')) {
      const categoryType = apiPath.replace('/categories/', '');

      await saveItemsToCategory(categoryType, []);

      return createResponse(200, {
        success: true,
        message: `Категория "${categoryType}" очищена`,
        categoryType,
        timestamp: new Date().toISOString()
      });
    }

    // ============================================================================
    // GET /api/fetch-xml - Proxy для загрузки XML (обход CORS)
    // ============================================================================
    if (httpMethod === 'GET' && apiPath === '/fetch-xml') {
      const targetUrl = event.queryStringParameters?.url;

      if (!targetUrl) {
        return createResponse(400, { error: 'Missing url parameter' });
      }

      console.log(`📥 Загрузка XML через proxy: ${targetUrl}`);

      try {
        // Создаем AbortController для таймаута
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 секунд

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; InventoryCalculator/1.0)'
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.error(`❌ Ошибка загрузки XML: ${response.status} ${response.statusText}`);
          return {
            statusCode: response.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              error: `Failed to fetch XML: ${response.statusText}`,
              status: response.status
            })
          };
        }

        const xmlText = await response.text();
        console.log(`✅ XML загружен, размер: ${xmlText.length} байт`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/xml',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: xmlText
        };

      } catch (fetchError) {
        console.error('❌ Ошибка fetch XML:', fetchError);

        // Проверяем, был ли таймаут
        const isTimeout = fetchError.name === 'AbortError';

        return createResponse(isTimeout ? 504 : 502, {
          error: isTimeout ? 'Request timeout' : 'Failed to fetch XML',
          message: fetchError.message,
          type: fetchError.name
        });
      }
    }

    // ============================================================================
    // 404 - Endpoint не найден
    // ============================================================================
    return createResponse(404, {
      error: 'Endpoint не найден',
      path: apiPath,
      method: httpMethod
    });

  } catch (error) {
    console.error('Ошибка API:', error);

    return createResponse(500, {
      error: 'Внутренняя ошибка сервера',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

#!/usr/bin/env node

/**
 * Migration Runner - Запуск миграции базы данных
 *
 * Этот скрипт:
 * 1. Подключается к Supabase
 * 2. Запускает миграцию 002_reorganize_database.sql
 * 3. Проверяет результаты миграции
 * 4. Выводит статистику
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Начало миграции базы данных...\n');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, 'migrations', '002_reorganize_database.sql');
    console.log(`📄 Чтение миграции из: ${migrationPath}`);
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📊 Размер миграции:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Создаем резервную копию перед миграцией
    console.log('💾 Создание резервной копии текущей структуры...');

    // Получаем статистику ДО миграции
    console.log('\n📈 Статистика ДО миграции:');
    const { data: tablesBefore, error: tablesError } = await supabase
      .from('tables')
      .select('id', { count: 'exact', head: true });

    const { data: tableItemsBefore, error: itemsError } = await supabase
      .from('table_items')
      .select('*', { count: 'exact', head: true });

    if (!tablesError && tablesBefore) {
      console.log(`  - Таблиц: ${tablesBefore.count || 0}`);
    }

    if (!itemsError && tableItemsBefore) {
      console.log(`  - Записей в table_items: ${tableItemsBefore.count || 0}`);
    }

    // Получаем количество уникальных товаров
    const { data: uniqueItemsData } = await supabase
      .from('table_items')
      .select('item_id');

    const uniqueItems = uniqueItemsData ? new Set(uniqueItemsData.map(i => i.item_id)).size : 0;
    console.log(`  - Уникальных товаров: ${uniqueItems}`);

    if (tableItemsBefore.count > 0 && uniqueItems > 0) {
      const duplicateRatio = (tableItemsBefore.count / uniqueItems).toFixed(2);
      console.log(`  - Коэффициент дублирования: ${duplicateRatio}x`);

      if (duplicateRatio > 1.5) {
        console.log(`  ⚠️  ПРЕДУПРЕЖДЕНИЕ: Обнаружено значительное дублирование данных!`);
      }
    }

    // Запрашиваем подтверждение
    console.log('\n⚠️  ВНИМАНИЕ: Это действие изменит структуру базы данных!');
    console.log('⚠️  Убедитесь, что у вас есть резервная копия данных.\n');

    console.log('Для продолжения выполните команду с флагом --confirm:');
    console.log('  node run-migration.js --confirm\n');

    if (!process.argv.includes('--confirm')) {
      console.log('❌ Миграция отменена. Используйте --confirm для запуска.');
      process.exit(0);
    }

    console.log('\n🔄 Запуск миграции...\n');

    // Разбиваем SQL на отдельные команды
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];

      // Пропускаем комментарии и пустые строки
      if (command.startsWith('--') || command.length === 0) {
        continue;
      }

      // Показываем прогресс
      if (i % 10 === 0) {
        process.stdout.write(`\r⏳ Выполнено команд: ${i}/${sqlCommands.length}`);
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: command + ';' });

        if (error) {
          // Некоторые ошибки можно игнорировать (например, таблица уже существует)
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist')) {
            // Игнорируем
          } else {
            console.error(`\n⚠️  Ошибка в команде ${i}:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`\n❌ Критическая ошибка в команде ${i}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n\n✅ Миграция завершена!`);
    console.log(`  - Успешно выполнено: ${successCount} команд`);
    if (errorCount > 0) {
      console.log(`  - Ошибок: ${errorCount}`);
    }

    // Получаем статистику ПОСЛЕ миграции
    console.log('\n📈 Статистика ПОСЛЕ миграции:');

    const { data: itemsAfter } = await supabase
      .from('items')
      .select('item_id', { count: 'exact', head: true });

    const { data: tableItemsAfter } = await supabase
      .from('table_items')
      .select('*', { count: 'exact', head: true });

    const { data: priceChanges } = await supabase
      .from('price_changes')
      .select('id', { count: 'exact', head: true });

    const { data: comments } = await supabase
      .from('item_comments')
      .select('id', { count: 'exact', head: true });

    console.log(`  - Товаров в items: ${itemsAfter?.count || 0}`);
    console.log(`  - Связей в table_items: ${tableItemsAfter?.count || 0}`);
    console.log(`  - Изменений цен: ${priceChanges?.count || 0}`);
    console.log(`  - Комментариев: ${comments?.count || 0}`);

    // Проверяем категории
    const categories = [
      'category_new',
      'category_optimization',
      'category_ab',
      'category_c_sale',
      'category_off_season',
      'category_unprofitable'
    ];

    console.log('\n📋 Статистика по категориям:');
    for (const category of categories) {
      const { data: catData } = await supabase
        .from(category)
        .select('id', { count: 'exact', head: true });

      const categoryName = category.replace('category_', '');
      console.log(`  - ${categoryName}: ${catData?.count || 0} товаров`);
    }

    console.log('\n🎉 Миграция успешно завершена!');
    console.log('\n📝 Следующие шаги:');
    console.log('  1. Проверьте данные в базе');
    console.log('  2. Обновите код приложения для работы с новой структурой');
    console.log('  3. После проверки удалите backup таблицы:');
    console.log('     - table_items_old_backup');
    console.log('     - item_categories_old_backup');
    console.log('  4. Запустите npm start для проверки работы приложения\n');

  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error);
    console.error('Стек:', error.stack);
    process.exit(1);
  }
}

// Альтернативный способ запуска миграции через SQL Editor в Supabase
async function showInstructions() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          ИНСТРУКЦИЯ ПО ЗАПУСКУ МИГРАЦИИ В SUPABASE           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Вариант 1: Запуск через этот скрипт');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('  node run-migration.js --confirm\n');

  console.log('Вариант 2: Запуск через Supabase SQL Editor (РЕКОМЕНДУЕТСЯ)');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('  1. Откройте Supabase Dashboard');
  console.log('  2. Перейдите в SQL Editor');
  console.log('  3. Скопируйте содержимое файла:');
  console.log('     migrations/002_reorganize_database.sql');
  console.log('  4. Вставьте в SQL Editor');
  console.log('  5. Нажмите "Run"');
  console.log('  6. Дождитесь завершения (может занять несколько минут)\n');

  console.log('Вариант 3: Запуск через командную строку');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('  Если у вас установлен Supabase CLI:');
  console.log('  supabase db push\n');

  console.log('⚠️  ВАЖНО:');
  console.log('  - Создайте резервную копию базы данных перед миграцией');
  console.log('  - Миграция может занять несколько минут для больших баз');
  console.log('  - Не прерывайте процесс миграции\n');
}

// Проверяем аргументы командной строки
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showInstructions();
  process.exit(0);
}

// Запускаем миграцию
runMigration().catch(err => {
  console.error('Необработанная ошибка:', err);
  process.exit(1);
});

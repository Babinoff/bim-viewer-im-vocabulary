const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let _db; // Переменная для хранения соединения с базой данных
const _tableName = "elements"

// Функция для получения пути к файлу базы данных
function getDbPath(filename) {
    return path.join(process.cwd(), 'models', `${filename}.sqlite`);
}

async function getDatabaseInfo(filename) {
    const dbPath = path.join(process.cwd(), 'models', `${filename}.sqlite`);
    
    // 1. Проверяем существование файла
    if (!fs.existsSync(dbPath)) {
        return {
            exists: false,
            message: `Файл базы данных "${filename}.sqlite" не найден`,
            rowCount: null
        };
    }

    let db;
    try {
        db = new sqlite3.Database(dbPath);
        
        // 2. Проверяем существование таблицы elements
        const tableExists = await new Promise((resolve, reject) => {
            db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='elements'",
                (err, row) => {
                    if (err) reject(err);
                    resolve(!!row);
                }
            );
        });

        if (!tableExists) {
            return {
                exists: true,
                tableExists: false,
                message: `Таблица "elements" не найдена в базе данных`,
                rowCount: null
            };
        }

        // 3. Получаем количество строк
        const rowCount = await new Promise((resolve, reject) => {
            db.get(
                "SELECT COUNT(*) as count FROM elements",
                (err, row) => {
                    if (err) reject(err);
                    resolve(row ? row.count : 0);
                }
            );
        });

        return {
            exists: true,
            tableExists: true,
            message: `База данных содержит ${rowCount} записей в таблице elements`,
            rowCount: rowCount
        };

    } catch (err) {
        return {
            exists: true,
            error: true,
            message: `Ошибка при проверке базы данных: ${err.message}`,
            rowCount: null
        };
    } finally {
        if (db) db.close();
    }
}

// Функция для создания файла базы данных
async function createDatabase(filename) {
    const dbPath = getDbPath(filename);

    // Проверяем, существует ли файл базы данных
    if (fs.existsSync(dbPath)) {
      return `Файл базы данных "${filename}.sqlite" уже существует.`;
    }

    // Убедимся, что папка models существует
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    // Создаем новую базу данных
    _db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw new Error(`Ошибка при создании базы данных: ${err.message}`);
        }
    });

    console.log(`База данных "${filename}.sqlite" успешно создана.`);
    await initializeDatabase(); // Инициализация таблицы
    _db.close(); // Закрываем соединение после создания
    return `База данных "${filename}.sqlite" готова к использованию.`;
}

// Функция для подключения к базе данных
async function connectToDatabase(filename) {
    const dbPath = getDbPath(filename);

    // Проверяем, существует ли файл базы данных
    if (!fs.existsSync(dbPath)) {
      console.error(`Файл базы данных "${filename}.sqlite" не существует.`);
    }

    // Подключаемся к базе данных с настройками для конкурентного доступа
    _db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(`Ошибка при подключении к базе данных: ${err.message}`);
        }
    });

    // Настройка режима работы с базой данных
    _db.configure('busyTimeout', 30000); // Ожидание до 30 секунд при блокировке
    _db.run('PRAGMA journal_mode = WAL'); // Использование WAL режима для лучшей конкурентности
    _db.run('PRAGMA synchronous = NORMAL'); // Баланс между производительностью и надежностью

    console.log(`Подключение к базе данных "${filename}.sqlite" успешно установлено.`);
    await initializeDatabase(); // Инициализация таблицы
}

// Инициализация таблицы elements
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        _db.run(
            `CREATE TABLE IF NOT EXISTS elements (
                globalid TEXT NOT NULL UNIQUE,
                expressID INT,
                vocabulary TEXT,
                RUS_DivisionNumber TEXT,
                RUS_StartDatePlan TEXT,
                RUS_StartDateIs TEXT,
                RUS_EndDatePlan TEXT,
                RUS_EndDateIs TEXT,
                RUS_ElementCode TEXT,
                RUS_OperationTemperatureRange TEXT,
                RUS_PersonResponsibleForOperation TEXT,
                RUS_ServiceSchedule TEXT,
                RUS_RepairDate TEXT,
                RUS_OverhaulDate TEXT,
                RUS_SpareParts TEXT,
                RUS_EquipmentCode TEXT
            )`,
            (err) => {
                if (err) {
                    reject(`Ошибка при создании таблицы: ${err.message}`);
                } else {
                    console.log('Таблица elements готова к использованию.');
                    resolve();
                }
            }
        );
    });
}

// Функция для добавления строки в таблицу elements
async function addElement(filename, globalid, expressID) {
    if (!_db) {
      connectToDatabase(filename);
    }

    return new Promise((resolve, reject) => {
        // Проверяем, существует ли строка с таким globalid
        _db.get(
            `SELECT globalid FROM elements WHERE globalid = ?`,
            [globalid],
            (err, row) => {
                if (err) {
                    reject(`Ошибка при проверке наличия globalid: ${err.message}`);
                } else if (row) {
                  updateElement(filename, globalid, {"expressID": expressID});
                  resolve(`Строка с globalid "${globalid}" уже существует.`);
                } else {
                    // Если строки с таким globalid нет, добавляем новую запись
                    _db.run(
                        `INSERT INTO elements (
                            globalid, expressID
                        ) VALUES (?, ?)`,
                        [globalid, expressID],
                        (err) => {
                            if (err) {
                                reject(`Ошибка при добавлении строки: ${err.message}`);
                            } else {
                                resolve(`Строка с globalid "${globalid}" успешно добавлена.`);
                            }
                        }
                    );
                }
            }
        );
    });
}

// Функция для получения данных по globalid
async function getElementByGlobalId(filename, globalid) {
    if (!_db) {
      connectToDatabase(filename);
    }

    return new Promise((resolve, reject) => {
        _db.get(
            `SELECT * FROM elements WHERE globalid = ?`,
            [globalid],
            (err, row) => {
                if (err) {
                    reject(`Ошибка при получении данных: ${err.message}`);
                } else {
                    resolve(row || null); // Возвращаем найденную строку или null
                }
            }
        );
    });
}

// Функция для обновления записи
async function updateElement(filename, globalid, fieldsToUpdate) {

  // console.log("updateElement filename", filename)
  if (!_db) {
    connectToDatabase(filename);
  }

  return new Promise((resolve, reject) => {
      // Проверяем, существует ли строка с таким именем
      // ensureColumnExists("expressID", "INT")
    //   ensureColumnExists('RUS_OperationTemperatureRange');
    //   ensureColumnExists('RUS_PersonResponsibleForOperation');
    //   ensureColumnExists('RUS_ServiceSchedule');
    //   ensureColumnExists('RUS_RepairDate');
    //   ensureColumnExists('RUS_OverhaulDate');
    //   ensureColumnExists('RUS_SpareParts');
    //   ensureColumnExists('RUS_EquipmentCode');
      _db.get(
          `SELECT globalid FROM elements WHERE globalid = ?`,
          [globalid],
          (err, row) => {
              if (err) {
                  reject(`Ошибка при проверке наличия globalid: ${err.message}`);
              } else if (!row) {
                  console.log("updateElement", err, row)
                  resolve(`Строка с globalid "${globalid}" не найдена.`);
              } else {
                  // Формируем SQL-запрос динамически
                  const updates = [];
                  const values = [];

                  // Проходим по всем полям, которые нужно обновить
                  for (const [key, value] of Object.entries(fieldsToUpdate)) {
                      if (value !== undefined && value !== null && value !== "") { // Проверяем, что значение есть
                          updates.push(`${key} = ?`); // Добавляем поле в запрос
                          values.push(value); // Добавляем значение
                      }
                  }

                  // Если нечего обновлять, возвращаем сообщение
                  if (updates.length === 0) {
                      resolve('Нет полей для обновления.');
                      return;
                  }

                  // Добавляем globalid в конец массива значений
                  values.push(globalid);

                  // Формируем финальный SQL-запрос
                  const sql = `UPDATE elements SET ${updates.join(', ')} WHERE globalid = ?`;

                  // Выполняем запрос
                  _db.run(sql, values, (err) => {
                      if (err) {
                          reject(`Ошибка при обновлении строки: ${err.message}`);
                      } else {
                        // console.log(`Строка с globalid "${globalid}" успешно обновлена параметрами: ${JSON.stringify(fieldsToUpdate)}`)
                        resolve(`Строка с globalid "${globalid}" успешно обновлена.`);
                      }
                  });
              }
          }
      );
  });
}

async function columnExists(columnName) {
  return new Promise((resolve, reject) => {
      _db.all(
          `PRAGMA table_info(${_tableName})`,
          (err, rows) => {
              if (err) return reject(err);
              resolve(rows.some(row => row.name === columnName));
          }
      );
  });
}

// Добавление новой колонки (исправленная версия)
async function addColumn(columnName, columnType = 'TEXT') {
  return new Promise((resolve, reject) => {
      _db.run(
          `ALTER TABLE ${_tableName} ADD COLUMN ${columnName} ${columnType}`,
          (err) => {
              if (err) {
                  // Игнорируем ошибку "duplicate column", если колонка уже существует
                  if (err.message.includes('duplicate column')) {
                      console.log(`Колонка ${columnName} уже существует`);
                      return resolve(false);
                  }
                  return reject(err);
              }
              resolve(true);
          }
      );
  });
}

// Безопасное добавление колонки
async function ensureColumnExists(columnName, columnType = 'TEXT') {
  try {
      // Сначала проверяем существование
      const exists = await columnExists(columnName);
      if (exists) {
          console.log(`Колонка ${columnName} уже существует`);
          return false;
      }
      
      // Если не существует - добавляем
      const result = await addColumn(columnName, columnType);
      console.log(`Колонка ${columnName} успешно добавлена`);
      return result;
  } catch (err) {
      console.error(`Ошибка при работе с колонкой ${columnName}:`, err);
  }
}

async function getAllKsiExpressID(filename) {
  try {
    if (!_db) {
      connectToDatabase(filename);
    }
  
    // Проверяем существование колонки
    const columnExists = await new Promise((resolve) => {
        _db.get(
            `SELECT name FROM pragma_table_info('elements') WHERE name='RUS_ElementCode'`,
            (err, row) => resolve(!!row)
        );
    });

    if (!columnExists) {
        throw new Error('Колонка RUS_ElementCode не существует в таблице elements');
    }

    // Получаем все значения
    const elementExpressID = await new Promise((resolve, reject) => {
        _db.all(
            `SELECT expressID FROM elements WHERE RUS_ElementCode IS NOT NULL`,
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.expressID));
            }
        );
    });
    return elementExpressID;
  } catch (err) {
    console.error(`getAllElementCodes:`, err);
}
}

async function getAllVocabularyFilled(filename) {
  try {
    // console.log("getAllVocabularyFilled _db", _db)
    if (!_db) {
      connectToDatabase(filename);
    }

    // Проверяем существование колонки
    const columnExists = await new Promise((resolve) => {
        _db.get(
            `SELECT name FROM pragma_table_info('elements') WHERE name='vocabulary'`, // Изменено на 'vocabulary'
            (err, row) => resolve(!!row)
        );
    });

    if (!columnExists) {
        throw new Error('Колонка vocabulary не существует в таблице elements'); // Изменено на 'vocabulary'
    }
    // console.log("getAllVocabularyFilled columnExists", columnExists)
    // Получаем все строки, где vocabulary не NULL и не пустая строка
    const rows = await new Promise((resolve, reject) => {
        _db.all(`SELECT * FROM elements WHERE vocabulary IS NOT NULL AND vocabulary != ''`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });

    // Фильтрация пустых колонок для каждой строки
    const filteredRows = rows.map(row => {
        const newRow = {};
        for (const key in row) {
            if (row[key] !== null && row[key] !== '') {
                newRow[key] = row[key];
            }
        }
        return newRow;
    });
    // console.log("getAllVocabularyFilled filteredRows", filteredRows)
    return filteredRows;
  } catch (err) {
      console.error('Error in getAllVocabularyFilled:', err.message);
      return [];
  }
}

// Функция для получения всех globalid из базы данных
async function getAllGlobalIds(filename) {
  try {
    if (!_db) {
      connectToDatabase(filename);
    }

    // Получаем все globalid из таблицы elements
    const globalIds = await new Promise((resolve, reject) => {
        _db.all(
            `SELECT globalid FROM elements`,
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.globalid));
            }
        );
    });
    
    return globalIds;
  } catch (err) {
    console.error(`getAllGlobalIds:`, err);
    return [];
  }
}

// Функция для массового обновления всех элементов одним SQL запросом
async function updateAllElementsWithValue(filename, columnName, valueGenerator) {
  try {
    if (!_db) {
      connectToDatabase(filename);
    }

    // Убеждаемся, что колонка существует
    await ensureColumnExists(columnName, 'TEXT');

    // Получаем все globalid
    const globalIds = await getAllGlobalIds(filename);
    
    if (globalIds.length === 0) {
      return { success: false, message: 'Нет элементов для обновления' };
    }

    // Подготавливаем данные для массового обновления
    const updates = [];
    const values = [];
    
    for (const globalId of globalIds) {
      const generatedValue = valueGenerator();
      updates.push(`WHEN ? THEN ?`);
      values.push(globalId, generatedValue);
    }
    
    // Добавляем все globalIds в конец для WHERE условия
    const placeholders = globalIds.map(() => '?').join(',');
    values.push(...globalIds);

    // Формируем SQL запрос с CASE WHEN для массового обновления
    const sql = `
      UPDATE elements 
      SET ${columnName} = CASE globalid 
        ${updates.join(' ')}
      END 
      WHERE globalid IN (${placeholders})
    `;

    // Выполняем массовое обновление
    const result = await new Promise((resolve, reject) => {
      _db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });

    return {
      success: true,
      message: `Успешно обновлено ${result.changes} элементов`,
      updatedCount: result.changes
    };

  } catch (err) {
    console.error(`updateAllElementsWithValue:`, err);
    return {
      success: false,
      message: `Ошибка при массовом обновлении: ${err.message}`
    };
  }
}

// Экспорт функций
module.exports = {
  getDatabaseInfo,
  createDatabase,
  connectToDatabase,
  addElement,
  getElementByGlobalId,
  updateElement,
  ensureColumnExists,
  getAllKsiExpressID,
  getAllVocabularyFilled,
  getAllGlobalIds,
  updateAllElementsWithValue
};
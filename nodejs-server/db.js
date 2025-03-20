const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let db; // Переменная для хранения соединения с базой данных

// Функция для получения пути к файлу базы данных
function getDbPath(filename) {
    return path.join(process.cwd(), 'models', `${filename}.sqlite`);
}

// Функция для создания файла базы данных
async function createDatabase(filename) {
    const dbPath = getDbPath(filename);

    // Проверяем, существует ли файл базы данных
    if (fs.existsSync(dbPath)) {
        throw new Error(`Файл базы данных "${filename}.sqlite" уже существует.`);
    }

    // Убедимся, что папка models существует
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    // Создаем новую базу данных
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw new Error(`Ошибка при создании базы данных: ${err.message}`);
        }
    });

    console.log(`База данных "${filename}.sqlite" успешно создана.`);
    await initializeDatabase(); // Инициализация таблицы
    db.close(); // Закрываем соединение после создания
    return `База данных "${filename}.sqlite" готова к использованию.`;
}

// Функция для подключения к базе данных
async function connectToDatabase(filename) {
    const dbPath = getDbPath(filename);

    // Проверяем, существует ли файл базы данных
    if (!fs.existsSync(dbPath)) {
        throw new Error(`Файл базы данных "${filename}.sqlite" не существует.`);
    }

    // Подключаемся к базе данных
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            throw new Error(`Ошибка при подключении к базе данных: ${err.message}`);
        }
    });

    console.log(`Подключение к базе данных "${filename}.sqlite" успешно установлено.`);
    await initializeDatabase(); // Инициализация таблицы
}

// Инициализация таблицы elements
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.run(
            `CREATE TABLE IF NOT EXISTS elements (
                globalid TEXT NOT NULL UNIQUE,
                vocabulary TEXT,
                RUS_DivisionNumber TEXT,
                RUS_StartDatePlan TEXT,
                RUS_StartDateIs TEXT,
                RUS_EndDatePlan TEXT,
                RUS_EndDateIs TEXT
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
async function addElement(filename, globalid, divisionNumber, startDatePlan, startDateIs, endDatePlan, endDateIs) {
    if (!db) {
      connectToDatabase(filename);
    }

    return new Promise((resolve, reject) => {
        // Проверяем, существует ли строка с таким globalid
        db.get(
            `SELECT globalid FROM elements WHERE globalid = ?`,
            [globalid],
            (err, row) => {
                if (err) {
                    reject(`Ошибка при проверке наличия globalid: ${err.message}`);
                } else if (row) {
                    resolve(`Строка с globalid "${globalid}" уже существует.`);
                } else {
                    // Если строки с таким globalid нет, добавляем новую запись
                    db.run(
                        `INSERT INTO elements (
                            globalid, RUS_DivisionNumber, 
                            RUS_StartDatePlan, RUS_StartDateIs, 
                            RUS_EndDatePlan, RUS_EndDateIs
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [globalid, divisionNumber, startDatePlan, startDateIs, endDatePlan, endDateIs],
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
    if (!db) {
      connectToDatabase(filename);
    }

    return new Promise((resolve, reject) => {
        db.get(
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
async function updateElement(fileName, globalid, fieldsToUpdate) {
  if (!db) {
    connectToDatabase(filename);
  }

  return new Promise((resolve, reject) => {
      // Проверяем, существует ли строка с таким globalid
      db.get(
          `SELECT globalid FROM elements WHERE globalid = ?`,
          [globalid],
          (err, row) => {
              if (err) {
                  reject(`Ошибка при проверке наличия globalid: ${err.message}`);
              } else if (!row) {
                  resolve(`Строка с globalid "${globalid}" не найдена.`);
              } else {
                  // Формируем SQL-запрос динамически
                  const updates = [];
                  const values = [];

                  // Проходим по всем полям, которые нужно обновить
                  for (const [key, value] of Object.entries(fieldsToUpdate)) {
                      if (value !== undefined && value !== null) { // Проверяем, что значение есть
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
                  db.run(sql, values, (err) => {
                      if (err) {
                          reject(`Ошибка при обновлении строки: ${err.message}`);
                      } else {
                          resolve(`Строка с globalid "${globalid}" успешно обновлена.`);
                      }
                  });
              }
          }
      );
  });
}
// Экспорт функций
module.exports = {
    createDatabase,
    connectToDatabase,
    addElement,
    getElementByGlobalId,
    updateElement,
};
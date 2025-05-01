// API Service - все запросы к серверу

const API_BASE_URL = 'http://localhost:4000';

/**
 * Получить информацию о модели
 * @param {string} fileName - имя файла модели
 * @returns {Promise<Object>} - информация о модели
 */
async function getModelInfo(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-model-info/?fileName=${fileName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching model info:', error);
    throw error;
  }
}

/**
 * Создать словарь
 * @param {string} fileName - имя файла модели
 * @returns {Promise<Object>} - результат создания
 */
async function createVocabulary(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/create-vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelname: fileName
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error creating vocabulary:', error);
    throw error;
  }
}

/**
 * Добавить запись в словарь
 * @param {string} fileName - имя файла модели
 * @param {string} globalid - идентификатор элемента
 * @returns {Promise<Object>} - результат добавления
 */
async function addVocabulary(fileName, globalid) {
  try {
    const response = await fetch(`${API_BASE_URL}/add-vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        globalid: encodeURIComponent(globalid)
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error adding to vocabulary:', error);
    throw error;
  }
}

/**
 * Обновить запись в словаре
 * @param {string} fileName - имя файла модели
 * @param {string} globalid - идентификатор элемента
 * @param {Object} fields - поля для обновления
 * @returns {Promise<Object>} - результат обновления
 */
async function updateVocabulary(fileName, globalid, fields) {
  try {
    const response = await fetch(`${API_BASE_URL}/update-vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        globalid: globalid,
        ...fields
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    throw error;
  }
}

/**
 * Получить запись из словаря
 * @param {string} fileName - имя файла модели
 * @param {string} globalid - идентификатор элемента
 * @returns {Promise<Object>} - данные из словаря
 */
async function getVocabulary(fileName, globalid) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-vocabulary/?fileName=${fileName}&globalid=${globalid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    throw error;
  }
}

// Экспорт всех методов
export default {
  getModelInfo,
  createVocabulary,
  addVocabulary,
  updateVocabulary,
  getVocabulary
};
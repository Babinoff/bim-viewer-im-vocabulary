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
async function addVocabulary(fileName, globalid, expressID) {
  try {
    const response = await fetch(`${API_BASE_URL}/add-vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        globalid: encodeURIComponent(globalid),
        expressID: expressID
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
    console.log("updateVocabulary fileName, globalid, fields", fileName, globalid, fields)
    const response = await fetch(`${API_BASE_URL}/update-vocabulary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        globalid: globalid,
        fields: fields
        // DivisionNumberVocabulary: fields.input_DivisionNumber,
        // StartDatePlanVocabulary: fields.input_StartDatePlan,
        // StartDateIsVocabulary: fields.input_StartDateIs,
        // EndDatePlanVocabulary: fields.input_EndDatePlan,
        // EndDateIsVocabulary: fields.input_EndDateIs
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

async function getFromAi(ifcClass, elementType) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-ksi-from-ai/?ifcClass=${ifcClass}&elementType=${elementType}`, {
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

async function getAllKsiExpressIds(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-all-ksi-express-id/?fileName=${fileName}`, {
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

async function getAllVocabularyFilled(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-all-vocabulary-filled/?fileName=${fileName}`, {
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
    console.error('Error fetching all filled vocabulary:', error);
    throw error;
  }
}

async function getLLMResponse(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/start-llm-check?fileName=${fileName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting LLM response:', error);
    throw error;
  }
}

// Экспорт всех методов
async function stopLLMCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/stop-llm-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error stopping LLM check:', error);
    throw error;
  }
}

export default {
  getModelInfo,
  createVocabulary,
  addVocabulary,
  updateVocabulary,
  getVocabulary,
  getFromAi,
  getAllKsiExpressIds,
  getAllVocabularyFilled,
  getLLMResponse,
  stopLLMCheck
};
// API Service - все запросы к серверу
import { io } from 'socket.io-client';

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
 * Добавить элемент в словарь
 * @param {string} fileName - имя файла модели
 * @param {string} globalid - идентификатор элемента
 * @param {number} expressID - express ID элемента
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
 * Пакетное добавление элементов в словарь
 * @param {string} fileName - имя файла модели
 * @param {Array} elements - массив элементов {globalid, expressID}
 * @param {number} batchSize - размер пакета (по умолчанию 1000)
 * @returns {Promise<Object>} - результат добавления
 */
async function addVocabularyBatch(fileName, elements, batchSize = 1000) {
  try {
    const results = [];
    
    // Разбиваем элементы на пакеты
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      
      console.log(`Отправка пакета ${Math.floor(i / batchSize) + 1}/${Math.ceil(elements.length / batchSize)} (${batch.length} элементов)`);
      
      const response = await fetch(`${API_BASE_URL}/add-vocabulary-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileName,
          elements: batch.map(el => ({
            globalid: encodeURIComponent(el.globalid),
            expressID: el.expressID
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      results.push(result);
      
      // Небольшая задержка между пакетами для снижения нагрузки на сервер
      if (i + batchSize < elements.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      success: true,
      totalElements: elements.length,
      batchesProcessed: results.length,
      results: results
    };
  } catch (error) {
    console.error('Error adding batch to vocabulary:', error);
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

/**
 * Выполнить команду генерации данных
 * @param {string} fileName - имя файла модели
 * @param {string} command - команда для выполнения
 * @returns {Promise<Object>} - результат выполнения команды
 */
async function executeCommand(fileName, command) {
  try {
    const response = await fetch(`${API_BASE_URL}/add-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        command: command
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error executing command:', error);
    throw error;
  }
}

/**
 * Запустить проверку LLM
 * @param {string} fileName - имя файла модели
 * @returns {Promise<Object>} - результат запуска
 */
async function startLlmCheck(fileName) {
  try {
    console.log('[CLIENT-LLM] Starting LLM check for file:', fileName);
    const response = await fetch(`${API_BASE_URL}/llm-start/?fileName=${fileName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('[CLIENT-LLM] ERROR: Response not OK:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting LLM check:', error);
    throw error;
  }
}

async function startLlmPrompt(prompt) {
  try {
    console.log('[CLIENT-LLM] Starting LLM prompt:', prompt);
    const response = await fetch(`${API_BASE_URL}/llm-prompt/?prompt=${prompt}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('[CLIENT-LLM] ERROR: Response not OK:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting LLM check:', error);
    throw error;
  }
}

/**
 * Остановить проверку LLM
 * @returns {Promise<Object>} - результат остановки
 */
async function stopLlmCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/llm-stop`, {
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
    console.error('Error stopping LLM check:', error);
    throw error;
  }
}

/**
 * Получить результат LLM
 * @param {string} fileName - имя файла модели
 * @returns {Promise<Object>} - результат LLM
 */
async function getLlmResult(fileName) {
  try {
    const response = await fetch(`${API_BASE_URL}/llm-results/?fileName=${fileName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log("getLlmResult response", response) // Add this line to log the response inf
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting LLM result:', error);
    throw error;
  }
}

// Функция для подключения к WebSocket серверу
let socket = null;
let socketCallbacks = {
  onChunk: null,
  onComplete: null,
  onError: null
};

/**
 * Подключиться к WebSocket серверу
 * @param {Object} callbacks - Объект с колбэками для обработки событий
 * @returns {Object} - Объект сокета
 */
function connectToWebSocket(callbacks = {}) {
  try {
    // Если сокет уже существует и подключен, используем его
    if (socket && socket.connected) {
      console.log('WebSocket already connected');
      
      // Обновляем колбэки
      if (callbacks.onChunk) socketCallbacks.onChunk = callbacks.onChunk;
      if (callbacks.onComplete) socketCallbacks.onComplete = callbacks.onComplete;
      if (callbacks.onError) socketCallbacks.onError = callbacks.onError;
      
      return Promise.resolve(socket);
    }
    
    // Создаем новое подключение используя импортированный socket.io
    socket = io(API_BASE_URL);
    
    // Сохраняем колбэки
    if (callbacks.onChunk) socketCallbacks.onChunk = callbacks.onChunk;
    if (callbacks.onComplete) socketCallbacks.onComplete = callbacks.onComplete;
    if (callbacks.onError) socketCallbacks.onError = callbacks.onError;
    
    // Настраиваем обработчики событий
    socket.on('connect', () => {
      console.log('WebSocket connected, socket ID:', socket.id);
    });
    
    socket.on('llm-chunk', (data) => {
      // console.log('Received LLM chunk:', data.chunk);
      if (socketCallbacks.onChunk) socketCallbacks.onChunk(data.chunk);
    });
    
    socket.on('llm-complete', (data) => {
      console.log('Received complete LLM result');
      if (socketCallbacks.onComplete) socketCallbacks.onComplete(data.result);
    });
    
    socket.on('llm-error', (data) => {
      console.error('LLM error:', data.message);
      if (socketCallbacks.onError) socketCallbacks.onError(data.message);
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return Promise.resolve(socket);
  } catch (error) {
    console.error('Error in connectToWebSocket:', error);
    throw error;
  }
}

/**
 * Запросить результаты LLM через WebSocket
 * @param {string} fileName - имя файла модели
 * @returns {Promise<void>}
 */
// async function requestLlmResultsViaWebSocket(fileName, prompt) {
//   try {
//     if (!socket || !socket.connected) {
//       throw new Error('WebSocket not connected. Call connectToWebSocket first.');
//     }
    
//     console.log('Requesting LLM results via WebSocket for file:', fileName, 'with prompt:', prompt);
//     socket.emit('request-llm-results', { fileName, prompt });
//   } catch (error) {
//     console.error('Error requesting LLM results via WebSocket:', error);
//     throw error;
//   }
// }

export default {
  getModelInfo,
  createVocabulary,
  addVocabulary,
  addVocabularyBatch,
  updateVocabulary,
  getVocabulary,
  getFromAi,
  getAllKsiExpressIds,
  executeCommand,
  startLlmCheck,
  stopLlmCheck,
  getLlmResult,
  connectToWebSocket,
  startLlmPrompt
  // requestLlmResultsViaWebSocket
};
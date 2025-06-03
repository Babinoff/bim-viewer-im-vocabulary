// LLM Server - серверная логика для работы с LLM-проверками

const { getAllVocabularyFilled } = require('./db');
const { streamChatCompletion } = require('./llm-services');
const { getIfcProperties, getIfcRelationships } = require('./mcp-services');

class LLMServer {
  constructor() {
    this.checkInterval = null;
    this.results = {}; // Хранилище результатов LLM для каждого файла
    this.isRunning = false;
    this.intervalDelay = 300000; // 300 секунд
  }

  // Запуск LLM-проверки
  async startCheck(fileName) {
    try {
      console.log('[LLM-SERVER] Starting LLM check process', fileName, new Date().toISOString());
      this.isRunning = true;
      this.performCheck(fileName);
      return 'LLM check started.';
    } catch (error) {
      console.error('[LLM-SERVER] ERROR starting LLM check:', error);
      this.isRunning = false;
      throw error;
    }
  }
  
  // Выполнение одной проверки
  async performCheck(fileName) {
    try {
      const dangerousElements = await getAllVocabularyFilled(fileName, "vocabulary", 900);
      
      if (dangerousElements.length > 0) {
        console.log(`[LLM-SERVER] Found ${dangerousElements.length} dangerous elements`);
        let dangerousElementsData = [];
        for (const element of dangerousElements) {
          await getIfcProperties(element.globalid).then(properties => {
            // console.log('[LLM-SERVER] Properties for element', element.globalid, properties);
            element.properties = properties;
          });
          await getIfcRelationships(element.globalid).then(relationships => {
            // console.log('[LLM-SERVER] Relationships for element', element.globalid, relationships);
            element.relationships = relationships;
          })
          dangerousElementsData.push(element);
        }
        
        // Генерируем результат через LLM или тестовый режим
        const result = await this.generateLLMResult(dangerousElementsData);
        
        // Сохраняем результат
        this.results[fileName] = result;
        console.log('[LLM-SERVER] LLM result stored for', fileName);
        console.log('[LLM-SERVER] Result preview:', {
          messageLength: result.message ? result.message.length : 0,
          dangerousElements: result.dangerousElements ? result.dangerousElements.length : 0
        });
      } else {
        console.log('[LLM-SERVER] No dangerous elements found');
      }
    } catch (error) {
      console.error('[LLM-SERVER] Error during check:', error);
    }
  }
  
  // Генерация результата через LLM
  async generateLLMResult(dangerousElementsData, socketId = null) {
    try {
      console.log(`[LLM-SERVER] Generating LLM result for data`, dangerousElementsData);
      const prompt = `Привышение пороговых величин для датчиков оборудования, сопутсвующуя информация: ${JSON.stringify(dangerousElementsData)} .`;
      console.log(prompt);
      let llmResponse = "";
      
      // Получаем ссылку на io из модуля server.js
      const io = require('./server').io;
      
      await streamChatCompletion(
        prompt,
        (chunk) => {
          process.stdout.write(chunk);
          llmResponse += chunk;
          
          // Отправляем каждый чанк через WebSocket, если есть socketId
          if (io && socketId) {
            io.to(socketId).emit('llm-chunk', { chunk });
          } else if (io) {
            // Если нет конкретного socketId, отправляем всем подключенным клиентам
            io.emit('llm-chunk', { chunk });
          }
        }
      );
      
      console.log('[LLM-SERVER] LLM response received, length:', llmResponse ? llmResponse.length : 0);
      const responseParts = llmResponse.split("</think>")
      const result = {
        think: responseParts[0],
        message: responseParts[1]
      };
      
      // Отправляем полный результат через WebSocket
      if (io && socketId) {
        io.to(socketId).emit('llm-complete', { result });
      } else if (io) {
        io.emit('llm-complete', { result });
      }
      
      console.log('[LLM-SERVER] LLM result generated successfully');
      return result;
    } catch (error) {
      console.error('[LLM-SERVER] Error generating LLM result:', error);
      
      // Fallback к тестовому результату в случае ошибки
      const fallbackResult = {
        message: `Ошибка при обращении к LLM. 
        Найдены элементы с высоким значением vocabulary (>900):
        \n${dangerousElementsData.map(id => `- GlobalID: ${id.globalid}`).join('\n')}\n\n
        Всего элементов: ${dangerousElementsData.length}`,
      };
      
      console.log('[LLM-SERVER] Fallback result generated');
      return fallbackResult;
    }
  }
  
  // Остановка LLM-проверки
  stopCheck() {
    console.log('[LLM-SERVER] Stopping LLM check');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[LLM-SERVER] Check interval cleared');
    }
    
    this.isRunning = false;
    console.log('[LLM-SERVER] LLM check stopped');
    
    return { success: true, message: 'LLM check stopped.' };
  }
  
  // Получение результата LLM
  getResult(fileName) {
    try {
      console.log('[LLM-SERVER] Getting LLM result for file:', fileName);
      console.log('[LLM-SERVER] Timestamp:', new Date().toISOString());
      
      const result = this.results[fileName];
      
      if (result) {
        console.log('[LLM-SERVER] Result found for file:', fileName);
        // console.log('[LLM-SERVER] Result details:');
        // console.log('[LLM-SERVER] - Dangerous elements count:', result.dangerousElements ? result.dangerousElements.length : 0);
        
        // if (result.dangerousElements && result.dangerousElements.length > 0) {
        //   result.dangerousElements.forEach((item, index) => {
        //     console.log(`[LLM-SERVER] - Element ${index + 1}: GlobalID=${item.globalid}, ExpressID=${item.expressID}, Vocabulary=${item.vocabulary}`);
        //   });
        // }
        
        // console.log('[LLM-SERVER] - Message length:', result.message ? result.message.length : 0);
        
        // // Очищаем результат после получения
        // delete this.results[fileName];
        // console.log('[LLM-SERVER] Result cleared after retrieval');
        
        return { success: true, result: result };
      } else {
        console.log('[LLM-SERVER] No result available for file:', fileName);
        return { success: true, result: null };
      }
    } catch (error) {
      console.error('[LLM-SERVER] Error getting result:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Проверка статуса работы
  isCheckRunning() {
    return this.isRunning;
  }
  
  // Установка интервала проверки
  setCheckInterval(intervalMs) {
    this.intervalDelay = intervalMs;
    console.log(`[LLM-SERVER] Check interval set to ${intervalMs/1000} seconds`);
  }
  
  // Получение всех активных результатов
  getAllResults() {
    return { ...this.results };
  }
  
  // Очистка всех результатов
  clearAllResults() {
    console.log('[LLM-SERVER] Clearing all results');
    this.results = {};
    console.log('[LLM-SERVER] All results cleared');
  }
}

// Создаем единственный экземпляр для использования
const llmServer = new LLMServer();

module.exports = llmServer;
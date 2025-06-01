// LLM Server - серверная логика для работы с LLM-проверками

const { getAllVocabularyFilled } = require('./db');
const { chatWithModel } = require('./llm-services');

class LLMServer {
  constructor() {
    this.checkInterval = null;
    this.results = {}; // Хранилище результатов LLM для каждого файла
    this.isRunning = false;
    this.intervalDelay = 30000; // 30 секунд
  }

  // Запуск LLM-проверки
  async startCheck(fileName) {
    try {
      console.log('[LLM-SERVER] Starting LLM check process');
      console.log('[LLM-SERVER] Timestamp:', new Date().toISOString());
      console.log('[LLM-SERVER] File:', fileName);
      
      if (this.checkInterval) {
        console.log('[LLM-SERVER] Check already running, stopping previous check');
        this.stopCheck();
      }
      
      this.isRunning = true;
      
      // Выполняем первую проверку сразу
      console.log('[LLM-SERVER] Performing immediate first check');
      await this.performCheck(fileName);
      
      // Запускаем интервал для последующих проверок
      console.log('[LLM-SERVER] Setting up check interval');
      this.checkInterval = setInterval(async () => {
        if (this.isRunning) {
          await this.performCheck(fileName);
        }
      }, this.intervalDelay);
      
      console.log(`[LLM-SERVER] Check interval set up with ${this.intervalDelay/1000} second intervals`);
      
      return { success: true, message: 'LLM check started.' };
    } catch (error) {
      console.error('[LLM-SERVER] CRITICAL ERROR starting LLM check:', error);
      console.error('[LLM-SERVER] Error details:', error.message);
      console.error('[LLM-SERVER] Error stack:', error.stack);
      this.isRunning = false;
      throw error;
    }
  }
  
  // Выполнение одной проверки
  async performCheck(fileName) {
    try {
      console.log('[LLM-SERVER] Starting vocabulary data analysis');
      console.log('[LLM-SERVER] Timestamp:', new Date().toISOString());
      console.log('[LLM-SERVER] File:', fileName);
      
      const vocabularyData = await this.getVocabularyData(fileName);
      const dangerousElements = this.findDangerousElements(vocabularyData);
      
      if (dangerousElements.length > 0) {
        console.log(`[LLM-SERVER] Found ${dangerousElements.length} dangerous elements`);
        
        // Собираем данные об опасных элементах
        const dangerousElementsData = this.collectDangerousElementsData(vocabularyData);
        
        // Генерируем результат через LLM или тестовый режим
        const result = await this.generateLLMResult(dangerousElements, dangerousElementsData);
        
        // Сохраняем результат
        this.results[fileName] = result;
        console.log('[LLM-SERVER] LLM result stored for', fileName);
        console.log('[LLM-SERVER] Result preview:', {
          messageLength: result.message ? result.message.length : 0,
          dangerousElementsCount: result.dangerousElements ? result.dangerousElements.length : 0
        });
      } else {
        console.log('[LLM-SERVER] No dangerous elements found');
      }
    } catch (error) {
      console.error('[LLM-SERVER] Error during check:', error);
      console.error('[LLM-SERVER] Error details:', error.message);
    }
  }
  
  // Получение данных vocabulary
  async getVocabularyData(fileName) {
    try {
      console.log('[LLM-SERVER] Getting vocabulary data for file:', fileName);
      const vocabularyData = await getAllVocabularyFilled(fileName);
      
      console.log('[LLM-SERVER] Vocabulary data statistics:');
      console.log('[LLM-SERVER] - Total records:', vocabularyData ? vocabularyData.length : 0);
      
      if (vocabularyData && vocabularyData.length > 0) {
        const validVocabulary = vocabularyData.filter(item => item.vocabulary && !isNaN(parseInt(item.vocabulary)));
        const highVocabulary = validVocabulary.filter(item => parseInt(item.vocabulary) > 900);
        const avgVocabulary = validVocabulary.length > 0 ? 
          validVocabulary.reduce((sum, item) => sum + parseInt(item.vocabulary), 0) / validVocabulary.length : 0;
        
        console.log('[LLM-SERVER] - Valid vocabulary records:', validVocabulary.length);
        console.log('[LLM-SERVER] - High vocabulary (>900) records:', highVocabulary.length);
        console.log('[LLM-SERVER] - Average vocabulary value:', avgVocabulary.toFixed(2));
      }
      
      return vocabularyData;
    } catch (error) {
      console.error('[LLM-SERVER] CRITICAL ERROR getting vocabulary data:', error);
      throw error;
    }
  }
  
  // Поиск опасных элементов
  findDangerousElements(vocabularyData) {
    try {
      console.log('[LLM-SERVER] Searching for dangerous elements');
      const dangerousElements = [];
      
      if (vocabularyData && vocabularyData.length > 0) {
        for (const item of vocabularyData) {
          if (item.vocabulary && parseInt(item.vocabulary) > 900) {
            dangerousElements.push(item.globalid);
          }
        }
      }
      
      console.log('[LLM-SERVER] Found dangerous elements:', dangerousElements.length);
      if (dangerousElements.length > 0) {
        console.log('[LLM-SERVER] Dangerous element IDs:', dangerousElements.slice(0, 5), 
          dangerousElements.length > 5 ? `... and ${dangerousElements.length - 5} more` : '');
      }
      
      return dangerousElements;
    } catch (error) {
      console.error('[LLM-SERVER] Error finding dangerous elements:', error);
      return [];
    }
  }
  
  // Сбор данных об опасных элементах
  collectDangerousElementsData(vocabularyData) {
    try {
      console.log('[LLM-SERVER] Collecting dangerous elements data');
      const dangerousElementsData = [];
      
      for (const item of vocabularyData) {
        if (item.vocabulary && parseInt(item.vocabulary) > 900) {
          dangerousElementsData.push({
            globalid: item.globalid,
            expressID: item.expressID,
            vocabulary: item.vocabulary
          });
        }
      }
      
      console.log('[LLM-SERVER] Collected data for', dangerousElementsData.length, 'dangerous elements');
      dangerousElementsData.forEach((item, index) => {
        console.log(`[LLM-SERVER] Element ${index + 1}: GlobalID=${item.globalid}, ExpressID=${item.expressID}, Vocabulary=${item.vocabulary}`);
      });
      
      return dangerousElementsData;
    } catch (error) {
      console.error('[LLM-SERVER] Error collecting dangerous elements data:', error);
      return [];
    }
  }
  
  // Генерация результата через LLM
  async generateLLMResult(dangerousElements, dangerousElementsData) {
    try {
      console.log('[LLM-SERVER] Generating LLM result');
      
      // Для тестирования без LLM - раскомментируйте следующий блок:
      /*
      const testResult = {
        message: `Найдены элементы с высоким значением vocabulary (>900):\n${dangerousElements.map(id => `- GlobalID: ${id}`).join('\n')}\n\nВсего элементов: ${dangerousElements.length}`,
        dangerousElements: dangerousElementsData
      };
      console.log('[LLM-SERVER] Test result generated');
      return testResult;
      */
      
      // Для работы с реальным LLM:
      console.log('[LLM-SERVER] Calling LLM with prompt for dangerous elements');
      const prompt = `Проанализируй элементы с globalid: ${dangerousElements.join(', ')}. Получи информацию о каждом элементе и связанных пространствах.`;
      console.log('[LLM-SERVER] LLM prompt:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
      
      const llmResponse = await chatWithModel(prompt);
      console.log('[LLM-SERVER] LLM response received, length:', llmResponse ? llmResponse.length : 0);
      
      const result = {
        message: llmResponse,
        dangerousElements: dangerousElementsData
      };
      
      console.log('[LLM-SERVER] LLM result generated successfully');
      return result;
    } catch (error) {
      console.error('[LLM-SERVER] Error generating LLM result:', error);
      
      // Fallback к тестовому результату в случае ошибки
      const fallbackResult = {
        message: `Ошибка при обращении к LLM. Найдены элементы с высоким значением vocabulary (>900):\n${dangerousElements.map(id => `- GlobalID: ${id}`).join('\n')}\n\nВсего элементов: ${dangerousElements.length}`,
        dangerousElements: dangerousElementsData
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
        console.log('[LLM-SERVER] Result details:');
        console.log('[LLM-SERVER] - Dangerous elements count:', result.dangerousElements ? result.dangerousElements.length : 0);
        
        if (result.dangerousElements && result.dangerousElements.length > 0) {
          result.dangerousElements.forEach((item, index) => {
            console.log(`[LLM-SERVER] - Element ${index + 1}: GlobalID=${item.globalid}, ExpressID=${item.expressID}, Vocabulary=${item.vocabulary}`);
          });
        }
        
        console.log('[LLM-SERVER] - Message length:', result.message ? result.message.length : 0);
        
        // Очищаем результат после получения
        delete this.results[fileName];
        console.log('[LLM-SERVER] Result cleared after retrieval');
        
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
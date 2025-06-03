// LLM Client - клиентская часть для работы с LLM проверками
import { ElementHighlighter } from './element-highlighter.js';

export class LLMClient {
  constructor(apiService, viewer) {
    this.apiService = apiService;
    this.viewer = viewer;
    this.checkInterval = null;
    this.isRunning = false;
    this.intervalDelay = 5000; // 5 секунд
    this.socket = null;
    this.currentLlmResponse = "";
  }

  // Запуск LLM-проверки
  async startCheck(fileName, modelID, warningMaterial) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction(`Начало проверки систем для: ${fileName}`);
      }
      
      if (this.isRunning) {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('Check already running, stopping previous check');
        }
        this.stopCheck();
      }
      
      this.isRunning = true;
      this.currentLlmResponse = "";
      
      // Сбрасываем текущий потоковый лог LLM перед началом новой проверки
      if (window.llmLogger) {
        window.llmLogger.resetLLMStreamLog();
      }
      
      // Инициализируем WebSocket соединение
      this.socket = await this.apiService.connectToWebSocket({
        // Обработчик получения чанка данных
        onChunk: (chunk) => {
          if (window.llmLogger) {
            // Добавляем чанк к текущему ответу
            this.currentLlmResponse += chunk;
            // Отображаем в реальном времени
            window.llmLogger.logLLMResponse(this.currentLlmResponse);
          }
        },
        
        // Обработчик получения полного результата
        onComplete: (result) => {
          if (window.llmLogger) {
            // Завершаем текущий потоковый лог LLM
            window.llmLogger.resetLLMStreamLog();
            window.llmLogger.logServerResponse('LLM results completed via WebSocket');
            // Создаем новую запись для финального JSON результата
            window.llmLogger.log('llm', result.message.split("title")[1], 'llm-response');
          }
          
          // Обработка полного результата и подсветка опасных элементов
          try {
            if (result && result.dangerousElements) {
              console.log('[LLM-CLIENT] Processing dangerous elements from WebSocket result:', result.dangerousElements);
              this.highlightLLMResults(result.dangerousElements, modelID, warningMaterial);
            } 
          } catch (error) {
            console.error('[LLM-CLIENT] Error processing WebSocket result:', error);
            if (window.llmLogger) {
              window.llmLogger.logError('client', `Error processing WebSocket result: ${error.message}`);
            }
          }
        },
        
        // Обработчик ошибок
        onError: (errorMessage) => {
          if (window.llmLogger) {
            window.llmLogger.logError('server', `Error in LLM processing: ${errorMessage}`);
          }
        }
      });
      
      // Отправляем запрос на начало проверки через HTTP
      window.llmLogger.logServerResponse(JSON.stringify(await this.apiService.startLlmCheck(fileName)));
      
      // Запрашиваем результаты через WebSocket
      await this.apiService.requestLlmResultsViaWebSocket(fileName);
      
      // Оставляем интервал для периодической проверки, если WebSocket не сработает
      // this.checkInterval = setInterval(async () => {
      //   if (this.isRunning) {
      //     await this.getLlmResult(fileName, modelID, warningMaterial);
      //   }
      // }, this.intervalDelay);
      
    } catch (error) {
      if (window.llmLogger) {
        window.llmLogger.logError('client', `CRITICAL ERROR starting LLM check: ${error.message}`);
      }
      console.error('[LLM-CLIENT] CRITICAL ERROR starting LLM check:', error);
      this.isRunning = false;
      throw error;
    }
  }
  
  // Выполнение одной проверки
  async getLlmResult(fileName, modelID, warningMaterial) {
    try {
      // Если WebSocket соединение активно, используем его
      if (this.socket && this.socket.connected) {
        console.log('[LLM-CLIENT] Using WebSocket for LLM results');
        // Запрашиваем результаты через WebSocket
        await this.apiService.requestLlmResultsViaWebSocket(fileName);
        // Результаты будут обрабатываться через обработчики событий WebSocket
        return;
      }
      
      // Запасной вариант - HTTP запрос
      console.log('[LLM-CLIENT] Using HTTP for LLM results (WebSocket not available)');
      const response = await this.apiService.getLlmResult(fileName);
      
      if (window.llmLogger) {
        window.llmLogger.logServerResponse('LLM results received via HTTP');
        // Обновляем текущий ответ
        this.currentLlmResponse = JSON.stringify(response);
        window.llmLogger.logLLMResponse(this.currentLlmResponse);
      }
      
      // Подсветка опасных элементов, если необходимо
      if (response && response.result && response.result.dangerousElements) {
        await this.highlightLLMResults(response.result.dangerousElements, modelID, warningMaterial);
      }
    } catch (error) {
      if (window.llmLogger) {
        window.llmLogger.logError('client', `Error during check polling: ${error.message}`);
      }
      console.error('[LLM-CLIENT] Error during check polling:', error);
    }
  }
  
  // Остановка LLM-проверки
  stopCheck() {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Stopping LLM check');
      }
      
      // Очищаем интервал проверки
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        console.log('[LLM-CLIENT] Check interval cleared');
      }
      
      // Закрываем WebSocket соединение, если оно открыто
      if (this.socket && this.socket.connected) {
        console.log('[LLM-CLIENT] Closing WebSocket connection');
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isRunning = false;
      this.currentLlmResponse = "";
      console.log('[LLM-CLIENT] LLM check stopped');
      
      // Завершаем текущий потоковый лог LLM
      if (window.llmLogger) {
        window.llmLogger.resetLLMStreamLog();
      }
      
      // Отправляем запрос на остановку проверки на сервере
      this.apiService.stopLlmCheck().then(response => {
        if (window.llmLogger) {
          window.llmLogger.logServerResponse(JSON.stringify(response));
        }
      }).catch(error => {
        console.error('[LLM-CLIENT] Error stopping LLM check on server:', error);
        if (window.llmLogger) {
          window.llmLogger.logError('client', `Error stopping LLM check on server: ${error.message}`);
        }
      });
      
    } catch (error) {
      console.error('[LLM-CLIENT] Error stopping LLM check:', error);
      if (window.llmLogger) {
        window.llmLogger.logError('client', `Error stopping LLM check: ${error.message}`);
      }
    }
  }
  
  // Обновление вывода LLM в UI
  // updateLLMOutput(result) {
  //   try {
  //     if (window.llmLogger) {
  //       window.llmLogger.logClientAction('Updating LLM output in UI');
  //     }
  //     const llmOutput = document.getElementById('llmOutput');
  //     if (llmOutput) {
  //       // Отключаем обновление llmOutput, так как теперь используем логгер
  //       // llmOutput.value = result.message || result;
  //       if (window.llmLogger) {
  //         window.llmLogger.logClientAction('LLM output element found but not updated (using logger instead)');
  //       }
  //     } else {
  //       if (window.llmLogger) {
  //         window.llmLogger.logClientAction('LLM output element not found');
  //       }
  //     }
  //   } catch (error) {
  //     if (window.llmLogger) {
  //       window.llmLogger.logError('client', `Error updating LLM output: ${error.message}`);
  //     }
  //     console.error('[LLM-CLIENT] Error updating LLM output:', error);
  //   }
  // }
  
  // Обработка результатов LLM и подсветка элементов
  async highlightLLMResults(dangerousElements, modelID, warningMaterial) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Processing LLM results for highlighting');
      }
      if (dangerousElements && Array.isArray(dangerousElements)) {
        // Создаем экземпляр highlighter для подсветки
        const highlighter = new ElementHighlighter(this.viewer, modelID, warningMaterial);
        await highlighter.highlightDangerousElements(dangerousElements);
        
        if (window.llmLogger) {
          window.llmLogger.logClientAction(`Highlighted ${dangerousElements.length} dangerous elements`);
        }
      } else {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('No dangerous elements found in results or invalid format');
        }
        console.warn('[LLM-CLIENT] No dangerous elements found or invalid format:', dangerousElements);
      }
    } catch (error) {
      if (window.llmLogger) {
        window.llmLogger.logError('client', `Error processing LLM results: ${error.message}`);
      }
      console.error('[LLM-CLIENT] Error processing LLM results:', error);
    }
  }
  
  // Проверка статуса работы
  isCheckRunning() {
    return this.isRunning;
  }
  
  // Установка интервала проверки
  setCheckInterval(intervalMs) {
    this.intervalDelay = intervalMs;
    if (window.llmLogger) {
      window.llmLogger.logClientAction(`Check interval set to ${intervalMs/1000} seconds`);
    }
  }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMClient;
} else {
  window.LLMClient = LLMClient;
}
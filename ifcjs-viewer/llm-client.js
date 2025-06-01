// LLM Client - клиентская часть для работы с LLM проверками
import { ElementHighlighter } from './element-highlighter.js';

export class LLMClient {
  constructor(apiService, viewer) {
    this.apiService = apiService;
    this.viewer = viewer;
    this.checkInterval = null;
    this.isRunning = false;
    this.intervalDelay = 20000; // 20 секунд
  }

  // Запуск LLM-проверки
  async startCheck(fileName, modelID, warningMaterial) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Starting LLM check process');
        window.llmLogger.logClientAction(`File: ${fileName}`);
      }
      
      if (this.isRunning) {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('Check already running, stopping previous check');
        }
        this.stopCheck();
      }
      
      this.isRunning = true;
      
      // Запускаем серверную проверку
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Starting server LLM check');
      }
      await this.apiService.startLlmCheck(fileName);
      
      // Выполняем первую проверку сразу
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Performing immediate first check');
      }
      await this.performCheck(fileName, modelID, warningMaterial);
      
      // Запускаем интервал для последующих проверок
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Setting up polling interval');
      }
      this.checkInterval = setInterval(async () => {
        if (this.isRunning) {
          await this.performCheck(fileName, modelID, warningMaterial);
        }
      }, this.intervalDelay);
      
      if (window.llmLogger) {
        window.llmLogger.logClientAction(`Polling interval set up with ${this.intervalDelay/1000} second intervals`);
      }
      
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
  async performCheck(fileName, modelID, warningMaterial) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Polling for LLM results...');
      }
      const response = await this.apiService.getLlmResult(fileName);
      
      if (response && response.result) {
        if (window.llmLogger) {
          window.llmLogger.logServerResponse('LLM results received');
          window.llmLogger.logLLMResponse(JSON.stringify(response.result, null, 2));
        }
        
        // Обновляем UI с результатом
        this.updateLLMOutput(response.result);
        
        // Обрабатываем результаты и подсвечиваем элементы
        await this.processLLMResults(response, modelID, warningMaterial);
      } else {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('No results available yet');
        }
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
    if (window.llmLogger) {
      window.llmLogger.logClientAction('Stopping LLM check');
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Polling interval cleared');
      }
    }
    
    this.isRunning = false;
    if (window.llmLogger) {
      window.llmLogger.logClientAction('LLM check stopped');
    }
  }
  
  // Обновление вывода LLM в UI
  updateLLMOutput(result) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Updating LLM output in UI');
      }
      const llmOutput = document.getElementById('llmOutput');
      if (llmOutput) {
        // Отключаем обновление llmOutput, так как теперь используем логгер
        // llmOutput.value = result.message || result;
        if (window.llmLogger) {
          window.llmLogger.logClientAction('LLM output element found but not updated (using logger instead)');
        }
      } else {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('LLM output element not found');
        }
      }
    } catch (error) {
      if (window.llmLogger) {
        window.llmLogger.logError('client', `Error updating LLM output: ${error.message}`);
      }
      console.error('[LLM-CLIENT] Error updating LLM output:', error);
    }
  }
  
  // Обработка результатов LLM и подсветка элементов
  async processLLMResults(response, modelID, warningMaterial) {
    try {
      if (window.llmLogger) {
        window.llmLogger.logClientAction('Processing LLM results for highlighting');
      }
      
      if (response.result && response.result.dangerousElements) {
        if (window.llmLogger) {
          window.llmLogger.logClientAction(`Found dangerous elements: ${response.result.dangerousElements.length}`);
        }
        
        // Создаем экземпляр highlighter для подсветки
        const highlighter = new ElementHighlighter(this.viewer, modelID, warningMaterial);
        await highlighter.highlightDangerousElements(response.result.dangerousElements);
      } else {
        if (window.llmLogger) {
          window.llmLogger.logClientAction('No dangerous elements found in results');
        }
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
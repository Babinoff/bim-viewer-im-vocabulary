// LLM Logger - модуль для логирования и отображения логов LLM системы

export class LLMLogger {
  constructor() {
    this.logWindow = null;
    this.logOutput = null;
    this.isVisible = false;
    this.logs = [];
    this.maxLogs = 1000; // Максимальное количество логов в памяти
    
    this.initializeLogWindow();
  }

  initializeLogWindow() {
    this.logWindow = document.getElementById('llmLogWindow');
    this.logOutput = document.getElementById('llmLogOutput');
    
    if (!this.logWindow || !this.logOutput) {
      console.error('[LLM-LOGGER] Log window elements not found');
      return;
    }

    // Обработчик закрытия окна
    const closeBtn = document.getElementById('llmLogClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideLogWindow();
      });
    }

    // Делаем окно перетаскиваемым
    this.makeDraggable();
    
    console.log('[LLM-LOGGER] Log window initialized');
  }

  makeDraggable() {
    const header = this.logWindow.querySelector('.llm-log-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('llm-log-close')) return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        
        this.logWindow.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  showLogWindow() {
    if (this.logWindow) {
      this.logWindow.style.display = 'flex';
      this.isVisible = true;
      // this.log('client', 'LLM Log Window opened');
    }
  }

  hideLogWindow() {
    if (this.logWindow) {
      this.logWindow.style.display = 'none';
      this.isVisible = false;
      this.log('client', 'LLM Log Window closed');
    }
  }

  toggleLogWindow() {
    if (this.isVisible) {
      this.hideLogWindow();
    } else {
      this.showLogWindow();
    }
  }

  log(source, message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      source,
      message,
      type
    };

    // Добавляем в массив логов
    this.logs.push(logEntry);
    
    // Ограничиваем количество логов
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Отображаем в консоли
    console.log(`[LLM-${source.toUpperCase()}] ${message}`);
    
    // Отображаем в окне логов
    this.displayLogEntry(logEntry);
  }

  displayLogEntry(logEntry) {
    if (!this.logOutput) return;

    const logElement = document.createElement('div');
    logElement.className = `llm-log-entry ${logEntry.source} ${logEntry.type}`;
    
    const timeStr = new Date(logEntry.timestamp).toLocaleTimeString();
    
    logElement.innerHTML = `
      <span class="llm-log-timestamp">${timeStr}</span>
      <span class="llm-log-source">[${logEntry.source.toUpperCase()}]</span>
      <span class="llm-log-message">${this.escapeHtml(logEntry.message)}</span>
    `;

    this.logOutput.appendChild(logElement);
    
    // Автоскролл вниз
    this.logOutput.scrollTop = this.logOutput.scrollHeight;
  }

  logClientAction(message) {
    this.log('client', message, 'info');
  }

  logServerResponse(message) {
    this.log('server', message, 'info');
  }

  // Переменная для хранения текущего потокового лога LLM ответа
  #currentLlmStreamLog = null;

  logLLMResponse(message) {
    // Если нет активного потокового лога, создаем новый
    if (!this.#currentLlmStreamLog) {
      this.#currentLlmStreamLog = this.streamLog('llm', message);
      // Добавляем запись в массив логов
      const timestamp = new Date().toISOString();
      this.logs.push({
        timestamp,
        source: 'llm',
        message: message,
        type: 'llm-response'
      });
    } else {
      // Обновляем существующий потоковый лог
      this.#currentLlmStreamLog.update(message);
      
      // Обновляем последнюю запись в массиве логов
      if (this.logs.length > 0) {
        this.logs[this.logs.length - 1].message = message;
      }
    }
    
    // Отображаем в консоли
    console.log(`[LLM-LLM] ${message}`);
  }

  // Метод для сброса текущего потокового лога LLM
  resetLLMStreamLog() {
    if (this.#currentLlmStreamLog) {
      this.#currentLlmStreamLog.complete();
      this.#currentLlmStreamLog = null;
    }
  }

  logError(source, message) {
    this.log(source, message, 'error');
  }

  clearLogs() {
    this.logs = [];
    if (this.logOutput) {
      this.logOutput.innerHTML = '';
    }
    this.log('client', 'Logs cleared');
  }

  exportLogs() {
    const logsText = this.logs.map(log => 
      `${log.timestamp} [${log.source.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.log('client', 'Logs exported to file');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Метод для потокового отображения данных (аналог streamChatCompletion)
  streamLog(source, initialMessage) {
    const timestamp = new Date().toISOString();
    const logElement = document.createElement('div');
    logElement.className = `llm-log-entry ${source} streaming`;
    
    const timeStr = new Date(timestamp).toLocaleTimeString();
    
    logElement.innerHTML = `
      <span class="llm-log-timestamp">${timeStr}</span>
      <span class="llm-log-source">[${source.toUpperCase()}]</span>
      <span class="llm-log-message">${this.escapeHtml(initialMessage)}</span>
    `;

    if (this.logOutput) {
      this.logOutput.appendChild(logElement);
      this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    // Возвращаем функцию для обновления сообщения
    return {
      update: (newMessage) => {
        const messageSpan = logElement.querySelector('.llm-log-message');
        if (messageSpan) {
          messageSpan.innerHTML = this.escapeHtml(newMessage);
          if (this.logOutput) {
            this.logOutput.scrollTop = this.logOutput.scrollHeight;
          }
        }
      },
      complete: () => {
        logElement.classList.remove('streaming');
      }
    };
  }
}

// Глобальный экземпляр логгера
window.llmLogger = new LLMLogger();
// Проверка доступности MCP сервера
async function checkMCPServerHealth() {
  console.log('=== Проверка доступности MCP сервера ===');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('http://localhost:8001/bonsai/get_ifc_project_info', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('MCP сервер доступен, статус открытого файла:', response.status);
    return true;
  } catch (error) {
    console.log('MCP сервер недоступен:', error.message);
    console.log('Убедитесь, что MCP сервер запущен на порту 8001');
    return false;
  }
}

// Тест прямого вызова MCP API
async function testMCPDirectCall() {
  console.log('=== Тест прямого вызова MCP API ===');
  try {
    const response = await fetch('http://localhost:8001/bonsai/list_ifc_entities', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entity_type: 'IfcAirTerminal',
        limit: 50,
        selected_only: false
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Успешный ответ от MCP сервера данные:', JSON.stringify(data, null, 2));
    
    if (data.entities && data.entities.length > 0) {
      console.log(`Найдено элементов ${data.entities.length}`);
      console.log('Первый элемент:', data.entities[0]);
    } else {
      console.log('Элементы не найдены');
    }
    
  } catch (error) {
    console.error('Ошибка при вызове MCP API:', error.message);
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('Запуск тестов интеграции с MCP сервером\n');
  
  // Проверяем доступность сервера
  const serverAvailable = await checkMCPServerHealth();
  
  if (serverAvailable) {
    console.log('\nMCP сервер доступен, запускаем полные тесты\n');
    await testMCPDirectCall();
  } else {
    console.log('\nMCP сервер недоступен\n');
  }
  
  console.log('\n=== Тесты завершены ===');
}

// Запуск тестов
await runTests().catch(console.error);

module.exports = {
  testMCPDirectCall,
  checkMCPServerHealth
};
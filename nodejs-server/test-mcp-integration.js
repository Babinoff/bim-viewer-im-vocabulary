const { generateDataByCode } = require('./data-generators');
const axios = require('axios');

// Тест прямого вызова MCP API
async function testMCPDirectCall() {
  console.log('=== Тест прямого вызова MCP API ===');
  
  try {
    const response = await axios.post('http://localhost:8001/bonsai/list_ifc_entities', {
      entity_type: 'IfcAirTerminal',
      limit: 50,
      selected_only: false
    }, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Успешный ответ от MCP сервера:');
    console.log('Статус:', response.status);
    console.log('Данные:', JSON.stringify(response.data, null, 2));
    
    if (response.data.entities && response.data.entities.length > 0) {
      console.log(`Найдено ${response.data.entities.length} элементов типа IfcAirTerminal`);
      console.log('Первый элемент:', response.data.entities[0]);
    } else {
      console.log('Элементы не найдены');
    }
    
  } catch (error) {
    console.error('Ошибка при вызове MCP API:');
    console.error('Сообщение:', error.message);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
    }
  }
}

// Тест генератора с IFC типом
async function testGeneratorWithIFCType() {
  console.log('\n=== Тест генератора RUS_PersonResponsibleForOperation с IFC типом ===');
  
  try {
    const result = await generateDataByCode('RUS_PersonResponsibleForOperation IfcAirTerminal');
    console.log('Результат генерации:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Ошибка при генерации данных:', error.message);
  }
}

// Тест генератора с другим IFC типом
async function testGeneratorWithDifferentIFCType() {
  console.log('\n=== Тест генератора с типом IfcWall ===');
  
  try {
    const result = await generateDataByCode('RUS_PersonResponsibleForOperation IfcWall');
    console.log('Результат генерации:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Ошибка при генерации данных:', error.message);
  }
}

// Тест генератора с globalId (старый способ)
async function testGeneratorWithGlobalId() {
  console.log('\n=== Тест генератора с globalId ===');
  
  try {
    const result = await generateDataByCode('RUS_PersonResponsibleForOperation', '25d8vNFRj878F8EetlLCj1');
    console.log('Результат генерации:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Ошибка при генерации данных:', error.message);
  }
}

// Проверка доступности MCP сервера
async function checkMCPServerHealth() {
  console.log('=== Проверка доступности MCP сервера ===');
  
  try {
    const response = await axios.get('http://localhost:8001/health', {
      timeout: 5000
    });
    console.log('MCP сервер доступен, статус:', response.status);
    return true;
  } catch (error) {
    console.log('MCP сервер недоступен:', error.message);
    console.log('Убедитесь, что MCP сервер запущен на порту 8001');
    return false;
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
    await testGeneratorWithIFCType();
    await testGeneratorWithDifferentIFCType();
  } else {
    console.log('\nMCP сервер недоступен, тестируем fallback режим\n');
    await testGeneratorWithIFCType();
  }
  
  // Тест с globalId всегда работает
  await testGeneratorWithGlobalId();
  
  console.log('\n=== Тесты завершены ===');
}

// Запуск тестов
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testMCPDirectCall,
  testGeneratorWithIFCType,
  testGeneratorWithGlobalId,
  checkMCPServerHealth
};
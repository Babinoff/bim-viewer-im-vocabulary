const { generateDataByCode } = require('./data-generators');

// Тест генератора RUS_PersonResponsibleForOperation с IFC типом
async function testIfcGenerator() {
  console.log('Тестирование генератора RUS_PersonResponsibleForOperation с IFC типом...');
  
  try {
    // Тест 1: Обычный вызов с globalId
    console.log('\n=== Тест 1: Обычный вызов с globalId ===');
    const result1 = await generateDataByCode('RUS_PersonResponsibleForOperation', 'test-global-id');
    console.log('Результат:', result1);
    
    // Тест 2: Вызов с IFC типом (пока с заглушкой)
    console.log('\n=== Тест 2: Вызов с IFC типом ===');
    const result2 = await generateDataByCode('RUS_PersonResponsibleForOperation', null, 'IFCLIGHTFIXTURE');
    console.log('Результат:', result2);
    
    // Тест 3: Вызов без параметров (случайная генерация)
    console.log('\n=== Тест 3: Случайная генерация ===');
    const result3 = await generateDataByCode('RUS_PersonResponsibleForOperation');
    console.log('Результат:', result3);
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

// Запуск теста
if (require.main === module) {
  testIfcGenerator();
}

module.exports = { testIfcGenerator };
const { dataGenerators } = require('./data-generators');

async function testSpecificGlobalId() {
    console.log('=== Тест с конкретным GlobalId ===');
    
    const globalId = '2mBj9dlvnE59AN5tSkDHdH';
    console.log(`Тестируем GlobalId: ${globalId}`);
    
    try {
        const result = await dataGenerators['RUS_PersonResponsibleForOperation'](globalId);
        console.log('Результат генерации:', result);
    } catch (error) {
        console.error('Ошибка при генерации:', error.message);
        console.error('Полная ошибка:', error);
    }
    
    console.log('=== Тест завершен ===');
}

testSpecificGlobalId();
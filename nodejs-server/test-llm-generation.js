const { generateDataByCode } = require('./data-generators');
const { connectToDatabase, getAllGlobalIds } = require('./db');
const { streamChatCompletion } = require('./llm-services');

// Тестовый скрипт для проверки работы LLM генерации
async function testLLMGeneration() {
  try {
    console.log('=== Тест LLM генерации ответственных лиц ===');
    
    // Подключаемся к тестовой базе данных
    // Замените 'test-model' на имя вашей модели
    const testFileName = 'exploitation_test';
    
    console.log(`Подключение к базе данных: ${testFileName}`);
    await connectToDatabase(testFileName);
    
    // Получаем несколько globalid для тестирования
    const allGlobalIds = await getAllGlobalIds(testFileName);
    console.log(`Найдено ${allGlobalIds.length} элементов в базе данных`);
    
    if (allGlobalIds.length === 0) {
      console.log('База данных пуста. Добавьте элементы для тестирования.');
      return;
    }
    
    // Тестируем на первых 3 элементах
    const testGlobalIds = allGlobalIds.slice(0, 3);
    console.log(`Тестирование на ${testGlobalIds.length} элементах:`);
    testGlobalIds.forEach((globalId, index) => {
      console.log(`  ${index + 1}. ${globalId}`);
    });
    
    console.log('\n=== Начинаем тестирование ===');
    
    for (let i = 0; i < testGlobalIds.length; i++) {
      const globalId = testGlobalIds[i]; // getAllGlobalIds возвращает массив строк
      
      // Проверяем на undefined
      if (!globalId) {
        console.log(`\nТест ${i + 1}/${testGlobalIds.length}: globalId is undefined, пропускаем`);
        continue;
      }
      
      console.log(`\nТест ${i + 1}/${testGlobalIds.length}: ${globalId}`);
      
      try {
        const responsiblePersons = {
          'Главный инженер': [
            'Иванов А.В.', 'Петров С.М.', 'Козлов В.И.', 'Морозов Д.А.'
          ],
          'Инженер по эксплуатации': [
            'Сидоров И.П.', 'Новиков К.С.', 'Беляев А.Н.', 'Катаев М.В.'
          ],
          'Технический директор': [
            'Обухов Н.Г.', 'Калинин Е.Р.', 'Лукин В.А.'
          ],
          'Начальник службы эксплуатации': [
            'Матвеев О.И.', 'Ильин Р.С.', 'Деревянко А.М.', 'Савельев П.В.'
          ],
          'Главный механик': [
            'Тихонов Г.А.', 'Борисов Л.Н.', 'Королев С.В.'
          ],
          'Главный энергетик': [
            'Герасимов В.М.', 'Пономарев А.И.', 'Григорьев Н.С.'
          ],
          'Инженер-механик': [
            'Лазарев К.В.', 'Медведев И.А.', 'Ершов Д.М.', 'Никитин П.С.'
          ],
          'Инженер-электрик': [
            'Соболев А.Г.', 'Рябов В.Н.', 'Поляков М.И.', 'Цветков С.А.'
          ],
          'Инженер по вентиляции и кондиционированию': [
            'Данилов Е.В.', 'Жуков Р.М.', 'Фролов А.С.'
          ],
          'Инженер по отоплению': [
            'Журавлев И.Н.', 'Николаев В.А.', 'Крылов Д.И.'
          ],
          'Инженер по водоснабжению': [
            'Максимов П.Г.', 'Сидоренко А.В.', 'Осипов М.С.'
          ],
          'Инженер по пожарной безопасности': [
            'Белоусов К.А.', 'Федотов В.И.', 'Дорофеев Н.М.'
          ],
          'Руководитель технической службы': [
            'Егоров С.В.', 'Матюшин А.Н.', 'Бобылев И.А.'
          ],
          'Специалист по техническому обслуживанию': [
            'Дмитриев В.С.', 'Калашников М.А.', 'Карпов Р.И.', 'Власов Д.В.'
          ],
          'Мастер по ремонту оборудования': [
            'Мельников А.М.', 'Денисов П.С.', 'Гаврилов И.В.', 'Тихомиров Н.А.'
          ],
          'Начальник отдела эксплуатации': [
            'Кузьмин В.Г.', 'Кудрявцев С.И.', 'Баранов А.Р.'
          ]
        };
        // Тестируем через streamChatCompletion
        const positions = Object.keys(responsiblePersons);
        const positionsText = positions.join(', ');
        
        const prompt = `
          Используй get_ifc_properties для GlobalId: ${globalId}.

          Если это элемент инжинерного оборудования, то на основании данных выбери наиболее подходящую должность ответственного лица из следующего списка:
          
          ${positionsText}
          
          Если это не элемент инжинерного оборудования, то верни "Не требуется"
          
          Возвращай только должность или "Не требуется" без комментариев, и результатов запроса.
          `;


        console.log('  Запрос к LLM (через streamChatCompletion)...');
        let streamResult = '';
        await streamChatCompletion(
          prompt,
          (chunk) => {
            streamResult += chunk;
            process.stdout.write(chunk); // Выводим каждый фрагмент в консоль
          }
        );
        console.log('\n  Результат (через stream):', streamResult);
        
      } catch (error) {
        console.error(`  Ошибка: ${error.message}`);
      }
      
      // Пауза между запросами
      if (i < testGlobalIds.length - 1) {
        pause = 1;
        console.log(`Пауза ${pause} секунды...`);
        await new Promise(resolve => setTimeout(resolve, pause*1000));
      }
    }
    
    console.log('\n=== Тестирование завершено ===');
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

async function testLLMStream() {
  console.log("statrt testLLMStream"); 
  await streamChatCompletion(
    'ping',
    (chunk) => {
        console.log(chunk); // Выводит каждый фрагмент в консоль
    }
  );
}

// Запускаем тест, если скрипт вызван напрямую
if (require.main === module) {
  console.log("statrt test-llm-generation"); 
  // testLLMStream();
  testLLMGeneration();
}

module.exports = { testLLMGeneration };
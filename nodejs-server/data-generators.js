// Генераторы данных для различных типов обслуживания

// const { formatDate, getRandomDate, getRandomDateInRange } = require('./date-utils');
const { chatWithModel, streamChatCompletion } = require('./llm-services');
const { getAllGlobalIds } = require('./db');
const axios = require('axios');

// Функции для генерации реалистичных данных
function generateRandomDate(startYear = 2020, endYear = 2030) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateServiceSchedule() {
  const schedules = [
    'Ежедневно',
    'Еженедельно', 
    'Ежемесячно',
    'Ежеквартально',
    'Раз в полгода',
    'Ежегодно',
    'Раз в 2 года',
    'Раз в 3 года',
    'Раз в 5 лет'
  ];
  return schedules[Math.floor(Math.random() * schedules.length)];
}

function generateRepairDate() {
  return formatDate(generateRandomDate(2024, 2026));
}

function generateOverhaulDate() {
  return formatDate(generateRandomDate(2025, 2035));
}

function generateSpareParts() {
  const parts = [
    'Фильтры воздушные',
    'Подшипники',
    'Ремни приводные',
    'Уплотнители',
    'Клапаны регулирующие',
    'Датчики температуры',
    'Датчики давления',
    'Электродвигатели',
    'Контакторы',
    'Предохранители',
    'Теплообменники',
    'Насосы циркуляционные',
    'Вентиляторы',
    'Компрессоры',
    'Трубопроводная арматура'
  ];
  
  const numParts = Math.floor(Math.random() * 3) + 1; // 1-3 запчасти
  const selectedParts = [];
  
  for (let i = 0; i < numParts; i++) {
    const randomPart = parts[Math.floor(Math.random() * parts.length)];
    if (!selectedParts.includes(randomPart)) {
      selectedParts.push(randomPart);
    }
  }
  
  return selectedParts.join(', ');
}

function generateEquipmentCode() {
  const prefixes = ['HVAC', 'ELEC', 'PLMB', 'FIRE', 'SECU', 'LIFT'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${prefix}-${number.toString().padStart(4, '0')}`;
}

// Генераторы данных в виде объекта с функциями
const dataGenerators = {
  // 'RUS_ElementCode': () => {
  //   const codes = ['EL001', 'EL002', 'EL003', 'EL004', 'EL005', 'EL006', 'EL007', 'EL008', 'EL009', 'EL010'];
  //   return codes[Math.floor(Math.random() * codes.length)];
  // },
  
  'RUS_ServiceSchedule': () => {
    const schedules = [
      'Ежедневно',
      'Еженедельно', 
      'Ежемесячно',
      'Ежеквартально',
      'Раз в полгода',
      'Ежегодно',
      'Раз в 2 года',
      'Раз в 3 года',
      'Раз в 5 лет',
      'По необходимости'
    ];
    return schedules[Math.floor(Math.random() * schedules.length)];
  },
  
  'RUS_RepairDate': () => {
    // Генерируем случайную дату в пределах последних 2 лет или следующих 2 лет
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
    const twoYearsLater = new Date(now.getFullYear() + 2, 11, 31);
    const randomTime = twoYearsAgo.getTime() + Math.random() * (twoYearsLater.getTime() - twoYearsAgo.getTime());
    const randomDate = new Date(randomTime);
    return randomDate.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  },
  
  'RUS_OverhaulDate': () => {
    // Генерируем дату капитального ремонта в пределах следующих 5-15 лет
    const now = new Date();
    const fiveYearsLater = new Date(now.getFullYear() + 5, 0, 1);
    const fifteenYearsLater = new Date(now.getFullYear() + 15, 11, 31);
    const randomTime = fiveYearsLater.getTime() + Math.random() * (fifteenYearsLater.getTime() - fiveYearsLater.getTime());
    const randomDate = new Date(randomTime);
    return randomDate.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  },
  
  'RUS_SpareParts': () => {
    const parts = [
      'Фильтр воздушный',
      'Подшипник качения',
      'Ремень приводной',
      'Уплотнительное кольцо',
      'Электродвигатель',
      'Датчик температуры',
      'Клапан запорный',
      'Насос циркуляционный',
      'Теплообменник',
      'Контроллер управления',
      'Реле защиты',
      'Трансформатор',
      'Кабель силовой',
      'Автоматический выключатель',
      'Вентилятор осевой'
    ];
    // Возвращаем 1-3 случайных запчасти
    const count = Math.floor(Math.random() * 3) + 1;
    const selectedParts = [];
    for (let i = 0; i < count; i++) {
      const randomPart = parts[Math.floor(Math.random() * parts.length)];
      if (!selectedParts.includes(randomPart)) {
        selectedParts.push(randomPart);
      }
    }
    return selectedParts.join(', ');
  },
  
  'RUS_EquipmentCode': () => {
    // Генерируем код оборудования в формате ABC-123-XYZ
    const letters1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letters2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    // Первая часть - 3 буквы
    for (let i = 0; i < 3; i++) {
      code += letters1.charAt(Math.floor(Math.random() * letters1.length));
    }
    code += '-';
    // Вторая часть - 3 цифры
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    code += '-';
    // Третья часть - 3 буквы
    for (let i = 0; i < 3; i++) {
      code += letters2.charAt(Math.floor(Math.random() * letters2.length));
    }
    
    return code;
  },
  
  'RUS_PersonResponsibleForOperation': async (globalId, ifcType = null) => {
    // Если передан IFC тип, получаем список globalid для этого типа
    if (ifcType && !globalId) {
      try {
        console.log(`Получаем список элементов для типа: ${ifcType}`);
        
        // Прямой HTTP вызов к MCP серверу для получения списка IFC элементов
        let entitiesResponse;
        try {
          const mcpResponse = await axios.post('http://localhost:8001/bonsai/list_ifc_entities', {
            entity_type: ifcType,
            limit: 50,
            selected_only: false
          }, {
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 секунд таймаут
          });
          
          entitiesResponse = JSON.stringify(mcpResponse.data);
          console.log(`Получен ответ от MCP сервера для типа ${ifcType}:`, mcpResponse.data);
        } catch (mcpError) {
          console.error(`Ошибка при обращении к MCP серверу:`, mcpError.message);
          console.log('Используется fallback - пустой список элементов');
          entitiesResponse = JSON.stringify({
            type: ifcType,
            entities: [],
            total_count: 0
          });
        }
        
        const entitiesData = JSON.parse(entitiesResponse);
        const globalIds = entitiesData.entities.map(entity => entity.id);
        
        console.log(`Найдено ${globalIds.length} элементов типа ${ifcType}`);
        
        // Обрабатываем каждый элемент
        const results = [];
        for (let i = 0; i < globalIds.length; i++) {
          const currentGlobalId = globalIds[i];
          console.log(`Обрабатываем элемент ${i + 1}/${globalIds.length}: ${currentGlobalId}`);
          
          try {
            // Рекурсивно вызываем эту же функцию для каждого globalId
            const generatedData = await dataGenerators['RUS_PersonResponsibleForOperation'](currentGlobalId);
            results.push({
              globalid: currentGlobalId,
              data: generatedData
            });
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`Ошибка при обработке элемента ${currentGlobalId}:`, error);
            // Fallback к случайной генерации
            const fallbackData = await dataGenerators['RUS_PersonResponsibleForOperation']();
            results.push({
              globalid: currentGlobalId,
              data: fallbackData
            });
          }
        }
        
        console.log(`Генерация завершена для типа ${ifcType}!`);
        return results;
        
      } catch (error) {
        console.error(`Ошибка при получении элементов типа ${ifcType}:`, error);
        throw error;
      }
    }
    
    // Словарь должностей с соответствующими фамилиями и инициалами
    const responsiblePersons = {
      'Не требуется': [""],
      'Главный инженер': [
        'Иванов А.В.'
      ],
      'Инженер по эксплуатации': [
        'Сидоров И.П.', 'Новиков К.С.', 'Беляев А.Н.', 'Катаев М.В.'
      ],
      'Технический директор': [
        'Обухов Н.Г.'
      ],
      'Начальник службы эксплуатации': [
        'Матвеев О.И.'
      ],
      'Главный механик': [
        'Тихонов Г.А.'
      ],
      'Главный энергетик': [
        'Герасимов В.М.'
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
        'Егоров С.В.'
      ],
      'Специалист по техническому обслуживанию': [
        'Дмитриев В.С.', 'Калашников М.А.'
      ],
      'Мастер по ремонту оборудования': [
        'Мельников А.М.', 'Денисов П.С.'
      ],
      'Начальник отдела эксплуатации': [
        'Кузьмин В.Г.'
      ]
    };
    
    // Если globalid предоставлен, используем LLM для выбора должности
    if (globalId) {
      try {
        const positions = Object.keys(responsiblePersons);
        const positionsText = positions.join(', ');
        
        const prompt = `Используй get_ifc_properties для GlobalId: ${globalId}.

          Из информации возьме "type" убрав в заголовке ifc получишь тип объекта.
          Из информации возьме "name" наименование объекта.
          Основываясь на типе и наименовании, определи оборудование ли это. 

          Если это элемент инжинерного оборудования, то на основании данных выбери наиболее подходящую должность ответственного лица из следующего списка:
          
          ${positionsText}

          Например:
          IfcFlowTerminal - Инженер по вентиляции и кондиционированию
          IFCLIGHTFIXTURE - Инженер-электрик
          
          Если это не элемент инжинерного оборудования, то верни "Не требуется"
          
          Возвращай только должность или "Не требуется" без комментариев, и результатов запроса.
          `;
        
        let llmResponse = '';
        await streamChatCompletion(
          prompt,
          (chunk) => {
            llmResponse += chunk;
          }
        );
        console.log('LLM Response:', llmResponse); // Добавлено для отладки
        // Ищем выбранную должность в ответе LLM
        const selectedPosition = positions.find(position => 
          llmResponse.toLowerCase().includes(position.toLowerCase())
        );
        
        if (selectedPosition && selectedPosition.includes("Не требуется")) {
          return "Не требуется";
        }
        else if (selectedPosition && responsiblePersons[selectedPosition]){
          // Выбираем случайного сотрудника для выбранной должности
          const persons = responsiblePersons[selectedPosition];
          const randomPerson = persons[Math.floor(Math.random() * persons.length)];
          return `${randomPerson}, ${selectedPosition}`;
        }
        else{
          return "Не данных";
        }
      } catch (error) {
        console.error('Ошибка при обращении к LLM:', error);
        // Fallback к случайному выбору при ошибке
      }
    }
    
    // Fallback: выбираем случайную должность
    const positions = Object.keys(responsiblePersons);
    const randomPosition = positions[Math.floor(Math.random() * positions.length)];
    
    // Выбираем случайного сотрудника для этой должности
    const persons = responsiblePersons[randomPosition];
    const randomPerson = persons[Math.floor(Math.random() * persons.length)];
    
    // Возвращаем в формате: Фамилия И.О., Должность
    return `${randomPerson}, ${randomPosition}`;
  }
};

// Основная функция генерации данных по коду
async function generateDataByCode(code, ...args) {
  if (dataGenerators[code]) {
    return await dataGenerators[code](...args);
  } else {
    throw new Error(`Неизвестный код: ${code}`);
  }
}

// Функция для получения описания кода
function getCodeDescription(code) {
  const descriptions = {
    'RUS_ElementCode': 'Код элемента',
    'RUS_ServiceSchedule': 'График обслуживания',
    'RUS_RepairDate': 'Дата ремонта',
    'RUS_OverhaulDate': 'Дата капитального ремонта',
    'RUS_SpareParts': 'Запасные части',
    'RUS_EquipmentCode': 'Код оборудования',
    'RUS_PersonResponsibleForOperation': 'Лицо, ответственное за эксплуатацию'
  };
  return descriptions[code] || 'Неизвестный код';
}

// Функция для получения списка доступных кодов
function getAvailableCodes() {
  return [
    'RUS_ElementCode',
    'RUS_ServiceSchedule',
    'RUS_RepairDate', 
    'RUS_OverhaulDate',
    'RUS_SpareParts',
    'RUS_EquipmentCode',
    'RUS_PersonResponsibleForOperation'
  ];
}

// Функция для массовой генерации данных с использованием LLM
async function generatePersonResponsibleWithLLM(filename) {
  try {
    console.log('Начинаем генерацию данных с использованием LLM...');
    
    // Получаем все globalid из базы данных
    const globalIds = await getAllGlobalIds(filename);
    console.log(`Найдено ${globalIds.length} элементов для обработки`);
    
    const results = [];
    
    // Обрабатываем каждый элемент
    for (let i = 0; i < globalIds.length; i++) {
      const globalId = globalIds[i]; // getAllGlobalIds возвращает массив строк, а не объектов
      
      // Проверяем на undefined
      if (!globalId) {
        console.log(`Пропускаем элемент ${i + 1}: globalId is undefined`);
        continue;
      }
      
      console.log(`Обрабатываем элемент ${i + 1}/${globalIds.length}: ${globalId}`);
      
      try {
        // Генерируем данные с использованием LLM
        const generatedData = await dataGenerators['RUS_PersonResponsibleForOperation'](globalId);
        
        results.push({
          globalid: globalId,
          data: generatedData
        });
        
        console.log(`Элемент ${globalId}: ${generatedData}`);
        
        // Небольшая задержка между запросами к LLM
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Ошибка при обработке элемента ${globalId}:`, error);
        
        // Fallback к случайной генерации
        const fallbackData = await dataGenerators['RUS_PersonResponsibleForOperation']();
        results.push({
          globalid: globalId,
          data: fallbackData
        });
      }
    }
    
    console.log('Генерация завершена!');
    return results;
    
  } catch (error) {
    console.error('Ошибка при массовой генерации:', error);
    throw error;
  }
}

module.exports = {
  generateDataByCode,
  getCodeDescription,
  getAvailableCodes,
  generatePersonResponsibleWithLLM,
  dataGenerators, // Экспортируем словарь генераторов
};
// Генераторы данных для различных типов обслуживания

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
  }
};

// Основная функция генерации данных по коду
function generateDataByCode(code) {
  if (dataGenerators[code]) {
    return dataGenerators[code]();
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
    'RUS_EquipmentCode': 'Код оборудования'
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
    'RUS_EquipmentCode'
  ];
}

module.exports = {
  generateDataByCode,
  getCodeDescription,
  getAvailableCodes
};
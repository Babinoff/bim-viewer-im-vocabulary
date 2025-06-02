const express = require('express');
const cors = require('cors');
const { create } = require('xmlbuilder2');
const fs = require('fs').promises;
const { 
  getDatabaseInfo, 
  createDatabase, 
  connectToDatabase, 
  addElement, 
  getElementByGlobalId, 
  updateElement,
  getAllKsiExpressID,
  // getAllVocabularyFilled,
  getAllGlobalIds,
  updateAllElementsWithValue
  } = require('./db');

const { 
  generateDataByCode,
  getCodeDescription,
  getAvailableCodes,
  generatePersonResponsibleWithLLM
  } = require('./data-generators');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const { chatWithModel, streamChatCompletion } = require('./llm-services');

const app = express();
const port = 4000;

const apiKey = process.env.MISTRAL_API_KEY;
const agentId = process.env.MISTRAL_AGENT_KSI;
const client = new Mistral({apiKey: apiKey});
const ksiOcrFileId = 'be265017-95c5-4d4d-9137-93942ee477ea'; //process.env.MISTRAL_OCR_FILE_KSI_TABLE;
const logLoiFileId = process.env.MISTRAL_OCR_FILE_LOG_LOI_TABLE;
const elemsParamsFileId = process.env.MISTRAL_OCR_FILE_ELEMS_PARAMS;


// fetchToken()
// const companies = fetchCompanies()
// const companyId = companies.filter(c => !c.isPersonal)[0].id
// const models = fetchModels(companyId)
// const modelId = models[1].versions[0].id
// const test3 = fetchProperties(modelId, 1000002)
// console.log(test3)

app.use(cors());
app.use(express.json());

app.get('/get-model-info', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/get-model-info req.body", req.query)
    if (!req.query || !req.query.fileName) {
      const errorMessage = 'Invalid data format. Required fields: fileName'
      console.error("/get-model-info", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }
    let dbInfo = await getDatabaseInfo(req.query.fileName)
    console.log("dbInfo", dbInfo);
    // res.json(vocabulary);
    res.status(200).json(dbInfo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/create-vocabulary', async (req, res) => {
  try {
    console.log("/create-vocabulary req.body", req.body)
    // Новая валидация данных
    if (!req.body || !req.body.modelname) {
      const errorMessage = 'Invalid data format. Required fields: modelname'
      console.error("/create-vocabulary", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }

    const dbName = req.body.modelname; // Имя базы данных без расширения
    console.log(await createDatabase(dbName));

    // Подключаемся к созданной базе данных
    await connectToDatabase(dbName);

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/add-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    // console.log("/add-vocabulary req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName || !req.body.expressID) {
      const errorMessage = 'Invalid data format. Required fields: globalid, fileName, expressID'
      console.error("/add-vocabulary", errorMessage);
      return res.status(400).json({ 
        error: errorMessage 
      });
    }
    // Добавляем элементы
    await addElement(
      req.body.fileName,
      decodeURIComponent(req.body.globalid),
      req.body.expressID
    ); // Успешно добавится
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/add-vocabulary-batch', async (req, res) => {
  try {
    // Валидация данных
    if (!req.body || !req.body.fileName || !req.body.elements || !Array.isArray(req.body.elements)) {
      const errorMessage = 'Invalid data format. Required fields: fileName, elements (array)'
      console.error("/add-vocabulary-batch", errorMessage);
      return res.status(400).json({ 
        error: errorMessage 
      });
    }
    
    console.log(`Пакетное добавление: ${req.body.elements.length} элементов для модели ${req.body.fileName}`);
    
    const results = [];
    const errors = [];
    
    // Обрабатываем каждый элемент в пакете
    for (const element of req.body.elements) {
      if (!element.globalid || element.expressID === undefined) {
        errors.push(`Пропущен элемент: отсутствует globalid или expressID`);
        continue;
      }
      
      try {
        await addElement(
          req.body.fileName,
          decodeURIComponent(element.globalid),
          element.expressID
        );
        results.push({ globalid: element.globalid, status: 'success' });
      } catch (error) {
        console.error(`Ошибка при добавлении элемента ${element.globalid}:`, error);
        errors.push(`Ошибка для ${element.globalid}: ${error}`);
        results.push({ globalid: element.globalid, status: 'error', error: error.toString() });
      }
    }
    
    res.status(200).json({ 
      success: true,
      processed: results.length,
      errors: errors.length,
      results: results,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/update-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/update-vocabulary req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName || !req.body.fields) {
      const errorMessage = 'Invalid data format. Required fields: globalid, fileName, fields' 
      console.error("/update-vocabulary", errorMessage);
      return res.status(400).json({ 
        error: errorMessage 
      });
    }
    // Добавляем элементы
    await updateElement(
      req.body.fileName,
      decodeURIComponent(req.body.globalid), 
      req.body.fields
      // {
      //   "RUS_DivisionNumber":req.body.DivisionNumberVocabulary,
      //   "RUS_StartDatePlan":req.body.StartDatePlanVocabulary,
      //   "RUS_StartDateIs":req.body.StartDateIsVocabulary,
      //   "RUS_EndDatePlan":req.body.EndDatePlanVocabulary,
      //   "RUS_EndDateIs":req.body.EndDateIsVocabulary,
      // }
    ); // Успешно добавится
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-vocabulary', async (req, res) => {
  try {
    // Новая валидация данныхexpressID
    console.log("/get-vocabulary req.body", req.query)
    if (!req.query || !req.query.globalid || !req.query.fileName) {
      const errorMessage = 'Invalid data format. Required fields: globalid fileName' 
      console.error("/get-vocabulary", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }

    let vocabulary = await getElementByGlobalId(req.query.fileName, decodeURIComponent(req.query.globalid))
    console.log(req.query, vocabulary); // 
    
    res.json(vocabulary);
    // res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.get('/get-all-vocabulary-filled', async (req, res) => {
//   try {
//     console.log("/get-all-vocabulary-filled req.query", req.query);
//     if (!req.query || !req.query.fileName) {
//       const errorMessage = 'Invalid data format. Required fields: fileName';
//       console.error("/get-all-vocabulary-filled", errorMessage);
//       return res.status(400).json({
//         error: errorMessage
//       });
//     }

//     let allFilledVocabulary = await getAllVocabularyFilled(req.query.fileName);
//     console.log("[0] filled vocabulary:", allFilledVocabulary[0]);

//     res.json(allFilledVocabulary);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.get('/get-ksi-from-ai', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/get-from-ai req.body", req.query)
    if (!req.query || !req.query.ifcClass || !req.query.elementType) {
      const errorMessage = 'Invalid data format. Required fields: ifcClass elementType' 
      console.error("/get-from-ai", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }
    const ksiOcrFileUrl = await client.files.getSignedUrl({fileId: ksiOcrFileId});
    console.log("ksiOcrFileUrl", ksiOcrFileUrl)
    const ifcClass = req.query.ifcClass;
    const elementType = req.query.elementType;
    // const response = await fetch('https://api.mistral.ai/v1/agents/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${apiKey}` // Замените на ваш API ключ
    //   },
    //   body: JSON.stringify({
    //     agent_id: agentId,
    //     messages: [
    //       {
    //         role: "user", // по умолчанию "user"
    //         content: [
    //           // Текстовый запрос как объект
    //           {
    //             type: "text",
    //             text: `какой класс КСИ для ${ifcClass} ${elementType}`
    //           },
    //           // Документ как объект
    //           {
    //             type: "document_url",
    //             document_url: ksiOcrFileUrl.url, // Только URL-строка, без объекта {url: ...}
    //             document_name: "KSI-IFC.pdf"
    //           }
    //         ]
    //       }
    //     ]
    //   })
    // });
    // const chatResponse = await response.json();
    // console.log("chatResponse", JSON.stringify(chatResponse));

    const chatResponse = await client.agents.complete({
      agentId: agentId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${ifcClass} ${elementType}`,
            },
            {
              type: "document_url",
              documentUrl: ksiOcrFileUrl.url,
            },
          ]
        },
      ],
    });
    const ksiKlass = chatResponse.choices[0].message.content
    console.log("ksiKlass:", ksiKlass);
    res.status(200).json(ksiKlass);
  } catch (error) {
    console.error('Error:', error);
    // console.error('Error:', JSON.stringify(error));
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/save-ksi', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/save-ksi req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName || !req.body.ksicode) {
      const errorMessage = 'Invalid data format. Required fields: globalid, ksicode' 
      console.error("/save-ksi", errorMessage);
      return res.status(400).json({ 
        error: errorMessage 
      });
    }
    // Добавляем элементы
    console.log(await updateElement(
      req.body.fileName,
      decodeURIComponent(req.body.globalid), 
      {
        "RUS_ElementCode": req.body.ksicode,
      }
    )); // Успешно добавится
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-all-ksi-express-id', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/get-all-ksi-express-id", req.query)
    if (!req.query || !req.query.fileName) {
      const errorMessage = 'Invalid data format. Required fields: globalid fileName' 
      console.error("/get-all-ksi-express-id", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }

    let allKsiExpressID = await getAllKsiExpressID(req.query.fileName)
    console.log(req.query, allKsiExpressID);

    res.status(200).json({ success: true, allKsiExpressID: allKsiExpressID });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-llm-response', async (req, res) => {
  try {
    // Новая валидация данных
    console.log("/get-llm-response", req.query)
    if (!req.query || !req.query.fileName || !req.query.prompt) {
      const errorMessage = 'Invalid data format. Required fields: fileName prompt' 
      console.error("/get-llm-response", errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }

    let llmresponse = await chatWithModel(req.query.prompt)
    console.log(req.query, llmresponse);

    res.status(200).json({ success: true, llmresponse: llmresponse });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(cors({
  origin: '*',
  methods: ['POST', 'GET']
}));

// Импортируем LLM сервер
const llmServer = require('./llm-server');

// Эндпоинт для запуска LLM-проверки
app.get('/api/llm-check', async (req, res) => {
  try {
    console.log('[LLM-CHECK] LLM check request received', new Date().toISOString(), req.query);
    
    const fileName = req.query.fileName;
    if (!fileName) {
      console.error('[LLM-CHECK] ERROR: fileName is required');
      return res.status(400).json({ error: 'fileName is required.' });
    }
    
    console.log('[LLM-CHECK] Starting LLM check for file:', fileName);
    const result = await llmServer.startCheck(fileName);
    
    console.log('[LLM-CHECK] LLM check started successfully');
    res.status(200).json(result);
  } catch (error) {
    console.error('[LLM-CHECK] CRITICAL ERROR starting LLM check:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Эндпоинт для остановки LLM-проверки
app.get('/api/llm-stop', (req, res) => {
  try {
    console.log('[LLM-STOP] LLM stop request received');
    console.log('[LLM-STOP] Timestamp:', new Date().toISOString());
    
    const result = llmServer.stopCheck();
    
    console.log('[LLM-STOP] LLM check stopped successfully');
    res.status(200).json(result);
  } catch (error) {
    console.error('[LLM-STOP] ERROR stopping LLM check:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Эндпоинт для получения результатов LLM
app.get('/api/llm-results', (req, res) => {
  try {
    console.log('[LLM-RESULTS] LLM results request received');
    console.log('[LLM-RESULTS] Timestamp:', new Date().toISOString());
    console.log('[LLM-RESULTS] Query params:', req.query);
    
    const fileName = req.query.fileName;
    if (!fileName) {
      console.error('[LLM-RESULTS] ERROR: fileName is required');
      return res.status(400).json({ error: 'fileName is required.' });
    }
    
    console.log('[LLM-RESULTS] Getting results for file:', fileName);
    const result = llmServer.getResult(fileName);
    
    if (result.success && result.result) {
      console.log('[LLM-RESULTS] Results found and sent to client');
    } else {
      console.log('[LLM-RESULTS] No results available');
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[LLM-RESULTS] ERROR getting LLM results:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint для выполнения команд генерации данных
app.post('/add-command', async (req, res) => {
  try {
    if (!req.body || !req.body.command || !req.body.fileName) {
      const errorMessage = 'Invalid data format. Required fields: command, fileName';
      console.error("/add-command", errorMessage);
      return res.status(400).json({ 
        error: errorMessage,
        availableCodes: getAvailableCodes()
      });
    }
    
    const { command, fileName, globalids } = req.body;
    
    // Парсим команду и параметры (например: "RUS_PersonResponsibleForOperation IFCLIGHTFIXTURE")
    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];
    const commandParams = commandParts.slice(1);
    
    // Проверяем, что базовая команда является валидным кодом
    const availableCodes = getAvailableCodes();
    if (!availableCodes.includes(baseCommand)) {
      await streamChatCompletion(
        baseCommand,
        (chunk) => {
          llmResponse += chunk;
        }
      );
      console.log('LLM Response:', llmResponse); 
      return res.status(200).json({ 
        llmResponse: llmResponse,
      });
      // Добавлено для отладки
      // return res.status(400).json({ 
      //   error: `Неизвестная команда: ${baseCommand}`,
      //   availableCodes: availableCodes,
      //   descriptions: availableCodes.reduce((acc, code) => {
      //     acc[code] = getCodeDescription(code);
      //     return acc;
      //   }, {})
      // });
    }
    
    console.log(`Выполнение команды ${baseCommand} (${getCodeDescription(baseCommand)}) для модели ${fileName}`);
    if (commandParams.length > 0) {
      console.log(`Параметры команды: ${commandParams.join(', ')}`);
    }
    
    // Специальная обработка для RUS_PersonResponsibleForOperation с IFC типом
    if (baseCommand === 'RUS_PersonResponsibleForOperation' && commandParams.length > 0) {
      const ifcType = commandParams[0];
      console.log(`Обработка IFC типа: ${ifcType}`);
      
      try {
        // Подключаемся к базе данных
        await connectToDatabase(fileName);
        
        // Убеждаемся, что колонка существует
        const { ensureColumnExists } = require('./db');
        await ensureColumnExists(baseCommand, 'TEXT');
        
        // Вызываем генератор с IFC типом
        const generationResults = await generateDataByCode(baseCommand, null, ifcType);
        
        // Обновляем базу данных с полученными результатами
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const result of generationResults) {
          try {
            const updateData = {};
            updateData[baseCommand] = result.data;
            await updateElement(fileName, result.globalid, updateData);
            successCount++;
          } catch (error) {
            console.error(`Ошибка при обновлении элемента ${result.globalid}:`, error);
            errorCount++;
            errors.push(`${result.globalid}: ${error.message}`);
          }
        }
        
        return res.status(200).json({
          message: `Команда ${baseCommand} выполнена для типа ${ifcType}`,
          totalProcessed: generationResults.length,
          successCount: successCount,
          errorCount: errorCount,
          errors: errors.slice(0, 10) // Показываем только первые 10 ошибок
        });
        
      } catch (error) {
        console.error(`Ошибка при выполнении команды ${baseCommand} для типа ${ifcType}:`, error);
        return res.status(500).json({ 
          error: `Ошибка при выполнении команды: ${error.message}` 
        });
      }
    }
    
    // Если не указаны конкретные globalids, используем массовое обновление
    let targetGlobalIds = globalids;
    const results = [];
    const errors = [];
    
    if (!targetGlobalIds || !Array.isArray(targetGlobalIds) || targetGlobalIds.length === 0) {
      // Массовое обновление всех элементов через SQL
      console.log('Не указаны конкретные элементы, выполняется массовое обновление всех элементов модели');
      targetGlobalIds = await getAllGlobalIds(fileName);
    }

    console.log(`Обновление ${targetGlobalIds.length} указанных элементов`);
    
    try {
      const { ensureColumnExists } = require('./db');
      await ensureColumnExists(baseCommand, 'TEXT');
    } catch (error) {
      console.error(`Ошибка при создании колонки ${baseCommand}:`, error);
    }
    
    // Применяем команду к конкретным элементам
    for (const globalid of targetGlobalIds) {
      try {
        // Добавляем await, так как generateDataByCode может быть асинхронной функцией
        const generatedValue = await generateDataByCode(baseCommand, decodeURIComponent(globalid), ...commandParams);
        // console.log('Сгенерированное значение:', generatedValue);
        console.log('Тип значения:', typeof generatedValue);
        // // Убедимся, что значение - строка
        const stringValue = typeof generatedValue === 'object' ? JSON.stringify(generatedValue) : String(generatedValue);
        console.log('Преобразованное значение:', stringValue);
        
        const updateData = {};
        updateData[baseCommand] = stringValue;
        console.log('Данные для обновления:', updateData);
        
        // Обновляем элемент в базе данных
        await updateElement(
          fileName,
          decodeURIComponent(globalid),
          updateData
        );
        
        results.push({ 
          globalid: globalid, 
          status: 'success',
          command: command,
          description: getCodeDescription(command),
          generatedValue: generatedValue
        });
      } catch (error) {
        console.error(`Ошибка при генерации данных для элемента ${globalid}:`, error);
        errors.push(`Ошибка для ${globalid}: ${error}`);
        results.push({ 
          globalid: globalid, 
          status: 'error', 
          error: error.toString() 
        });
      }
    }
    
    if (results.length === 0 && errors.length > 0) {
      return res.status(400).json({ error: 'Не удалось обработать ни одного элемента', errorDetails: errors });
    }
    
    res.status(200).json({ 
      success: true,
      command: command,
      description: getCodeDescription(command),
      processed: results.length,
      errors: errors.length,
      results: results,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Error in add-command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Новый endpoint для массовой генерации данных с использованием LLM
app.post('/generate-person-responsible-llm', async (req, res) => {
  try {
    console.log('/generate-person-responsible-llm req.body', req.body);
    
    // Валидация данных
    if (!req.body || !req.body.fileName) {
      const errorMessage = 'Invalid data format. Required fields: fileName';
      console.error('/generate-person-responsible-llm', errorMessage);
      return res.status(400).json({ 
        error: errorMessage
      });
    }
    
    const fileName = req.body.fileName;
    
    // Подключаемся к базе данных
    await connectToDatabase(fileName);
    
    // Убеждаемся, что колонка RUS_PersonResponsibleForOperation существует
    try {
      const { ensureColumnExists } = require('./db');
      await ensureColumnExists('RUS_PersonResponsibleForOperation', 'TEXT');
    } catch (error) {
      console.error('Ошибка при создании колонки RUS_PersonResponsibleForOperation:', error);
    }
    
    // Запускаем массовую генерацию
    console.log('Запуск массовой генерации данных с использованием LLM...');
    const results = await generatePersonResponsibleWithLLM();
    
    // Обновляем базу данных с полученными результатами
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const result of results) {
      try {
        await updateElement(
          fileName,
          result.globalid,
          { 'RUS_PersonResponsibleForOperation': result.data }
        );
        successCount++;
      } catch (error) {
        console.error(`Ошибка при обновлении элемента ${result.globalid}:`, error);
        errorCount++;
        errors.push(`${result.globalid}: ${error.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Массовая генерация завершена',
      totalProcessed: results.length,
      successCount: successCount,
      errorCount: errorCount,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in generate-person-responsible-llm:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});


app.post('/api/llm-check', async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      console.log('[LLM-CHECK] ERROR: fileName parameter is missing');
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }
    
    console.log('[LLM-CHECK] Starting LLM check for file:', fileName);
    console.log('[LLM-CHECK] Timestamp:', new Date().toISOString());
    
    // Получаем данные vocabulary для файла
    console.log('[LLM-CHECK] Fetching vocabulary data for file:', fileName);
    const vocabularyData = await getVocabularyData(fileName);
    
    if (!vocabularyData || vocabularyData.length === 0) {
      console.log('[LLM-CHECK] WARNING: No vocabulary data found for file:', fileName);
      return res.json({ success: true, message: 'No vocabulary data found' });
    }
    
    console.log('[LLM-CHECK] Vocabulary data loaded. Total records:', vocabularyData.length);
    
    // Ищем элементы с vocabulary > 900
    console.log('[LLM-CHECK] Searching for dangerous elements (vocabulary > 900)...');
    const dangerousElements = [];
    let checkedCount = 0;
    
    for (const item of vocabularyData) {
      checkedCount++;
      if (item.vocabulary && parseInt(item.vocabulary) > 900) {
        dangerousElements.push(item.globalid);
        console.log(`[LLM-CHECK] Found dangerous element: GlobalID=${item.globalid}, ExpressID=${item.expressID}, Vocabulary=${item.vocabulary}`);
      }
    }
    
    console.log(`[LLM-CHECK] Analysis complete. Checked ${checkedCount} elements, found ${dangerousElements.length} dangerous elements`);
    
    if (dangerousElements.length === 0) {
      console.log('[LLM-CHECK] No dangerous elements found. Analysis complete.');
      return res.json({ success: true, message: 'No dangerous elements found' });
    }
    
    console.log('[LLM-CHECK] Starting background LLM analysis...');
    
    // Запускаем LLM анализ в фоновом режиме
    setTimeout(async () => {
      try {
        console.log('[LLM-BACKGROUND] Background LLM analysis started for', fileName);
        console.log('[LLM-BACKGROUND] Processing', dangerousElements.length, 'dangerous elements');
        
        if (dangerousElements.length > 0) {
          // Собираем данные об опасных элементах
          console.log('[LLM-BACKGROUND] Collecting detailed data for dangerous elements...');
          const dangerousElementsData = [];
          
          for (const item of vocabularyData) {
            if (item.vocabulary && parseInt(item.vocabulary) > 900) {
              const elementData = {
                globalid: item.globalid,
                expressID: item.expressID,
                vocabulary: item.vocabulary
              };
              dangerousElementsData.push(elementData);
              console.log(`[LLM-BACKGROUND] Collected element data:`, elementData);
            }
          }
          
          console.log('[LLM-BACKGROUND] Total dangerous elements data collected:', dangerousElementsData.length);
          
          // Для тестирования без LLM - просто формируем результат
          console.log('[LLM-BACKGROUND] Generating test result (LLM integration disabled)...');
          // const testResult = {
          //   message: `Найдены элементы с высоким значением vocabulary (>900):\n${dangerousElements.map(id => `- GlobalID: ${id}`).join('\n')}\n\nВсего элементов: ${dangerousElements.length}`,
          //   dangerousElements: dangerousElementsData
          // };
          
          // Раскомментируйте следующие строки для работы с реальным LLM:
          console.log('[LLM-BACKGROUND] Preparing LLM prompt...');
          const prompt = `Проанализируй элементы с globalid: ${dangerousElements.join(', ')}. Получи информацию о каждом элементе и связанных пространствах.`;
          console.log('[LLM-BACKGROUND] LLM prompt:', prompt);
          console.log('[LLM-BACKGROUND] Calling LLM service...');
          const llmResponse = await chatWithModel(prompt);
          console.log('[LLM-BACKGROUND] LLM response received:', llmResponse);
          llmResults[fileName] = {
            message: llmResponse,
            dangerousElements: dangerousElementsData
          };
          
          // Для тестирования сохраняем тестовый результат
          // llmResults[fileName] = llmResponse;
          console.log('[LLM-BACKGROUND] Result stored for file:', fileName);
          console.log('[LLM-BACKGROUND] Stored result:', JSON.stringify(llmResponse, null, 2));
          console.log('[LLM-BACKGROUND] Analysis complete. Results available for retrieval.');
        }
      } catch (error) {
        console.error('[LLM-BACKGROUND] ERROR during background LLM analysis:', error);
        console.error('[LLM-BACKGROUND] Error stack:', error.stack);
      }
    }, 1000);
    
    console.log('[LLM-CHECK] Background analysis scheduled. Returning success response.');
    res.json({ success: true, message: 'LLM check started' });
  } catch (error) {
    console.error('[LLM-CHECK] CRITICAL ERROR in LLM check endpoint:', error);
    console.error('[LLM-CHECK] Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Эндпоинт для получения результатов LLM
app.get('/api/llm-results', (req, res) => {
  try {
    console.log('[LLM-RESULTS] Client requesting LLM results');
    console.log('[LLM-RESULTS] Timestamp:', new Date().toISOString());
    console.log('[LLM-RESULTS] Available result keys:', Object.keys(llmResults));
    
    if (Object.keys(llmResults).length === 0) {
      console.log('[LLM-RESULTS] No results available yet');
      return res.json({ success: true, results: {} });
    }
    
    // Логируем детали каждого результата
    for (const [fileName, result] of Object.entries(llmResults)) {
      console.log(`[LLM-RESULTS] Result for file "${fileName}":`);
      if (result.dangerousElements) {
        console.log(`[LLM-RESULTS]   - Dangerous elements count: ${result.dangerousElements.length}`);
        result.dangerousElements.forEach((element, index) => {
          console.log(`[LLM-RESULTS]   - Element ${index + 1}: GlobalID=${element.globalid}, ExpressID=${element.expressID}, Vocabulary=${element.vocabulary}`);
        });
      }
      if (result.message) {
        console.log(`[LLM-RESULTS]   - Message length: ${result.message.length} characters`);
      }
    }
    
    console.log('[LLM-RESULTS] Sending results to client');
    res.json({ success: true, results: llmResults });
    
    // Очищаем результаты после отправки
    console.log('[LLM-RESULTS] Clearing results after sending to client');
    const clearedKeys = Object.keys(llmResults);
    for (const key in llmResults) {
      delete llmResults[key];
    }
    console.log('[LLM-RESULTS] Cleared result keys:', clearedKeys);
    console.log('[LLM-RESULTS] Results successfully sent and cleared');
  } catch (error) {
    console.error('[LLM-RESULTS] CRITICAL ERROR getting LLM results:', error);
    console.error('[LLM-RESULTS] Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


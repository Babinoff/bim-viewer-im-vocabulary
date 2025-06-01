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
  getAllVocabularyFilled,
  getAllGlobalIds,
  updateAllElementsWithValue
  } = require('./db');
const { 
  chatWithModel
  } = require('./llm-services');
const { 
  generateDataByCode,
  getCodeDescription,
  getAvailableCodes
  } = require('./data-generators');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

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

app.get('/get-all-vocabulary-filled', async (req, res) => {
  try {
    console.log("/get-all-vocabulary-filled req.query", req.query);
    if (!req.query || !req.query.fileName) {
      const errorMessage = 'Invalid data format. Required fields: fileName';
      console.error("/get-all-vocabulary-filled", errorMessage);
      return res.status(400).json({
        error: errorMessage
      });
    }

    let allFilledVocabulary = await getAllVocabularyFilled(req.query.fileName);
    console.log("[0] filled vocabulary:", allFilledVocabulary[0]);

    res.json(allFilledVocabulary);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

let llmCheckInterval;

app.get('/start-llm-check', async (req, res) => {
  if (llmCheckInterval) {
    return res.status(200).json({ message: 'LLM check already running.' });
  }

  const fileName = req.query.fileName; // Получаем fileName из запроса
  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required.' });
  }

  llmCheckInterval = setInterval(async () => {
    try {
      const vocabularyData = await getAllVocabularyFilled(fileName);
      const dangerousElements = [];

      if (vocabularyData && vocabularyData.length > 0) {
        for (const item of vocabularyData) {
          if (item.vocabulary && parseInt(item.vocabulary) > 900) {
            dangerousElements.push(item.globalid);
          }
        }
      }

      if (dangerousElements.length > 0) {
        const prompt = `Опасные элементы с globalid: ${dangerousElements.join(', ')}. Проанализируйте их.`;
        const llmResponse = await chatWithModel(prompt);
        console.log('LLM Response for dangerous elements:', llmResponse);
      }
    } catch (error) {
      console.error('Error during LLM check:', error);
    }
  }, 30000); // Проверяем каждые 30 секунд

  res.status(200).json({ message: 'LLM check started.' });
});

app.get('/stop-llm-check', (req, res) => {
  if (llmCheckInterval) {
    clearInterval(llmCheckInterval);
    llmCheckInterval = null;
    res.status(200).json({ message: 'LLM check stopped.' });
  } else {
    res.status(200).json({ message: 'LLM check not running.' });
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
    
    // Проверяем, что команда является валидным кодом
    const availableCodes = getAvailableCodes();
    if (!availableCodes.includes(command)) {
      return res.status(400).json({ 
        error: `Неизвестная команда: ${command}`,
        availableCodes: availableCodes,
        descriptions: availableCodes.reduce((acc, code) => {
          acc[code] = getCodeDescription(code);
          return acc;
        }, {})
      });
    }
    
    console.log(`Выполнение команды ${command} (${getCodeDescription(command)}) для модели ${fileName}`);
    
    // Если не указаны конкретные globalids, используем массовое обновление
    let targetGlobalIds = globalids;
    const results = [];
    const errors = [];
    
    if (!targetGlobalIds || !Array.isArray(targetGlobalIds) || targetGlobalIds.length === 0) {
      // Массовое обновление всех элементов через SQL
      console.log('Не указаны конкретные элементы, выполняется массовое обновление всех элементов модели');
      
      try {
        await connectToDatabase(fileName);
        
        // Используем функцию массового обновления
        const updateResult = await updateAllElementsWithValue(
          fileName, 
          command, 
          () => generateDataByCode(command)
        );
        
        if (updateResult.success) {
          results.push({
            scope: 'all_elements',
            status: 'success',
            command: command,
            description: getCodeDescription(command),
            updatedCount: updateResult.updatedCount,
            message: updateResult.message
          });
        } else {
          errors.push(updateResult.message);
        }
        
      } catch (error) {
        console.error('Ошибка при массовом обновлении:', error);
        return res.status(500).json({ error: 'Ошибка при массовом обновлении элементов' });
      }
      
    } else {
      // Обновление конкретных элементов
      console.log(`Обновление ${targetGlobalIds.length} указанных элементов`);
      
      try {
        const { ensureColumnExists } = require('./db');
        await ensureColumnExists(command, 'TEXT');
      } catch (error) {
        console.error(`Ошибка при создании колонки ${command}:`, error);
      }
      
      // Применяем команду к конкретным элементам
      for (const globalid of targetGlobalIds) {
        try {
          const generatedValue = generateDataByCode(command);
          const updateData = { [command]: generatedValue };
          
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


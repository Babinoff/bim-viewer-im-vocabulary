const express = require('express');
const cors = require('cors');
const { create } = require('xmlbuilder2');
const fs = require('fs').promises;
const { getDatabaseInfo, createDatabase, connectToDatabase, addElement, getElementByGlobalId, updateElement, ensureColumnExists} = require('./db');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();
const port = 4000;

const apiKey = process.env.MISTRAL_API_KEY;
const agentId = process.env.MISTRAL_AGENT_KSI;
const client = new Mistral({apiKey: apiKey});
const ksiOcrFileId = 'f3ec9b24-5697-4038-af27-5cb27bae6fb7';

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
    console.log("/add-vocabulary req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName) {
      const errorMessage = 'Invalid data format. Required fields: globalid, fileName'
      console.error("/add-vocabulary", errorMessage);
      return res.status(400).json({ 
        error: errorMessage 
      });
    }
    // Добавляем элементы
    console.log(await addElement(
      req.body.fileName,
      decodeURIComponent(req.body.globalid)
    )); // Успешно добавится
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
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
    console.log(await updateElement(
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
    )); // Успешно добавится
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
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

app.get('/get-from-ai', async (req, res) => {
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
              text: `${req.query.ifcClass} ${req.query.elementType}`,
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
    // console.log("ksiKlass:", ksiKlass);
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


app.use(cors({
  origin: '*',
  methods: ['POST', 'GET']
}));
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
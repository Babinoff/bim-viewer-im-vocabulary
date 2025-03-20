const express = require('express');
const cors = require('cors');
const { create } = require('xmlbuilder2');
const fs = require('fs').promises;
const { createDatabase, connectToDatabase, addElement, getElementByGlobalId, updateElement} = require('./db');

const app = express();
const port = 4000;

// fetchToken()
// const companies = fetchCompanies()
// const companyId = companies.filter(c => !c.isPersonal)[0].id
// const models = fetchModels(companyId)
// const modelId = models[1].versions[0].id
// const test3 = fetchProperties(modelId, 1000002)
// console.log(test3)

app.use(cors());
app.use(express.json());

app.post('/create-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    if (!req.body || !req.body.modelname) {
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: modelname' 
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
    // console.log("req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName) {
      console.error('Invalid data format. Required fields: globalid, fileName');
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: globalid, fileName' 
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
    // console.log("req.body", req.body)
    if (!req.body || !req.body.globalid || !req.body.fileName) {
      console.error('Invalid data format. Required fields: globalid, fileName');
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: globalid, fileName' 
      });
    }
    // Добавляем элементы
    console.log(await updateElement(
      req.body.fileName,
      decodeURIComponent(req.body.globalid), 
      {
        "RUS_DivisionNumber":req.body.DivisionNumberVocabulary,
        "RUS_StartDatePlan":req.body.StartDatePlanVocabulary,
        "RUS_StartDateIs":req.body.StartDateIsVocabulary,
        "RUS_EndDatePlan":req.body.EndDatePlanVocabulary,
        "RUS_EndDateIs":req.body.EndDateIsVocabulary,
      }
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
    if (!req.query || !req.query.globalid || !req.query.fileName) {
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: globalid fileName' 
      });
    }

    let vocabulary = await getElementByGlobalId(req.query.fileName, decodeURIComponent(req.query.globalid))
    console.log(req.query, vocabulary); // 
    
    res.json(vocabulary);
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
const express = require('express');
const cors = require('cors');
const { create } = require('xmlbuilder2');
const fs = require('fs').promises;
const { createDatabase, connectToDatabase, addElement, getElementByGlobalId } = require('./db');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

app.post('/create-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    if (!req.body || !req.body.modelname) {
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: expressid, globalid' 
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

app.post('/save-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    if (!req.body || !req.body.expressid || !req.body.globalid) {
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: expressid, globalid' 
      });
    }

    // const dbName = 'mydatabase'; // Имя базы данных без расширения
    // console.log(await createDatabase(dbName));

    // // Подключаемся к созданной базе данных
    // await connectToDatabase(dbName);

    // Добавляем элементы
    console.log(await addElement(req.body.expressid, req.body.globalid, "")); // Успешно добавится
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/get-vocabulary', async (req, res) => {
  try {
    // Новая валидация данных
    if (!req.query || !req.query.globalid) {
      return res.status(400).json({ 
        error: 'Invalid data format. Required fields: expressid, globalid' 
      });
    }

    let vocabulary = await getElementByGlobalId(req.query.globalid)
    console.log(vocabulary); // Успешно добавится
    
    res.json(vocabulary);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(cors({
  origin: 'http://127.0.0.1:3000',
  methods: ['POST', 'GET']
}));
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
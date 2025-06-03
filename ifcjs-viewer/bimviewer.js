const constructVocabularyBool = true;

import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import api from './api-service';
import { GUIManager } from './gui-manager.js'
import { LLMClient } from './llm-client.js';
import { ElementHighlighter } from './element-highlighter.js';
import './llm-logger.js';
import { MeshLambertMaterial, MeshStandardMaterial, DoubleSide } from 'three';  
import {
  createCheckboxes,
  createIfcTreeMenu,
  createIfcPropertyMenu,
  toolbarBottom,
  toolbarTop,
  createHelpInfo,
} from "./overlay.js";

import { projects } from "./projects.js";

import {
  //need to load additional ifc entities or remove filter
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCDOOR,
  IFCWINDOW,
  IFCFURNISHINGELEMENT,
  IFCMEMBER,
  IFCPLATE,
  IFCSPACE,
  IFCSITE,
  IFCROOF,
  IFCBUILDINGELEMENTPROXY,
  IFCAIRTERMINAL,
  IFCDUCTFITTING,
  IFCDUCTSEGMENT
} from "web-ifc";
import apiService from "./api-service";

// List of categories names
const categories = {
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCFURNISHINGELEMENT,
  IFCDOOR,
  IFCWINDOW,
  IFCPLATE,
  IFCMEMBER,
  IFCSPACE,
  IFCSITE,
  IFCROOF,
  IFCBUILDINGELEMENTPROXY,
  IFCAIRTERMINAL,
  IFCDUCTFITTING,
  IFCDUCTSEGMENT
};

const container = document.getElementById("viewer-container");
const _viewer = new IfcViewerAPI({
  container,
  backgroundColor: new Color(255, 255, 255),
});

_viewer.axes.setAxes();
_viewer.grid.setGrid();

const currentUrl = window.location.href;
const url = new URL(currentUrl);
const currentProjectID = url.searchParams.get("id"); //bimserver project id - use this to get latest revision etc

const scene = _viewer.context.getScene(); //for showing/hiding categories

_viewer.context.renderer.postProduction.active = false;
// _viewer.IFC.loader.ifcManager.parser.setupOptionalCategories({  
//   [IFCSPACE]: false  
// }); 

_viewer.IFC.loader.ifcManager.parser.setupOptionalCategories({  
  [IFCAIRTERMINAL]: true,
  [IFCSPACE]: false    // Явно включить  
});

_viewer.IFC.loader.ifcManager.applyWebIfcConfig({  
  USE_FAST_BOOLS: false,  // Отключить быстрые булевы операции  
  COORDINATE_TO_ORIGIN: true  
});

let _path;
let _fileName;
let _model;
let _modelID;
let _globalid;
let _expressID;
let _elemKsiCode;
let _numberOfElements;
let _allHighlightKsiIds = [];
let _allHighlightWarningIds = [];
let _elemCounter = 0;
let _isCancelled = false;
let _modelInfo = {
  exists: false,
  message: ``,
  rowCount: null
};
// Создаем экземпляр LLM клиента
let _llmClient = null;

const _customSelectMaterial = new MeshLambertMaterial({  
  color: 0xcc0000,  // Red color  
  opacity: 0.5,  
  transparent: true,  
  // depthTest: false,  
  side: 2 // DoubleSide  
});

const _warningMaterial = new MeshLambertMaterial({  
  color: 0xcc0000,  // Red color  
  opacity: 0.5,  
  transparent: true,  
  // depthTest: false,  
  side: 2, // DoubleSide  
  depthTest: true
});

const _customKsiMaterial =  new MeshLambertMaterial({
  color: 0x00ff00,  // Зелёный цвет
  transparent: true,  // Отключаем прозрачность (по умолчанию false)
  opacity: 0.2,         // Полная непрозрачность (по умолчанию 1)
  depthTest: false
});

const _transparentMaterial =  new MeshLambertMaterial({
  color: 0x00ff00,  // Зелёный цвет
  transparent: true,  // Отключаем прозрачность (по умолчанию false)
  opacity: 0.1,         // Полная непрозрачность (по умолчанию 1)
  depthTest: true
});

for (let proj of projects) {
  if (proj.id === currentProjectID) {
    _fileName = proj.name;
    _path = "./models/" + _fileName + ".ifc"; // get path into this /get-model-info
    try {
      _modelInfo = await api.getModelInfo(_fileName);
      // console.log("modelInfo", _modelInfo)
      if (_modelInfo.exists == false){
        const result = await api.createVocabulary(_fileName);
        // console.log("createVocabulary result", result)
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

const guiManager = new GUIManager(
  _viewer, 
  _viewer.IFC.loader.ifcManager,
  scene, 
  api, 
  _fileName,
  categories
);

async function loadIfc(url) {
  // Load the model
  _model = await _viewer.IFC.loadIfcUrl(url);
  _modelID = _model.modelID

  guiManager.modelID = _model.modelID;
  // Add dropped shadow and post-processing efect
  await _viewer.shadowDropper.renderShadow(_model.modelID);
  // viewer.context.renderer.postProduction.active = true;
  _model.removeFromParent(); //for ifc categories filter
  const ifcProject = await _viewer.IFC.getSpatialStructure(_model.modelID);
  await guiManager.setupAllCategories(); //for ifc categories filter
  const modelInfo = await api.getModelInfo(_fileName);
  const structure = await _viewer.IFC.loader.ifcManager.getSpatialStructure(_model.modelID);
  // Рекурсивный подсчёт элементов в структуре
  let highlightIds = []
  let transparentIds = []
  function countElements(item) {
    // console.log("countElements item", item)
    // if (item.type == "IFCSPACE"){
    //   transparentIds.push(item.expressID)
    //   console.log("countElements item.type == IFCSPACE", item) //помогает показать невидимые элементы
    // }
    highlightIds.push(item.expressID)
    _viewer.IFC.selector.highlightIfcItemsByID(_model.modelID, highlightIds); //помогает показать невидимые элементы
    let count = item.children.length;
    for (const child of item.children) {
        count += countElements(child);
    }
    return count;
  }
  _numberOfElements = countElements(structure);
  // createSubsetForColor(transparentIds, _transparentMaterial, "transparentIds")
  console.log('loadIfc numberOfElements modelInfo.rowCount', _numberOfElements, modelInfo.rowCount);
  
  // Используем пакетную отправку вместо индивидуальных запросов
  if (constructVocabularyBool){
    try {
      await guiManager.constructVocabularyBatch(structure.children);
    } catch (error) {
      console.error('Ошибка при пакетном создании словаря, переходим к индивидуальной обработке:', error);
      // Fallback к старому методу в случае ошибки
      structure.children.forEach((child) => {
        guiManager.constructVocabulary(child);
      });
    }
  }
  // try {
  //   await guiManager.constructVocabularyBatch(structure.children);
  // } catch (error) {
  //   console.error('Ошибка при пакетном создании словаря, переходим к индивидуальной обработке:', error);
  //   // Fallback к старому методу в случае ошибки
  //   structure.children.forEach((child) => {
  //     guiManager.constructVocabulary(child);
  //   });
  // }

  await guiManager.createTreeMenu(ifcProject, _modelInfo, _numberOfElements);
}

loadIfc(_path); 

// Set this material as your selection material  
// _viewer.IFC.selector.highlight.material = customMaterial; 
// _viewer.IFC.selector.selection.material = _customSelectMaterial;

//UI elements

createIfcPropertyMenu();

// const propsGUI = document.getElementById("ifc-property-menu-root");

createIfcTreeMenu();
createCheckboxes();
createHelpInfo();
toolbarTop();
toolbarBottom();

//select IFC elements
window.onmousemove = () => _viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
  const ifcItem = await _viewer.IFC.selector.pickIfcItem(); //highlightIfcItem hides all other elements
  console.log("window.ondblclick viewer.IFC.selector.pickIfcItem()", ifcItem)
  if (!ifcItem) return;
  const { modelID, id } = ifcItem;
  _expressID = id;
  const props = await _viewer.IFC.getProperties(modelID, id, true, false);
  _globalid = encodeURIComponent(props.GlobalId.value);

  guiManager.createPropertiesMenu(props);

  document.getElementById("ifc-property-menu").style.display = "initial";
  propertiesButton.classList.add("active");

  if (clippingPlanesActive) {
    _viewer.clipper.createPlane();
  }

  if (measurementsActive) {
    _viewer.dimensions.create();
  }
};

//set up clipping planes
const clipButton = document.getElementById("clipPlaneButton");

let clippingPlanesActive = false;
clipButton.onclick = () => {
  clippingPlanesActive = !clippingPlanesActive;
  _viewer.clipper.active = clippingPlanesActive;

  if (clippingPlanesActive) {
    //add or remove active class depending on whether button is clicked and clipping planes are active
    clipButton.classList.add("active");
  } else {
    clipButton.classList.remove("active");
  }
};

window.onauxclick = () => {
  if (clippingPlanesActive) {
    _viewer.clipper.createPlane();
  }

  if (measurementsActive) {
    _viewer.dimensions.create();
  }
};

window.onkeydown = (event) => {
  if (event.code === "Delete" && clippingPlanesActive) {
    // viewer.clipper.deletePlane();
    _viewer.clipper.deleteAllPlanes();
  }

  if (event.code === "Delete" && measurementsActive) {
    _viewer.dimensions.delete();
  }
};

//notes / annotations

const annotationsButton = document.getElementById("annotationsButton");
let measurementsActive = false;

annotationsButton.onclick = () => {
  _viewer.dimensions.active = true;
  _viewer.dimensions.previewActive = true;
  measurementsActive = !measurementsActive;

  if (measurementsActive) {
    annotationsButton.classList.add("active");
  } else {
    annotationsButton.classList.remove("active");
    _viewer.dimensions.active = false;
    _viewer.dimensions.previewActive = false;
  }
};

//help button
//const helpButton = document.getElementById("help-button");

//IFC tree view
const toggler = document.getElementsByClassName("caret");
for (let i = 0; i < toggler.length; i++) {
  toggler[i].onclick = () => {
    toggler[i].parentElement
      .querySelector(".nested")
      .classList.toggle("tree-active");
    toggler[i].classList.toggle("caret-down");
  };
}

//IFC properties menu functions
const dialog = document.getElementById("dialog");
// const inputForm = document.getElementById("inputForm");

dialog.addEventListener('submit', async (event) => {
  try {
    // console.log("addEventListener", event)
    event.preventDefault(); // Отменяем стандартное поведение формы
    const fields = {
      "RUS_ServiceSchedule": document.getElementById("input_RUS_ServiceSchedule").value,
      "RUS_RepairDate": document.getElementById("input_RUS_RepairDate").value,
      "RUS_OverhaulDate": document.getElementById("input_RUS_OverhaulDate").value,
      "RUS_SpareParts": document.getElementById("input_RUS_SpareParts").value,
      "RUS_EquipmentCode": document.getElementById("input_RUS_EquipmentCode").value
    }
    // console.log("addEventListener fields", fields)
    dialog.close();
    api.updateVocabulary(_fileName, _globalid, fields)
  } catch (error) {
    console.error('Error:', error);
    // alert('Connection error!');
  }
})

const btnGetData = document.getElementById("getData");
btnGetData.onclick = async function() {
  try {
    console.log("btnGetData.onclick");
    if (_expressID) {
        console.log("ExpressID выделенного элемента:", _expressID);
    } else {
        console.log("Ничего не выделено!");
    }

    const result = await getKsiForElement(_expressID)
    console.log("btnGetData result", result);
    _elemKsiCode = result;
    const ksiInfoInput = document.getElementById("ksi_info");
    ksiInfoInput.value = _elemKsiCode;
    ksiInfoInput.style.backgroundColor = '#F1F8E9';
  } catch (error) {
    console.error('Error:', error);
  }
}

const btnSendData = document.getElementById("sendData");
btnSendData.onclick = async function() {
  try {
    console.log("btnSendData.onclick")
    const result = await api.updateVocabulary(_fileName, _globalid, {"RUS_ElementCode":_elemKsiCode});
    if (result.success == true){
      const ksiInfoInput = document.getElementById("ksi_info");
      ksiInfoInput.style.backgroundColor = '#8cff08';
      _allHighlightKsiIds.push(_expressID);
      console.log("btnSendData _expressID _allHighlightKsiIds", _expressID, _allHighlightKsiIds)
      createSubsetForColor(_allHighlightKsiIds, _customKsiMaterial, "KsiIds");
    }
    console.log("btnSendData result", result);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getKsiForElement(expressID) {
  _elemCounter += 1;
  const percent = Math.round((_elemCounter / _numberOfElements) * 100);
  console.log("btnAllKsi percent", percent)

  await new Promise(resolve => requestAnimationFrame(resolve));
  // Даём браузеру время на отрисовку

  updateProgressBar(percent);
  let props = await _viewer.IFC.getProperties(0, expressID, true, false);
  props = await guiManager.normaliseProps(props);
  console.log("getKsiForElement expressID props", expressID, props);
  console.log("props.type props.Name props.mat", props.type, props.Name, props.mat);
  return await api.getFromAi(props.type, `${props.Name} ${props.mat}`);
}

const btnAllKsi = document.getElementById("btnAllKsi");
btnAllKsi.onclick = async function() {
  try {
    _isCancelled = false;
    _elemCounter = _allHighlightKsiIds.length;
    showProgressBar();
    console.log("btnAllKsi.onclick");
    const structure = await _viewer.IFC.loader.ifcManager.getSpatialStructure(_model.modelID);
    console.log("btnAllKsi structure", structure)
    // let highlightIds = []
    async function setKsiOnAllElements(item) {
      if (!_allHighlightKsiIds.includes(item.expressID))
        _allHighlightKsiIds.push(item.expressID);
        createSubsetForColor(_allHighlightKsiIds, _customKsiMaterial, "KsiIds")
        let count = item.children.length;
        console.log("btnAllKsi setKsiOnAllElements count", count)
        if (item.children.length == 0){
          const progressOverlay = document.getElementById("progressBar");
          progressOverlay.style.backgroundColor = '#bcbcbc';
          const ksiCode = await getKsiForElement(item.expressID)
          const props = await _viewer.IFC.getProperties(_model.modelID, item.expressID, true, false);
          const globalid = encodeURIComponent(props.GlobalId.value);
          // console.log("btnAllKsi setKsiOnAllElements _fileName, globalid, {RUS_ElementCode:ksiCode}", _fileName, globalid, ksiCode);
          const result = await api.updateVocabulary(_fileName, globalid, {"RUS_ElementCode":ksiCode});
          if (result.success == true){
            progressOverlay.style.backgroundColor = '#8cff08';
          }
          console.log("btnAllKsi setKsiOnAllElements ksiCode", ksiCode)
          // Даём браузеру время на отрисовку
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      for (const child of item.children) {
        if (_isCancelled) {
          console.log("Обработка отменена");
          break; // Прерываем цикл
        }
        count += await setKsiOnAllElements(child);
      }
      return count;
    }
    const numberOfElements = await setKsiOnAllElements(structure);
    console.log("btnAllKsi.numberOfElements", numberOfElements);
  } catch (error) {
    console.error('Error:', error);
  }
  finally{
    updateProgressBar(100);
    hideProgressBar();
  }
}

function createSubsetForColor(highlightIds, material, subsetName){
  console.log("createSubsetForColor(highlightIds, material, subsetName)", highlightIds, material, subsetName)
  const subset = _viewer.IFC.loader.ifcManager.createSubset({  
    modelID: _model.modelID,  
    ids: highlightIds,  
    material: material,  
    scene: _viewer.context.getScene(),  
    removePrevious: true,
    customID: subsetName 
  });
}

console.log("viewer.IFC.selector",_viewer.IFC.selector)

function showProgressBar() {
  const overlay = document.getElementById('progressOverlay');
  overlay.animate([
    { display: 'none', opacity: 0 },
    { display: 'flex', opacity: 1 }
    ], 
    {
      duration: 300,
      fill: 'forwards'
    });
  updateProgressBar(0);
  overlay.classList.add('show');
}

function hideProgressBar() {
  const overlay = document.getElementById('progressOverlay');
  overlay.animate([
    { display: 'none', opacity: 0 }
    ], 
    {
      duration: 300,
      fill: 'forwards'
    });
    overlay.classList.remove('show');
}

function updateProgressBar(percent) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  progressBar.style.width = percent + '%';
  progressText.textContent = percent + '%';
  
  // Добавляем анимацию при завершении
  if (percent >= 100) {
      progressBar.classList.add('complete');
  } else {
      progressBar.classList.remove('complete');
  }
}

const btnAllKsiCancel = document.getElementById("cancelProgress");
btnAllKsiCancel.onclick = async function() {
  try {
    console.log('Кнопка:', btnAllKsiCancel);
    console.log('Стили:', getComputedStyle(btnAllKsiCancel).cursor);
    _isCancelled = true;
    // Здесь можно добавить логику отмены операции
    console.log('Операция отменена');
  } catch (error) {
    console.error('Error:', error);
  }
  finally{
    hideProgressBar();
  }
}
  
const btnOnKsi = document.getElementById("btnOnKsi");
btnOnKsi.onclick = async function() {
  try {
    const response = await apiService.getAllKsiExpressIds(_fileName);
    console.log("btnOnKsi apiService.getAllKsiExpressIds response", response);
    if (response.success){
      _allHighlightKsiIds = response.allKsiExpressID;
      createSubsetForColor(_allHighlightKsiIds, _customKsiMaterial, "KsiIds");
    }
  } catch (error) {
    console.error('Error:', error);
  }
  finally{
    hideProgressBar();
  }
}

const btnOffKsi = document.getElementById("btnOffKsi");
btnOffKsi.onclick = async function() {
  try {
    _allHighlightKsiIds = [];
    createSubsetForColor(_allHighlightKsiIds, _customKsiMaterial, "KsiIds")
  } catch (error) {
    console.error('Error:', error);
  }
}

// Обработчик для командной строки
const btnExecuteCommand = document.getElementById("btnExecuteCommand");
const commandInput = document.getElementById("commandInput");

btnExecuteCommand.onclick = async function() {
  try {
    const command = commandInput.value.trim();
    if (!command) {
      alert('Введите команду');
      return;
    }

    if (command.startsWith('заявка')) {
      // const requestText = command.substring('заявка'.length).trim();
      // const prompt = `Пользователь оставил заявку: ${requestText}. Сгенерируй ответ для пользователя.`;
      const prompt = `В нашем помещении 21 часто отключается электричество, 
                      приходится включать обратно автомат в щитовой, 
                      просьба сделать что-то, чтобы работа электросети стабилизировалась.`

      // Инициализируем LLM клиент если еще не создан
      if (!_llmClient) {
        _llmClient = new LLMClient(apiService, _viewer);
      }
      apiService.stopLlmCheck();
      _llmClient.stopCheck();
      window.llmLogger.showLogWindow();
      // Запускаем LLM проверку для получения ответа
      _llmClient.startCheck(_fileName, _modelID, _warningMaterial, prompt);

      if (window.llmLogger) {
        window.llmLogger.logClientAction(`Отправка заявки: ${prompt}`);
        window.llmLogger.logLLMResponse(`Заявка отправлена: ${prompt}`);
      }

      return;
    }
    
    console.log('Выполнение команды:', command);
    
    const response = await apiService.executeCommand(_fileName, command);
    
    if (response.success) {
      console.log('Команда выполнена успешно:', response);
      // alert(`Команда "${response.command}" (${response.description}) выполнена успешно!\nОбработано элементов: ${response.processed}`);
    } else {
      console.error('Ошибка выполнения команды:', response.error);
      // alert(`Ошибка: ${response.error}`);
    }
  } catch (error) {
    console.error('Ошибка при выполнении команды:', error);
    // alert(`Ошибка при выполнении команды: ${error.message}`);
  }
}

// Обработчик Enter в поле ввода команды
commandInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    btnExecuteCommand.click();
  }
});

// Переменная для хранения интервала LLM проверки
let llmCheckInterval = null;

// Обработчик кнопки LLM
const btnLLM = document.getElementById("btnLLM");

btnLLM.onclick = async function() {
  try {
    // if (window.llmLogger) {
    //   window.llmLogger.logClientAction('LLM button clicked');
    //   window.llmLogger.logClientAction(`Current file name: ${_fileName}`);
    // }
    
    if (!_fileName) {
      if (window.llmLogger) {
        window.llmLogger.logError('client', 'No current file name available');
      }
      alert('No file loaded. Please load a model first.');
      return;
    }
    
    // Инициализируем LLM клиент если еще не создан
    if (!_llmClient) {
      _llmClient = new LLMClient(apiService, _viewer);
    }
    
    if (_llmClient.isCheckRunning()) {
      apiService.stopLlmCheck();
      _llmClient.stopCheck();
      btnLLM.style.backgroundColor = '';
      btnLLM.textContent = 'LLM';
      window.llmLogger.hideLogWindow();
    } 
    else {
      btnLLM.style.backgroundColor = 'red';
      btnLLM.textContent = 'LLM (активно)';
      window.llmLogger.showLogWindow();
      await _llmClient.startCheck(_fileName, _modelID, _warningMaterial);
    }
  } catch (error) {
    if (window.llmLogger) {
      window.llmLogger.logError('client', `CRITICAL ERROR при работе с LLM: ${error.message}`);
    }
    console.error('[CLIENT-UI] CRITICAL ERROR при работе с LLM:', error);
    
    // Сбрасываем кнопку в случае ошибки
    btnLLM.style.backgroundColor = '';
    btnLLM.textContent = 'LLM';
  }
};

// Функция для подсветки опасных элементов
async function highlightDangerousElements(dangerousElements) {
  try {
    console.log('[CLIENT-HIGHLIGHT] Starting dangerous elements highlighting');
    console.log('[CLIENT-HIGHLIGHT] Timestamp:', new Date().toISOString());
    console.log('[CLIENT-HIGHLIGHT] Elements to highlight:', dangerousElements.length);
    
    let testIds = [];
    _allHighlightWarningIds = []; // Очищаем предыдущие подсветки
    console.log('[CLIENT-HIGHLIGHT] Cleared previous highlight IDs');
    
    console.log('[CLIENT-HIGHLIGHT] Processing dangerous elements:');
    
    for (let i = 0; i < dangerousElements.length; i++) {
      const item = dangerousElements[i];
      console.log(`[CLIENT-HIGHLIGHT] Processing element ${i + 1}/${dangerousElements.length}:`, item);
      
      if (item.expressID && parseInt(item.vocabulary) > 900) {
        testIds.push(item.expressID);
        console.log(`[CLIENT-HIGHLIGHT] Adding to highlight list: ExpressID=${item.expressID}, GlobalID=${item.globalid}, Vocabulary=${item.vocabulary}`);
        _allHighlightWarningIds.push(item.expressID);
        
        // Фокусируемся на элементе
        console.log(`[CLIENT-HIGHLIGHT] Focusing camera on element ${i + 1}: ExpressID=${item.expressID}`);
        try {
          await _viewer.IFC.selector.pickIfcItemsByID(_modelID, [item.expressID], true); // true = focusSelection
          console.log(`[CLIENT-HIGHLIGHT] Camera focused successfully on element ${i + 1}`);
        } catch (focusError) {
          console.error(`[CLIENT-HIGHLIGHT] ERROR focusing on element ${i + 1}:`, focusError);
        }
        
        console.log(`[CLIENT-HIGHLIGHT] Waiting 2 seconds before next element...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Уменьшаем задержку до 2 секунд
      } else {
        console.log(`[CLIENT-HIGHLIGHT] Skipping element ${i + 1}: ExpressID=${item.expressID}, Vocabulary=${item.vocabulary} (not meeting criteria)`);
      }
    }
    
    console.log('[CLIENT-HIGHLIGHT] All elements processed. Total highlighted:', _allHighlightWarningIds.length);
    
    // Создаем подмножество для цветовой подсветки
    if (_allHighlightWarningIds.length > 0) {
      console.log('[CLIENT-HIGHLIGHT] Creating color subset for highlighted elements');
      console.log('[CLIENT-HIGHLIGHT] Highlight IDs:', _allHighlightWarningIds);
      try {
        createSubsetForColor(_allHighlightWarningIds, _warningMaterial, "warningIds");
        console.log('[CLIENT-HIGHLIGHT] Color subset created successfully');
      } catch (subsetError) {
        console.error('[CLIENT-HIGHLIGHT] ERROR creating color subset:', subsetError);
      }
    } else {
      console.log('[CLIENT-HIGHLIGHT] No elements to highlight with color');
    }
    
    console.log('[CLIENT-HIGHLIGHT] Dangerous elements highlighting completed');
  } catch (error) {
    console.error('[CLIENT-HIGHLIGHT] CRITICAL ERROR highlighting dangerous elements:', error);
    console.error('[CLIENT-HIGHLIGHT] Error details:', error.message);
    console.error('[CLIENT-HIGHLIGHT] Error stack:', error.stack);
  }
}

// Функции для генерации случайных данных

function getRandomValue(min, max) {
  return (Math.random() * (max - min) + min).toFixed(1);
}

// Безопасная функция для обновления элемента
function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Элемент с ID '${id}' не найден`);
  }
}

function updateAirSupplyData() {
  // Реалистичные параметры воздухоснабжения
  const airFlow = getRandomValue(800, 1100); // м³/ч - типичный расход для офисного помещения
  const supplyTemp = getRandomValue(18, 22); // °C - температура приточного воздуха
  const exhaustTemp = getRandomValue(24, 28); // °C - температура вытяжки (выше комнатной)
  const pressure = getRandomValue(50, 150); // Па - давление в вентиляционной системе

  updateElement('air-flow', airFlow);
  updateElement('air-supply-temp', supplyTemp);
  updateElement('air-exhaust-temp', exhaustTemp);
  updateElement('air-pressure', pressure);
}

function updatePowerSupplyData() {
  const voltage = getRandomValue(210, 230);
  const current = getRandomValue(50, 100);
  const powerLoad = getRandomValue(10, 50);

  updateElement('power-voltage', voltage);
  updateElement('power-current', current);
  updateElement('power-load', powerLoad);
}

function updateCoolingSupplyData() {
  // Реалистичные параметры кондиционирования
  const roomTemp = getRandomValue(21, 24); // °C - комфортная температура в помещении
  const roomHumidity = getRandomValue(45, 55); // % - оптимальная влажность для комфорта
  const coolingAirFlow = getRandomValue(300, 400); // м³/ч - расход охлажденного воздуха
  const coolingCapacity = getRandomValue(8, 12); // кВт - холодопроизводительность

  updateElement('room-temp', roomTemp);
  updateElement('room-humidity', roomHumidity);
  updateElement('cooling-air-flow', coolingAirFlow);
  updateElement('cooling-capacity', coolingCapacity);
}

async function updateLlmData(){
  try {
    const response = await api.getLLMResponse(_fileName); // Предполагаем, что API теперь не требует prompt
    if (response && response.answer) {
      llmOutput.value = response.answer;
      clearInterval(checkInterval); // Останавливаем проверку после получения ответа
    }
  } catch (error) {
    console.error('Error calling LLM API:', error);
    llmOutput.value = '...';
    clearInterval(checkInterval); // Останавливаем проверку в случае ошибки
  }
}; // Проверяем каждые 3 секунды

// Функция для запуска обновлений только после загрузки DOM
function startDataUpdates() {
  // Проверяем, что все необходимые элементы существуют
  const requiredIds = [
    'air-flow', 'air-supply-temp', 'air-exhaust-temp', 'air-pressure',
    'power-voltage', 'power-current', 'power-load',
    'room-temp', 'room-humidity', 'cooling-air-flow', 'cooling-capacity'
  ];
  
  const missingElements = requiredIds.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('Не найдены элементы с ID:', missingElements);
    return;
  }
  
  // Запускаем первое обновление сразу
  updateAirSupplyData();
  updatePowerSupplyData();
  updateCoolingSupplyData();
  // updateLlmData();
  
  // Обновление данных каждые 3 секунды
  setInterval(updateAirSupplyData, 2550);
  setInterval(updatePowerSupplyData, 4400);
  setInterval(updateCoolingSupplyData, 1500);
  // setInterval(updateLlmData, 5100);
}



// Запускаем только после полной загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDataUpdates);
} else {
  startDataUpdates();
}
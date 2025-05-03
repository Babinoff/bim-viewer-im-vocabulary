import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import api from './api-service';
import { GUIManager } from './gui-manager.js'
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
} from "web-ifc";

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
};

const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({
  container,
  backgroundColor: new Color(255, 255, 255),
});

viewer.axes.setAxes();
viewer.grid.setGrid();

const currentUrl = window.location.href;
const url = new URL(currentUrl);
const currentProjectID = url.searchParams.get("id"); //bimserver project id - use this to get latest revision etc

const scene = viewer.context.getScene(); //for showing/hiding categories

let _path;
let _fileName;
let _model;
let _globalid;
let _expressID;
let _elemKsiCode;
let _modelInfo = {
  exists: false,
  message: ``,
  rowCount: null
};

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
  viewer, 
  viewer.IFC.loader.ifcManager,
  scene, 
  api, 
  _fileName,
  categories
);

async function loadIfc(url) {
  // Load the model
  _model = await viewer.IFC.loadIfcUrl(url);
  guiManager.modelID = _model.modelID;
  // Add dropped shadow and post-processing efect
  await viewer.shadowDropper.renderShadow(_model.modelID);
  // viewer.context.renderer.postProduction.active = true;
  _model.removeFromParent(); //for ifc categories filter
  const ifcProject = await viewer.IFC.getSpatialStructure(_model.modelID);
  await guiManager.setupAllCategories(); //for ifc categories filter
  const modelInfo = await api.getModelInfo(_fileName);
  const structure = await viewer.IFC.loader.ifcManager.getSpatialStructure(_model.modelID);
  // Рекурсивный подсчёт элементов в структуре
  function countElements(item) {
    let count = item.children.length;
    for (const child of item.children) {
        count += countElements(child);
    }
    return count;
  }
  const numberOfElements = countElements(structure);
  console.log('loadIfc numberOfElements modelInfo.rowCount', numberOfElements, modelInfo.rowCount);
  const btnGetData = document.getElementById("getData");
  console.log("btnGetData.onclick", btnGetData)
  if (numberOfElements != modelInfo.rowCount){
      //создавать элементы словаря
    structure.children.forEach((child) => {
      guiManager.constructVocabulary(child);
    });
  }
  await guiManager.createTreeMenu(ifcProject, _modelInfo, numberOfElements);
}

loadIfc(_path);

//UI elements

createIfcPropertyMenu();

// const propsGUI = document.getElementById("ifc-property-menu-root");

createIfcTreeMenu();
createCheckboxes();
createHelpInfo();
toolbarTop();
toolbarBottom();

//select IFC elements
window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
  _expressID = await viewer.IFC.selector.pickIfcItem(); //highlightIfcItem hides all other elements
  console.log("window.ondblclick viewer.IFC.selector.pickIfcItem()", _expressID)
  if (!_expressID) return;
  const { modelID, id } = _expressID;
  const props = await viewer.IFC.getProperties(modelID, id, true, false);
  _globalid = encodeURIComponent(props.GlobalId.value);

  guiManager.createPropertiesMenu(props);

  document.getElementById("ifc-property-menu").style.display = "initial";
  propertiesButton.classList.add("active");

  if (clippingPlanesActive) {
    viewer.clipper.createPlane();
  }

  if (measurementsActive) {
    viewer.dimensions.create();
  }
};

//set up clipping planes
const clipButton = document.getElementById("clipPlaneButton");

let clippingPlanesActive = false;
clipButton.onclick = () => {
  clippingPlanesActive = !clippingPlanesActive;
  viewer.clipper.active = clippingPlanesActive;

  if (clippingPlanesActive) {
    //add or remove active class depending on whether button is clicked and clipping planes are active
    clipButton.classList.add("active");
  } else {
    clipButton.classList.remove("active");
  }
};

window.onauxclick = () => {
  if (clippingPlanesActive) {
    viewer.clipper.createPlane();
  }

  if (measurementsActive) {
    viewer.dimensions.create();
  }
};

window.onkeydown = (event) => {
  if (event.code === "Delete" && clippingPlanesActive) {
    // viewer.clipper.deletePlane();
    viewer.clipper.deleteAllPlanes();
  }

  if (event.code === "Delete" && measurementsActive) {
    viewer.dimensions.delete();
  }
};

//notes / annotations

const annotationsButton = document.getElementById("annotationsButton");
let measurementsActive = false;

annotationsButton.onclick = () => {
  viewer.dimensions.active = true;
  viewer.dimensions.previewActive = true;
  measurementsActive = !measurementsActive;

  if (measurementsActive) {
    annotationsButton.classList.add("active");
  } else {
    annotationsButton.classList.remove("active");
    viewer.dimensions.active = false;
    viewer.dimensions.previewActive = false;
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
      "RUS_DivisionNumber": document.getElementById("input_DivisionNumber").value,
      "RUS_StartDatePlan": document.getElementById("input_StartDatePlan").value,
      "RUS_StartDateIs": document.getElementById("input_StartDateIs").value,
      "RUS_EndDatePlan": document.getElementById("input_EndDatePlan").value,
      "RUS_EndDateIs": document.getElementById("input_EndDateIs").value
      // input_DivisionNumber: document.getElementById("input_DivisionNumber").value,
      // input_StartDatePlan: document.getElementById("input_StartDatePlan").value,
      // input_StartDateIs: document.getElementById("input_StartDateIs").value,
      // input_EndDatePlan: document.getElementById("input_EndDatePlan").value,
      // input_EndDateIs: document.getElementById("input_EndDateIs").value
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
    let props = await viewer.IFC.getProperties(0, _expressID.id, true, false);
    // console.log("btnGetData expressID", _expressID)
    props = await guiManager.normaliseProps(props);
    console.log("btnGetData props", props);
    console.log("props.type props.Name props.mat", props.type, props.Name, props.mat);
    // const result = await api.getFromAi("ifcWall", "Перегородка")
    const result = await api.getFromAi(props.type, `${props.Name} ${props.mat}`);
    console.log("btnGetData result", result);
    _elemKsiCode = result;
    document.getElementById("ksi_info").value = _elemKsiCode;
  } catch (error) {
    console.error('Error:', error);
  }
}

const btnSendData = document.getElementById("sendData");
btnSendData.onclick = async function() {
  try {
    console.log("btnSendData.onclick")
    const result = await api.updateVocabulary(_fileName, _globalid, {"RUS_ElementCode":_elemKsiCode});
    console.log("btnSendData result", result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// viewer.IFC.selector.pickIfcItem(async (element) => {
//   if (!element) {
//       console.log("Выделение снято");
//       return;
//   }

//   const expressID = element.expressID;
//   console.log("Выделен элемент с expressID:", expressID);

//   // Дополнительно можно получить его IFC-класс
//   const ifcManager = viewer.IFC.loader.ifcManager;
//   const props = await ifcManager.getItemProperties(0, expressID); // 0 = modelID (если модель одна)
//   console.log("IFC-класс:", props.type);
// });
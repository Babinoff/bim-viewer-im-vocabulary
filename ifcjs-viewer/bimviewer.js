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
let _globalid;
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
  scene, 
  api, 
  _fileName, 
  categories
);

async function loadIfc(url) {
  // Load the model
  const model = await viewer.IFC.loadIfcUrl(url);
  // Add dropped shadow and post-processing efect
  await viewer.shadowDropper.renderShadow(model.modelID);
  // viewer.context.renderer.postProduction.active = true;
  model.removeFromParent(); //for ifc categories filter
  const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
  await guiManager.setupAllCategories(); //for ifc categories filter
  const modelInfo = await api.getModelInfo(_fileName);
  const structure = await viewer.IFC.loader.ifcManager.getSpatialStructure(model.modelID);
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
  const expressID = await viewer.IFC.selector.pickIfcItem(); //highlightIfcItem hides all other elements
  console.log("window.ondblclick viewer.IFC.selector.pickIfcItem()", expressID)
  if (!expressID) return;
  const { modelID, id } = expressID;
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

// Stores the created subsets
const subsets = {};

//IFC properties menu functions
const dialog = document.getElementById("dialog");
// const inputForm = document.getElementById("inputForm");

dialog.addEventListener('submit', async (event) => {
  // console.log("addEventListener", event)
  event.preventDefault(); // Отменяем стандартное поведение формы
  const fields = {
    input_DivisionNumber: document.getElementById("input_DivisionNumber").value,
    input_StartDatePlan: document.getElementById("input_StartDatePlan").value,
    input_StartDateIs: document.getElementById("input_StartDateIs").value,
    input_EndDatePlan: document.getElementById("input_EndDatePlan").value,
    input_EndDateIs: document.getElementById("input_EndDateIs").value
  }
  // console.log("addEventListener fields", fields)
  try {
    dialog.close();
    api.updateVocabulary(_fileName, _globalid, fields)
  } catch (error) {
    console.error('Error:', error);
    // alert('Connection error!');
  }
})

const btnGetData = document.getElementById("getData");
console.log("btnGetData.onclick", btnGetData)

btnGetData.onclick = async function() {
  try {
    console.log("btnGetData.onclick")
    const result = await api.getFromAi("ifcWall", "Перегородка")
    console.log("btnGetData result",result)
  } catch (error) {
    console.error('Error:', error);
  }
}

// document.addEventListener('DOMContentLoaded', function() {
//   const btnGetData = document.getElementById("getData");
//   btnGetData.addEventListener('click', async (event) => {
//     try {
//       console.log("btnGetData addEventListener", event)
//       event.preventDefault(); // Отменяем стандартное поведение формы
//       const result = await api.getFromAi("ifcWall", "Перегородка")
//       console.log("btnGetData result",result)
//     } catch (error) {
//       console.error('Error:', error);
//     }
//   })
//   // Можно также добавить обработчик для sendData
//   const btnSendData = document.getElementById("sendData");
//   if (btnSendData) {
//       btnSendData.addEventListener('click', function() {
//           // Логика отправки данных
//           alert("Данные отправлены (из внешнего JS)");
//       });
//   }
// });
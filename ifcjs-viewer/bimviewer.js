import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
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

async function loadIfc(url) {
  // Load the model
  const model = await viewer.IFC.loadIfcUrl(url);
  // Add dropped shadow and post-processing efect
  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;

  model.removeFromParent(); //for ifc categories filter

  const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
  


  await setupAllCategories(); //for ifc categories filter
  createTreeMenu(ifcProject);
}

const scene = viewer.context.getScene(); //for showing/hiding categories

let path;
let fileName;

for (let proj of projects) {
  if (proj.id === currentProjectID) {
    fileName = proj.name;
    path = "./models/" + fileName + ".ifc"; // get path into this
    try {
      const response = await fetch('http://localhost:4000/create-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelname: fileName
        }),
      });
  
      const result = await response.json();
      // alert(result.success ? 'Action saved!' : 'Error: ' + result.error);
    } catch (error) {
      console.error('Error:', error);
      // alert('Connection error!');
    }
  }
}

loadIfc(path);

//UI elements

createIfcPropertyMenu();

const propsGUI = document.getElementById("ifc-property-menu-root");

createIfcTreeMenu();
createCheckboxes();
createHelpInfo();
toolbarTop();
toolbarBottom();

//select IFC elements
window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
  const result = await viewer.IFC.selector.pickIfcItem(); //highlightIfcItem hides all other elements
  if (!result) return;
  const { modelID, id } = result;
  const props = await viewer.IFC.getProperties(modelID, id, true, false);

  createPropertiesMenu(props);

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

// hiding/filters

// Gets the name of a category
function getName(category) {
  const names = Object.keys(categories);
  return names.find((name) => categories[name] === category);
}

// Gets all the items of a category
async function getAll(category) {
  return viewer.IFC.loader.ifcManager.getAllItemsOfType(0, category, false);
}

// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
  const ids = await getAll(category);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: 0,
    scene,
    ids,
    removePrevious: true,
    customID: category.toString(),
  });
}

// Stores the created subsets
const subsets = {};

async function setupAllCategories() {
  const allCategories = Object.values(categories);
  for (let i = 0; i < allCategories.length; i++) {
    const category = allCategories[i];
    await setupCategory(category);
  }
}

// Creates a new subset and configures the checkbox
async function setupCategory(category) {
  subsets[category] = await newSubsetOfType(category);
  setupCheckBox(category);
}

// Sets up the checkbox event to hide / show elements
function setupCheckBox(category) {
  const name = getName(category);
  const checkBox = document.getElementById(name);
  checkBox.addEventListener("change", (event) => {
    const checked = event.target.checked;
    const subset = subsets[category];
    if (checked) scene.add(subset);
    else subset.removeFromParent();
  });
}

// Spatial tree menu

function createTreeMenu(ifcProject) {
  const root = document.getElementById("tree-root");
  removeAllChildren(root);
  const ifcProjectNode = createNestedChild(root, ifcProject);
  ifcProject.children.forEach((child) => {
    constructTreeMenuNode(ifcProjectNode, child);
  });
}

function nodeToString(node) {
  return `${node.type} - ${node.expressID}`;
}

async function constructTreeMenuNode(parent, node) {
  const children = node.children;

  // запись элементов в справочник
  const props = await viewer.IFC.getProperties(0, node.expressID, true, false);
  // console.log(node.expressID, props.GlobalId.value);
  
  try {
    await saveVacabulary(props.GlobalId.value)
  } catch (error) {
    console.error('Error:', error);
    // alert('Connection error!');
  }

  if (children.length === 0) {
    createSimpleChild(parent, node);
    return;
  }
  const nodeElement = createNestedChild(parent, node);
  children.forEach((child) => {
    constructTreeMenuNode(nodeElement, child);
  });
}

function createNestedChild(parent, node) {
  const content = nodeToString(node);
  const root = document.createElement("li");
  createTitle(root, content);
  const childrenContainer = document.createElement("ul");
  childrenContainer.classList.add("nested");
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement("span");
  title.classList.add("caret");
  title.onclick = () => {
    title.parentElement
      .querySelector(".nested")
      .classList.toggle("tree-active");
    title.classList.toggle("caret-down");
  };
  title.textContent = content;
  parent.appendChild(title);
}

function createSimpleChild(parent, node) {
  const content = nodeToString(node);
  const childNode = document.createElement("li");
  childNode.classList.add("leaf-node");
  childNode.textContent = content;
  parent.appendChild(childNode);

  childNode.onmouseenter = () => {
    viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
  };

  childNode.onclick = async () => {
    viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID], true);

    let idsArray = [node.expressID];

    const props = await viewer.IFC.getProperties(0, idsArray[0], true, false);
    // console.log(props); //call the function here
    createPropertiesMenu(props);
    document.getElementById("ifc-property-menu").style.display = "initial";
    propertiesButton.classList.add("active");
  };
}

//IFC properties menu functions
const dialog = document.getElementById("dialog");
const inputForm = document.getElementById("inputForm");

let globalidVocabulary;

const input_DivisionNumber = document.getElementById("input_DivisionNumber");
const input_StartDatePlan = document.getElementById("input_StartDatePlan");
const input_StartDateIs = document.getElementById("input_StartDateIs");
const input_EndDatePlan = document.getElementById("input_EndDatePlan");
const input_EndDateIs = document.getElementById("input_EndDateIs");


dialog.addEventListener('submit', (event) => {
  console.log("addEventListener", event)
  event.preventDefault(); // Отменяем стандартное поведение формы
  try {
    dialog.close();
    updateVacabulary(globalidVocabulary)
  } catch (error) {
    console.error('Error:', error);
    // alert('Connection error!');
  }
})

async function saveVacabulary(globalid){
  const responsePost = await fetch('http://localhost:4000/add-vocabulary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: fileName,
      globalid: encodeURIComponent(globalid)
    }),
  });
  const result = await responsePost.json();
  // console.log(result)
}

async function updateVacabulary(globalid){
  const responsePost = await fetch('http://localhost:4000/update-vocabulary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: fileName,
      globalid: globalid,
      DivisionNumberVocabulary: input_DivisionNumber.value,
      StartDatePlanVocabulary: input_StartDatePlan.value,
      StartDateIsVocabulary: input_StartDateIs.value,
      EndDatePlanVocabulary: input_EndDatePlan.value,
      EndDateIsVocabulary: input_EndDateIs.value
    }),
  });
  const result = await responsePost.json();
  // console.log(result)
}

async function createPropertiesMenu(props) {
  inputForm.reset();
  globalidVocabulary = null;
  input_DivisionNumber.disabled = false;
  input_StartDatePlan.disabled = false;
  input_StartDateIs.disabled = false;
  input_EndDatePlan.disabled = false;
  input_EndDateIs.disabled = false;

  removeAllChildren(propsGUI);
  console.log(props)
  let fromVocabulary;
  try {
    globalidVocabulary = encodeURIComponent(props.GlobalId.value);
    const response = await fetch(`http://localhost:4000/get-vocabulary/?fileName=${fileName}&globalid=${globalidVocabulary}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    // Проверка статуса ответа
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
    }
    // Парсинг JSON данных
    const result = await response.json();
    console.log("result",result)
    if (result != null){
      if (result.RUS_DivisionNumber){
        props.RUS_DivisionNumber = result.RUS_DivisionNumber;
        input_DivisionNumber.disabled = true;
      }
      if (result.RUS_StartDatePlan){
        props.RUS_StartDatePlan = result.RUS_StartDatePlan;
        input_StartDatePlan.disabled = true;
      }
      if (result.RUS_StartDateIs){
        props.RUS_StartDateIs = result.RUS_StartDateIs;
        input_StartDateIs.disabled = true;
      }
      if (result.RUS_EndDatePlan){
        props.RUS_EndDatePlan = result.RUS_EndDatePlan;
        input_EndDatePlan.disabled = true;
      }
      if (result.RUS_EndDateIs){
        props.RUS_EndDateIs = result.RUS_EndDateIs;
        input_EndDateIs.disabled = true;
      }
    }


    // alert(result.success ? 'Action saved!' : 'Error: ' + result.error);
  } catch (error) {
    console.error('Error:', error);
    // alert('Connection error!');
  }
  delete props.psets;
  delete props.mats;
  delete props.type;
  // properties.mats = JSON.stringify(properties.mats);
  for (let key in props) {
    createPropertyEntry(key, props[key]);
  }
  // input.value = null;
  dialog.showModal();
}

function createPropertyEntry(key, value) {
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if (value === null || value === undefined) value = "undefined";
  else if (value.value) value = value.value;

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  propsGUI.appendChild(propContainer);
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

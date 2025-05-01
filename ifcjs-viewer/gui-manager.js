// GUI Manager Library
export class GUIManager {
  constructor(viewer, scene, api, fileName, categories) {
    this.viewer = viewer;
    this.scene = scene;
    this.api = api;
    this.fileName = fileName;
    this.categories = categories;
    this.subsets = {};
    
    // Элементы DOM, которые должны быть переданы или найдены
    // this.propsGUI = document.getElementById("ifc-property-menu-root");
    this.inputForm = document.getElementById('inputForm');
    this.dialog = document.getElementById('dialog');
    this.propertiesButton = document.getElementById('properties-button');
    
    // Input элементы
    this.input_DivisionNumber = document.getElementById("input_DivisionNumber");
    this.input_StartDatePlan = document.getElementById("input_StartDatePlan");
    this.input_StartDateIs = document.getElementById("input_StartDateIs");
    this.input_EndDatePlan = document.getElementById("input_EndDatePlan");
    this.input_EndDateIs = document.getElementById("input_EndDateIs");
    
    this.globalidVocabulary = null;
  }

  // Properties Menu Methods
  async createPropertiesMenu(props) {
    this.inputForm.reset();
    this.globalidVocabulary = null;
    
    // Reset input disabled states
    [this.input_DivisionNumber, this.input_StartDatePlan, 
     this.input_StartDateIs, this.input_EndDatePlan, this.input_EndDateIs]
      .forEach(input => input.disabled = false);

    const propsGUI = document.getElementById("ifc-property-menu-root");
    this.removeAllChildren(propsGUI, "createPropertiesMenu");
    
    try {
      const globalid = encodeURIComponent(props.GlobalId.value);
      const result = await this.api.getVocabulary(this.fileName, globalid);

      if (result != null) {
        this.updatePropsFromVocabulary(result, props);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    // Prepare properties for display
    props.psets = JSON.stringify(props.psets);
    props.mats = JSON.stringify(props.mats);
    props.type = JSON.stringify(props.type);

    // Create property entries
    for (let key in props) {
      this.createPropertyEntry(key, props[key]);
    }

    this.dialog.showModal();
  }

  updatePropsFromVocabulary(result, props) {
    const vocabularyMappings = {
      'RUS_DivisionNumber': { prop: 'RUS_DivisionNumber', input: this.input_DivisionNumber },
      'RUS_StartDatePlan': { prop: 'RUS_StartDatePlan', input: this.input_StartDatePlan },
      'RUS_StartDateIs': { prop: 'RUS_StartDateIs', input: this.input_StartDateIs },
      'RUS_EndDatePlan': { prop: 'RUS_EndDatePlan', input: this.input_EndDatePlan },
      'RUS_EndDateIs': { prop: 'RUS_EndDateIs', input: this.input_EndDateIs }
    };

    for (const [key, mapping] of Object.entries(vocabularyMappings)) {
      if (result[key]) {
        props[mapping.prop] = result[key];
        mapping.input.disabled = true;
      }
    }
  }

  createPropertyEntry(key, value) {
    if (value === null || value === undefined) value = "undefined";
    else if (value.value) value = value.value;

    const propContainer = document.createElement("div");
    propContainer.classList.add("ifc-property-item");

    const keyElement = document.createElement("div");
    keyElement.textContent = key;
    propContainer.appendChild(keyElement);

    const valueElement = document.createElement("div");
    valueElement.classList.add("ifc-property-value");
    valueElement.textContent = value;
    propContainer.appendChild(valueElement);
    const propsGUI = document.getElementById("ifc-property-menu-root");
    propsGUI.appendChild(propContainer);
  }

  // DOM Utilities
  removeAllChildren(element, test) {
    console.log("removeAllChildren element", test, element)
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  // Category Methods
  getName(category) {
    const names = Object.keys(this.categories);
    return names.find((name) => this.categories[name] === category);
  }

  async getAll(category) {
    return this.viewer.IFC.loader.ifcManager.getAllItemsOfType(0, category, false);
  }

  async newSubsetOfType(category) {
    const ids = await this.getAll(category);
    return this.viewer.IFC.loader.ifcManager.createSubset({
      modelID: 0,
      scene: this.scene,
      ids,
      removePrevious: true,
      customID: category.toString(),
    });
  }

  async setupAllCategories() {
    const allCategories = Object.values(this.categories);
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      await this.setupCategory(category);
    }
  }

  async setupCategory(category) {
    this.subsets[category] = await this.newSubsetOfType(category);
    this.setupCheckBox(category);
  }

  setupCheckBox(category) {
    const name = this.getName(category);
    const checkBox = document.getElementById(name);
    checkBox.addEventListener("change", (event) => {
      const checked = event.target.checked;
      const subset = this.subsets[category];
      if (checked) this.scene.add(subset);
      else subset.removeFromParent();
    });
  }

  // Tree Menu Methods
  createTreeMenu(ifcProject, modelInfo) {
    const root = document.getElementById("tree-root");
    this.removeAllChildren(root, "createTreeMenu");
    const ifcProjectNode = this.createNestedChild(root, ifcProject);
    const ifcElements = ifcProject.children;
    if (ifcElements.length == modelInfo.rowCount){
      ifcElements.forEach((child) => {
        this.constructTreeMenuNode(ifcProjectNode, child, false);
      });
    }
    else {
      ifcElements.forEach((child) => {
        this.constructTreeMenuNode(ifcProjectNode, child, true);
      });
    }

  }

  nodeToString(node) {
    return `${node.type} - ${node.expressID}`;
  }

  async constructTreeMenuNode(parent, node, needAddVocabulaty) {
    const children = node.children;
    const props = await this.viewer.IFC.getProperties(0, node.expressID, true, false);
    
    if (needAddVocabulaty){
      try {
        await this.api.addVocabulary(this.fileName, props.GlobalId.value);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (children.length === 0) {
      this.createSimpleChild(parent, node);
      return;
    }
    
    const nodeElement = this.createNestedChild(parent, node);
    children.forEach((child) => {
      this.constructTreeMenuNode(nodeElement, child);
    });
  }

  createNestedChild(parent, node) {
    const content = this.nodeToString(node);
    const root = document.createElement("li");
    this.createTitle(root, content);
    const childrenContainer = document.createElement("ul");
    childrenContainer.classList.add("nested");
    root.appendChild(childrenContainer);
    parent.appendChild(root);
    return childrenContainer;
  }

  createTitle(parent, content) {
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

  createSimpleChild(parent, node) {
    const content = this.nodeToString(node);
    const childNode = document.createElement("li");
    childNode.classList.add("leaf-node");
    childNode.textContent = content;
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
      this.viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
    };

    childNode.onclick = async () => {
      this.viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID], true);
      const props = await this.viewer.IFC.getProperties(0, node.expressID, true, false);
      this.createPropertiesMenu(props);
      document.getElementById("ifc-property-menu").style.display = "initial";
      this.propertiesButton.classList.add("active");
    };
  }
}
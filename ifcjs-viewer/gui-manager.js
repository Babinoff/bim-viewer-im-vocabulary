// GUI Manager Library
export class GUIManager {
  constructor(viewer, ifcManager, scene, api, fileName, categories,) {
    this.viewer = viewer;
    this.ifcManager = ifcManager
    this.scene = scene;
    this.api = api;
    this.fileName = fileName;
    this.modelID;
    this.categories = categories;
    this.subsets = {};
    // Элементы DOM, которые должны быть переданы или найдены
    // this.propsGUI = document.getElementById("ifc-property-menu-root");
    this.inputForm = document.getElementById('inputForm');
    this.dialog = document.getElementById('dialog');
    this.propertiesButton = document.getElementById('properties-button');
    // Input элементы
    this.input_ServiceSchedule = document.getElementById("input_RUS_ServiceSchedule");
    this.input_RepairDate = document.getElementById("input_RUS_RepairDate");
    this.input_OverhaulDate = document.getElementById("input_RUS_OverhaulDate");
    this.input_SpareParts = document.getElementById("input_RUS_SpareParts");
    this.input_EquipmentCode = document.getElementById("input_RUS_EquipmentCode");
    this.ksiInfoInput = document.getElementById("ksi_info");
    this.globalid = null;
  }

  // Properties Menu Methods
  async createPropertiesMenu(props) {
    this.inputForm.reset();
    this.ksiInfoInput.style.backgroundColor = '#eeeeee';
    // Reset input disabled states
    [this.input_ServiceSchedule, this.input_RepairDate, 
     this.input_OverhaulDate, this.input_SpareParts, this.input_EquipmentCode]
      .forEach(input => input.disabled = false);

    const propsGUI = document.getElementById("ifc-property-menu-root");
    this.removeAllChildren(propsGUI, "createPropertiesMenu");
    
    try {
      const globalid = encodeURIComponent(props.GlobalId.value);
      const resultFromVocabulary = await this.api.getVocabulary(this.fileName, globalid);

      if (resultFromVocabulary != null) {
        this.updatePropsFromVocabulary(resultFromVocabulary, props);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    // Prepare properties for display
    // props.psets = JSON.stringify(props.psets);
    // console.log("props.psets", JSON.stringify(props.psets));
    // console.log("props.mats", JSON.stringify(props.mats));
    // props.mats = props.mats.map(mat => this.decodeUnicodeEscape(mat.Name?.value)).join('_');
    // props.Name = this.decodeUnicodeEscape(props.Name.value)
    
    const typeID = await this.ifcManager.getIfcType(this.modelID, props.expressID);
    console.log("typeID:", typeID);
    props.type = typeID;
    props = await this.normaliseProps(props);

    // Create property entries
    for (let key in props) {
      // console.log(key, props[key])
      this.createPropertyEntry(key, props[key]);
    }

    this.dialog.showModal();
  }

  async normaliseProps(props) {
    if (props != null){
      props.mats = props.mats.map(mat => this.decodeUnicodeEscape(mat.Name?.value ?? 'unnamed')).join('_');
      props.Name = this.decodeUnicodeEscape(props.Name?.value ?? 'unnamed');
      const typeID = await this.ifcManager.getIfcType(this.modelID, props.expressID);
      // console.log("typeID:", typeID);
      props.type = typeID;
    }
    return props;
  }

  decodeUnicodeEscape(str) {
    // Заменяем все вхождения \X2\....\X0\ на соответствующие символы
    return str.replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, function(match, hexCodes) {
        let result = '';
        // Разбиваем строку на группы по 4 символа (каждый символ UTF-16)
        for (let i = 0; i < hexCodes.length; i += 4) {
            const hex = hexCodes.substr(i, 4);
            const codePoint = parseInt(hex, 16);
            result += String.fromCharCode(codePoint);
        }
        return result;
    });
  }

  updatePropsFromVocabulary(resultFromVocabulary, props) {
    console.log("resultFromVocabulary", resultFromVocabulary)
    for (const [key, value] of Object.entries(resultFromVocabulary)) {
      if (key.includes("RUS") && value) {
        props[key] = value;
        try{
          const input = document.getElementById(`input_${key}`);
          console.log("updatePropsFromVocabulary input", input)
          if (input){
            input.disabled = true;
          }
        }
        catch (error) {
          console.error('Error:', error);
        }
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
    // console.log("removeAllChildren element", test, element)
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
    return this.ifcManager.getAllItemsOfType(0, category, false);
  }

  async newSubsetOfType(category) {
    const ids = await this.getAll(category);
    return this.ifcManager.createSubset({
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
  async createTreeMenu(ifcProject, modelInfo, numberOfElements) {
    const root = document.getElementById("tree-root");
    this.removeAllChildren(root, "createTreeMenu");
    const ifcProjectNode = this.createNestedChild(root, ifcProject);
    const ifcElements = ifcProject.children;
    ifcElements.forEach((child) => {
      this.constructTreeMenuNode(ifcProjectNode, child);
    });
  }

  nodeToString(node) {
    return `${node.type} - ${node.expressID}`;
  }

  async constructTreeMenuNode(parent, node) {
    const children = node.children;
    if (children.length === 0) {
      this.createSimpleChild(parent, node);
      return;
    }
    const nodeElement = this.createNestedChild(parent, node);
    children.forEach((child) => {
      this.constructTreeMenuNode(nodeElement, child);
    });
  }

  async constructVocabulary(node) {
    const children = node.children;
    const props = await this.viewer.IFC.getProperties(0, node.expressID, true, false);
    // console.log('constructTreeMenuNode addVocabulary')
    try {
      await this.api.addVocabulary(this.fileName, props.GlobalId.value, node.expressID);
    } catch (error) {
      console.error('Error:', error);
    }
    if (children.length === 0) {
      return;
    }
    children.forEach((child) => {
      this.constructVocabulary(child);
    });
  }

  async collectVocabularyElements(node, elements = []) {
    const children = node.children;
    const props = await this.viewer.IFC.getProperties(0, node.expressID, true, false);
    
    // Добавляем текущий элемент в массив
    elements.push({
      globalid: props.GlobalId.value,
      expressID: node.expressID
    });
    
    // Рекурсивно обрабатываем дочерние элементы
    if (children.length > 0) {
      for (const child of children) {
        await this.collectVocabularyElements(child, elements);
      }
    }
    
    return elements;
  }

  async constructVocabularyBatch(nodes) {
    console.log('Начинаем пакетное создание словаря...');
    const allElements = [];
    
    // Собираем все элементы из всех узлов
    for (const node of nodes) {
      await this.collectVocabularyElements(node, allElements);
    }
    
    console.log(`Собрано ${allElements.length} элементов для пакетной отправки`);
    
    try {
      // Отправляем все элементы пакетно
      const result = await this.api.addVocabularyBatch(this.fileName, allElements);
      console.log('Пакетное создание словаря завершено:', result);
      return result;
    } catch (error) {
      console.error('Ошибка при пакетном создании словаря:', error);
      throw error;
    }
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
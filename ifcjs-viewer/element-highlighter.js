// Element Highlighter - логика подсветки и фокусировки на элементах

export class ElementHighlighter {
  constructor(viewer, modelID, warningMaterial) {
    this.viewer = viewer;
    this.modelID = modelID;
    this.warningMaterial = warningMaterial;
    this.allHighlightWarningIds = [];
  }

  // Функция для подсветки опасных элементов
  async highlightDangerousElements(dangerousElements) {
    try {
      console.log('[ELEMENT-HIGHLIGHTER] Starting dangerous elements highlighting');
      console.log('[ELEMENT-HIGHLIGHTER] Timestamp:', new Date().toISOString());
      console.log('[ELEMENT-HIGHLIGHTER] Elements to highlight:', dangerousElements.length);
      
      let testIds = [];
      this.allHighlightWarningIds = []; // Очищаем предыдущие подсветки
      console.log('[ELEMENT-HIGHLIGHTER] Cleared previous highlight IDs');
      
      console.log('[ELEMENT-HIGHLIGHTER] Processing dangerous elements:');
      
      for (let i = 0; i < dangerousElements.length; i++) {
        const item = dangerousElements[i];
        console.log(`[ELEMENT-HIGHLIGHTER] Processing element ${i + 1}/${dangerousElements.length}:`, item);
        
        if (item.expressID && parseInt(item.vocabulary) > 900) {
          testIds.push(item.expressID);
          console.log(`[ELEMENT-HIGHLIGHTER] Adding to highlight list: ExpressID=${item.expressID}, GlobalID=${item.globalid}, Vocabulary=${item.vocabulary}`);
          this.allHighlightWarningIds.push(item.expressID);
          
          // Фокусируемся на элементе
          console.log(`[ELEMENT-HIGHLIGHTER] Focusing camera on element ${i + 1}: ExpressID=${item.expressID}`);
          try {
            await this.viewer.IFC.selector.pickIfcItemsByID(this.modelID, [item.expressID], true); // true = focusSelection
            console.log(`[ELEMENT-HIGHLIGHTER] Camera focused successfully on element ${i + 1}`);
          } catch (focusError) {
            console.error(`[ELEMENT-HIGHLIGHTER] ERROR focusing on element ${i + 1}:`, focusError);
          }
          
          console.log(`[ELEMENT-HIGHLIGHTER] Waiting 2 seconds before next element...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Уменьшаем задержку до 2 секунд
        } else {
          console.log(`[ELEMENT-HIGHLIGHTER] Skipping element ${i + 1}: ExpressID=${item.expressID}, Vocabulary=${item.vocabulary} (not meeting criteria)`);
        }
      }
      
      console.log('[ELEMENT-HIGHLIGHTER] All elements processed. Total highlighted:', this.allHighlightWarningIds.length);
      
      // Создаем подмножество для цветовой подсветки
      if (this.allHighlightWarningIds.length > 0) {
        console.log('[ELEMENT-HIGHLIGHTER] Creating color subset for highlighted elements');
        console.log('[ELEMENT-HIGHLIGHTER] Highlight IDs:', this.allHighlightWarningIds);
        try {
          this.createSubsetForColor(this.allHighlightWarningIds, this.warningMaterial, "warningIds");
          console.log('[ELEMENT-HIGHLIGHTER] Color subset created successfully');
        } catch (subsetError) {
          console.error('[ELEMENT-HIGHLIGHTER] ERROR creating color subset:', subsetError);
        }
      } else {
        console.log('[ELEMENT-HIGHLIGHTER] No elements to highlight with color');
      }
      
      console.log('[ELEMENT-HIGHLIGHTER] Dangerous elements highlighting completed');
    } catch (error) {
      console.error('[ELEMENT-HIGHLIGHTER] CRITICAL ERROR highlighting dangerous elements:', error);
      console.error('[ELEMENT-HIGHLIGHTER] Error details:', error.message);
      console.error('[ELEMENT-HIGHLIGHTER] Error stack:', error.stack);
    }
  }

  // Создание подмножества для цветовой подсветки
  createSubsetForColor(ids, material, subsetName) {
    try {
      console.log(`[ELEMENT-HIGHLIGHTER] Creating subset '${subsetName}' with ${ids.length} elements`);
      
      // Удаляем предыдущее подмножество если существует
      if (this.viewer.IFC.loader.ifcManager.state.models[this.modelID]) {
        const existingSubset = this.viewer.IFC.loader.ifcManager.state.models[this.modelID].mesh.children
          .find(child => child.name === subsetName);
        if (existingSubset) {
          console.log(`[ELEMENT-HIGHLIGHTER] Removing existing subset '${subsetName}'`);
          this.viewer.IFC.loader.ifcManager.removeSubset(this.modelID, material, subsetName);
        }
      }
      
      // Создаем новое подмножество
      this.viewer.IFC.loader.ifcManager.createSubset({
        modelID: this.modelID,
        ids: ids,
        material: material,
        scene: this.viewer.context.getScene(),
        removePrevious: true,
        customID: subsetName
      });
      
      console.log(`[ELEMENT-HIGHLIGHTER] Subset '${subsetName}' created successfully`);
    } catch (error) {
      console.error(`[ELEMENT-HIGHLIGHTER] Error creating subset '${subsetName}':`, error);
      throw error;
    }
  }

  // Очистка всех подсветок
  clearHighlights() {
    try {
      console.log('[ELEMENT-HIGHLIGHTER] Clearing all highlights');
      
      if (this.allHighlightWarningIds.length > 0) {
        this.viewer.IFC.loader.ifcManager.removeSubset(this.modelID, this.warningMaterial, "warningIds");
        this.allHighlightWarningIds = [];
        console.log('[ELEMENT-HIGHLIGHTER] All highlights cleared');
      } else {
        console.log('[ELEMENT-HIGHLIGHTER] No highlights to clear');
      }
    } catch (error) {
      console.error('[ELEMENT-HIGHLIGHTER] Error clearing highlights:', error);
    }
  }

  // Подсветка конкретных элементов по ID
  async highlightSpecificElements(expressIDs, focusOnElements = true) {
    try {
      console.log(`[ELEMENT-HIGHLIGHTER] Highlighting ${expressIDs.length} specific elements`);
      
      this.allHighlightWarningIds = [...expressIDs];
      
      if (focusOnElements) {
        for (let i = 0; i < expressIDs.length; i++) {
          const expressID = expressIDs[i];
          console.log(`[ELEMENT-HIGHLIGHTER] Focusing on element ${i + 1}/${expressIDs.length}: ${expressID}`);
          
          try {
            await this.viewer.IFC.selector.pickIfcItemsByID(this.modelID, [expressID], true);
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (focusError) {
            console.error(`[ELEMENT-HIGHLIGHTER] Error focusing on element ${expressID}:`, focusError);
          }
        }
      }
      
      // Создаем цветовую подсветку
      this.createSubsetForColor(expressIDs, this.warningMaterial, "warningIds");
      
      console.log('[ELEMENT-HIGHLIGHTER] Specific elements highlighting completed');
    } catch (error) {
      console.error('[ELEMENT-HIGHLIGHTER] Error highlighting specific elements:', error);
      throw error;
    }
  }

  // Получение списка подсвеченных элементов
  getHighlightedElements() {
    return [...this.allHighlightWarningIds];
  }

  // Проверка, подсвечен ли элемент
  isElementHighlighted(expressID) {
    return this.allHighlightWarningIds.includes(expressID);
  }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementHighlighter;
} else {
  window.ElementHighlighter = ElementHighlighter;
}
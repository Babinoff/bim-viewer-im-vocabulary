// MCP Services - Сервисы для работы с MCP API

const MCP_BASE_URL = 'http://localhost:8001';
const DEFAULT_TIMEOUT = 10000;

// Базовая функция для выполнения запросов к MCP серверу
async function mcpRequest(endpoint, data = {}, timeout = DEFAULT_TIMEOUT) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${MCP_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Запрос был отменен по таймауту');
    }
    throw error;
  }
}

// Execute Blender Code
async function executeBlenderCode(code) {
  return await mcpRequest('/bonsai/execute_blender_code', { code });
}

// Decode Unicode Strings
async function decodeUnicodeStrings(obj) {
  return await mcpRequest('/bonsai/decode_unicode_strings', { obj });
}

// Get IFC Project Info
async function getIfcProjectInfo() {
  return await mcpRequest('/bonsai/get_ifc_project_info');
}

// Get Selected IFC Entities
async function getSelectedIfcEntities() {
  return await mcpRequest('/bonsai/get_selected_ifc_entities');
}

// List IFC Entities
async function listIfcEntities(entityType = null, limit = 50, selectedOnly = false) {
  return await mcpRequest('/bonsai/list_ifc_entities', {
    entity_type: entityType,
    limit: limit,
    selected_only: selectedOnly
  });
}

// Get IFC Properties
async function getIfcProperties(globalId = null) {
  return await mcpRequest('/bonsai/get_ifc_properties', {
    global_id: globalId
  });
}

// Get IFC Properties Multiple
async function getIfcPropertiesMultiple(globalIds = null) {
  return await mcpRequest('/bonsai/get_ifc_properties_multiple', {
    global_ids: globalIds
  });
}

// Get IFC Element Coordinates
async function getIfcElementCoordinates(globalIds = null, selectedOnly = false) {
  return await mcpRequest('/bonsai/get_ifc_element_coordinates', {
    global_ids: globalIds,
    selected_only: selectedOnly
  });
}

// Get IFC Space Properties By Number
async function getIfcSpacePropertiesByNumber(spaceNumber) {
  return await mcpRequest('/bonsai/get_ifc_space_properties_by_number', {
    space_number: spaceNumber
  });
}

// Get IFC Spatial Structure
async function getIfcSpatialStructure() {
  return await mcpRequest('/bonsai/get_ifc_spatial_structure');
}

// Get IFC Relationships
async function getIfcRelationships(globalId) {
  return await mcpRequest('/bonsai/get_ifc_relationships', {
    global_id: globalId
  });
}

// Export IFC Data
async function exportIfcData(entityType = null, levelName = null, outputFormat = 'csv') {
  return await mcpRequest('/bonsai/export_ifc_data', {
    entity_type: entityType,
    level_name: levelName,
    output_format: outputFormat
  });
}

// Place IFC Object
async function placeIfcObject(typeName, x, y, z, rotation = 0) {
  return await mcpRequest('/bonsai/place_ifc_object', {
    type_name: typeName,
    x: x,
    y: y,
    z: z,
    rotation: rotation
  });
}

// Get User View
async function getUserView() {
  return await mcpRequest('/bonsai/get_user_view');
}

// Sequential Thinking
async function sequentialThinking(thought, thoughtNumber, totalThoughts, nextThoughtNeeded, isRevision = null, revisesThought = null, branchFromThought = null, branchId = null, needsMoreThoughts = null) {
  return await mcpRequest('/bonsai/sequentialthinking', {
    thought: thought,
    thoughtNumber: thoughtNumber,
    totalThoughts: totalThoughts,
    nextThoughtNeeded: nextThoughtNeeded,
    isRevision: isRevision,
    revisesThought: revisesThought,
    branchFromThought: branchFromThought,
    branchId: branchId,
    needsMoreThoughts: needsMoreThoughts
  });
}

// Get All IFC Elements By Space Name
async function getAllIfcElementsBySpaceName(spaceName) {
  return await mcpRequest('/bonsai/get_all_ifc_elements_by_space_name', {
    space_name: spaceName
  });
}

// Проверка доступности MCP сервера
async function checkMCPServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${MCP_BASE_URL}/bonsai/get_ifc_project_info`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    return false;
  }
}

module.exports = {
  // Основные функции
  executeBlenderCode,
  decodeUnicodeStrings,
  getIfcProjectInfo,
  getSelectedIfcEntities,
  listIfcEntities,
  getIfcProperties,
  getIfcPropertiesMultiple,
  getIfcElementCoordinates,
  getIfcSpacePropertiesByNumber,
  getIfcSpatialStructure,
  getIfcRelationships,
  exportIfcData,
  placeIfcObject,
  getUserView,
  sequentialThinking,
  getAllIfcElementsBySpaceName,
  
  // Утилиты
  checkMCPServerHealth,
  mcpRequest
};
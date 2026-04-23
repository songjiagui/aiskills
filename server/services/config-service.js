const fs = require('fs');
const {
   CONFIG_PATH,
   MODELS_CONFIG_PATH,
   SKILLS_CONFIG_PATH,
   DEFAULT_CONFIG
} = require('../constants');
const { cloneJson, ensureJsonFile, readJsonFile, writeJsonFile } = require('../utils/json-store');

const toolSchemaCache = {
   mtimeMs: -1,
   tools: []
};

function ensureConfig() {
   ensureJsonFile(CONFIG_PATH, DEFAULT_CONFIG);
}

function loadConfig() {
   ensureConfig();
   const raw = readJsonFile(CONFIG_PATH, DEFAULT_CONFIG);
   return {
      ...DEFAULT_CONFIG,
      ...raw,
      availableModels: Array.isArray(raw.availableModels) && raw.availableModels.length > 0
         ? raw.availableModels
         : DEFAULT_CONFIG.availableModels
   };
}

function saveConfig(config) {
   writeJsonFile(CONFIG_PATH, config);
}

function loadModelsConfig() {
   return readJsonFile(MODELS_CONFIG_PATH, { models: {} });
}

function saveModelsConfig(config) {
   writeJsonFile(MODELS_CONFIG_PATH, config);
}

function buildTools() {
   ensureJsonFile(SKILLS_CONFIG_PATH, { skills: [] });

   const stats = fs.statSync(SKILLS_CONFIG_PATH);
   if (toolSchemaCache.mtimeMs === stats.mtimeMs) {
      return cloneJson(toolSchemaCache.tools);
   }

   const skillsConfig = readJsonFile(SKILLS_CONFIG_PATH, { skills: [] });
   const tools = skillsConfig.skills.map(skill => ({
      type: 'function',
      function: {
         name: skill.name,
         description: `${skill.description}。${skill.when_to_use}`,
         parameters: {
            type: 'object',
            properties: skill.parameters.reduce((acc, parameter) => {
               acc[parameter.name] = { type: parameter.type, description: parameter.description };
               return acc;
            }, {}),
            required: skill.parameters
               .filter(parameter => !parameter.description.includes('可选'))
               .map(parameter => parameter.name)
         }
      }
   }));

   toolSchemaCache.mtimeMs = stats.mtimeMs;
   toolSchemaCache.tools = cloneJson(tools);
   return cloneJson(tools);
}

function serializeConfig(config) {
   return {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : '',
      currentModel: config.currentModel,
      availableModels: config.availableModels
   };
}

module.exports = {
   ensureConfig,
   loadConfig,
   saveConfig,
   loadModelsConfig,
   saveModelsConfig,
   buildTools,
   serializeConfig
};

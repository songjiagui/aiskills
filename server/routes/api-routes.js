const express = require('express');
const crypto = require('crypto');
const skillManager = require('../../skills/index');
const { sessions, activeRequests } = require('../state');
const {
   loadConfig,
   saveConfig,
   loadModelsConfig,
   saveModelsConfig,
   serializeConfig
} = require('../services/config-service');
const {
   createInitialMessages,
   getOrCreateSession,
   executeChat,
   streamChatSession,
   writeStreamEvent
} = require('../services/chat-service');

const router = express.Router();

router.get('/health', (req, res) => {
   const config = loadConfig();
   res.json({
      success: true,
      status: 'ok',
      sessionCount: sessions.size,
      config: serializeConfig(config)
   });
});

router.post('/session', (req, res) => {
   const sessionId = crypto.randomUUID();
   sessions.set(sessionId, createInitialMessages());
   res.json({ success: true, sessionId });
});

router.get('/config', (req, res) => {
   const config = loadConfig();
   res.json({ success: true, config: serializeConfig(config) });
});

router.get('/servers', async (req, res) => {
   try {
      const result = await skillManager.executeSkill('list_servers', {});
      res.json({
         success: result.success !== false,
         servers: result.servers || [],
         message: result.message || ''
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

router.post('/model', (req, res) => {
   const { model } = req.body || {};
   const normalizedModel = typeof model === 'string' ? model.trim() : '';

   if (!normalizedModel) {
      res.status(400).json({ success: false, error: '模型名称不能为空' });
      return;
   }

   const config = loadConfig();
   if (!config.availableModels.includes(normalizedModel)) {
      config.availableModels.push(normalizedModel);
   }
   config.currentModel = normalizedModel;

   const modelsConfig = loadModelsConfig();
   if (modelsConfig.models && modelsConfig.models[normalizedModel]) {
      const modelConfig = modelsConfig.models[normalizedModel];
      if (modelConfig.apiUrl) config.apiUrl = modelConfig.apiUrl;
      if (modelConfig.apiKey) config.apiKey = modelConfig.apiKey;
   }

   saveConfig(config);

   res.json({
      success: true,
      message: `已切换到模型: ${normalizedModel}`,
      config: serializeConfig(config)
   });
});

router.post('/models/add', (req, res) => {
   const { model, apiUrl, apiKey } = req.body || {};
   const normalizedModel = typeof model === 'string' ? model.trim() : '';

   if (!normalizedModel) {
      res.status(400).json({ success: false, error: '模型名称不能为空' });
      return;
   }

   const config = loadConfig();
   if (config.availableModels.includes(normalizedModel)) {
      res.json({
         success: false,
         message: `模型已存在: ${normalizedModel}`,
         config: serializeConfig(config)
      });
      return;
   }

   config.availableModels.push(normalizedModel);

   if (apiUrl || apiKey) {
      const modelsConfig = loadModelsConfig();
      modelsConfig.models[normalizedModel] = {
         apiUrl: apiUrl || config.apiUrl,
         apiKey: apiKey || config.apiKey
      };
      saveModelsConfig(modelsConfig);
   }

   saveConfig(config);

   res.json({
      success: true,
      message: `模型已添加: ${normalizedModel}`,
      config: serializeConfig(config)
   });
});

router.post('/models/delete', (req, res) => {
   const { model } = req.body || {};
   const normalizedModel = typeof model === 'string' ? model.trim() : '';

   if (!normalizedModel) {
      res.status(400).json({ success: false, error: '模型名称不能为空' });
      return;
   }

   const config = loadConfig();
   const modelIndex = config.availableModels.indexOf(normalizedModel);

   if (modelIndex === -1) {
      res.status(404).json({ success: false, error: `模型不存在: ${normalizedModel}` });
      return;
   }

   if (config.currentModel === normalizedModel) {
      res.status(400).json({ success: false, error: '不能删除当前正在使用的模型' });
      return;
   }

   config.availableModels.splice(modelIndex, 1);
   saveConfig(config);

   res.json({
      success: true,
      message: `模型已删除: ${normalizedModel}`,
      config: serializeConfig(config)
   });
});

router.get('/models', (req, res) => {
   const config = loadConfig();
   res.json({
      success: true,
      models: config.availableModels,
      currentModel: config.currentModel
   });
});

router.get('/models/:modelName/config', (req, res) => {
   const modelName = req.params.modelName;

   try {
      const modelsConfig = loadModelsConfig();
      if (modelsConfig.models && modelsConfig.models[modelName]) {
         res.json({
            success: true,
            config: modelsConfig.models[modelName]
         });
         return;
      }

      const config = loadConfig();
      res.json({
         success: true,
         config: {
            apiUrl: config.apiUrl,
            apiKey: config.apiKey
         }
      });
   } catch (error) {
      res.status(500).json({ success: false, error: '获取模型配置失败' });
   }
});

router.post('/models/:modelName/config', (req, res) => {
   const modelName = req.params.modelName;
   const { apiUrl, apiKey } = req.body || {};

   try {
      const modelsConfig = loadModelsConfig();
      if (!modelsConfig.models[modelName]) {
         modelsConfig.models[modelName] = {};
      }

      if (apiUrl) modelsConfig.models[modelName].apiUrl = apiUrl;
      if (apiKey) modelsConfig.models[modelName].apiKey = apiKey;

      saveModelsConfig(modelsConfig);

      res.json({
         success: true,
         message: `模型配置已更新: ${modelName}`
      });
   } catch (error) {
      res.status(500).json({ success: false, error: '更新模型配置失败' });
   }
});

router.post('/config/api', (req, res) => {
   const { apiUrl, apiKey } = req.body || {};

   if (!apiUrl && !apiKey) {
      res.status(400).json({ success: false, error: '至少需要提供 apiUrl 或 apiKey' });
      return;
   }

   try {
      const config = loadConfig();
      if (apiUrl) config.apiUrl = apiUrl;
      if (apiKey) config.apiKey = apiKey;
      saveConfig(config);

      res.json({
         success: true,
         message: 'API 配置已更新',
         config: serializeConfig(config)
      });
   } catch (error) {
      res.status(500).json({ success: false, error: '更新 API 配置失败' });
   }
});

router.post('/servers/stop', async (req, res) => {
   const payload = {};
   if (typeof req.body?.serverId === 'string' && req.body.serverId.trim()) {
      payload.serverId = req.body.serverId.trim();
   }
   if (Number.isFinite(req.body?.pid)) {
      payload.pid = req.body.pid;
   }
   if (Number.isFinite(req.body?.port)) {
      payload.port = req.body.port;
   }

   if (Object.keys(payload).length === 0) {
      res.status(400).json({ success: false, error: '请提供 serverId、pid 或 port 之一' });
      return;
   }

   try {
      const result = await skillManager.executeSkill('stop_server', payload);
      res.status(result.success === false ? 500 : 200).json(result);
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

router.post('/chat/stop', (req, res) => {
   const { sessionId } = req.body || {};

   if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ success: false, error: 'sessionId 不能为空' });
      return;
   }

   if (!activeRequests.has(sessionId)) {
      res.json({ success: false, message: '当前没有正在进行的请求' });
      return;
   }

   const request = activeRequests.get(sessionId);
   request.isActive = false;
   request.abortController.abort();

   res.json({ success: true, message: '已发送停止信号' });
});

router.post('/chat', async (req, res) => {
   const userMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
   if (!userMessage) {
      res.status(400).json({ success: false, error: 'message 不能为空' });
      return;
   }

   const { sessionId, messages } = getOrCreateSession(req.body?.sessionId);
   messages.push({ role: 'user', content: userMessage });

   try {
      const config = loadConfig();
      const result = await executeChat(messages, config);
      res.json({
         success: true,
         sessionId,
         reply: result.reply,
         traces: result.traces,
         model: config.currentModel
      });
   } catch (error) {
      messages.pop();
      res.status(500).json({
         success: false,
         sessionId,
         error: error.message
      });
   }
});

router.post('/chat/stream', async (req, res) => {
   const userMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
   if (!userMessage) {
      res.status(400).json({ success: false, error: 'message 不能为空' });
      return;
   }

   const { sessionId, messages } = getOrCreateSession(req.body?.sessionId);
   messages.push({ role: 'user', content: userMessage });

   res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
   });

   writeStreamEvent(res, {
      type: 'session',
      stage: 'created',
      sessionId,
      progress: 1
   });

   try {
      const config = loadConfig();
      await streamChatSession(messages, config, res, sessionId);
   } catch (error) {
      messages.pop();
      writeStreamEvent(res, {
         type: 'error',
         sessionId,
         error: error.message,
         progress: 100
      });
   } finally {
      res.end();
   }
});

module.exports = router;

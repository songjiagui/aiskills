const crypto = require('crypto');
const skillManager = require('../../skills/index');
const { SYSTEM_PROMPT } = require('../constants');
const { sessions, activeRequests } = require('../state');
const { buildTools } = require('./config-service');

function createInitialMessages() {
   return [{ role: 'system', content: SYSTEM_PROMPT }];
}

function getOrCreateSession(sessionId) {
   if (sessionId && sessions.has(sessionId)) {
      return { sessionId, messages: sessions.get(sessionId) };
   }

   const nextSessionId = crypto.randomUUID();
   const messages = createInitialMessages();
   sessions.set(nextSessionId, messages);
   return { sessionId: nextSessionId, messages };
}

function createEmptyAssistantMessage() {
   return {
      role: 'assistant',
      content: '',
      tool_calls: []
   };
}

function ensureToolCall(message, index) {
   while (message.tool_calls.length <= index) {
      message.tool_calls.push({
         id: '',
         type: 'function',
         function: {
            name: '',
            arguments: ''
         }
      });
   }

   return message.tool_calls[index];
}

function parseSseEvents(buffer) {
   const segments = buffer.split('\n\n');
   const remainder = segments.pop() || '';
   const events = [];

   for (const segment of segments) {
      const lines = segment
         .split('\n')
         .map(line => line.trim())
         .filter(Boolean);

      const dataLines = lines
         .filter(line => line.startsWith('data:'))
         .map(line => line.slice(5).trim());

      if (dataLines.length > 0) {
         events.push(dataLines.join('\n'));
      }
   }

   return { events, remainder };
}

async function requestModel(messages, config, stream, abortSignal) {
   const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
         model: config.currentModel,
         messages,
         tools: buildTools(),
         tool_choice: 'auto',
         reasoning_effort: 'high',
         stream
      }),
      signal: abortSignal
   });

   if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`模型接口调用失败(${response.status}): ${errorText}`);
   }

   return response;
}

async function streamModelResponse(messages, config, hooks = {}, abortSignal = null) {
   const response = await requestModel(messages, config, true, abortSignal);

   if (!response.body) {
      throw new Error('模型流式响应不可用');
   }

   const reader = response.body.getReader();
   const decoder = new TextDecoder('utf-8');
   const assistantMessage = createEmptyAssistantMessage();
   let buffer = '';

   while (true) {
      const { done, value } = await reader.read();
      if (done) {
         break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseEvents(buffer);
      buffer = parsed.remainder;

      for (const rawEvent of parsed.events) {
         if (!rawEvent || rawEvent === '[DONE]') {
            continue;
         }

         let payload;
         try {
            payload = JSON.parse(rawEvent);
         } catch (error) {
            continue;
         }

         const delta = payload.choices?.[0]?.delta;
         if (!delta) {
            continue;
         }

         if (typeof delta.content === 'string' && delta.content) {
            assistantMessage.content += delta.content;
            if (hooks.onContent) {
               hooks.onContent(delta.content, assistantMessage.content);
            }
         }

         if (Array.isArray(delta.tool_calls)) {
            for (const toolChunk of delta.tool_calls) {
               const index = toolChunk.index ?? 0;
               const target = ensureToolCall(assistantMessage, index);
               if (toolChunk.id) {
                  target.id = toolChunk.id;
               }
               if (toolChunk.type) {
                  target.type = toolChunk.type;
               }
               if (toolChunk.function?.name) {
                  target.function.name += toolChunk.function.name;
               }
               if (toolChunk.function?.arguments) {
                  target.function.arguments += toolChunk.function.arguments;
               }
            }
         }
      }
   }

   if (buffer.trim()) {
      const parsed = parseSseEvents(`${buffer}\n\n`);
      for (const rawEvent of parsed.events) {
         if (!rawEvent || rawEvent === '[DONE]') {
            continue;
         }

         let payload;
         try {
            payload = JSON.parse(rawEvent);
         } catch (error) {
            continue;
         }

         const delta = payload.choices?.[0]?.delta;
         if (!delta) {
            continue;
         }

         if (typeof delta.content === 'string' && delta.content) {
            assistantMessage.content += delta.content;
            if (hooks.onContent) {
               hooks.onContent(delta.content, assistantMessage.content);
            }
         }
      }
   }

   assistantMessage.tool_calls = assistantMessage.tool_calls.filter(toolCall =>
      toolCall.id || toolCall.function.name || toolCall.function.arguments
   );

   return assistantMessage;
}

async function executeToolCalls(toolCalls, messages, traces) {
   for (const toolCall of toolCalls) {
      const skillName = toolCall.function.name;
      let params = {};

      try {
         params = JSON.parse(toolCall.function.arguments || '{}');
      } catch (error) {
         const parseError = `参数解析失败: ${error.message}`;
         traces.push({ type: 'tool_error', skillName, error: parseError });
         messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, error: parseError })
         });
         continue;
      }

      const trace = { type: 'tool_call', skillName, params };

      try {
         const result = await skillManager.executeSkill(skillName, params);
         trace.result = result;
         traces.push(trace);
         messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
         });
      } catch (error) {
         const result = { success: false, error: error.message };
         trace.result = result;
         traces.push(trace);
         messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
         });
      }
   }
}

async function executeChat(messages, config) {
   const traces = [];
   let finalReply = '';
   let continueLoop = true;

   while (continueLoop) {
      const response = await requestModel(messages, config, false, null);
      const data = await response.json();
      const message = data.choices?.[0]?.message;

      if (!message) {
         throw new Error('未收到模型响应');
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
         messages.push(message);
         await executeToolCalls(message.tool_calls, messages, traces);
         continue;
      }

      finalReply = message.content || '';
      if (finalReply) {
         messages.push({ role: 'assistant', content: finalReply });
      }
      continueLoop = false;
   }

   return { reply: finalReply, traces };
}

function writeStreamEvent(res, event) {
   res.write(`${JSON.stringify(event)}\n`);
}

async function streamChatSession(messages, config, res, sessionId = null) {
   const traces = [];
   let finalReply = '';
   let continueLoop = true;
   let iteration = 0;
   let totalToolsExecuted = 0;

   const abortController = new AbortController();
   if (sessionId) {
      activeRequests.set(sessionId, { abortController, isActive: true });
   }

   const cleanup = () => {
      if (sessionId && activeRequests.has(sessionId)) {
         activeRequests.delete(sessionId);
      }
   };

   try {
      writeStreamEvent(res, {
         type: 'session',
         stage: 'start',
         progress: 5,
         model: config.currentModel
      });

      while (continueLoop) {
         if (!activeRequests.has(sessionId) || activeRequests.get(sessionId)?.isActive === false) {
            writeStoppedEvent(res, finalReply, traces);
            cleanup();
            return;
         }

         iteration += 1;
         writeStreamEvent(res, {
            type: 'status',
            stage: 'model',
            progress: Math.min(15 + iteration * 5, 35),
            message: '模型正在生成响应'
         });

         let assistantMessage;
         try {
            assistantMessage = await streamModelResponse(messages, config, {
               onContent(chunk) {
                  writeStreamEvent(res, {
                     type: 'content',
                     chunk,
                     progress: Math.min(45, 20 + iteration * 10)
                  });
               }
            }, abortController.signal);
         } catch (error) {
            if (error.name === 'AbortError') {
               writeStoppedEvent(res, finalReply, traces);
               cleanup();
               return;
            }
            throw error;
         }

         if (assistantMessage.tool_calls.length > 0) {
            messages.push(assistantMessage);
            writeStreamEvent(res, {
               type: 'status',
               stage: 'tools',
               progress: 55,
               message: `准备执行 ${assistantMessage.tool_calls.length} 个工具`
            });

            for (const [index, toolCall] of assistantMessage.tool_calls.entries()) {
               if (!activeRequests.has(sessionId) || activeRequests.get(sessionId)?.isActive === false) {
                  writeStoppedEvent(res, finalReply, traces);
                  cleanup();
                  return;
               }

               const skillName = toolCall.function.name;
               let params = {};

               try {
                  params = JSON.parse(toolCall.function.arguments || '{}');
               } catch (error) {
                  const parseError = `参数解析失败: ${error.message}`;
                  traces.push({ type: 'tool_error', skillName, error: parseError });
                  messages.push({
                     role: 'tool',
                     tool_call_id: toolCall.id,
                     content: JSON.stringify({ success: false, error: parseError })
                  });
                  writeStreamEvent(res, {
                     type: 'tool',
                     stage: 'error',
                     skillName,
                     params: toolCall.function.arguments || '',
                     error: parseError,
                     progress: 60
                  });
                  continue;
               }

               writeStreamEvent(res, {
                  type: 'tool',
                  stage: 'start',
                  skillName,
                  params,
                  progress: Math.min(60 + index * 8, 82)
               });

               const trace = { type: 'tool_call', skillName, params };
               let result;
               try {
                  result = await skillManager.executeSkill(skillName, params);
               } catch (error) {
                  result = { success: false, error: error.message };
               }

               trace.result = result;
               traces.push(trace);
               totalToolsExecuted += 1;

               messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result)
               });

               writeStreamEvent(res, {
                  type: 'tool',
                  stage: 'end',
                  skillName,
                  params,
                  result,
                  progress: Math.min(68 + (index + 1) * 10, 88)
               });
            }

            continue;
         }

         finalReply = assistantMessage.content || '';
         if (finalReply) {
            messages.push({ role: 'assistant', content: finalReply });
         }

         writeStreamEvent(res, {
            type: 'status',
            stage: 'complete',
            progress: 100,
            message: totalToolsExecuted > 0 ? '流程已完成，工具执行结果已汇总' : '响应生成完成'
         });

         writeStreamEvent(res, {
            type: 'done',
            reply: finalReply,
            traces,
            progress: 100
         });

         continueLoop = false;
      }
   } finally {
      cleanup();
   }
}

function writeStoppedEvent(res, finalReply, traces) {
   writeStreamEvent(res, {
      type: 'status',
      stage: 'stopped',
      progress: 100,
      message: '请求已被用户手动停止'
   });
   writeStreamEvent(res, {
      type: 'done',
      reply: finalReply || '请求已停止',
      traces,
      progress: 100,
      stopped: true
   });
}

module.exports = {
   createInitialMessages,
   getOrCreateSession,
   executeChat,
   streamChatSession,
   writeStreamEvent
};

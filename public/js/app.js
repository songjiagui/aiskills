/**
 * AI Assistant Frontend - Main Application
 */

// Global state
const state = {
  sessionId: '',
  config: null,
  sending: false
};

// Configure marked.js
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.warn('代码高亮失败:', err);
      }
    }
    return hljs.highlightAuto(code).value;
  }
});

// DOM Elements
const elements = {
  apiUrl: document.getElementById('api-url'),
  modelSelect: document.getElementById('model-select'),
  saveModel: document.getElementById('save-model'),
  newSession: document.getElementById('new-session'),
  refreshConfig: document.getElementById('refresh-config'),
  refreshServers: document.getElementById('refresh-servers'),
  stopAllServers: document.getElementById('stop-all-servers'),
  themeToggle: document.getElementById('theme-toggle'),
  openSettings: document.getElementById('open-settings'),
  closeSettings: document.getElementById('close-settings'),
  settingsModal: document.getElementById('settings-modal'),
  status: document.getElementById('status'),
  serverList: document.getElementById('server-list'),
  sessionMeta: document.getElementById('session-meta'),
  modelMeta: document.getElementById('model-meta'),
  messages: document.getElementById('messages'),
  chatForm: document.getElementById('chat-form'),
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-button'),
  stopButton: document.getElementById('stop-button'),
  lightbox: document.getElementById('image-lightbox'),
  lightboxImg: document.getElementById('image-lightbox-img'),
  logoutBtn: document.getElementById('logout-btn'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  // Model management elements
  newModelInput: document.getElementById('new-model-input'),
  newModelApiUrl: document.getElementById('new-model-api-url'),
  newModelApiKey: document.getElementById('new-model-api-key'),
  addModelBtn: document.getElementById('add-model-btn'),
  modelsList: document.getElementById('models-list'),
  // API Config elements (now in settings)
  apiConfigUrl: document.getElementById('api-config-url'),
  apiKeyConfig: document.getElementById('api-config-key'),
  saveApiConfig: document.getElementById('save-api-config')
};

// ========== Mobile Sidebar Toggle ==========

function openSidebar() {
  if (elements.sidebar) {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  if (elements.sidebar) {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function toggleSidebar() {
  if (elements.sidebar && elements.sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

if (elements.mobileMenuBtn) {
  elements.mobileMenuBtn.addEventListener('click', toggleSidebar);
}

if (elements.sidebarOverlay) {
  elements.sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking on sidebar links/buttons
if (elements.sidebar) {
  const sidebarButtons = elements.sidebar.querySelectorAll('button');
  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Only close on mobile screens
      if (window.innerWidth <= 920) {
        closeSidebar();
      }
    });
  });
}

// Close sidebar on window resize if switching to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 920) {
    closeSidebar();
  }
});

// Prevent body scroll when sidebar is open
document.addEventListener('touchmove', (e) => {
  if (elements.sidebar && elements.sidebar.classList.contains('open')) {
    const target = e.target;
    const isSidebar = elements.sidebar.contains(target);
    if (!isSidebar) {
      e.preventDefault();
    }
  }
}, { passive: false });

// ========== Image Lightbox ==========

function openLightbox(src) {
  elements.lightboxImg.src = src;
  elements.lightbox.classList.add('open');
}

function closeLightbox() {
  elements.lightbox.classList.remove('open');
}

elements.lightbox.addEventListener('click', (e) => {
  if (e.target !== elements.lightboxImg) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Global function: click image to open lightbox
window.handleImageClick = function(e) {
  if (e.target.tagName === 'IMG') {
    openLightbox(e.target.src);
  }
};

elements.messages.addEventListener('click', window.handleImageClick);
elements.serverList && elements.serverList.addEventListener('click', window.handleImageClick);

// ========== Theme Management ==========

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const hljsLight = document.getElementById('hljs-light');
  const hljsDark = document.getElementById('hljs-dark');
  if (theme === 'dark') {
    hljsLight.disabled = true;
    hljsDark.disabled = false;
    elements.themeToggle.textContent = '☼️';
    elements.themeToggle.title = '切换到亮色模式';
  } else {
    hljsLight.disabled = false;
    hljsDark.disabled = true;
    elements.themeToggle.textContent = '☽';
    elements.themeToggle.title = '切换到暗色模式';
  }
}

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

let isTransitioning = false;

elements.themeToggle.addEventListener('click', (e) => {
  if (isTransitioning) return;
  isTransitioning = true;

  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  const rect = elements.themeToggle.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  const overlay = document.createElement('div');
  overlay.className = 'theme-transition-overlay';
  overlay.style.setProperty('--start-x', `${startX}px`);
  overlay.style.setProperty('--start-y', `${startY}px`);
  overlay.style.backgroundColor = newTheme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  const handleAnimationEnd = () => {
    setTheme(newTheme);
    overlay.removeEventListener('animationend', handleAnimationEnd);

    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    setTimeout(() => {
      overlay.remove();
      isTransitioning = false;
    }, 200);
  };

  overlay.addEventListener('animationend', handleAnimationEnd);
});

// ========== Settings Modal ==========

function openSettings() {
  elements.settingsModal.classList.add('open');
}

function closeSettings() {
  elements.settingsModal.classList.remove('open');
}

elements.openSettings.addEventListener('click', openSettings);
elements.closeSettings.addEventListener('click', closeSettings);

elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) {
    closeSettings();
  }
});

// Tab switching with new nav items
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    
    // Remove active class from all nav items
    navItems.forEach(nav => nav.classList.remove('active'));
    // Remove active class from all tab contents
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked nav item
    item.classList.add('active');
    // Show corresponding tab content
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  });
});

// Theme selection handling
const themeOptions = document.querySelectorAll('.theme-option');
themeOptions.forEach(option => {
  const radio = option.querySelector('input[type="radio"]');
  const label = option.querySelector('.theme-card-label');
  
  label.addEventListener('click', () => {
    const theme = option.dataset.theme;
    setTheme(theme);
    
    // Update radio buttons
    document.querySelectorAll('input[name="theme"]').forEach(r => r.checked = false);
    radio.checked = true;
  });
});

// Set initial theme selection based on current theme
function updateThemeSelection() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  document.querySelectorAll('input[name="theme"]').forEach(r => {
    r.checked = r.value === currentTheme;
  });
}

// Update theme selection when settings modal is opened
const originalOpenSettings = openSettings;
openSettings = function() {
  originalOpenSettings();
  updateThemeSelection();
};

// ESC to close settings modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSettings();
  }
});

// Save API Config from settings page
elements.saveApiConfig.addEventListener('click', async () => {
  const apiUrl = elements.apiConfigUrl.value.trim();
  const apiKey = elements.apiKeyConfig.value.trim();

  if (!apiUrl && !apiKey) {
    setStatus('至少需要填写接口地址或API密钥之一', true);
    return;
  }

  try {
    await request('/api/config/api', {
      method: 'POST',
      body: JSON.stringify({ apiUrl, apiKey })
    });
    setStatus('API 配置已更新');
    
    // Clear the API key field for security
    elements.apiKeyConfig.value = '';
    
    await loadConfig();
  } catch (error) {
    setStatus(error.message, true);
  }
});

// ========== Status & UI Helpers ==========

function setStatus(text, isError = false) {
  elements.status.textContent = text;
  elements.status.style.background = isError ? '#fde7e7' : '';
  elements.status.style.color = isError ? '#8a1c1c' : '';
}

function setSending(sending) {
  state.sending = sending;
  elements.sendButton.style.display = sending ? 'none' : 'block';
  elements.stopButton.style.display = sending ? 'block' : 'none';
  elements.messageInput.disabled = sending;
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  });
}

function formatTime() {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ========== Trace / Flow Rendering ==========

function createFlowSection(traces = []) {
  const wrapper = document.createElement('div');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'flow-toggle';
  toggle.textContent = traces.length ? `查看流程 (${traces.length})` : '查看流程';

  const panel = document.createElement('div');
  panel.className = 'flow-panel';

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(panel);

  traces.forEach(trace => appendTrace(panel, trace));
  return { wrapper, toggle, panel };
}

function appendTrace(container, trace) {
  const block = document.createElement('div');
  block.className = 'trace';
  const title = document.createElement('div');
  title.className = 'trace-title';
  title.textContent = `技能调用: ${trace.skillName}`;

  const table = document.createElement('table');
  table.className = 'trace-table';

  const tbody = document.createElement('tbody');

  const paramsRow = createTraceRow('参数', trace.params);
  tbody.appendChild(paramsRow);

  const resultData = trace.result || trace.error || {};
  const resultRow = createTraceRow('结果', resultData, true);
  tbody.appendChild(resultRow);

  table.appendChild(tbody);
  block.appendChild(title);
  block.appendChild(table);
  container.appendChild(block);
}

function createTraceRow(label, data, collapsible = false) {
  const row = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = label;
  row.appendChild(th);

  const td = document.createElement('td');
  td.className = 'trace-data';

  // Helper: check if a string contains markdown image syntax
  function containsMarkdown(str) {
    return typeof str === 'string' && /\!\[.*?\]\(.*?\)/.test(str);
  }

  // Helper: render value as markdown if it contains image syntax
  function renderValue(value) {
    if (typeof value === 'string' && containsMarkdown(value)) {
      const div = document.createElement('div');
      div.innerHTML = marked.parse(value);
      return div;
    }
    const span = document.createElement('span');
    span.className = 'trace-value';
    span.textContent = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    span.title = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return span;
  }

  if (typeof data === 'object' && data !== null) {
    const flexContainer = document.createElement('div');
    flexContainer.className = 'trace-flex';

    if (collapsible) {
      const contentWrapper = document.createElement('div');
      contentWrapper.style.width = '100%';

      const traceContent = document.createElement('div');
      traceContent.className = 'trace-content';

      Object.entries(data).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'trace-flex-item';

        const keySpan = document.createElement('span');
        keySpan.className = 'trace-key';
        keySpan.textContent = key;

        const valueEl = renderValue(value);
        if (valueEl.classList) {
          valueEl.classList.add('trace-value');
        }

        item.appendChild(keySpan);
        item.appendChild(valueEl);
        traceContent.appendChild(item);
      });

      contentWrapper.appendChild(traceContent);

      const needsExpand = traceContent.scrollHeight > 120;

      if (needsExpand) {
        const expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'expand-button';
        expandButton.textContent = '展开';

        expandButton.addEventListener('click', () => {
          const isExpanded = traceContent.classList.toggle('expanded');
          expandButton.classList.toggle('expanded');
          expandButton.textContent = isExpanded ? '收起' : '展开';
        });

        contentWrapper.appendChild(expandButton);
      }

      flexContainer.appendChild(contentWrapper);
    } else {
      Object.entries(data).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'trace-flex-item';

        const keySpan = document.createElement('span');
        keySpan.className = 'trace-key';
        keySpan.textContent = key;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'trace-value';
        valueSpan.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
        valueSpan.title = typeof value === 'object' ? JSON.stringify(value) : String(value);

        item.appendChild(keySpan);
        item.appendChild(valueSpan);
        flexContainer.appendChild(item);
      });
    }

    td.appendChild(flexContainer);
  } else {
    if (collapsible) {
      const contentWrapper = document.createElement('div');
      contentWrapper.style.width = '100%';

      const traceContent = document.createElement('div');
      traceContent.className = 'trace-content';
      traceContent.textContent = String(data);

      contentWrapper.appendChild(traceContent);

      const needsExpand = String(data).length > 200;

      if (needsExpand) {
        const expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'expand-button';
        expandButton.textContent = '展开';

        expandButton.addEventListener('click', () => {
          const isExpanded = traceContent.classList.toggle('expanded');
          expandButton.classList.toggle('expanded');
          expandButton.textContent = isExpanded ? '收起' : '展开';
        });

        contentWrapper.appendChild(expandButton);
      }

      td.appendChild(contentWrapper);
    } else {
      td.textContent = String(data);
    }
  }

  row.appendChild(td);
  return row;
}

// ========== Message Handling ==========

function appendMessage(role, content, traces = []) {
  const item = document.createElement('article');
  item.className = `message ${role}`;

  const body = document.createElement('div');
  body.className = 'message-body';
  body.innerHTML = role === 'user' || role === 'system'
    ? marked.parse(content)
    : '';

  item.appendChild(body);

  let flowSection = null;
  if (role === 'assistant') {
    flowSection = createFlowSection(traces);
    item.appendChild(flowSection.wrapper);
  }

  elements.messages.appendChild(item);
  scrollMessagesToBottom();
  return { item, body, flowSection };
}

function createStreamingAssistantMessage() {
  return appendMessage('assistant', '', []);
}

// ========== Streaming Chat ==========

async function streamChat(message) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: state.sessionId,
      message
    })
  });

  if (!response.ok || !response.body) {
    let errorMessage = '流式请求失败';
    try {
      const data = await response.json();
      errorMessage = data.error || data.message || errorMessage;
    } catch (error) {
      // Ignore parse errors and keep fallback message.
    }
    throw new Error(errorMessage);
  }

  const assistantMessage = createStreamingAssistantMessage();
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalReply = '';
  let isStopped = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const event = JSON.parse(trimmed);
      if (event.sessionId) {
        state.sessionId = event.sessionId;
        elements.sessionMeta.textContent = `Session: ${state.sessionId}`;
      }

      if (event.type === 'content') {
        finalReply += event.chunk || '';
        assistantMessage.body.innerHTML = marked.parse(finalReply);
        scrollMessagesToBottom();
      }

      if (event.type === 'tool' && assistantMessage.flowSection) {
        if (event.stage === 'end' || event.stage === 'error') {
          appendTrace(assistantMessage.flowSection.panel, {
            skillName: event.skillName,
            params: event.params,
            result: event.result,
            error: event.error
          });
          const count = assistantMessage.flowSection.panel.children.length;
          assistantMessage.flowSection.toggle.textContent = `查看流程 (${count})`;
          scrollMessagesToBottom();
        }
      }

      if (event.type === 'done') {
        finalReply = event.reply || finalReply;
        isStopped = event.stopped || false;
        assistantMessage.body.innerHTML = marked.parse(finalReply || '模型未返回文本内容。');
        if (assistantMessage.flowSection && Array.isArray(event.traces)) {
          assistantMessage.flowSection.panel.innerHTML = '';
          event.traces.forEach(trace => appendTrace(assistantMessage.flowSection.panel, trace));
          assistantMessage.flowSection.toggle.textContent = `查看流程 (${event.traces.length})`;
        }
        scrollMessagesToBottom();
      }

      if (event.type === 'error') {
        throw new Error(event.error || '流式请求失败');
      }
    }
  }

  if (isStopped) {
    return { stopped: true };
  }
}

// ========== API Helpers ==========

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || '请求失败');
  }
  return data;
}

async function loadConfig() {
  const data = await request('/api/config');
  state.config = data.config;

  elements.apiUrl.value = data.config.apiUrl;
  
  // Update the new API URL display element
  const apiUrlDisplay = document.getElementById('api-url-display');
  if (apiUrlDisplay) {
    apiUrlDisplay.textContent = data.config.apiUrl;
  }
  
  elements.modelMeta.textContent = `当前模型: ${data.config.currentModel}`;

  const models = data.config.availableModels || [];
  elements.modelSelect.innerHTML = '';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    if (model === data.config.currentModel) {
      option.selected = true;
    }
    elements.modelSelect.appendChild(option);
  });

  // Render models list in the management UI
  renderModelsList(models, data.config.currentModel);
}

function renderModelsList(models, currentModel) {
  elements.modelsList.innerHTML = '';

  if (!models || models.length === 0) {
    elements.modelsList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--muted);">暂无可用模型</div>';
    return;
  }

  models.forEach(model => {
    const item = document.createElement('div');
    item.className = `model-item${model === currentModel ? ' current' : ''}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'model-name';
    nameSpan.textContent = model;
    item.appendChild(nameSpan);

    if (model === currentModel) {
      const badge = document.createElement('span');
      badge.className = 'current-badge';
      badge.textContent = '当前';
      item.appendChild(badge);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'model-actions';

    // Add config button for all models
    const configBtn = document.createElement('button');
    configBtn.type = 'button';
    configBtn.className = 'model-btn model-btn-config';
    configBtn.textContent = '配置';
    
    configBtn.addEventListener('click', async () => {
      // Load model config
      try {
        const modelConfigData = await request(`/api/models/${encodeURIComponent(model)}/config`);
        const modelConfig = modelConfigData.config;

        // Switch to API tab and fill in the form
        const apiTab = document.querySelector('[data-tab="api"]');
        if (apiTab) {
          apiTab.click();
        }

        // Set the values
        elements.apiConfigUrl.value = modelConfig.apiUrl || '';
        elements.apiKeyConfig.value = '';

        // Override save to save for this specific model
        const saveHandler = async () => {
          const apiUrl = elements.apiConfigUrl.value.trim();
          const apiKey = elements.apiKeyConfig.value.trim();

          if (!apiUrl && !apiKey) {
            setStatus('至少需要填写接口地址或API密钥之一', true);
            return;
          }

          try {
            await request(`/api/models/${encodeURIComponent(model)}/config`, {
              method: 'POST',
              body: JSON.stringify({ apiUrl, apiKey })
            });
            setStatus(`模型 ${model} 配置已更新`);
            await loadConfig();
          } catch (error) {
            setStatus(error.message, true);
          }
        };

        elements.saveApiConfig.onclick = saveHandler;
      } catch (error) {
        setStatus('获取模型配置失败: ' + error.message, true);
      }
    });
    actionsDiv.appendChild(configBtn);

    // Don't show delete button for current model
    if (model !== currentModel) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'model-btn model-btn-delete';
      deleteBtn.textContent = '删除';
      
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`确定要删除模型 "${model}" 吗？`)) {
          try {
            await request('/api/models/delete', {
              method: 'POST',
              body: JSON.stringify({ model })
            });
            setStatus(`模型已删除: ${model}`);
            await loadConfig();
          } catch (error) {
            setStatus(error.message, true);
          }
        }
      });
      actionsDiv.appendChild(deleteBtn);
    }

    item.appendChild(actionsDiv);
    elements.modelsList.appendChild(item);
  });
}

async function createSession() {
  const data = await request('/api/session', { method: 'POST', body: '{}' });
  state.sessionId = data.sessionId;
  elements.sessionMeta.textContent = `Session: ${state.sessionId}`;
  elements.messages.innerHTML = '';
}

// ========== Server Management ==========

function renderServers(servers) {
  elements.serverList.innerHTML = '';

  if (!servers.length) {
    const empty = document.createElement('div');
    empty.className = 'server-empty';
    empty.textContent = '没有运行中的后台服务。';
    elements.serverList.appendChild(empty);
    return;
  }

  servers.forEach(server => {
    const card = document.createElement('div');
    card.className = 'server-card';

    const title = document.createElement('strong');
    title.textContent = server.filename || server.id;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `ID: ${server.id} | PID: ${server.pid}${server.port ? ` | 端口: ${server.port}` : ''}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary';
    button.textContent = '关闭此服务';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await request('/api/servers/stop', {
          method: 'POST',
          body: JSON.stringify({ serverId: server.id })
        });
        setStatus(result.message || '服务已关闭。');
        await loadServers();
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        button.disabled = false;
      }
    });

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(button);
    elements.serverList.appendChild(card);
  });
}

async function loadServers() {
  const data = await request('/api/servers');
  renderServers(data.servers || []);
}

// ========== Initialization & Event Handlers ==========

async function initialize() {
  try {
    await loadConfig();
    await createSession();
    await loadServers();
    setStatus('服务已就绪，可以直接在当前网页发起请求。');
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.refreshConfig.addEventListener('click', async () => {
  try {
    await loadConfig();
    await loadServers();
    setStatus('配置已刷新。');
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.refreshServers.addEventListener('click', async () => {
  try {
    await loadServers();
    setStatus('服务列表已刷新。');
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.stopAllServers.addEventListener('click', async () => {
  try {
    const data = await request('/api/servers');
    const servers = data.servers || [];
    if (!servers.length) {
      setStatus('当前没有可关闭的后台服务。');
      return;
    }

    for (const server of servers) {
      await request('/api/servers/stop', {
        method: 'POST',
        body: JSON.stringify({ serverId: server.id })
      });
    }

    await loadServers();
    setStatus('后台服务已全部关闭。');
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.newSession.addEventListener('click', async () => {
  try {
    await createSession();
    setStatus('已创建新的网页会话。');
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.saveModel.addEventListener('click', async () => {
  try {
    const model = elements.modelSelect.value;
    const data = await request('/api/model', {
      method: 'POST',
      body: JSON.stringify({ model })
    });
    state.config = data.config;
    elements.modelMeta.textContent = `当前模型: ${data.config.currentModel}`;
    setStatus(data.message);
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.addModelBtn.addEventListener('click', async () => {
  const model = elements.newModelInput.value.trim();
  const apiUrl = elements.newModelApiUrl.value.trim();
  const apiKey = elements.newModelApiKey.value.trim();
  
  if (!model) {
    setStatus('请输入模型名称', true);
    return;
  }

  try {
    const data = await request('/api/models/add', {
      method: 'POST',
      body: JSON.stringify({ model, apiUrl, apiKey })
    });
    elements.newModelInput.value = '';
    elements.newModelApiUrl.value = '';
    elements.newModelApiKey.value = '';
    setStatus(data.message);
    await loadConfig();
  } catch (error) {
    setStatus(error.message, true);
  }
});

// Allow pressing Enter to add model
elements.newModelInput.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    elements.addModelBtn.click();
  }
});

elements.chatForm.addEventListener('submit', async event => {
  event.preventDefault();
  sendMessage();
});

elements.messageInput.addEventListener('keydown', async event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (state.sending) {
    return;
  }

  const message = elements.messageInput.value.trim();
  if (!message) {
    setStatus('请输入消息后再发送。', true);
    return;
  }

  appendMessage('user', message);
  elements.messageInput.value = '';
  setSending(true);
  setStatus('正在请求服务端...');

  try {
    const result = await streamChat(message);
    if (result && result.stopped) {
      setStatus('请求已被手动停止。');
    } else {
      setStatus('本次请求已完成。');
    }
  } catch (error) {
    appendMessage('system', `请求失败: ${error.message}`);
    setStatus(error.message, true);
  } finally {
    setSending(false);
  }
}

async function stopChat() {
  if (!state.sessionId) {
    return;
  }

  try {
    await request('/api/chat/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId: state.sessionId })
    });
    setStatus('已发送停止信号...');
  } catch (error) {
    // Ignore stop request error
  }
}

elements.stopButton.addEventListener('click', stopChat);

// ========== Logout ==========

elements.logoutBtn.addEventListener('click', async () => {
  try {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch (error) {
    // Force redirect even if logout fails
    window.location.href = '/login';
  }
});

// Start the app
initialize();

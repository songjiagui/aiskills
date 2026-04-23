const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const GENERATED_IMAGES_DIR = path.join(ROOT_DIR, 'generated_images');
const CONFIG_PATH = path.join(ROOT_DIR, 'assistant.config.json');
const MODELS_CONFIG_PATH = path.join(ROOT_DIR, 'models.json');
const SKILLS_CONFIG_PATH = path.join(ROOT_DIR, 'skills.json');
const USERS_FILE = path.join(ROOT_DIR, 'users.json');

const DEFAULT_CONFIG = {
   apiUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
   apiKey: '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',
   currentModel: 'nvidia/nemotron-3-super-120b-a12b',
   availableModels: [
      'nvidia/nemotron-3-super-120b-a12b',
      'granite4:tiny-h'
   ]
};

const SYSTEM_PROMPT = `你是智能助手，按以下流程处理用户请求：
【处理流程】
1. 分析用户请求，确定需要哪些步骤
2. 按顺序调用对应的技能工具
3. 每个技能执行后会返回结果

【重要规则】
- 多步骤任务(如"编写代码并运行测试")需要调用多个工具
- 先调用write_code编写代码，再调用run_code运行代码
- 将上一步的结果传递给下一步使用`;

module.exports = {
   ROOT_DIR,
   PUBLIC_DIR,
   GENERATED_IMAGES_DIR,
   CONFIG_PATH,
   MODELS_CONFIG_PATH,
   SKILLS_CONFIG_PATH,
   USERS_FILE,
   DEFAULT_CONFIG,
   SYSTEM_PROMPT
};

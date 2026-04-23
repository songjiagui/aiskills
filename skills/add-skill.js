const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname);
const SKILLS_CONFIG_PATH = path.join(__dirname, '..', 'skills.json');

module.exports = {
   name: 'add_skill',
   description: '动态添加新技能到系统中。可以创建新的技能文件并注册到技能配置。',
   parameters: [
      {
         name: 'name',
         type: 'string',
         description: '技能名称（英文，下划线分隔），如：send_email, upload_file'
      },
      {
         name: 'description',
         type: 'string',
         description: '技能描述'
      },
      {
         name: 'when_to_use',
         type: 'string',
         description: '使用场景说明'
      },
      {
         name: 'code',
         type: 'string',
         description: '技能实现代码（完整的 Node.js 模块）'
      },
      {
         name: 'parameters',
         type: 'array',
         description: '技能参数定义数组，每项包含 name, type, description'
      }
   ],
   async execute(params) {
      const { name, description, when_to_use, code, parameters = [] } = params;

      if (!name) {
         return { success: false, message: '请提供技能名称' };
      }
      if (!description) {
         return { success: false, message: '请提供技能描述' };
      }
      if (!code) {
         return { success: false, message: '请提供技能代码' };
      }

      const skillFilename = name.replace(/-/g, '-') + '.js';
      const skillPath = path.join(SKILLS_DIR, skillFilename);

      try {
         fs.writeFileSync(skillPath, code, 'utf8');

         let config = { skills: [] };
         if (fs.existsSync(SKILLS_CONFIG_PATH)) {
            config = JSON.parse(fs.readFileSync(SKILLS_CONFIG_PATH, 'utf8'));
         }

         const existingIndex = config.skills.findIndex(s => s.name === name);
         const skillConfig = {
            name,
            description,
            when_to_use: when_to_use || `当用户需要${description}时使用`,
            parameters
         };

         if (existingIndex >= 0) {
            config.skills[existingIndex] = skillConfig;
         } else {
            config.skills.push(skillConfig);
         }

         fs.writeFileSync(SKILLS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

         return {
            success: true,
            message: `技能 "${name}" 已成功添加！文件：${skillFilename}`,
            file: skillFilename,
            skill: skillConfig
         };
      } catch (error) {
         return {
            success: false,
            message: `添加技能失败：${error.message}`
         };
      }
   }
};

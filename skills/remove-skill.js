const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname);
const SKILLS_CONFIG_PATH = path.join(__dirname, '..', 'skills.json');

module.exports = {
   name: 'remove_skill',
   description: '从系统中删除指定技能。',
   parameters: [
      {
         name: 'name',
         type: 'string',
         description: '要删除的技能名称'
      }
   ],
   async execute(params) {
      const { name } = params;

      if (!name) {
         return { success: false, message: '请提供技能名称' };
      }

      const skillFilename = name + '.js';
      const skillPath = path.join(SKILLS_DIR, skillFilename);

      try {
         if (!fs.existsSync(skillPath)) {
            return { success: false, message: `技能文件 "${skillFilename}" 不存在` };
         }

         fs.unlinkSync(skillPath);

         let config = { skills: [] };
         if (fs.existsSync(SKILLS_CONFIG_PATH)) {
            config = JSON.parse(fs.readFileSync(SKILLS_CONFIG_PATH, 'utf8'));
         }

         const initialLength = config.skills.length;
         config.skills = config.skills.filter(s => s.name !== name);

         if (config.skills.length < initialLength) {
            fs.writeFileSync(SKILLS_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
            return {
               success: true,
               message: `技能 "${name}" 已成功删除`,
               deletedFile: skillFilename
            };
         } else {
            return {
               success: true,
               message: `技能文件已删除，但配置中未找到 "${name}"`,
               deletedFile: skillFilename
            };
         }
      } catch (error) {
         return {
            success: false,
            message: `删除技能失败：${error.message}`
         };
      }
   }
};

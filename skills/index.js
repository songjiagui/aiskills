const path = require('path');
const fs = require('fs');

class SkillManager {
   constructor() {
      this.skills = new Map();
      this.skillsDir = __dirname;
      this.loadSkills();
   }

   loadSkills() {
      this.loadFromDirectory(this.skillsDir, '');
   }

   loadFromDirectory(dir, subPath) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
         const fullPath = path.join(dir, file);
         const stat = fs.statSync(fullPath);
         
         if (stat.isDirectory()) {
            if (file === 'workflows') {
               this.loadFromDirectory(fullPath, file);
            }
            continue;
         }
         
         if (file === 'index.js' || !file.endsWith('.js')) continue;
         
         try {
            const skill = require(fullPath);
            if (skill.name && skill.execute) {
               this.skills.set(skill.name, skill);
               console.log(`[技能加载] ${skill.name}: ${skill.description}${subPath ? ` (${subPath})` : ''}`);
            }
         } catch (e) {
            console.error(`[技能加载失败] ${file}: ${e.message}`);
         }
      }
   }

   getSkill(name) {
      return this.skills.get(name);
   }

   hasSkill(name) {
      return this.skills.has(name);
   }

   listSkills() {
      return Array.from(this.skills.values()).map(s => ({
         name: s.name,
         description: s.description,
         parameters: s.parameters || []
      }));
   }

   async executeSkill(name, params = {}) {
      const skill = this.getSkill(name);
      if (!skill) {
         return { success: false, error: `技能 "${name}" 不存在` };
      }
      try {
         return await skill.execute(params);
      } catch (e) {
         return { success: false, error: e.message };
      }
   }
}

module.exports = new SkillManager();

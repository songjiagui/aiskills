const fs = require('fs');
const path = require('path');

const SKILLS_CONFIG_PATH = path.join(__dirname, '..', 'skills.json');

module.exports = {
   name: 'list_skill_templates',
   description: '获取技能模板列表，用于创建新技能时参考。',
   parameters: [
      {
         name: 'type',
         type: 'string',
         description: '模板类型（可选）：command, api, file, system'
      }
   ],
   async execute(params) {
      const { type } = params;

      const templates = {
         command: {
            name: 'execute_custom_command',
            description: '执行自定义系统命令',
            when_to_use: '用户要求执行特定系统命令时使用',
            code: `const { exec } = require('child_process');

module.exports = {
   name: 'execute_custom_command',
   description: '执行自定义系统命令',
   when_to_use: '用户要求执行特定系统命令时使用',
   parameters: [
      { name: 'command', type: 'string', description: '要执行的命令' }
   ],
   async execute(params) {
      const { command } = params;
      
      return new Promise((resolve, reject) => {
         exec(command, (error, stdout, stderr) => {
            if (error) {
               resolve({ success: false, message: '执行失败：' + error.message });
            } else {
               resolve({ success: true, message: '执行成功', output: stdout.trim() });
            }
         });
      });
   }
};`
         },
         api: {
            name: 'call_api',
            description: '调用外部 API 接口',
            when_to_use: '用户要求获取网络数据或调用外部服务时使用',
            code: `const https = require('https');

module.exports = {
   name: 'call_api',
   description: '调用外部 API 接口',
   when_to_use: '用户要求获取网络数据或调用外部服务时使用',
   parameters: [
      { name: 'url', type: 'string', description: 'API 地址' },
      { name: 'method', type: 'string', description: 'HTTP 方法 (GET/POST)' }
   ],
   async execute(params) {
      const { url, method = 'GET' } = params;
      
      return new Promise((resolve, reject) => {
         https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
               try {
                  const json = JSON.parse(data);
                  resolve({ success: true, message: 'API 调用成功', data: json });
               } catch (e) {
                  resolve({ success: true, message: 'API 调用成功', output: data });
               }
            });
         }).on('error', (err) => {
            resolve({ success: false, message: 'API 调用失败：' + err.message });
         });
      });
   }
};`
         },
         file: {
            name: 'file_operation',
            description: '文件操作（复制、移动、删除）',
            when_to_use: '用户要求管理文件时使用',
            code: `const fs = require('fs');
const path = require('path');

module.exports = {
   name: 'file_operation',
   description: '文件操作（复制、移动、删除）',
   when_to_use: '用户要求管理文件时使用',
   parameters: [
      { name: 'operation', type: 'string', description: '操作类型：copy, move, delete' },
      { name: 'source', type: 'string', description: '源文件路径' },
      { name: 'destination', type: 'string', description: '目标路径（copy/move 需要）' }
   ],
   async execute(params) {
      const { operation, source, destination } = params;
      
      try {
         if (operation === 'copy') {
            fs.copyFileSync(source, destination);
            return { success: true, message: '文件已复制' };
         } else if (operation === 'move') {
            fs.renameSync(source, destination);
            return { success: true, message: '文件已移动' };
         } else if (operation === 'delete') {
            fs.unlinkSync(source);
            return { success: true, message: '文件已删除' };
         }
         return { success: false, message: '未知操作' };
      } catch (error) {
         return { success: false, message: '操作失败：' + error.message };
      }
   }
};`
         },
         system: {
            name: 'get_system_info',
            description: '获取系统信息',
            when_to_use: '用户询问系统状态、内存、磁盘等信息时使用',
            code: `const os = require('os');

module.exports = {
   name: 'get_system_info',
   description: '获取系统信息',
   when_to_use: '用户询问系统状态、内存、磁盘等信息时使用',
   parameters: [],
   async execute(params) {
      const info = {
         platform: os.platform(),
         arch: os.arch(),
         cpus: os.cpus().length,
         totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
         freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
         uptime: os.uptime() / 3600 + ' 小时'
      };
      
      return { 
         success: true, 
         message: '系统信息获取成功',
         data: info
      };
   }
};`
         }
      };

      if (type && templates[type]) {
         return {
            success: true,
            message: `技能模板 (${type}):`,
            template: templates[type]
         };
      }

      return {
         success: true,
         message: '可用技能模板:',
         templates: Object.keys(templates).map(key => ({
            type: key,
            name: templates[key].name,
            description: templates[key].description
         }))
      };
   }
};

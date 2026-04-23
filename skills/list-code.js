const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', 'code_temp');

module.exports = {
   name: 'list_code',
   description: '列出已保存的代码文件',
   parameters: [],
   async execute(params) {
      if (!fs.existsSync(CODE_DIR)) {
         fs.mkdirSync(CODE_DIR, { recursive: true });
         return {
            success: true,
            message: '代码目录为空',
            files: []
         };
      }

      const files = fs.readdirSync(CODE_DIR);
      
      if (files.length === 0) {
         return {
            success: true,
            message: '代码目录为空',
            files: []
         };
      }

      const fileInfos = files.map(file => {
         const filePath = path.join(CODE_DIR, file);
         const stats = fs.statSync(filePath);
         return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toLocaleString('zh-CN')
         };
      });

      return {
         success: true,
         message: `共 ${files.length} 个代码文件:\n${fileInfos.map(f => `  - ${f.name} (${f.size} bytes)`).join('\n')}`,
         files: fileInfos
      };
   }
};

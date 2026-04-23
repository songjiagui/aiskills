const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', 'code_temp');

module.exports = {
   name: 'read_code',
   description: '读取已保存的代码文件内容',
   parameters: [
      {
         name: 'filename',
         type: 'string',
         description: '要读取的文件名'
      }
   ],
   async execute(params) {
      const { filename } = params;

      if (!filename) {
         return { success: false, message: '请提供文件名' };
      }

      let filePath = path.join(CODE_DIR, filename);

      if (!fs.existsSync(filePath)) {
         const files = fs.readdirSync(CODE_DIR);
         const match = files.find(f => 
            f.startsWith(filename + '.') || f === filename
         );
         if (match) {
            filePath = path.join(CODE_DIR, match);
         } else {
            return { success: false, message: `文件 "${filename}" 不存在` };
         }
      }

      try {
         const content = fs.readFileSync(filePath, 'utf8');
         const stats = fs.statSync(filePath);
         
         return {
            success: true,
            message: `文件内容:\n\`\`\`\n${content}\n\`\`\``,
            file: {
               name: path.basename(filePath),
               path: filePath,
               content,
               size: stats.size
            }
         };
      } catch (error) {
         return {
            success: false,
            message: `读取文件失败: ${error.message}`
         };
      }
   }
};

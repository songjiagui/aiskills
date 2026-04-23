const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', 'code_temp');

if (!fs.existsSync(CODE_DIR)) {
   fs.mkdirSync(CODE_DIR, { recursive: true });
}

const EXTENSIONS = {
   javascript: 'js',
   typescript: 'ts',
   python: 'py',
   java: 'java',
   c: 'c',
   cpp: 'cpp',
   csharp: 'cs',
   go: 'go',
   rust: 'rs',
   ruby: 'rb',
   php: 'php',
   bash: 'sh',
   powershell: 'ps1',
   sql: 'sql',
   html: 'html',
   css: 'css',
   json: 'json',
   xml: 'xml',
   yaml: 'yaml',
   markdown: 'md'
};

module.exports = {
   name: 'write_code',
   description: '编写代码并保存到文件。单步骤任务可用。多步骤任务(如编写并运行)请使用plan_workflow。',
   parameters: [
      {
         name: 'filename',
         type: 'string',
         description: '文件名(不含扩展名)，如: fibonacci, main, utils'
      },
      {
         name: 'language',
         type: 'string',
         description: '编程语言: javascript, python, java, c, cpp, go, rust, ruby, php'
      },
      {
         name: 'code',
         type: 'string',
         description: '完整的代码内容'
      },
      {
         name: 'description',
         type: 'string',
         description: '代码功能描述'
      }
   ],
   async execute(params) {
      let { filename, language, code, description } = params;

      if (!filename) {
         return { success: false, message: '请提供文件名' };
      }
      if (!language) {
         return { success: false, message: '请提供编程语言' };
      }
      if (!code) {
         return { success: false, message: '请提供代码内容' };
      }

      filename = filename.replace(/\.[^.]+$/, '');

      const ext = EXTENSIONS[language.toLowerCase()] || 'txt';
      const fullFilename = `${filename}.${ext}`;
      const filePath = path.join(CODE_DIR, fullFilename);

      try {
         fs.writeFileSync(filePath, code, 'utf8');

         const stats = fs.statSync(filePath);
         
         return {
            success: true,
            message: `代码已保存: ${fullFilename}`,
            file: {
               name: fullFilename,
               path: filePath,
               language: language,
               size: stats.size,
               description: description || ''
            }
         };
      } catch (error) {
         return {
            success: false,
            message: `保存代码失败: ${error.message}`
         };
      }
   }
};

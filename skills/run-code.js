const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', 'code_temp');

const RUNNERS = {
   javascript: { cmd: 'node', ext: 'js' },
   typescript: { cmd: 'npx ts-node', ext: 'ts' },
   python: { cmd: 'python', ext: 'py' },
   java: { cmd: 'java', ext: 'java', compile: 'javac' },
   c: { cmd: '', ext: 'c', compile: 'gcc -o', runCmd: './' },
   cpp: { cmd: '', ext: 'cpp', compile: 'g++ -o', runCmd: './' },
   go: { cmd: 'go run', ext: 'go' },
   rust: { cmd: 'cargo run', ext: 'rs' },
   ruby: { cmd: 'ruby', ext: 'rb' },
   php: { cmd: 'php', ext: 'php' },
   bash: { cmd: 'bash', ext: 'sh' },
   powershell: { cmd: 'powershell -File', ext: 'ps1' }
};

const SERVER_KEYWORDS = ['express', 'listen', 'server', 'http.createserver', 'app.listen', 'fastapi', 'flask', 'uvicorn'];

function detectServerCode(filePath) {
   try {
      const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
      return SERVER_KEYWORDS.some(keyword => content.includes(keyword));
   } catch {
      return false;
   }
}

function executeWithTimeout(command, options, timeout = 10000) {
   return new Promise((resolve, reject) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
      const child = exec(command, { 
         shell, 
         encoding: 'utf8',
         maxBuffer: 1024 * 1024,
         ...options 
      }, (error, stdout, stderr) => {
         if (error) {
            reject(new Error(`${error.message}\n${stderr}`));
         } else {
            resolve(stdout.trim());
         }
      });

      const timer = setTimeout(() => {
         child.kill();
         reject(new Error('执行超时 - 程序可能是一个服务器，请使用 start_server 技能'));
      }, timeout);

      child.on('close', () => clearTimeout(timer));
   });
}

module.exports = {
   name: 'run_code',
   description: '执行代码文件(短时间运行的程序)。服务器程序请使用start_server。',
   parameters: [
      {
         name: 'filename',
         type: 'string',
         description: '要执行的文件名'
      },
      {
         name: 'language',
         type: 'string',
         description: '编程语言(可选，自动检测)'
      },
      {
         name: 'args',
         type: 'array',
         description: '命令行参数'
      },
      {
         name: 'stdin',
         type: 'string',
         description: '标准输入内容'
      },
      {
         name: 'timeout',
         type: 'number',
         description: '超时时间(毫秒，默认10000)'
      }
   ],
   async execute(params) {
      const { filename, language, args = [], stdin, timeout = 10000 } = params;

      if (!filename) {
         return { success: false, message: '请提供要执行的文件名' };
      }

      let filePath;
      let detectedLang = language;

      if (path.isAbsolute(filename) && fs.existsSync(filename)) {
         filePath = filename;
      } else {
         filePath = path.join(CODE_DIR, filename);
      }

      if (!fs.existsSync(filePath)) {
         const files = fs.readdirSync(CODE_DIR);
         const basename = path.basename(filename);
         const match = files.find(f => 
            f.startsWith(basename + '.') || f === basename || f === filename
         );
         if (match) {
            filePath = path.join(CODE_DIR, match);
            if (!detectedLang) {
               const ext = match.split('.').pop();
               detectedLang = Object.keys(RUNNERS).find(
                  lang => RUNNERS[lang].ext === ext
               );
            }
         } else {
            return { success: false, message: `文件 "${filename}" 不存在` };
         }
      }

      if (!detectedLang) {
         const ext = filePath.split('.').pop();
         detectedLang = Object.keys(RUNNERS).find(
            lang => RUNNERS[lang].ext === ext
         );
      }

      if (detectedLang) {
         detectedLang = detectedLang.toLowerCase();
      }

      if (!detectedLang || !RUNNERS[detectedLang]) {
         return { 
            success: false, 
            message: `不支持的语言: ${detectedLang || '未知'}。支持的语言: ${Object.keys(RUNNERS).join(', ')}`
         };
      }

      if (detectServerCode(filePath)) {
         return {
            success: false,
            message: '检测到这是一个服务器程序，请使用 start_server 技能来启动它',
            isServer: true,
            hint: '服务器程序需要后台运行，请说"启动服务器"或"start_server"'
         };
      }

      const runner = RUNNERS[detectedLang];
      const startTime = Date.now();

      try {
         let result;
         const options = { cwd: CODE_DIR };
         if (stdin) options.input = stdin;

         if (runner.compile) {
            if (detectedLang === 'java') {
               const compileCmd = `${runner.compile} "${filePath}"`;
               await executeWithTimeout(compileCmd, { cwd: CODE_DIR }, timeout);
               const className = path.basename(filename, '.java');
               result = await executeWithTimeout(
                  `${runner.cmd} ${className} ${args.join(' ')}`,
                  { cwd: CODE_DIR },
                  timeout
               );
            } else if (detectedLang === 'c' || detectedLang === 'cpp') {
               const outputFile = path.join(CODE_DIR, `${filename}.exe`);
               const compileCmd = `${runner.compile} "${outputFile}" "${filePath}"`;
               await executeWithTimeout(compileCmd, {}, timeout);
               result = await executeWithTimeout(
                  `"${outputFile}" ${args.join(' ')}`,
                  {},
                  timeout
               );
            }
         } else {
            const cmd = `${runner.cmd} "${filePath}" ${args.join(' ')}`;
            result = await executeWithTimeout(cmd, options, timeout);
         }

         const executionTime = Date.now() - startTime;

         return {
            success: true,
            message: `执行成功 (${executionTime}ms)`,
            output: result,
            executionTime,
            language: detectedLang
         };
      } catch (error) {
         const executionTime = Date.now() - startTime;
         const errorMsg = error.message;
         
         if (errorMsg.includes('超时')) {
            return {
               success: false,
               message: '执行超时 - 这可能是一个服务器程序，请使用 start_server 技能',
               isServer: true
            };
         }
         
         return {
            success: false,
            message: `执行失败: ${errorMsg}`,
            error: errorMsg,
            executionTime,
            language: detectedLang
         };
      }
   }
};

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', 'code_temp');
const PROCESSES_FILE = path.join(__dirname, '..', 'processes.json');

if (!fs.existsSync(CODE_DIR)) {
   fs.mkdirSync(CODE_DIR, { recursive: true });
}

function loadProcesses() {
   if (fs.existsSync(PROCESSES_FILE)) {
      return JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
   }
   return {};
}

function saveProcesses(processes) {
   fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 2));
}

const EXTENSIONS = {
   javascript: 'js',
   nodejs: 'js',
   typescript: 'ts',
   python: 'py',
   java: 'java',
   go: 'go',
   ruby: 'rb',
   php: 'php',
   bash: 'sh',
   powershell: 'ps1'
};

const RUNNERS = {
   javascript: { command: 'node', args: [] },
   nodejs: { command: 'node', args: [] },
   typescript: { command: 'npx', args: ['ts-node'] },
   python: { command: 'python', args: [] },
   java: { command: 'java', args: [] },
   go: { command: 'go', args: ['run'] },
   ruby: { command: 'ruby', args: [] },
   php: { command: 'php', args: [] },
   bash: { command: 'bash', args: [] },
   powershell: { command: 'powershell', args: ['-File'] }
};

function findFile(filename) {
   if (path.isAbsolute(filename) && fs.existsSync(filename)) {
      return filename;
   }

   let filePath = path.join(CODE_DIR, filename);
   if (fs.existsSync(filePath)) {
      return filePath;
   }

   const basename = path.basename(filename);
   filePath = path.join(CODE_DIR, basename);
   if (fs.existsSync(filePath)) {
      return filePath;
   }

   const files = fs.readdirSync(CODE_DIR);
   const match = files.find(f => {
      const fileBasename = path.basename(f, path.extname(f));
      return fileBasename === basename || f === basename || f === filename;
   });
   if (match) {
      return path.join(CODE_DIR, match);
   }

   return null;
}

module.exports = {
   name: 'start_server',
   description: '启动后台服务器程序。用于运行Web服务器、API服务等长时间运行的程序。',
   parameters: [
      {
         name: 'filename',
         type: 'string',
         description: '要运行的服务器文件名'
      },
      {
         name: 'language',
         type: 'string',
         description: '编程语言(可选，自动检测)'
      },
      {
         name: 'port',
         type: 'number',
         description: '服务端口(可选，用于记录)'
      }
   ],
   async execute(params) {
      const { filename, language, port } = params;

      if (!filename) {
         return { success: false, message: '请提供文件名' };
      }

      const filePath = findFile(filename);
      if (!filePath) {
         const files = fs.readdirSync(CODE_DIR);
         return {
            success: false,
            message: `文件 "${filename}" 不存在。可用文件: ${files.join(', ') || '无'}`
         };
      }

      let detectedLang = language;
      if (!detectedLang) {
         const ext = path.extname(filePath).slice(1);
         detectedLang = Object.keys(EXTENSIONS).find(lang => EXTENSIONS[lang] === ext);
      }

      if (detectedLang) {
         detectedLang = detectedLang.toLowerCase();
      }

      if (!detectedLang || !RUNNERS[detectedLang]) {
         return { success: false, message: `不支持的语言: ${detectedLang || '未知'}` };
      }

      // 自动检测端口号：读取文件内容查找端口定义
      let detectedPort = port;
      if (!detectedPort) {
         try {
            const content = fs.readFileSync(filePath, 'utf8');
            // 匹配常见的端口定义模式
            const patterns = [
               /(?:port|PORT)\s*=\s*(\d{4,5})/,  // port = 3000 或 PORT = 3000
               /process\.env\.PORT\s*\|\|\s*(\d{4,5})/,  // process.env.PORT || 3000
               /listen\s*\(\s*(\d{4,5})/,  // listen(3000)
               /port[:\s]+(\d{4,5})/,  // port: 3000 或 port 3000
            ];
            
            for (const pattern of patterns) {
               const match = content.match(pattern);
               if (match && match[1]) {
                  detectedPort = parseInt(match[1], 10);
                  break;
               }
            }
         } catch (e) {
            console.error(`[端口检测] 读取文件失败: ${e.message}`);
         }
      }

      const runner = RUNNERS[detectedLang];
      const serverId = `server_${Date.now()}`;

      try {
         const child = spawn(runner.command, [...runner.args, filePath], {
            cwd: CODE_DIR,
            detached: true,
            stdio: 'ignore'
         });

         child.unref();

         const processes = loadProcesses();
         processes[serverId] = {
            pid: child.pid,
            filename: path.basename(filePath),
            language: detectedLang,
            port: detectedPort,
            startTime: new Date().toISOString()
         };
         saveProcesses(processes);

         return {
            success: true,
            message: `服务器已启动 (PID: ${child.pid})`,
            serverId,
            pid: child.pid,
            filename: path.basename(filePath),
            port: detectedPort || '未知'
         };
      } catch (error) {
         return { success: false, message: `启动失败: ${error.message}` };
      }
   }
};

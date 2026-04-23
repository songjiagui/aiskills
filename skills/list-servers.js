const fs = require('fs');
const path = require('path');

const PROCESSES_FILE = path.join(__dirname, '..', 'processes.json');

function loadProcesses() {
   if (fs.existsSync(PROCESSES_FILE)) {
      return JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
   }
   return {};
}

function saveProcesses(processes) {
   fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 2));
}

function isProcessRunning(pid) {
   try {
      process.kill(pid, 0);
      return true;
   } catch (error) {
      return false;
   }
}

module.exports = {
   name: 'list_servers',
   description: '列出所有后台运行的服务器程序。',
   parameters: [],
   async execute(params) {
      const processes = loadProcesses();
      const activeProcesses = {};

      for (const [id, info] of Object.entries(processes)) {
         if (info?.pid && isProcessRunning(info.pid)) {
            activeProcesses[id] = info;
         }
      }

      if (Object.keys(activeProcesses).length !== Object.keys(processes).length) {
         saveProcesses(activeProcesses);
      }

      const serverIds = Object.keys(activeProcesses);

      if (serverIds.length === 0) {
         return { success: true, message: '没有运行中的服务器', servers: [] };
      }

      const servers = serverIds.map(id => ({
         id,
         ...activeProcesses[id]
      }));

      let message = `运行中的服务器 (${servers.length}):\n`;
      servers.forEach((s, i) => {
         message += `  ${i + 1}. ${s.filename} (PID: ${s.pid}`;
         if (s.port) message += `, 端口: ${s.port}`;
         message += `)\n`;
      });

      return {
         success: true,
         message,
         servers
      };
   }
};

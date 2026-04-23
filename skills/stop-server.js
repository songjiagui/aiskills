const { exec, spawn } = require('child_process');
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

function killProcessTree(pid) {
   return new Promise((resolve) => {
      if (!pid || !isProcessRunning(pid)) {
         resolve(true);
         return;
      }

      try {
         process.kill(pid, 'SIGKILL');
      } catch (error) {
         // Ignore and fall back to platform tools below.
      }

      if (!isProcessRunning(pid)) {
         resolve(true);
         return;
      }

      if (process.platform === 'win32') {
         exec(`taskkill /pid ${pid} /t /f`, (error, stdout, stderr) => {
            resolve(!error);
         });
      } else {
         exec(`kill -9 -${pid}`, (error) => {
            resolve(!error);
         });
      }
   });
}

function findProcessByPort(port) {
   return new Promise((resolve) => {
      if (process.platform === 'win32') {
         exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (error || !stdout) {
               resolve(null);
               return;
            }
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
               const parts = line.trim().split(/\s+/);
               if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
                  const pid = parseInt(parts[4]);
                  if (pid && pid > 0) {
                     resolve(pid);
                     return;
                  }
               }
            }
            resolve(null);
         });
      } else {
         exec(`lsof -i :${port} -t`, (error, stdout) => {
            if (error || !stdout) {
               resolve(null);
               return;
            }
            const pid = parseInt(stdout.trim());
            resolve(pid > 0 ? pid : null);
         });
      }
   });
}

module.exports = {
   name: 'stop_server',
   description: '停止后台运行的服务器程序。',
   parameters: [
      {
         name: 'serverId',
         type: 'string',
         description: '服务器ID(可选，不提供则停止所有)'
      },
      {
         name: 'port',
         type: 'number',
         description: '端口号(可选，停止指定端口的服务)'
      },
      {
         name: 'pid',
         type: 'number',
         description: '进程ID(可选)'
      }
   ],
   async execute(params) {
      const { serverId, port, pid: directPid } = params;
      const processes = loadProcesses();

      for (const [id, info] of Object.entries(processes)) {
         if (!info?.pid || !isProcessRunning(info.pid)) {
            delete processes[id];
         }
      }
      saveProcesses(processes);

      const serverIds = Object.keys(processes);

      let toStop = [];

      if (directPid) {
         const killed = await killProcessTree(directPid);
         for (const [id, info] of Object.entries(processes)) {
            if (info.pid === directPid) {
               delete processes[id];
            }
         }
         saveProcesses(processes);
         return {
            success: killed,
            message: killed 
               ? `✓ 进程 ${directPid} 已停止` 
               : `✗ 进程 ${directPid} 停止失败`,
            stopped: killed ? 1 : 0
         };
      }

      if (port) {
         const portPid = await findProcessByPort(port);
         if (portPid) {
            const killed = await killProcessTree(portPid);
            for (const [id, info] of Object.entries(processes)) {
               if (info.pid === portPid || info.port === port) {
                  delete processes[id];
               }
            }
            saveProcesses(processes);
            return {
               success: killed,
               message: killed 
                  ? `✓ 端口 ${port} 的进程 (PID: ${portPid}) 已停止` 
                  : `✗ 端口 ${port} 的进程停止失败`,
               stopped: killed ? 1 : 0
            };
         }
      }

      if (serverIds.length === 0) {
         return { success: true, message: '没有运行中的服务器', servers: [] };
      }

      if (serverId) {
         if (processes[serverId]) {
            toStop.push({ id: serverId, ...processes[serverId] });
         } else {
            return { success: false, message: `服务器 "${serverId}" 不存在` };
         }
      } else {
         toStop = serverIds.map(id => ({ id, ...processes[id] }));
      }

      if (toStop.length === 0) {
         return { success: true, message: '没有匹配的服务器' };
      }

      const results = [];
      let stoppedCount = 0;
      let failedCount = 0;
      for (const server of toStop) {
         const killed = await killProcessTree(server.pid);
         if (killed) {
            delete processes[server.id];
            results.push(`✓ ${server.filename} (PID: ${server.pid}) 已停止`);
            stoppedCount += 1;
         } else {
            results.push(`✗ ${server.filename} (PID: ${server.pid}) 停止失败`);
            failedCount += 1;
         }
      }

      saveProcesses(processes);

      return {
         success: failedCount === 0,
         message: results.join('\n'),
         stopped: stoppedCount,
         failed: failedCount
      };
   }
};

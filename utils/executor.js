const { exec } = require('child_process');

function normalizePowerShellCommand(command) {
   let normalized = command;

   if (/\bInvoke-WebRequest\b/i.test(normalized) && !/-UseBasicParsing\b/i.test(normalized)) {
      normalized = normalized.replace(/\bInvoke-WebRequest\b/i, 'Invoke-WebRequest -UseBasicParsing');
   }

   if (/\biwr\b/i.test(normalized) && !/-UseBasicParsing\b/i.test(normalized)) {
      normalized = normalized.replace(/\biwr\b/i, 'Invoke-WebRequest -UseBasicParsing');
   }

   return normalized;
}

function executeCommand(command, options = {}) {
   return new Promise((resolve, reject) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
      const normalizedCommand = process.platform === 'win32'
         ? normalizePowerShellCommand(command)
         : command;

      exec(normalizedCommand, { 
         shell, 
         encoding: 'utf8',
         maxBuffer: 1024 * 1024,
         ...options 
      }, (error, stdout, stderr) => {
         if (error) {
            reject(new Error(`命令执行失败: ${error.message}\n${stderr}`));
         } else {
            resolve(stdout.trim());
         }
      });
   });
}

module.exports = { executeCommand };

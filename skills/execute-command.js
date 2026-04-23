const { executeCommand } = require('../utils/executor');

module.exports = {
   name: 'execute_command',
   description: '执行系统命令。用于文件操作、系统信息获取等。如: dir(列出目录)、ipconfig(IP信息)、systeminfo(系统信息)、ren(重命名)、copy(复制)、move(移动)等。',
   parameters: [
      {
         name: 'command',
         type: 'string',
         description: '要执行的命令，如: dir E:\\, ipconfig, systeminfo, ren old.txt new.txt'
      },
      {
         name: 'cwd',
         type: 'string',
         description: '执行命令的工作目录(可选)'
      }
   ],
   async execute(params) {
      const { command, cwd } = params;

      if (!command) {
         return { success: false, message: '请提供要执行的命令' };
      }

      try {
         const options = {};
         if (cwd) {
            options.cwd = cwd;
         }

         const result = await executeCommand(command, options);

         return {
            success: true,
            message: '命令执行成功',
            output: result,
            command
         };
      } catch (error) {
         return {
            success: false,
            message: `命令执行失败: ${error.message}`,
            error: error.message,
            command
         };
      }
   }
};

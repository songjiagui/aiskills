const { executeCommand } = require('../utils/executor');

module.exports = {
   name: 'get_local_ip',
   description: '获取本机IP地址',
   parameters: [],
   async execute(params) {
      const isWindows = process.platform === 'win32';
      let command;
      
      if (isWindows) {
         command = 'ipconfig';
      } else {
         command = 'ifconfig || ip addr show';
      }
      
      const result = await executeCommand(command);
      
      const ips = [];
      if (isWindows) {
         const ipv4Regex = /IPv4[^\d]+(\d+\.\d+\.\d+\.\d+)/g;
         let match;
         while ((match = ipv4Regex.exec(result)) !== null) {
            ips.push(match[1]);
         }
      } else {
         const ipv4Regex = /inet\s+(\d+\.\d+\.\d+\.\d+)/g;
         let match;
         while ((match = ipv4Regex.exec(result)) !== null) {
            if (!match[1].startsWith('127.')) {
               ips.push(match[1]);
            }
         }
      }
      
      return {
         success: true,
         rawOutput: result,
         ipAddresses: ips,
         message: ips.length > 0 
            ? `本机IP地址: ${ips.join(', ')}` 
            : '未找到IPv4地址'
      };
   }
};

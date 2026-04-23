const fs = require('fs');
const path = require('path');

module.exports = {
   name: 'analyze_project',
   description: '分析项目情况，获取项目结构、依赖、代码统计等信息。',
   when_to_use: '用户想了解项目结构、项目情况、代码统计时使用。',
   parameters: [
      {
         name: 'projectPath',
         type: 'string',
         description: '项目路径（可选，默认为当前目录）'
      },
      {
         name: 'detail',
         type: 'string',
         description: '详细程度：basic(基础), full(完整)'
      }
   ],
   async execute(params) {
      const { projectPath = process.cwd(), detail = 'basic' } = params;

      if (!fs.existsSync(projectPath)) {
         return { success: false, message: `项目路径 "${projectPath}" 不存在` };
      }

      try {
         const result = {
            path: projectPath,
            timestamp: new Date().toISOString()
         };

         // 1. 获取项目类型和配置信息
         const projectInfo = await this.getProjectInfo(projectPath);
         result.projectInfo = projectInfo;

         // 2. 获取目录结构（排除依赖目录）
         const dirStructure = await this.getDirectoryStructure(projectPath, detail === 'full');
         result.structure = dirStructure;

         // 3. 代码统计
         const codeStats = await this.getCodeStats(projectPath);
         result.codeStats = codeStats;

         // 4. 依赖信息（只读取配置文件）
         if (projectInfo.type) {
            const dependencies = await this.getDependencies(projectPath, projectInfo.type);
            result.dependencies = dependencies;
         }

         let message = `项目分析完成\n`;
         message += `路径：${result.path}\n`;
         message += `类型：${result.projectInfo.type || '未知'}\n`;
         if (result.projectInfo.name) {
            message += `名称：${result.projectInfo.name}\n`;
         }
         if (result.projectInfo.version) {
            message += `版本：${result.projectInfo.version}\n`;
         }
         message += `文件总数：${result.codeStats.totalFiles}\n`;
         message += `代码文件：${result.codeStats.codeFiles}\n`;
         message += `总行数：${result.codeStats.totalLines}\n`;
         
         if (result.dependencies) {
            message += `依赖数：${result.dependencies.count}\n`;
         }

         return {
            success: true,
            message,
            data: result
         };
      } catch (error) {
         return {
            success: false,
            message: `分析失败：${error.message}`
         };
      }
   },

   async getDirectoryStructure(rootPath, fullDetail) {
      const structure = {
         directories: 0,
         files: 0,
         tree: []
      };

      // 排除的依赖目录和临时目录
      const ignoreDirs = [
         'node_modules',      // Node.js 依赖
         'vendor',            // PHP/Go 依赖
         '__pycache__',       // Python 缓存
         '.git',              // Git 仓库
         'dist', 'build',     // 构建输出
         'target',            // Java Maven 输出
         '.vscode', '.idea',  // IDE 配置
         'venv', '.venv',     // Python 虚拟环境
         'env', '.env'        // 环境目录
      ];

      const ignoreFiles = ['.DS_Store', 'Thumbs.db', '.gitignore', '.npmignore'];

      async function scan(dir, depth = 0) {
         if (depth > (fullDetail ? 10 : 3)) return [];

         try {
            const items = await fs.promises.readdir(dir);
            const result = [];

            for (const item of items) {
               if (ignoreFiles.includes(item)) continue;

               const fullPath = path.join(dir, item);
               
               try {
                  const stat = await fs.promises.stat(fullPath);

                  if (stat.isDirectory()) {
                     if (ignoreDirs.includes(item)) continue;
                     
                     structure.directories++;
                     const children = await scan(fullPath, depth + 1);
                     result.push({
                        type: 'directory',
                        name: item,
                        children: children.length > 0 ? children : undefined
                     });
                  } else {
                     structure.files++;
                     result.push({
                        type: 'file',
                        name: item,
                        size: stat.size
                     });
                  }
               } catch (e) {
                  // 跳过无法访问的文件/目录
               }
            }

            return result;
         } catch (e) {
            return [];
         }
      }

      structure.tree = await scan(rootPath);
      return structure;
   },

   async getProjectInfo(projectPath) {
      const info = {
         type: null,
         name: null,
         version: null,
         configFiles: [],
         dependencyDirs: []
      };

      // 项目配置文件定义
      const configFiles = [
         { 
            file: 'package.json', 
            type: 'nodejs', 
            parse: JSON.parse,
            depDir: 'node_modules'
         },
         { 
            file: 'pom.xml', 
            type: 'java-maven', 
            parse: null,
            depDir: '.m2'
         },
         { 
            file: 'build.gradle', 
            type: 'java-gradle', 
            parse: null,
            depDir: 'build'
         },
         { 
            file: 'requirements.txt', 
            type: 'python', 
            parse: null,
            depDir: null
         },
         { 
            file: 'Cargo.toml', 
            type: 'rust', 
            parse: null,
            depDir: null
         },
         { 
            file: 'go.mod', 
            type: 'go', 
            parse: null,
            depDir: 'vendor'
         },
         { 
            file: 'composer.json', 
            type: 'php', 
            parse: JSON.parse,
            depDir: 'vendor'
         },
         {
            file: 'CMakeLists.txt',
            type: 'cpp-cmake',
            parse: null,
            depDir: null
         }
      ];

      for (const config of configFiles) {
         const configPath = path.join(projectPath, config.file);
         if (fs.existsSync(configPath)) {
            info.type = config.type;
            info.configFiles.push(config.file);
            
            // 检查依赖目录是否存在
            if (config.depDir) {
               const depPath = path.join(projectPath, config.depDir);
               if (fs.existsSync(depPath)) {
                  info.dependencyDirs.push(config.depDir);
               }
            }
            
            // 解析配置获取项目名称和版本
            if (config.parse) {
               try {
                  const content = fs.readFileSync(configPath, 'utf8');
                  const data = config.parse(content);
                  info.name = data.name || null;
                  info.version = data.version || null;
               } catch (e) {}
            }
            break;
         }
      }

      return info;
   },

   async getCodeStats(projectPath) {
      const stats = {
         totalFiles: 0,
         codeFiles: 0,
         totalLines: 0,
         byLanguage: {}
      };

      const codeExtensions = {
         '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
         '.ts': 'TypeScript', '.tsx': 'TypeScript',
         '.py': 'Python',
         '.java': 'Java',
         '.c': 'C', '.cpp': 'C++', '.h': 'C/C++', '.hpp': 'C/C++',
         '.go': 'Go',
         '.rs': 'Rust',
         '.php': 'PHP',
         '.rb': 'Ruby',
         '.cs': 'C#',
         '.html': 'HTML',
         '.css': 'CSS', '.scss': 'SCSS', '.sass': 'SASS', '.less': 'Less',
         '.vue': 'Vue', '.jsx': 'React',
         '.json': 'JSON', '.xml': 'XML', '.yaml': 'YAML', '.yml': 'YAML',
         '.md': 'Markdown', '.sql': 'SQL', '.sh': 'Shell'
      };

      // 排除的目录
      const ignoreDirs = ['node_modules', 'vendor', '__pycache__', '.git', 'dist', 'build', 'target', '.m2'];

      async function scan(dir) {
         try {
            const items = await fs.promises.readdir(dir);

            for (const item of items) {
               if (ignoreDirs.includes(item)) continue;

               const fullPath = path.join(dir, item);
               
               try {
                  const stat = await fs.promises.stat(fullPath);

                  if (stat.isDirectory()) {
                     await scan(fullPath);
                  } else {
                     stats.totalFiles++;
                     const ext = path.extname(item).toLowerCase();
                     
                     if (codeExtensions[ext]) {
                        stats.codeFiles++;
                        const lang = codeExtensions[ext];
                        stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;

                        try {
                           const content = await fs.promises.readFile(fullPath, 'utf8');
                           stats.totalLines += content.split('\n').length;
                        } catch (e) {}
                     }
                  }
               } catch (e) {
                  // 跳过无法访问的文件
               }
            }
         } catch (e) {
            // 跳过无法访问的目录
         }
      }

      await scan(projectPath);
      return stats;
   },

   async getDependencies(projectPath, type) {
      const deps = {
         type,
         count: 0,
         list: [],
         hasDependencyDir: false
      };

      try {
         if (type === 'nodejs') {
            const packagePath = path.join(projectPath, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
            deps.list = Object.entries(allDeps).map(([name, version]) => ({ name, version }));
            deps.count = deps.list.length;
            deps.hasDependencyDir = fs.existsSync(path.join(projectPath, 'node_modules'));
         } else if (type === 'python') {
            const reqPath = path.join(projectPath, 'requirements.txt');
            const content = fs.readFileSync(reqPath, 'utf8');
            deps.list = content.split('\n')
               .filter(line => line.trim() && !line.startsWith('#'))
               .map(line => {
                  const parts = line.split('==');
                  return { name: parts[0], version: parts[1] || '*' };
               });
            deps.count = deps.list.length;
         } else if (type === 'java-maven') {
            const pomPath = path.join(projectPath, 'pom.xml');
            const content = fs.readFileSync(pomPath, 'utf8');
            // 简单解析 XML 获取依赖
            const depMatches = content.match(/<dependency>[\s\S]*?<\/dependency>/g) || [];
            deps.count = depMatches.length;
            deps.hasDependencyDir = fs.existsSync(path.join(process.env.HOME || '', '.m2'));
         } else if (type === 'php') {
            const composerPath = path.join(projectPath, 'composer.json');
            const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
            const allDeps = { ...composer.require, ...composer.require_dev };
            deps.list = Object.entries(allDeps).map(([name, version]) => ({ name, version }));
            deps.count = deps.list.length;
            deps.hasDependencyDir = fs.existsSync(path.join(projectPath, 'vendor'));
         } else if (type === 'go') {
            const goModPath = path.join(projectPath, 'go.mod');
            const content = fs.readFileSync(goModPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim().startsWith('require') || (line.trim() && !line.startsWith('module')));
            deps.count = lines.length;
            deps.hasDependencyDir = fs.existsSync(path.join(projectPath, 'vendor'));
         } else if (type === 'rust') {
            const cargoPath = path.join(projectPath, 'Cargo.toml');
            const content = fs.readFileSync(cargoPath, 'utf8');
            const depMatches = content.match(/^\[dependencies\][\s\S]*?$/m);
            if (depMatches) {
               const depLines = depMatches[0].split('\n').filter(line => line.includes('='));
               deps.count = depLines.length;
            }
         }
      } catch (e) {
         // 解析失败时返回空依赖列表
      }

      return deps;
   }
};

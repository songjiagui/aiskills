const fs = require('fs');

const jsonFileCache = new Map();

function cloneJson(value) {
   return value == null ? value : JSON.parse(JSON.stringify(value));
}

function ensureJsonFile(filePath, defaultValue) {
   if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
   }
}

function readJsonFile(filePath, defaultValue) {
   ensureJsonFile(filePath, defaultValue);

   const stats = fs.statSync(filePath);
   const cached = jsonFileCache.get(filePath);
   if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cloneJson(cached.value);
   }

   const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
   jsonFileCache.set(filePath, {
      mtimeMs: stats.mtimeMs,
      value: cloneJson(parsed)
   });
   return cloneJson(parsed);
}

function writeJsonFile(filePath, value) {
   fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
   const stats = fs.statSync(filePath);
   jsonFileCache.set(filePath, {
      mtimeMs: stats.mtimeMs,
      value: cloneJson(value)
   });
}

module.exports = {
   cloneJson,
   ensureJsonFile,
   readJsonFile,
   writeJsonFile
};

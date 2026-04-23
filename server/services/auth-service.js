const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { USERS_FILE } = require('../constants');
const { ensureJsonFile, readJsonFile, writeJsonFile } = require('../utils/json-store');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function ensureUsersFile() {
   ensureJsonFile(USERS_FILE, {
      users: [
         {
            username: 'admin',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin'
         }
      ]
   });
}

function loadUsers() {
   ensureUsersFile();
   return readJsonFile(USERS_FILE, { users: [] });
}

function saveUsers(users) {
   writeJsonFile(USERS_FILE, users);
}

function findUser(username) {
   const users = loadUsers();
   return users.users.find(user => user.username === username);
}

function verifyPassword(password, hash) {
   return bcrypt.compareSync(password, hash);
}

module.exports = {
   SESSION_SECRET,
   ensureUsersFile,
   loadUsers,
   saveUsers,
   findUser,
   verifyPassword
};

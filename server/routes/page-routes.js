const express = require('express');
const path = require('path');
const { PUBLIC_DIR } = require('../constants');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
   if (!isAuthenticated(req)) {
      return res.redirect('/login');
   }
   res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

router.use((req, res) => {
   if (!isAuthenticated(req)) {
      return res.redirect('/login');
   }
   res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

module.exports = router;

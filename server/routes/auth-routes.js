const express = require('express');
const path = require('path');
const { PUBLIC_DIR } = require('../constants');
const { findUser, verifyPassword } = require('../services/auth-service');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
   if (isAuthenticated(req)) {
      return res.redirect('/');
   }
   res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

router.post('/api/auth/login', (req, res) => {
   const { username, password } = req.body || {};

   if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
   }

   try {
      const user = findUser(username);
      if (!user) {
         return res.status(401).json({ success: false, error: '用户名或密码错误' });
      }

      const isValid = verifyPassword(password, user.password);
      if (!isValid) {
         return res.status(401).json({ success: false, error: '用户名或密码错误' });
      }

      req.session.authenticated = true;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({
         success: true,
         message: '登录成功',
         username: user.username
      });
   } catch (error) {
      res.status(500).json({ success: false, error: '登录失败，请重试' });
   }
});

router.get('/api/auth/check', (req, res) => {
   res.json({
      authenticated: isAuthenticated(req),
      username: req.session?.username || null
   });
});

router.post('/api/auth/logout', (req, res) => {
   req.session.destroy(err => {
      if (err) {
         return res.status(500).json({ success: false, error: '退出失败' });
      }
      res.json({ success: true, message: '已退出登录' });
   });
});

module.exports = router;

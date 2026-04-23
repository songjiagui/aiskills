function requireAuth(req, res, next) {
   if (req.session && req.session.authenticated) {
      return next();
   }
   res.redirect('/login');
}

function isAuthenticated(req) {
   return req.session && req.session.authenticated;
}

module.exports = {
   requireAuth,
   isAuthenticated
};

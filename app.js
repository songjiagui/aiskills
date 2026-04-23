const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { PUBLIC_DIR, GENERATED_IMAGES_DIR } = require('./server/constants');
const { SESSION_SECRET, ensureUsersFile } = require('./server/services/auth-service');
const { requireAuth } = require('./server/middleware/auth');
const authRoutes = require('./server/routes/auth-routes');
const apiRoutes = require('./server/routes/api-routes');
const pageRoutes = require('./server/routes/page-routes');
const { printStartupBanner } = require('./server/banner');

const app = express();
const PORT = Number(process.env.PORT) || 3615;

ensureUsersFile();

app.use(session({
   secret: SESSION_SECRET,
   resave: false,
   saveUninitialized: false,
   cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
   }
}));

app.use(express.json({ limit: '1mb' }));

if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
   fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
}

app.use('/api/images', express.static(GENERATED_IMAGES_DIR));
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

app.use(authRoutes);
app.use('/api', requireAuth, apiRoutes);
app.use(pageRoutes);

app.listen(PORT, () => {
   printStartupBanner(PORT);
});

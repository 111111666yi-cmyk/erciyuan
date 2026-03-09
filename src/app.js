const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { testConnection, ensureSchema, pool } = require('./db/mysql');
const { createAvatarRepository } = require('./repositories/avatarRepository');
const { createAvatarService } = require('./services/avatarService');
const { createAvatarController } = require('./controllers/avatarController');
const { createApiRouter } = require('./routes/apiRoutes');

function readAdminToken(req) {
  const headerToken = req.headers['x-admin-token'];
  if (headerToken) return String(headerToken).trim();

  const queryToken = req.query?.adminToken;
  if (queryToken) return String(queryToken).trim();

  const bodyToken = req.body?.adminToken;
  if (bodyToken) return String(bodyToken).trim();

  return '';
}

function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  const adminToken = env.security.adminToken;

  app.use((req, res, next) => {
    if (!adminToken) {
      req.isAdmin = true;
      return next();
    }

    req.isAdmin = readAdminToken(req) === adminToken;
    return next();
  });

  const requireAdmin = (req, res, next) => {
    if (req.isAdmin) {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: '需要管理员令牌，请在请求头 x-admin-token 传入。'
    });
  };

  const avatarRepository = createAvatarRepository(pool);
  const avatarService = createAvatarService(avatarRepository);
  const avatarController = createAvatarController(avatarService);

  app.use('/api', createApiRouter(avatarController, { requireAdmin }));

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  app.get('/', (req, res) => {
    res.redirect('/gallery.html');
  });

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || '服务器内部错误';

    if (env.app.nodeEnv !== 'production') {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    res.status(status).json({
      success: false,
      message,
      ...(env.app.nodeEnv !== 'production' ? { stack: err.stack } : {})
    });
  });

  return app;
}

async function ensureReady() {
  await testConnection();
  await ensureSchema();
}

module.exports = {
  createApp,
  ensureReady
};

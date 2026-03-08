const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { testConnection, pool } = require('./db/mysql');
const { createAvatarRepository } = require('./repositories/avatarRepository');
const { createAvatarService } = require('./services/avatarService');
const { createAvatarController } = require('./controllers/avatarController');
const { createApiRouter } = require('./routes/apiRoutes');

function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  const avatarRepository = createAvatarRepository(pool);
  const avatarService = createAvatarService(avatarRepository);
  const avatarController = createAvatarController(avatarService);

  app.use('/api', createApiRouter(avatarController));

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
}

module.exports = {
  createApp,
  ensureReady
};

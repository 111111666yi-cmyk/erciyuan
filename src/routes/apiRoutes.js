const express = require('express');
const multer = require('multer');
const env = require('../config/env');

function createApiRouter(avatarController, options = {}) {
  const router = express.Router();
  const requireAdmin = options.requireAdmin || ((req, res, next) => next());

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.upload.maxFileSizeMb * 1024 * 1024,
      files: 50
    }
  });

  router.get('/avatars', avatarController.list);
  router.post('/avatars/upload', requireAdmin, upload.array('images', 50), avatarController.upload);
  router.post('/avatars/import/urls', requireAdmin, avatarController.importByUrls);
  router.post('/avatars/import/scrape', requireAdmin, avatarController.scrapeImport);
  router.post('/avatars/:id/click', avatarController.click);
  router.patch('/avatars/:id/share-visibility', requireAdmin, avatarController.setShareVisibility);
  router.delete('/avatars/:id', requireAdmin, avatarController.remove);

  return router;
}

module.exports = {
  createApiRouter
};
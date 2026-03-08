const express = require('express');
const multer = require('multer');
const env = require('../config/env');

function createApiRouter(avatarController) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.upload.maxFileSizeMb * 1024 * 1024,
      files: 50
    }
  });

  router.get('/avatars', avatarController.list);
  router.post('/avatars/upload', upload.array('images', 50), avatarController.upload);
  router.post('/avatars/import/urls', avatarController.importByUrls);
  router.post('/avatars/import/scrape', avatarController.scrapeImport);
  router.post('/avatars/:id/click', avatarController.click);
  router.delete('/avatars/:id', avatarController.remove);

  return router;
}

module.exports = {
  createApiRouter
};

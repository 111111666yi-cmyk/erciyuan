function normalizeBoolean(input) {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return input === 1;
  const text = String(input || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes';
}

function createAvatarController(avatarService) {
  async function list(req, res, next) {
    try {
      const data = await avatarService.list(req.query, { isAdmin: req.isAdmin === true });
      res.json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }

  async function upload(req, res, next) {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ success: false, message: '请至少上传一张图片' });
      }

      const created = await avatarService.createFromUploadFiles({
        files,
        title: req.body.title,
        description: req.body.description,
        sourcePlatform: req.body.sourcePlatform || 'upload',
        sourceUrl: req.body.sourceUrl,
        tags: req.body.tags
      });

      res.status(201).json({
        success: true,
        message: `成功入库 ${created.length} 张图片`,
        items: created
      });
    } catch (error) {
      next(error);
    }
  }

  async function importByUrls(req, res, next) {
    try {
      const { items, urls, title, description, sourcePlatform, sourceUrl, tags } = req.body || {};

      const normalizedItems = Array.isArray(items) && items.length
        ? items
        : (Array.isArray(urls) ? urls.map((url) => ({ imageUrl: url })) : []);

      if (!normalizedItems.length) {
        return res.status(400).json({ success: false, message: '请提供可导入的图片 URL 列表' });
      }

      const created = await avatarService.createFromUrlItems(normalizedItems, {
        title,
        description,
        sourcePlatform: sourcePlatform || 'url',
        sourceUrl,
        tags
      });

      res.status(201).json({
        success: true,
        message: `成功导入 ${created.length} 张图片`,
        items: created
      });
    } catch (error) {
      next(error);
    }
  }

  async function scrapeImport(req, res, next) {
    try {
      const { platform, pageUrl, limit, persist, tags } = req.body || {};
      if (!platform || !pageUrl) {
        return res.status(400).json({
          success: false,
          message: 'platform 和 pageUrl 不能为空'
        });
      }

      const result = await avatarService.scrapeAndImport({
        platform,
        pageUrl,
        limit: Number.parseInt(limit, 10) || 30,
        persist: persist !== false,
        tags
      });

      res.status(201).json({
        success: true,
        message: `抓取 ${result.scrapedCount} 张，入库 ${result.importedCount} 张`,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async function click(req, res, next) {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: '非法 ID' });
      }

      const item = await avatarService.click(id);
      if (!item) {
        return res.status(404).json({ success: false, message: '数据不存在' });
      }

      res.json({ success: true, item });
    } catch (error) {
      next(error);
    }
  }

  async function remove(req, res, next) {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: '非法 ID' });
      }

      const item = await avatarService.remove(id);
      if (!item) {
        return res.status(404).json({ success: false, message: '数据不存在' });
      }

      res.json({ success: true, message: '删除成功', item });
    } catch (error) {
      next(error);
    }
  }

  async function setShareVisibility(req, res, next) {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: '非法 ID' });
      }

      const isShareVisible = normalizeBoolean(req.body?.isShareVisible);
      const item = await avatarService.setShareVisibility(id, isShareVisible);
      if (!item) {
        return res.status(404).json({ success: false, message: '数据不存在' });
      }

      res.json({
        success: true,
        message: isShareVisible ? '已恢复到云端展示' : '已从云端隐藏',
        item
      });
    } catch (error) {
      next(error);
    }
  }

  return {
    list,
    upload,
    importByUrls,
    scrapeImport,
    click,
    remove,
    setShareVisibility
  };
}

module.exports = {
  createAvatarController
};
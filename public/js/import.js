mountNav('import');

const urlForm = document.getElementById('url-import-form');
const scrapeForm = document.getElementById('scrape-form');

urlForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage('url-message');

  const submitBtn = document.getElementById('url-submit-btn');
  submitBtn.disabled = true;

  try {
    const urlsText = document.getElementById('urls').value;
    const urls = urlsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      urls,
      title: document.getElementById('url-title').value,
      sourcePlatform: document.getElementById('url-source-platform').value,
      sourceUrl: document.getElementById('url-source-url').value,
      tags: document.getElementById('url-tags').value
    };

    const response = await fetch('/api/avatars/import/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.success) {
      showMessage('url-message', data.message || 'URL 导入失败', 'warn');
      return;
    }

    showMessage('url-message', data.message, 'ok');
    urlForm.reset();
  } catch (error) {
    showMessage('url-message', error.message || 'URL 导入失败', 'warn');
  } finally {
    submitBtn.disabled = false;
  }
});

scrapeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage('scrape-message');

  const submitBtn = document.getElementById('scrape-submit-btn');
  submitBtn.disabled = true;

  try {
    const payload = {
      platform: document.getElementById('platform').value,
      pageUrl: document.getElementById('page-url').value,
      limit: Number.parseInt(document.getElementById('limit').value, 10) || 30,
      persist: document.getElementById('persist').checked,
      tags: document.getElementById('scrape-tags').value
    };

    const response = await fetch('/api/avatars/import/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.success) {
      showMessage('scrape-message', data.message || '采集失败', 'warn');
      return;
    }

    showMessage('scrape-message', data.message, 'ok');
  } catch (error) {
    showMessage('scrape-message', error.message || '采集失败', 'warn');
  } finally {
    submitBtn.disabled = false;
  }
});

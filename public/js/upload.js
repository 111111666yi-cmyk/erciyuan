mountNav('upload');

const form = document.getElementById('upload-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage('message');

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;

  try {
    if (!getAdminToken()) {
      ensureAdminToken();
    }

    const formData = new FormData(form);
    const response = await fetch('/api/avatars/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });

    const data = await response.json();
    if (!data.success) {
      showMessage('message', data.message || '上传失败', 'warn');
      return;
    }

    showMessage('message', data.message, 'ok');
    form.reset();
  } catch (error) {
    showMessage('message', error.message || '上传失败', 'warn');
  } finally {
    submitBtn.disabled = false;
  }
});

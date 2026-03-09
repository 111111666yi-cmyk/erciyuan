mountNav('gallery');

const state = {
  page: 1,
  limit: 24
};

function buildQuery() {
  const source = document.getElementById('source').value.trim();
  const tag = document.getElementById('tag').value.trim();
  const keyword = document.getElementById('keyword').value.trim();
  const scope = document.getElementById('scope').value;

  const params = new URLSearchParams();
  params.set('page', String(state.page));
  params.set('limit', String(state.limit));
  params.set('scope', scope || 'public');
  if (source) params.set('source', source);
  if (tag) params.set('tag', tag);
  if (keyword) params.set('keyword', keyword);
  return params.toString();
}

async function sendAdminRequest(url, init) {
  let headers = authHeaders(init.headers || {});
  if (!headers['x-admin-token']) {
    const token = ensureAdminToken();
    if (!token) {
      throw new Error('未设置管理员令牌');
    }
    headers = authHeaders(init.headers || {});
  }

  return fetch(url, { ...init, headers });
}

function renderItems(items) {
  const root = document.getElementById('gallery-grid');
  root.innerHTML = '';

  if (!items.length) {
    root.innerHTML = '<div class="panel">暂无数据，请先上传或导入。</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';

    const tags = (item.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');
    const visibilityLabel = item.isShareVisible ? '公开' : '隐藏';

    card.innerHTML = `
      <img src="${item.storagePath}" alt="${item.title}" loading="lazy" />
      <div class="card-body">
        <p class="card-title">${item.title}</p>
        <div class="meta-row">ID: ${item.id} | 来源: ${item.sourcePlatform} | 点击: <span data-click-id="${item.id}">${item.clickCount}</span></div>
        <div class="meta-row">云端状态: <span class="status-pill ${item.isShareVisible ? 'public' : 'hidden'}">${visibilityLabel}</span></div>
        <div class="tag-list">${tags}</div>
        <div class="meta-row">${new Date(item.createdAt).toLocaleString()}</div>
        <div class="card-actions">
          <a class="btn secondary" href="${item.storagePath}" download>下载</a>
          <button class="secondary" data-share-id="${item.id}" data-next-visible="${item.isShareVisible ? '0' : '1'}" type="button">${item.isShareVisible ? '云端隐藏' : '恢复公开'}</button>
          <button class="danger" data-delete-id="${item.id}" type="button">删除</button>
        </div>
      </div>
    `;

    card.addEventListener('click', async () => {
      const response = await fetch(`/api/avatars/${item.id}/click`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        const clickEl = card.querySelector(`[data-click-id="${item.id}"]`);
        clickEl.textContent = data.item.clickCount;
      }
    });

    const shareBtn = card.querySelector(`[data-share-id="${item.id}"]`);
    shareBtn.addEventListener('click', async (event) => {
      event.stopPropagation();

      const nextVisible = shareBtn.getAttribute('data-next-visible') === '1';
      const actionLabel = nextVisible ? '恢复公开' : '从云端隐藏';
      const ok = window.confirm(`确认${actionLabel}「${item.title}」吗？`);
      if (!ok) return;

      try {
        const response = await sendAdminRequest(`/api/avatars/${item.id}/share-visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isShareVisible: nextVisible })
        });

        const data = await response.json();
        if (!data.success) {
          showMessage('message', data.message || '操作失败', 'warn');
          return;
        }

        showMessage('message', data.message, 'ok');
        load();
      } catch (error) {
        showMessage('message', error.message || '操作失败', 'warn');
      }
    });

    const deleteBtn = card.querySelector(`[data-delete-id="${item.id}"]`);
    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();

      const ok = window.confirm(`确认删除图片「${item.title}」吗？`);
      if (!ok) return;

      try {
        const response = await sendAdminRequest(`/api/avatars/${item.id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!data.success) {
          showMessage('message', data.message || '删除失败', 'warn');
          return;
        }

        showMessage('message', '删除成功', 'ok');
        load();
      } catch (error) {
        showMessage('message', error.message || '删除失败', 'warn');
      }
    });

    root.appendChild(card);
  });
}

async function load() {
  hideMessage('message');

  const response = await fetch(`/api/avatars?${buildQuery()}`);
  const data = await response.json();

  if (!data.success) {
    showMessage('message', data.message || '加载失败', 'warn');
    return;
  }

  renderItems(data.items || []);

  const totalPage = Math.max(1, Math.ceil((data.total || 0) / state.limit));
  document.getElementById('pager-info').textContent = `第 ${state.page} / ${totalPage} 页，共 ${data.total} 条`;
  document.getElementById('prev-btn').disabled = state.page <= 1;
  document.getElementById('next-btn').disabled = state.page >= totalPage;
}

document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.page = 1;
  load();
});

document.getElementById('prev-btn').addEventListener('click', () => {
  state.page -= 1;
  load();
});

document.getElementById('next-btn').addEventListener('click', () => {
  state.page += 1;
  load();
});

load();

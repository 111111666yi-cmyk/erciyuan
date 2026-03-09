const navHtml = `
<header class="topbar">
  <div class="title">二次元头像展览库</div>
  <nav>
    <a href="/gallery.html" data-nav="gallery">图库</a>
    <a href="/upload.html" data-nav="upload">上传</a>
    <a href="/import.html" data-nav="import">外部采集</a>
    <button type="button" class="token-btn" id="admin-token-btn">管理员令牌</button>
  </nav>
</header>
`;

function mountNav(activeKey) {
  const root = document.getElementById('nav-root');
  if (!root) return;

  root.innerHTML = navHtml;
  const target = root.querySelector(`[data-nav="${activeKey}"]`);
  if (target) {
    target.classList.add('active');
  }

  const tokenBtn = document.getElementById('admin-token-btn');
  if (tokenBtn) {
    const refreshText = () => {
      tokenBtn.textContent = getAdminToken() ? '管理员令牌：已设置' : '管理员令牌';
    };

    refreshText();
    tokenBtn.addEventListener('click', () => {
      const current = getAdminToken();
      const next = window.prompt('请输入管理员令牌（留空可清除）', current || '');
      if (next === null) return;
      setAdminToken(next.trim());
      refreshText();
    });
  }
}

function getAdminToken() {
  return window.localStorage.getItem('adminToken') || '';
}

function setAdminToken(token) {
  if (!token) {
    window.localStorage.removeItem('adminToken');
    return;
  }
  window.localStorage.setItem('adminToken', token);
}

function ensureAdminToken() {
  const existing = getAdminToken();
  if (existing) return existing;

  const entered = window.prompt('请输入管理员令牌');
  if (!entered) return '';
  setAdminToken(entered.trim());
  return getAdminToken();
}

function authHeaders(baseHeaders = {}) {
  const token = getAdminToken();
  if (!token) {
    return { ...baseHeaders };
  }
  return {
    ...baseHeaders,
    'x-admin-token': token
  };
}

function showMessage(targetId, text, type = 'ok') {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.className = `message ${type === 'ok' ? 'ok' : 'warn'}`;
  el.textContent = text;
  el.hidden = false;
}

function hideMessage(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.hidden = true;
}

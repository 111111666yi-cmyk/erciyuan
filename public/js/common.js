const navHtml = `
<header class="topbar">
  <div class="title">二次元头像展览库</div>
  <nav>
    <a href="/gallery.html" data-nav="gallery">图库</a>
    <a href="/upload.html" data-nav="upload">上传</a>
    <a href="/import.html" data-nav="import">外部采集</a>
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

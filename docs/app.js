async function run() {
  const meta = document.getElementById('meta');
  const grid = document.getElementById('grid');

  try {
    const response = await fetch('./data.json', { cache: 'no-store' });
    const data = await response.json();

    meta.textContent = `生成时间: ${new Date(data.generatedAt).toLocaleString()} | 总数: ${data.total}`;

    for (const item of data.items || []) {
      const card = document.createElement('article');
      card.className = 'card';

      const tags = (item.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join('');

      card.innerHTML = `
        <img src="${item.imagePath}" alt="${item.title}" loading="lazy" />
        <div class="body">
          <p class="title">${item.title}</p>
          <div class="row">来源: ${item.sourcePlatform || '-'}</div>
          <div class="row">${new Date(item.createdAt).toLocaleString()}</div>
          <div class="tags">${tags}</div>
        </div>
      `;

      grid.appendChild(card);
    }
  } catch (error) {
    meta.textContent = `加载失败: ${error.message}`;
  }
}

run();

/**
 * ========================================================
 * ARK LEGACY WORLD *VN* - BIO LINK & 465 CATALOG APP.JS
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DATA REFERENCES
  const items = Array.isArray(window.ARK_ITEMS) ? window.ARK_ITEMS : [];
  const bounty = window.ARK_BOUNTY || {};

  // State Management
  const state = {
    currentTab: 'tab-bio',
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'id-asc',
    itemsPerPage: 36,
    currentPage: 1,
    currentBountyCat: 'carnivores',
  };

  // Category Names Map
  const CATEGORY_NAMES = {
    all: 'Tất cả sản phẩm',
    dinos: 'Khủng Long & Thú Chiến',
    weapons_tools: 'Vũ Khí & Dụng Cụ',
    armors: 'Giáp & Khiên Bảo Vệ',
    saddles: 'Yên Cưỡi Khủng Long',
    structures: 'Công Trình & Kiến Trúc',
    consumables: 'Tiêu Dùng & Dược Phẩm',
    resources: 'Tài Nguyên & Vật Liệu',
  };

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnGotoItems = document.getElementById('btn-goto-items');

  const searchInput = document.getElementById('catalog-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-search');
  const catPills = document.querySelectorAll('.cat-pill');
  const sortSelect = document.getElementById('catalog-sort');
  const itemsGrid = document.getElementById('items-grid');
  const filteredCountNum = document.getElementById('filtered-count-num');
  const emptyState = document.getElementById('empty-state');
  const paginationBar = document.getElementById('pagination-bar');
  const btnLoadMore = document.getElementById('btn-load-more');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  const bountyCatButtons = document.querySelectorAll('.bounty-cat-btn');
  const bountyDinosGrid = document.getElementById('bounty-dinos-grid');

  const itemModal = document.getElementById('item-modal');
  const modalCardContent = document.getElementById('modal-card-content');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // ========================================================
  // 2. TAB SWITCHING
  // ========================================================
  function switchTab(tabId) {
    state.currentTab = tabId;
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabContents.forEach(sec => {
      sec.classList.toggle('active', sec.id === tabId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL hash
    const hash = tabId.replace('tab-', '');
    if (history.replaceState) {
      history.replaceState(null, null, `#${hash}`);
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  if (btnGotoItems) {
    btnGotoItems.addEventListener('click', () => {
      switchTab('tab-items');
    });
  }

  // Handle Initial Hash
  if (window.location.hash) {
    const rawHash = window.location.hash.replace('#', '');
    const targetTab = 'tab-' + rawHash;
    if (document.getElementById(targetTab)) {
      switchTab(targetTab);
    }
  }

  // ========================================================
  // 3. TOAST NOTIFICATION
  // ========================================================
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Copy to Clipboard
  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || `Đã sao chép: ${text}`);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || `Đã sao chép: ${text}`);
    } catch (_) {
      showToast(`Mã ID: ${text}`);
    }
    document.body.removeChild(tempInput);
  }

  // ========================================================
  // 4. CATALOG FILTERING & SORTING
  // ========================================================
  function getFilteredItems() {
    return items.filter(item => {
      // Category filter
      if (state.selectedCategory !== 'all' && item.category !== state.selectedCategory) {
        return false;
      }
      // Search filter
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase().trim();
        const num = String(item.number || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();
        const name = String(item.name || '').toLowerCase();
        const id = String(item.id || '').toLowerCase();
        
        const matchId = num.includes(q) || code === q || id.includes(q) || ('#' + num).includes(q);
        const matchName = name.includes(q);
        if (!matchId && !matchName) return false;
      }
      return true;
    }).sort((a, b) => {
      const pA = getEffectivePrice(a);
      const pB = getEffectivePrice(b);
      const numA = parseInt(a.number, 10) || 0;
      const numB = parseInt(b.number, 10) || 0;

      switch (state.sortBy) {
        case 'id-desc':
          return numB - numA;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return pA - pB;
        case 'price-desc':
          return pB - pA;
        case 'id-asc':
        default:
          return numA - numB;
      }
    });
  }

  function getEffectivePrice(item) {
    if (!item.pricing) return 0;
    if (item.pricing.has_levels) {
      return item.pricing.lvl1?.total || item.pricing.lvl1?.pts || 0;
    }
    return item.pricing.total || item.pricing.pts || 0;
  }

  function renderCatalog() {
    const filtered = getFilteredItems();
    filteredCountNum.textContent = filtered.length;

    if (filtered.length === 0) {
      itemsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      paginationBar.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';

    // Pagination slice
    const totalToShow = state.currentPage * state.itemsPerPage;
    const itemsToRender = filtered.slice(0, totalToShow);

    itemsGrid.innerHTML = itemsToRender.map(item => createItemCardHtml(item)).join('');

    // Toggle Load More button
    if (totalToShow >= filtered.length) {
      paginationBar.style.display = 'none';
    } else {
      paginationBar.style.display = 'block';
      btnLoadMore.querySelector('span').textContent = `Xem thêm (${filtered.length - totalToShow} món còn lại)...`;
    }

    attachCardEventListeners();
  }

  function createItemCardHtml(item) {
    const hasLevels = item.has_levels && item.pricing && item.pricing.has_levels;
    let priceHtml = '';

    if (hasLevels) {
      const l1 = item.pricing.lvl1?.total || item.pricing.lvl1?.pts || 0;
      const l2 = item.pricing.lvl2?.total || item.pricing.lvl2?.pts || 0;
      const l3 = item.pricing.lvl3?.total || item.pricing.lvl3?.pts || 0;

      priceHtml = `
        <div class="item-price-section">
          <div class="price-levels-chips">
            <div class="level-chip" title="Cấp 1: Bản vẽ mặc định">
              <span class="lvl-tag">Cấp 1</span>
              <span class="lvl-val">${l1}p</span>
            </div>
            <div class="level-chip" title="Cấp 2: Bản vẽ random hang">
              <span class="lvl-tag">Cấp 2</span>
              <span class="lvl-val">${l2}p</span>
            </div>
            <div class="level-chip" title="Cấp 3: Bản vẽ max chỉ số">
              <span class="lvl-tag">Cấp 3</span>
              <span class="lvl-val">${l3}p</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const pts = item.pricing?.pts || 0;
      const tax = item.pricing?.tax || Math.ceil(pts * 0.1);
      const total = item.pricing?.total || (pts + tax);

      priceHtml = `
        <div class="item-price-section">
          <div class="price-row-simple">
            <span class="price-pts">${total} Điểm</span>
            <span class="price-tax">(${pts}p + ${tax}p thuế)</span>
          </div>
        </div>
      `;
    }

    const imgSrc = item.relativeImage || 'assets/images/banner_welcome.png';
    const catLabel = CATEGORY_NAMES[item.category] || item.category;

    return `
      <div class="item-card" data-number="${item.number}" data-id="${item.id}">
        <div class="item-card-header">
          <span class="item-id-badge">#${item.number}</span>
          <span class="item-cat-tag">${catLabel.split('&')[0].trim()}</span>
        </div>
        <div class="item-img-box">
          <img src="${imgSrc}" alt="${item.name}" class="item-img" loading="lazy" onerror="this.onerror=null; this.src='assets/images/banner_welcome.png';">
        </div>
        <div class="item-name" title="${item.name}">${item.name}</div>
        ${priceHtml}
        <div class="item-card-actions">
          <button class="copy-id-btn" data-copy="#${item.number}" title="Sao chép mã ID để mua trong Discord">
            <i class="fa-solid fa-copy"></i>
            <span>Copy #${item.number}</span>
          </button>
          <a href="https://discord.gg/YQS4gJYZ3" target="_blank" rel="noopener noreferrer" class="buy-discord-btn" title="Vào Discord mua">
            <i class="fa-brands fa-discord"></i>
          </a>
        </div>
      </div>
    `;
  }

  function attachCardEventListeners() {
    // Copy ID buttons
    document.querySelectorAll('.copy-id-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.dataset.copy;
        copyToClipboard(code, `Đã copy mã ${code}! Vào Discord nhập tại [🛒 Mua Đồ Theo Mã ID] nhé!`);
      });
    });

    // Buy discord buttons stop propagation
    document.querySelectorAll('.buy-discord-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // Card click opens modal
    document.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        const num = card.dataset.number;
        const item = items.find(it => it.number === num);
        if (item) openItemModal(item);
      });
    });
  }

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
    renderCatalog();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    state.currentPage = 1;
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    renderCatalog();
  });

  // Category pills handler
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategory = pill.dataset.category;
      state.currentPage = 1;
      renderCatalog();
    });
  });

  // Sort select handler
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.currentPage = 1;
    renderCatalog();
  });

  // Load more button
  btnLoadMore.addEventListener('click', () => {
    state.currentPage++;
    renderCatalog();
  });

  // Reset filters
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      state.selectedCategory = 'all';
      catPills.forEach(p => p.classList.toggle('active', p.dataset.category === 'all'));
      state.sortBy = 'id-asc';
      sortSelect.value = 'id-asc';
      state.currentPage = 1;
      renderCatalog();
    });
  }

  // ========================================================
  // 5. ITEM DETAIL MODAL
  // ========================================================
  function openItemModal(item) {
    const imgSrc = item.relativeImage || 'assets/images/banner_welcome.png';
    const catLabel = CATEGORY_NAMES[item.category] || item.category;
    const hasLevels = item.has_levels && item.pricing && item.pricing.has_levels;

    let priceDetailsHtml = '';
    if (hasLevels) {
      priceDetailsHtml = `
        <div style="background: rgba(13, 19, 33, 0.8); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; margin: 14px 0;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--neon-cyan); margin-bottom: 8px; text-transform: uppercase;">
            <i class="fa-solid fa-layer-group"></i> 3 Cấp Độ Bản Vẽ & Điểm Quy Đổi:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px;">
              <div>
                <strong style="color: #ffffff; font-size: 0.85rem;">Cấp 1:</strong>
                <span style="font-size: 0.75rem; color: var(--text-dim);"> (${item.pricing.lvl1?.desc || 'Bản vẽ mặc định'})</span>
              </div>
              <strong style="color: var(--neon-green); font-family: var(--font-display); font-size: 1.05rem;">${item.pricing.lvl1?.total || item.pricing.lvl1?.pts} Điểm</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px;">
              <div>
                <strong style="color: #ffffff; font-size: 0.85rem;">Cấp 2:</strong>
                <span style="font-size: 0.75rem; color: var(--text-dim);"> (${item.pricing.lvl2?.desc || 'Bản vẽ random hang'})</span>
              </div>
              <strong style="color: var(--neon-cyan); font-family: var(--font-display); font-size: 1.05rem;">${item.pricing.lvl2?.total || item.pricing.lvl2?.pts} Điểm</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px;">
              <div>
                <strong style="color: #ffffff; font-size: 0.85rem;">Cấp 3:</strong>
                <span style="font-size: 0.75rem; color: var(--text-dim);"> (${item.pricing.lvl3?.desc || 'Bản vẽ max chỉ số'})</span>
              </div>
              <strong style="color: var(--neon-gold); font-family: var(--font-display); font-size: 1.05rem;">${item.pricing.lvl3?.total || item.pricing.lvl3?.pts} Điểm</strong>
            </div>
          </div>
        </div>
      `;
    } else {
      const pts = item.pricing?.pts || 0;
      const tax = item.pricing?.tax || Math.ceil(pts * 0.1);
      const total = item.pricing?.total || (pts + tax);
      const unit = item.pricing?.unit || item.defaultAmount || 1;

      priceDetailsHtml = `
        <div style="background: rgba(13, 19, 33, 0.8); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px; margin: 14px 0; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Tổng Điểm Quy Đổi (Đã gồm 10% thuế)</div>
          <div style="font-size: 1.8rem; font-weight: 800; font-family: var(--font-display); color: var(--neon-green);">${total} Điểm</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            Giá gốc: <strong>${pts}p</strong> + Thuế 10%: <strong>${tax}p</strong> • Đơn vị: <strong>${unit}</strong>
          </div>
        </div>
      `;
    }

    modalCardContent.innerHTML = `
      <button class="modal-close-btn" id="modal-close-btn">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div style="text-align: center;">
        <span class="item-id-badge" style="font-size: 1rem; padding: 3px 12px;">MÃ ID: #${item.number}</span>
        <h3 style="font-size: 1.3rem; font-weight: 800; margin: 10px 0 4px 0; color: #ffffff;">${item.name}</h3>
        <span style="font-size: 0.8rem; color: var(--neon-cyan); background: rgba(6,182,212,0.15); padding: 3px 10px; border-radius: 999px; font-weight: 600;">
          ${catLabel}
        </span>

        <div style="width: 160px; height: 160px; margin: 16px auto; background: rgba(13,19,33,0.7); border-radius: 16px; display: flex; align-items: center; justify-content: center; padding: 12px; border: 1px solid var(--border-subtle);">
          <img src="${imgSrc}" alt="${item.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        </div>

        ${priceDetailsHtml}

        <div style="background: rgba(88, 101, 242, 0.12); border: 1px dashed rgba(88, 101, 242, 0.4); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; text-align: left;">
          <strong style="color: #ffffff;"><i class="fa-brands fa-discord" style="color: #5865f2;"></i> Cách mua trong Discord:</strong><br>
          1. Bấm nút <strong>[Copy Mã #${item.number}]</strong> bên dưới.<br>
          2. Vào kênh <span class="tag-channel">#đổi-điểm</span> trong Discord Server.<br>
          3. Bấm nút <strong>[🛒 Mua Đồ Theo Mã ID]</strong> và dán mã <code>${item.number}</code> để nhận đồ!
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="modal-copy-btn" class="cta-btn" style="flex: 1; justify-content: center; background: var(--neon-green); color: #042f2e;">
            <i class="fa-solid fa-copy"></i>
            <span>Copy Mã #${item.number}</span>
          </button>
          <a href="https://discord.gg/YQS4gJYZ3" target="_blank" rel="noopener noreferrer" class="cta-btn" style="flex: 1; justify-content: center; background: #5865f2; color: #ffffff; text-decoration: none; box-shadow: 0 0 16px rgba(88, 101, 242, 0.4);">
            <i class="fa-brands fa-discord"></i>
            <span>Vào Discord Mua</span>
          </a>
        </div>
      </div>
    `;

    itemModal.style.display = 'flex';

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-copy-btn').addEventListener('click', () => {
      copyToClipboard(`#${item.number}`, `Đã copy mã #${item.number}! Vào Discord bấm [🛒 Mua Đồ Theo Mã ID] để mua ngay!`);
    });
  }

  function closeModal() {
    itemModal.style.display = 'none';
  }

  itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && itemModal.style.display === 'flex') {
      closeModal();
    }
  });

  // ========================================================
  // 6. BOUNTY HANDBOOK RENDERING
  // ========================================================
  function renderBountyDinos() {
    if (!bounty.categories) return;

    const catKey = state.currentBountyCat;
    const catData = bounty.categories[catKey];
    if (!catData || !Array.isArray(catData.dinos)) return;

    bountyDinosGrid.innerHTML = catData.dinos.map(dino => {
      const isCarnivore = catKey === 'carnivores';
      const imgSrc = `assets/images/Khủng Long/${dino.file}`;
      
      const conditionsHtml = (dino.conditions || []).map(c => `
        <div class="condition-pill">
          <span class="cond-lvl">🎯 ${c.level}</span>
          <span class="cond-pts">+${c.points} Điểm</span>
        </div>
      `).join('');

      return `
        <div class="bounty-dino-card glass-panel">
          <div class="bounty-dino-img-wrap">
            <img src="${imgSrc}" alt="${dino.name}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/banner_welcome.png';">
          </div>
          <div class="bounty-dino-info">
            <div class="bounty-dino-title">
              <h3>${dino.name}</h3>
              <span class="bounty-diet-badge ${isCarnivore ? '' : 'herbivore'}">
                ${dino.diet}
              </span>
            </div>
            <div class="bounty-diff">
              <i class="fa-solid fa-triangle-exclamation"></i> ${dino.difficulty}
            </div>
            <p class="bounty-tip">${dino.tip}</p>
            <div class="bounty-conditions">
              ${conditionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  bountyCatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      bountyCatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentBountyCat = btn.dataset.bcat;
      renderBountyDinos();
    });
  });

  // ========================================================
  // 7. INITIAL RENDER
  // ========================================================
  renderCatalog();
  renderBountyDinos();
});

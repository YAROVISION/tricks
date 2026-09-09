/**
 * 100 Трюків Маніпуляцій у Спілкуванні
 * Interactive Application Logic
 */

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    tricks: (typeof TRICKS_DATA !== 'undefined') ? TRICKS_DATA : [],
    searchQuery: '',
    selectedCategory: 'all',
    selectedLevel: 'all',
    showFavoritesOnly: false,
    favorites: new Set(),
    activeTrickId: null,
    currentTrainerTrick: null
  };

  // --- DOM Elements ---
  const elements = {
    grid: document.getElementById('tricks-grid'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoriesContainer: document.getElementById('categories-container'),
    dangerPills: document.querySelectorAll('.danger-pill'),
    toggleFavoritesBtn: document.getElementById('toggle-favorites-btn'),
    resultsCount: document.getElementById('results-count'),
    statFavorites: document.getElementById('stat-favorites'),
    
    // Detail Modal
    detailModal: document.getElementById('detail-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalNumber: document.getElementById('modal-number'),
    modalLevel: document.getElementById('modal-level'),
    modalCategory: document.getElementById('modal-category'),
    modalTitle: document.getElementById('modal-title'),
    modalDescription: document.getElementById('modal-description'),
    modalExample: document.getElementById('modal-example'),
    modalDefense: document.getElementById('modal-defense'),
    modalFavToggle: document.getElementById('modal-fav-toggle'),
    modalCopyBtn: document.getElementById('modal-copy-btn'),

    // Trainer Modal
    btnRandomTrainer: document.getElementById('btn-random-trainer'),
    trainerModal: document.getElementById('trainer-modal'),
    trainerCloseBtn: document.getElementById('trainer-close-btn'),
    trainerCategory: document.getElementById('trainer-category'),
    trainerExample: document.getElementById('trainer-example'),
    trainerAnswerSection: document.getElementById('trainer-answer-section'),
    trainerTrickName: document.getElementById('trainer-trick-name'),
    trainerDescription: document.getElementById('trainer-description'),
    trainerDefense: document.getElementById('trainer-defense'),
    trainerRevealBtn: document.getElementById('trainer-reveal-btn'),
    trainerNextBtn: document.getElementById('trainer-next-btn')
  };

  // --- Initialize Application ---
  function init() {
    loadFavoritesFromStorage();
    bindEvents();
    render();
    updateFavoriteCountBadge();
  }

  // --- LocalStorage Helpers ---
  function loadFavoritesFromStorage() {
    try {
      const stored = localStorage.getItem('manipulation_tricks_favs');
      if (stored) {
        const arr = JSON.parse(stored);
        state.favorites = new Set(arr);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
  }

  function saveFavoritesToStorage() {
    try {
      localStorage.setItem('manipulation_tricks_favs', JSON.stringify([...state.favorites]));
    } catch (e) {
      console.warn('Could not save to LocalStorage:', e);
    }
    updateFavoriteCountBadge();
  }

  function updateFavoriteCountBadge() {
    if (elements.statFavorites) {
      elements.statFavorites.textContent = state.favorites.size;
    }
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
      render();
    });

    // Clear search
    elements.searchClear.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClear.style.display = 'none';
      elements.searchInput.focus();
      render();
    });

    // Category chips
    elements.categoriesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-chip');
      if (!btn) return;
      document.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCategory = btn.dataset.category;
      render();
    });

    // Danger level pills
    elements.dangerPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.dangerPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedLevel = pill.dataset.level;
        render();
      });
    });

    // Toggle favorites
    elements.toggleFavoritesBtn.addEventListener('click', () => {
      state.showFavoritesOnly = !state.showFavoritesOnly;
      elements.toggleFavoritesBtn.classList.toggle('active', state.showFavoritesOnly);
      render();
    });

    // Modal close events
    elements.modalCloseBtn.addEventListener('click', closeDetailModal);
    elements.detailModal.addEventListener('click', (e) => {
      if (e.target === elements.detailModal) closeDetailModal();
    });

    // Modal favorites toggle
    elements.modalFavToggle.addEventListener('click', () => {
      if (!state.activeTrickId) return;
      toggleFavorite(state.activeTrickId);
      updateModalFavButton(state.activeTrickId);
      render();
    });

    // Copy defense to clipboard
    elements.modalCopyBtn.addEventListener('click', () => {
      const defenseText = elements.modalDefense.textContent;
      navigator.clipboard.writeText(defenseText).then(() => {
        const originalText = elements.modalCopyBtn.textContent;
        elements.modalCopyBtn.textContent = '✓ Скопійовано!';
        elements.modalCopyBtn.style.background = '#10b981';
        setTimeout(() => {
          elements.modalCopyBtn.textContent = originalText;
          elements.modalCopyBtn.style.background = '';
        }, 1800);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });

    // Trainer open/close
    elements.btnRandomTrainer.addEventListener('click', openRandomTrainer);
    elements.trainerCloseBtn.addEventListener('click', closeTrainerModal);
    elements.trainerModal.addEventListener('click', (e) => {
      if (e.target === elements.trainerModal) closeTrainerModal();
    });

    // Trainer actions
    elements.trainerRevealBtn.addEventListener('click', () => {
      elements.trainerAnswerSection.style.display = 'block';
      elements.trainerRevealBtn.style.display = 'none';
    });

    elements.trainerNextBtn.addEventListener('click', () => {
      pickRandomTrainerTrick();
    });

    // Global keyboard shortcuts (ESC to close modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDetailModal();
        closeTrainerModal();
      }
    });
  }

  // --- Filter Logic ---
  function getFilteredTricks() {
    return state.tricks.filter(item => {
      // Category filter
      if (state.selectedCategory !== 'all' && item.category !== state.selectedCategory) {
        return false;
      }

      // Level filter
      if (state.selectedLevel !== 'all' && item.level !== state.selectedLevel) {
        return false;
      }

      // Favorites filter
      if (state.showFavoritesOnly && !state.favorites.has(item.id)) {
        return false;
      }

      // Search query filter
      if (state.searchQuery) {
        const q = state.searchQuery;
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inExample = item.example.toLowerCase().includes(q);
        const inDefense = item.defense.toLowerCase().includes(q);
        const inCategory = item.category.toLowerCase().includes(q);
        const inTags = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
        const inNumber = ('#' + item.number).includes(q) || String(item.number) === q;

        if (!inTitle && !inDesc && !inExample && !inDefense && !inCategory && !inTags && !inNumber) {
          return false;
        }
      }

      return true;
    });
  }

  // --- Rendering Grid ---
  function render() {
    const filtered = getFilteredTricks();

    // Update Counter
    elements.resultsCount.textContent = `Показано ${filtered.length} із ${state.tricks.length}`;

    if (filtered.length === 0) {
      elements.grid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h3 class="empty-title">Нічого не знайдено</h3>
          <p class="empty-text">Спробуйте змінити пошуковий запит або скинути фільтри категорій.</p>
          <button class="btn btn-secondary" onclick="window.resetFilters()">Скинути всі фільтри</button>
        </div>
      `;
      return;
    }

    // Render Cards
    const html = filtered.map(trick => {
      const isFav = state.favorites.has(trick.id);
      const levelClass = getLevelBadgeClass(trick.level_color);

      return `
        <article class="trick-card" data-id="${trick.id}">
          <div>
            <div class="card-header">
              <div class="badge-group">
                <span class="card-number">#${trick.number}</span>
                <span class="card-level-badge ${levelClass}">${trick.level}</span>
              </div>
              <button class="favorite-btn ${isFav ? 'favorited' : ''}" 
                      title="${isFav ? 'Видалити з вибраного' : 'Додати до вибраного'}" 
                      onclick="window.toggleCardFav(event, ${trick.id})">
                <svg viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>

            <div class="card-category">${escapeHtml(trick.category)}</div>
            <h3 class="card-title">${escapeHtml(trick.title)}</h3>
            <p class="card-description">${escapeHtml(trick.description)}</p>

            <div class="card-quote">
              ${escapeHtml(trick.example)}
            </div>
          </div>

          <div class="card-footer">
            <div class="card-tags">
              ${(trick.tags || []).slice(0, 3).map(tag => `<span class="tag-badge">#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <button class="btn-card-detail" onclick="window.openDetail(${trick.id})">
              <span>Захист</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    elements.grid.innerHTML = html;
  }

  // --- Badge Styling Helper ---
  function getLevelBadgeClass(levelColor) {
    switch (levelColor) {
      case 'info': return 'level-badge-info';
      case 'warning': return 'level-badge-warning';
      case 'danger': return 'level-badge-danger';
      case 'critical': return 'level-badge-critical';
      default: return 'level-badge-info';
    }
  }

  // --- Favorite Toggle ---
  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
    } else {
      state.favorites.add(id);
    }
    saveFavoritesToStorage();
  }

  window.toggleCardFav = function (event, id) {
    event.stopPropagation();
    toggleFavorite(id);
    render();
  };

  // --- Detail Modal Logic ---
  window.openDetail = function (id) {
    const trick = state.tricks.find(t => t.id === id);
    if (!trick) return;

    state.activeTrickId = id;

    elements.modalNumber.textContent = `#${trick.number}`;
    elements.modalLevel.textContent = trick.level;
    elements.modalLevel.className = `card-level-badge ${getLevelBadgeClass(trick.level_color)}`;
    elements.modalCategory.textContent = trick.category;
    elements.modalTitle.textContent = trick.title;
    elements.modalDescription.textContent = trick.description;
    elements.modalExample.textContent = trick.example;
    elements.modalDefense.textContent = trick.defense;

    updateModalFavButton(id);

    elements.detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function updateModalFavButton(id) {
    const isFav = state.favorites.has(id);
    elements.modalFavToggle.textContent = isFav ? '★ Видалити з вибраного' : '☆ Додати до вибраного';
    elements.modalFavToggle.style.color = isFav ? '#fbbf24' : '';
  }

  function closeDetailModal() {
    elements.detailModal.classList.remove('active');
    document.body.style.overflow = '';
    state.activeTrickId = null;
  }

  // --- Trainer / Randomizer Logic ---
  function openRandomTrainer() {
    elements.trainerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    pickRandomTrainerTrick();
  }

  function pickRandomTrainerTrick() {
    const randomIndex = Math.floor(Math.random() * state.tricks.length);
    const trick = state.tricks[randomIndex];
    state.currentTrainerTrick = trick;

    elements.trainerCategory.textContent = trick.category;
    elements.trainerExample.textContent = trick.example;
    elements.trainerTrickName.textContent = `Трюк №${trick.number}: ${trick.title}`;
    elements.trainerDescription.textContent = trick.description;
    elements.trainerDefense.textContent = trick.defense;

    elements.trainerAnswerSection.style.display = 'none';
    elements.trainerRevealBtn.style.display = 'inline-flex';
  }

  function closeTrainerModal() {
    elements.trainerModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- Global Helper for Reset Filters ---
  window.resetFilters = function () {
    state.searchQuery = '';
    state.selectedCategory = 'all';
    state.selectedLevel = 'all';
    state.showFavoritesOnly = false;

    elements.searchInput.value = '';
    elements.searchClear.style.display = 'none';
    elements.toggleFavoritesBtn.classList.remove('active');

    document.querySelectorAll('.category-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.category === 'all');
    });

    elements.dangerPills.forEach(el => {
      el.classList.toggle('active', el.dataset.level === 'all');
    });

    render();
  };

  window.filterByCategory = function (categoryName) {
    const chip = document.querySelector(`.category-chip[data-category="${categoryName}"]`);
    if (chip) chip.click();
  };

  // Safe HTML Escape
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', init);

})();

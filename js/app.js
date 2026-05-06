const App = (() => {
  let currentPage = 'dashboard';
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewResults = [];
  let isFlipped = false;

  function init() {
    if (!Storage.hasCompletedSetup()) {
      renderSetupPage();
    } else {
      renderApp();
      navigateTo('dashboard');
    }
  }

  // ── Toast ──
  function showToast(msg, type = 'info') {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.remove(); }, 2500);
  }

  // ── Setup Page ──
  function renderSetupPage() {
    document.getElementById('app').innerHTML = `
      <div class="setup-page">
        <h2>📚 FlowReview</h2>
        <p class="subtitle">选择你要学习的词库，开始高效复习</p>
        <div class="book-grid" id="bookGrid"></div>
        <button class="btn btn-primary btn-block" id="startBtn" disabled>开始学习</button>
      </div>`;
    const grid = document.getElementById('bookGrid');
    WordBanks.books.forEach(book => {
      const div = document.createElement('div');
      div.className = 'book-option';
      div.dataset.id = book.id;
      div.innerHTML = `<div class="book-icon">${book.icon}</div><div class="book-info"><h3>${book.name}</h3><p>${book.count} 个核心词汇</p></div><div class="check"></div>`;
      div.onclick = () => { div.classList.toggle('selected'); document.getElementById('startBtn').disabled = !document.querySelector('.book-option.selected'); };
      grid.appendChild(div);
    });
    document.getElementById('startBtn').onclick = () => {
      const selected = [...document.querySelectorAll('.book-option.selected')].map(el => el.dataset.id);
      if (!selected.length) return;
      Storage.setSelectedBooks(selected);
      selected.forEach(id => {
        const words = WordBanks[id];
        if (words) Storage.importWords(words, id);
      });
      showToast('词库导入成功！', 'success');
      renderApp();
      navigateTo('dashboard');
    };
  }

  // ── Main App Shell ──
  function renderApp() {
    document.getElementById('app').innerHTML = `
      <div class="app">
        <header class="header">
          <h1>FlowReview</h1>
          <div class="header-icon" onclick="App.navigateTo('settings')" title="设置">⚙️</div>
        </header>
        <div class="main-content">
          <div class="page" id="page-dashboard"></div>
          <div class="page" id="page-review"></div>
          <div class="page" id="page-words"></div>
          <div class="page" id="page-add"></div>
          <div class="page" id="page-ai"></div>
          <div class="page" id="page-settings"></div>
        </div>
        <nav class="bottom-nav">
          <button class="nav-item" data-page="dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>首页</span>
          </button>
          <button class="nav-item" data-page="review" id="navReview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>复习</span>
          </button>
          <button class="nav-item" data-page="words">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span>词库</span>
          </button>
          <button class="nav-item" data-page="add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <span>添加</span>
          </button>
          <button class="nav-item" data-page="ai">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M10 17h4"/></svg>
            <span>AI助手</span>
          </button>
        </nav>
      </div>`;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => navigateTo(btn.dataset.page);
    });
    updateNavBadge();
  }

  function updateNavBadge() {
    const nav = document.getElementById('navReview');
    if (!nav) return;
    const due = Storage.getDueWords().length;
    const existing = nav.querySelector('.nav-badge');
    if (existing) existing.remove();
    if (due > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = due > 99 ? '99+' : due;
      nav.appendChild(badge);
    }
  }

  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) { target.classList.add('active'); }
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'review': startReview(); break;
      case 'words': renderWordList(); break;
      case 'add': renderAddForm(); break;
      case 'ai': renderAIChat(); break;
      case 'settings': renderSettings(); break;
    }
  }

  // ── Dashboard ──
  function renderDashboard() {
    const stats = Storage.getOverallStats();
    const today = Storage.getTodayStats();
    const weekly = Storage.getWeeklyStats();
    const maxCount = Math.max(...weekly.map(d => d.count), 1);

    document.getElementById('page-dashboard').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-number">${stats.due}</div><div class="stat-label">待复习</div></div>
        <div class="stat-card accent-green"><div class="stat-number">${stats.mastered}</div><div class="stat-label">已掌握</div></div>
        <div class="stat-card accent-amber"><div class="stat-number">${today.reviewed}</div><div class="stat-label">今日已学</div></div>
        <div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">总词汇</div></div>
      </div>

      ${stats.due > 0 ? `<div class="card" style="cursor:pointer" onclick="App.navigateTo('review')">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">🎯</span>
          <div><div style="font-weight:600">有 ${stats.due} 个单词待复习</div><div style="font-size:0.78rem;color:var(--text-secondary)">点击开始今日复习</div></div>
          <span style="margin-left:auto;font-size:1.2rem">→</span>
        </div>
      </div>` : `<div class="card"><div style="text-align:center;padding:8px"><span style="font-size:2rem">🎉</span><p style="margin-top:8px;color:var(--text-secondary)">今天没有待复习的单词，太棒了！</p></div></div>`}

      <div class="card">
        <div style="font-weight:600;margin-bottom:12px;font-size:0.9rem">📊 本周学习</div>
        <div class="chart-bars">
          ${weekly.map(d => `<div class="chart-bar-wrapper"><div class="chart-value">${d.count}</div><div class="chart-bar" style="height:${Math.max((d.count/maxCount)*100,4)}%"></div><div class="chart-label">${d.date}</div></div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div style="font-weight:600;margin-bottom:8px;font-size:0.9rem">📈 学习进度</div>
        <div style="display:flex;gap:16px;font-size:0.82rem;color:var(--text-secondary)">
          <span>🟢 已掌握 ${stats.mastered}</span>
          <span>🔵 学习中 ${stats.learning}</span>
          <span>⚪ 新词 ${stats.newWords}</span>
        </div>
        <div class="progress-bar" style="margin-top:12px"><div class="progress-fill" style="width:${stats.total?((stats.mastered/stats.total)*100):0}%"></div></div>
      </div>`;
    updateNavBadge();
  }

  // ── Review ──
  function startReview() {
    reviewQueue = Storage.getDueWords(30);
    reviewIndex = 0;
    reviewResults = [];
    isFlipped = false;
    if (!reviewQueue.length) {
      document.getElementById('page-review').innerHTML = `<div class="review-complete"><div class="big-emoji">🎉</div><h2>复习完毕！</h2><p>当前没有需要复习的单词</p><button class="btn btn-primary" onclick="App.navigateTo('dashboard')">返回首页</button></div>`;
      return;
    }
    renderReviewCard();
  }

  function renderReviewCard() {
    if (reviewIndex >= reviewQueue.length) { renderReviewComplete(); return; }
    const word = reviewQueue[reviewIndex];
    isFlipped = false;
    const progress = ((reviewIndex) / reviewQueue.length * 100).toFixed(0);

    document.getElementById('page-review').innerHTML = `
      <div class="review-container">
        <div class="review-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="progress-text">${reviewIndex + 1} / ${reviewQueue.length}</div>
        </div>
        <div class="flashcard-wrapper">
          <div class="flashcard" id="flashcard" onclick="App.flipCard()">
            <div class="flashcard-face flashcard-front">
              <button class="sound-btn" onclick="event.stopPropagation();App.speak('${word.word.replace(/'/g,"\\'")}')" title="发音">🔊</button>
              <div class="flashcard-word">${word.word}</div>
              <div class="flashcard-phonetic">${word.phonetic || ''}</div>
              <div class="flashcard-hint">点击翻转查看释义</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <div class="flashcard-pos">${word.partOfSpeech || ''}</div>
              <div class="flashcard-definition">${word.definition}</div>
              ${word.example ? `<div class="flashcard-example">"${word.example}"</div>` : ''}
            </div>
          </div>
        </div>
        <div class="rating-buttons" id="ratingBtns" style="visibility:hidden">
          <button class="rating-btn again" onclick="App.rateWord(1)"><span class="label">忘记</span><span class="interval">&lt;10分钟</span></button>
          <button class="rating-btn hard" onclick="App.rateWord(2)"><span class="label">困难</span><span class="interval">1-3天</span></button>
          <button class="rating-btn good" onclick="App.rateWord(3)"><span class="label">良好</span><span class="interval">${SRS.getNextReviewText({...word,repetitions:(word.repetitions||0),intervalDays:(word.intervalDays||0),easeFactor:(word.easeFactor||2.5)})}</span></button>
          <button class="rating-btn easy" onclick="App.rateWord(4)"><span class="label">简单</span><span class="interval">4-10天</span></button>
        </div>
      </div>`;
  }

  function flipCard() {
    const card = document.getElementById('flashcard');
    if (!card) return;
    isFlipped = !isFlipped;
    card.classList.toggle('flipped', isFlipped);
    if (isFlipped) {
      document.getElementById('ratingBtns').style.visibility = 'visible';
    }
  }

  function rateWord(rating) {
    const word = reviewQueue[reviewIndex];
    Storage.recordReview(word.id, rating);
    reviewResults.push({ word: word.word, rating });
    reviewIndex++;
    renderReviewCard();
  }

  function renderReviewComplete() {
    const correct = reviewResults.filter(r => r.rating >= 3).length;
    const total = reviewResults.length;
    document.getElementById('page-review').innerHTML = `
      <div class="review-complete">
        <div class="big-emoji">${correct/total >= 0.8 ? '🏆' : correct/total >= 0.5 ? '💪' : '📖'}</div>
        <h2>本轮复习完成！</h2>
        <p>你复习了 ${total} 个单词</p>
        <div class="review-summary">
          <div class="stat-card accent-green"><div class="stat-number">${correct}</div><div class="stat-label">记住了</div></div>
          <div class="stat-card accent-amber"><div class="stat-number">${total - correct}</div><div class="stat-label">需加强</div></div>
          <div class="stat-card"><div class="stat-number">${total ? Math.round(correct/total*100) : 0}%</div><div class="stat-label">正确率</div></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="App.navigateTo('dashboard')" style="margin-bottom:10px">返回首页</button>
        ${Storage.getDueWords().length > 0 ? `<button class="btn btn-secondary btn-block" onclick="App.navigateTo('review')">继续复习</button>` : ''}
      </div>`;
    updateNavBadge();
  }

  // ── Words List ──
  function renderWordList() {
    const words = Storage.searchWords('', { sort: 'alpha' });
    document.getElementById('page-words').innerHTML = `
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="searchInput" placeholder="搜索单词或释义..." oninput="App.onSearch()">
      </div>
      <div class="filter-row">
        <span class="filter-chip active" data-filter="all" onclick="App.filterWords('all',this)">全部</span>
        <span class="filter-chip" data-filter="new" onclick="App.filterWords('new',this)">新词</span>
        <span class="filter-chip" data-filter="learning" onclick="App.filterWords('learning',this)">学习中</span>
        <span class="filter-chip" data-filter="mastered" onclick="App.filterWords('mastered',this)">已掌握</span>
        <span class="filter-chip" data-filter="due" onclick="App.filterWords('due',this)">待复习</span>
      </div>
      <div class="word-count-label">共 ${words.length} 个单词</div>
      <div id="wordListContainer"></div>`;
    renderWordItems(words);
  }

  let currentFilter = 'all';
  function filterWords(status, el) {
    currentFilter = status === 'all' ? null : status;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    onSearch();
  }

  function onSearch() {
    const q = document.getElementById('searchInput')?.value || '';
    const words = Storage.searchWords(q, { status: currentFilter, sort: 'alpha' });
    const label = document.querySelector('.word-count-label');
    if (label) label.textContent = `共 ${words.length} 个单词`;
    renderWordItems(words);
  }

  function renderWordItems(words) {
    const container = document.getElementById('wordListContainer');
    if (!container) return;
    if (!words.length) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">🔍</div><p>没有找到匹配的单词</p></div>`;
      return;
    }
    container.innerHTML = words.map(w => {
      const m = SRS.getMasteryLevel(w);
      return `<div class="word-item" onclick="App.showWordDetail('${w.id}')">
        <div class="mastery-dot" style="background:${m.color}"></div>
        <div class="word-text">${w.word}</div>
        <div class="word-def">${w.definition}</div>
      </div>`;
    }).join('');
  }

  function showWordDetail(id) {
    const w = Storage.getWordById(id);
    if (!w) return;
    const m = SRS.getMasteryLevel(w);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div class="modal">
      <h3 style="display:flex;align-items:center;gap:8px"><span class="mastery-dot" style="background:${m.color}"></span>${w.word}</h3>
      ${w.phonetic ? `<p style="color:var(--text-secondary);margin-bottom:8px">${w.phonetic}</p>` : ''}
      <p style="margin-bottom:8px">${w.definition}</p>
      ${w.example ? `<p style="font-size:0.85rem;color:var(--text-secondary);font-style:italic;margin-bottom:12px">"${w.example}"</p>` : ''}
      <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">状态：${m.label} | 复习次数：${w.totalReviews||0} | 下次复习：${SRS.getNextReviewText(w)}</div>
      <div style="font-size:0.78rem;color:var(--text-muted)">词库：${w.book || '自定义'}</div>
      <div class="modal-actions" style="flex-wrap:wrap">
        <button class="btn btn-sm btn-secondary" onclick="App.speak('${w.word.replace(/'/g,"\\'")}')">🔊 发音</button>
        <button class="btn btn-sm btn-primary" onclick="App.aiExplainWord('${w.id}')">🤖 AI讲解</button>
        <button class="btn btn-sm btn-danger" onclick="if(confirm('确定删除？')){App.deleteWordAction('${w.id}')}">删除</button>
        <button class="btn btn-sm btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
      </div>
      <div id="aiExplainResult" style="margin-top:12px"></div>
    </div>`;
    document.body.appendChild(overlay);
  }

  function deleteWordAction(id) {
    Storage.deleteWord(id);
    document.querySelector('.modal-overlay')?.remove();
    renderWordList();
    showToast('单词已删除');
  }

  // ── Add Word ──
  function renderAddForm() {
    document.getElementById('page-add').innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:1.1rem">✏️ 添加新单词</h3>
        <div class="form-group"><label>单词 *</label><input id="addWord" placeholder="e.g. eloquent"></div>
        <div class="form-group"><label>音标</label><input id="addPhonetic" placeholder="e.g. /ˈeləkwənt/"></div>
        <div class="form-group"><label>释义 *</label><input id="addDef" placeholder="e.g. adj. 雄辩的"></div>
        <div class="form-group"><label>词性</label><select id="addPos"><option value="">选择词性</option><option value="n">n. 名词</option><option value="v">v. 动词</option><option value="adj">adj. 形容词</option><option value="adv">adv. 副词</option><option value="prep">prep. 介词</option><option value="conj">conj. 连词</option></select></div>
        <div class="form-group"><label>例句</label><textarea id="addExample" rows="2" placeholder="e.g. She gave an eloquent speech."></textarea></div>
        <button class="btn btn-primary btn-block" onclick="App.submitWord()">添加单词</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:1rem">📥 导入词库</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">从预置词库添加更多单词</p>
        <div id="importBookBtns"></div>
      </div>`;
    const importDiv = document.getElementById('importBookBtns');
    const selected = Storage.getSelectedBooks();
    WordBanks.books.forEach(book => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-block';
      btn.style.marginBottom = '8px';
      btn.textContent = `${book.icon} ${book.name}`;
      btn.onclick = () => {
        const added = Storage.importWords(WordBanks[book.id], book.id);
        if (!selected.includes(book.id)) {
          selected.push(book.id);
          Storage.setSelectedBooks(selected);
        }
        showToast(`已导入 ${added} 个新单词`, 'success');
      };
      importDiv.appendChild(btn);
    });
  }

  function submitWord() {
    const word = document.getElementById('addWord')?.value?.trim();
    const def = document.getElementById('addDef')?.value?.trim();
    if (!word || !def) { showToast('请至少填写单词和释义', 'error'); return; }
    Storage.addWord({
      word,
      phonetic: document.getElementById('addPhonetic')?.value?.trim() || '',
      definition: def,
      partOfSpeech: document.getElementById('addPos')?.value || '',
      example: document.getElementById('addExample')?.value?.trim() || '',
      book: 'custom'
    });
    showToast(`"${word}" 添加成功！`, 'success');
    document.getElementById('addWord').value = '';
    document.getElementById('addPhonetic').value = '';
    document.getElementById('addDef').value = '';
    document.getElementById('addPos').value = '';
    document.getElementById('addExample').value = '';
    updateNavBadge();
  }

  // ── Settings ──
  function renderSettings() {
    const settings = Storage.getSettings();
    const stats = Storage.getOverallStats();
    const selectedBooks = Storage.getSelectedBooks();
    document.getElementById('page-settings').innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:1rem">📚 已选词库</h3>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">
          ${selectedBooks.map(id => { const b = WordBanks.books.find(x=>x.id===id); return b ? `${b.icon} ${b.name}` : id; }).join('<br>') || '无'}
        </div>
        <button class="btn btn-sm btn-secondary" onclick="App.resetBooks()">重新选择词库</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:4px;font-size:1rem">⚙️ 设置</h3>
        <div class="setting-item">
          <div><div class="setting-label">自动播放发音</div><div class="setting-desc">翻卡时自动朗读</div></div>
          <button class="toggle ${settings.autoPlaySound?'on':''}" onclick="App.toggleSetting('autoPlaySound',this)"></button>
        </div>
        <div class="setting-item">
          <div><div class="setting-label">显示音标</div></div>
          <button class="toggle ${settings.showPhonetic?'on':''}" onclick="App.toggleSetting('showPhonetic',this)"></button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:4px;font-size:1rem">🤖 AI 助手设置</h3>
        <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px">输入你的 DeepSeek API Key 来启用 AI 功能。Key 仅保存在你的浏览器本地，不会上传到任何服务器。</p>
        <div class="form-group" style="margin-bottom:8px">
          <label>DeepSeek API Key</label>
          <div style="display:flex;gap:8px">
            <input id="apiKeyInput" type="password" placeholder="sk-xxxxxxxxxxxxxxxx" value="${AI.getApiKey()}" style="flex:1;padding:10px 14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);background:var(--bg-card);color:var(--text-primary);font-size:0.85rem;font-family:monospace;outline:none">
            <button class="btn btn-sm btn-primary" onclick="App.saveApiKey()">保存</button>
          </div>
        </div>
        <p style="font-size:0.7rem;color:var(--text-muted)">🔒 Key 存储在 localStorage，仅你可见 | <a href="https://platform.deepseek.com/api_keys" target="_blank" style="color:var(--accent-purple)">获取 API Key →</a></p>
        ${AI.hasApiKey() ? '<p style="font-size:0.75rem;color:var(--accent-green);margin-top:6px">✅ 已配置 API Key</p>' : '<p style="font-size:0.75rem;color:var(--accent-amber);margin-top:6px">⚠️ 未配置 — AI 功能不可用</p>'}
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:1rem">💾 数据管理</h3>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">总计 ${stats.total} 个单词</p>
        <button class="btn btn-sm btn-secondary" style="margin-right:8px;margin-bottom:8px" onclick="App.exportData()">📤 导出数据</button>
        <button class="btn btn-sm btn-secondary" style="margin-bottom:8px" onclick="document.getElementById('importFile').click()">📥 导入数据</button>
        <input type="file" id="importFile" accept=".json" style="display:none" onchange="App.importData(event)">
        <br><button class="btn btn-sm btn-danger" style="margin-top:8px" onclick="App.clearData()">🗑️ 清除所有数据</button>
      </div>`;
  }

  function toggleSetting(key, el) {
    const settings = Storage.getSettings();
    settings[key] = !settings[key];
    Storage.updateSettings(settings);
    el.classList.toggle('on');
  }

  function resetBooks() {
    if (!confirm('重新选择词库？已有的学习进度不会丢失。')) return;
    Storage.setSelectedBooks([]);
    renderSetupPage();
  }

  function saveApiKey() {
    const key = document.getElementById('apiKeyInput')?.value?.trim();
    if (!key) { showToast('请输入 API Key', 'error'); return; }
    AI.setApiKey(key);
    showToast('API Key 已保存！', 'success');
    renderSettings();
  }

  function exportData() {
    const data = Storage.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flowreview_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('数据已导出', 'success');
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        Storage.importAllData(data);
        showToast('数据导入成功！', 'success');
        navigateTo('dashboard');
      } catch (err) {
        showToast('导入失败：文件格式错误', 'error');
      }
    };
    reader.readAsText(file);
  }

  function clearData() {
    if (!confirm('确定清除所有数据？此操作不可恢复！')) return;
    Storage.clearAllData();
    showToast('数据已清除');
    renderSetupPage();
  }

  // ── Speech ──
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  // ── AI Chat ──
  let chatHistory = [];

  function renderAIChat() {
    if (!AI.hasApiKey()) {
      document.getElementById('page-ai').innerHTML = `
        <div class="card" style="text-align:center;padding:32px 20px">
          <div style="font-size:3rem;margin-bottom:12px">🔑</div>
          <h3 style="margin-bottom:8px">需要配置 API Key</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">请先在设置中输入你的 DeepSeek API Key 来启用 AI 助手功能</p>
          <button class="btn btn-primary" onclick="App.navigateTo('settings')">前往设置</button>
          <p style="font-size:0.72rem;color:var(--text-muted);margin-top:12px"><a href="https://platform.deepseek.com/api_keys" target="_blank" style="color:var(--accent-purple)">没有 Key？去 DeepSeek 免费获取 →</a></p>
        </div>`;
      return;
    }
    document.getElementById('page-ai').innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:4px;font-size:1.1rem">🤖 AI 英语助手</h3>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:16px">由 DeepSeek 驱动，可以问任何英语学习问题</p>
        <div id="chatMessages" style="max-height:50vh;overflow-y:auto;margin-bottom:12px"></div>
        <div style="display:flex;gap:8px">
          <input id="chatInput" type="text" placeholder="问我任何英语问题..." style="flex:1;padding:10px 14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);background:var(--bg-card);color:var(--text-primary);font-size:0.9rem;font-family:inherit;outline:none" onkeydown="if(event.key==='Enter')App.sendChat()">
          <button class="btn btn-primary btn-sm" onclick="App.sendChat()">发送</button>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:1rem">⚡ 快捷功能</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn btn-sm btn-secondary" onclick="App.aiQuickAction('帮我随机挑一个CET-4单词并详细讲解')">🎲 随机讲解</button>
          <button class="btn btn-sm btn-secondary" onclick="App.aiQuickAction('给我5个常用的英语口语表达及例句')">💬 口语表达</button>
          <button class="btn btn-sm btn-secondary" onclick="App.aiQuickAction('给我一个关于日常生活的英语小对话')">📖 情景对话</button>
          <button class="btn btn-sm btn-secondary" onclick="App.aiQuickAction('解释一个容易混淆的英语语法点')">📐 语法讲解</button>
        </div>
      </div>`;
    renderChatMessages();
  }

  function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (!chatHistory.length) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem">👋 你好！我是AI英语助手，有什么可以帮你的？</div>';
      return;
    }
    container.innerHTML = chatHistory.map(msg => {
      const isUser = msg.role === 'user';
      return `<div style="display:flex;justify-content:${isUser?'flex-end':'flex-start'};margin-bottom:10px">
        <div style="max-width:85%;padding:10px 14px;border-radius:${isUser?'var(--radius-md) var(--radius-md) 4px var(--radius-md)':'var(--radius-md) var(--radius-md) var(--radius-md) 4px'};background:${isUser?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.05)'};font-size:0.85rem;line-height:1.6;white-space:pre-wrap">${msg.content}</div>
      </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  async function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    chatHistory.push({ role: 'user', content: msg });
    renderChatMessages();
    // Show loading
    const container = document.getElementById('chatMessages');
    container.innerHTML += '<div id="aiLoading" style="padding:10px;color:var(--text-muted);font-size:0.82rem">🤖 思考中...</div>';
    container.scrollTop = container.scrollHeight;
    try {
      const reply = await AI.freeChat(msg, chatHistory.slice(-10));
      document.getElementById('aiLoading')?.remove();
      chatHistory.push({ role: 'assistant', content: reply });
      renderChatMessages();
    } catch (e) {
      document.getElementById('aiLoading')?.remove();
      chatHistory.push({ role: 'assistant', content: '⚠️ 请求失败，请检查网络后重试。' });
      renderChatMessages();
    }
  }

  async function aiQuickAction(prompt) {
    chatHistory.push({ role: 'user', content: prompt });
    if (currentPage !== 'ai') navigateTo('ai');
    else renderChatMessages();
    const container = document.getElementById('chatMessages');
    if (container) {
      container.innerHTML += '<div id="aiLoading" style="padding:10px;color:var(--text-muted);font-size:0.82rem">🤖 思考中...</div>';
      container.scrollTop = container.scrollHeight;
    }
    try {
      const reply = await AI.freeChat(prompt, chatHistory.slice(-10));
      document.getElementById('aiLoading')?.remove();
      chatHistory.push({ role: 'assistant', content: reply });
      renderChatMessages();
    } catch (e) {
      document.getElementById('aiLoading')?.remove();
      chatHistory.push({ role: 'assistant', content: '⚠️ 请求失败，请检查网络后重试。' });
      renderChatMessages();
    }
  }

  async function aiExplainWord(id) {
    const w = Storage.getWordById(id);
    if (!w) return;
    const resultDiv = document.getElementById('aiExplainResult');
    if (!resultDiv) return;
    resultDiv.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.82rem">🤖 AI分析中...</div>';
    try {
      const explanation = await AI.explainWord(w.word, w.definition);
      resultDiv.innerHTML = `<div style="padding:12px;background:rgba(124,58,237,0.08);border-radius:var(--radius-md);font-size:0.83rem;line-height:1.7;white-space:pre-wrap">${explanation}</div>`;
    } catch (e) {
      resultDiv.innerHTML = '<div style="padding:12px;color:var(--accent-red);font-size:0.82rem">⚠️ AI请求失败，请检查网络</div>';
    }
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (currentPage !== 'review') return;
    if (e.code === 'Space') { e.preventDefault(); flipCard(); }
    if (isFlipped) {
      if (e.key === '1') rateWord(1);
      if (e.key === '2') rateWord(2);
      if (e.key === '3') rateWord(3);
      if (e.key === '4') rateWord(4);
    }
  });

  return {
    init, navigateTo, flipCard, rateWord, speak,
    onSearch, filterWords, showWordDetail, deleteWordAction,
    submitWord, toggleSetting, resetBooks, saveApiKey, exportData, importData, clearData,
    showToast, sendChat, aiQuickAction, aiExplainWord
  };
})();

document.addEventListener('DOMContentLoaded', App.init);

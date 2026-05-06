/**
 * FlowReview — localStorage Data Layer
 * Handles all CRUD operations for words and review stats.
 */

const Storage = (() => {
  const KEYS = {
    WORDS: 'flowreview_words',
    STATS: 'flowreview_stats',
    SETTINGS: 'flowreview_settings',
    HISTORY: 'flowreview_history',
    SELECTED_BOOKS: 'flowreview_selected_books'
  };

  // ── Helpers ──

  function _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage read error:', e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error:', e);
      return false;
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // ── Words CRUD ──

  function getAllWords() {
    return _get(KEYS.WORDS) || [];
  }

  function getWordById(id) {
    return getAllWords().find(w => w.id === id);
  }

  function addWord(wordData) {
    const words = getAllWords();
    const newWord = {
      id: generateId(),
      word: wordData.word.trim(),
      phonetic: wordData.phonetic || '',
      definition: wordData.definition.trim(),
      example: wordData.example || '',
      partOfSpeech: wordData.partOfSpeech || '',
      book: wordData.book || 'custom',
      createdAt: new Date().toISOString(),
      ...SRS.createInitialStats()
    };
    words.push(newWord);
    _set(KEYS.WORDS, words);
    return newWord;
  }

  function updateWord(id, updates) {
    const words = getAllWords();
    const idx = words.findIndex(w => w.id === id);
    if (idx === -1) return null;
    words[idx] = { ...words[idx], ...updates };
    _set(KEYS.WORDS, words);
    return words[idx];
  }

  function deleteWord(id) {
    const words = getAllWords().filter(w => w.id !== id);
    _set(KEYS.WORDS, words);
  }

  function importWords(wordList, bookName) {
    const words = getAllWords();
    const existingMap = new Map(words.map(w => [w.word.toLowerCase(), w]));
    let added = 0;

    wordList.forEach(item => {
      const key = item.word.toLowerCase().trim();
      if (!existingMap.has(key)) {
        words.push({
          id: generateId(),
          word: item.word.trim(),
          phonetic: item.phonetic || '',
          definition: item.definition.trim(),
          example: item.example || '',
          partOfSpeech: item.partOfSpeech || '',
          book: bookName || 'imported',
          createdAt: new Date().toISOString(),
          ...SRS.createInitialStats()
        });
        added++;
      }
    });

    _set(KEYS.WORDS, words);
    return added;
  }

  // ── Review Operations ──

  function getDueWords(limit) {
    const words = getAllWords();
    const now = new Date();
    const due = words.filter(w => {
      if (!w.nextReviewDate) return true;
      return new Date(w.nextReviewDate) <= now;
    });

    // Sort: new words first, then by next review date (oldest first)
    const settings = getSettings();
    if (settings.reviewOrder === 'random') {
      // Fisher-Yates shuffle
      for (let i = due.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [due[i], due[j]] = [due[j], due[i]];
      }
    } else {
      due.sort((a, b) => {
        if (a.repetitions === 0 && b.repetitions !== 0) return -1;
        if (a.repetitions !== 0 && b.repetitions === 0) return 1;
        return new Date(a.nextReviewDate || 0) - new Date(b.nextReviewDate || 0);
      });
    }

    return limit ? due.slice(0, limit) : due;
  }

  function recordReview(wordId, rating) {
    const words = getAllWords();
    const idx = words.findIndex(w => w.id === wordId);
    if (idx === -1) return null;

    const word = words[idx];
    const nextStats = SRS.calculateNextReview({
      intervalDays: word.intervalDays,
      easeFactor: word.easeFactor,
      repetitions: word.repetitions
    }, rating);

    words[idx] = {
      ...word,
      ...nextStats,
      totalReviews: (word.totalReviews || 0) + 1,
      correctCount: (word.correctCount || 0) + (rating >= 3 ? 1 : 0)
    };

    _set(KEYS.WORDS, words);

    // Record in history
    addHistoryEntry({
      wordId,
      word: word.word,
      rating,
      timestamp: new Date().toISOString()
    });

    return words[idx];
  }

  // ── History ──

  function getHistory() {
    return _get(KEYS.HISTORY) || [];
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.push(entry);
    // Keep only last 5000 entries
    if (history.length > 5000) {
      history.splice(0, history.length - 5000);
    }
    _set(KEYS.HISTORY, history);
  }

  function getTodayStats() {
    const history = getHistory();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEntries = history.filter(h => new Date(h.timestamp) >= todayStart);

    return {
      reviewed: todayEntries.length,
      correct: todayEntries.filter(h => h.rating >= 3).length,
      incorrect: todayEntries.filter(h => h.rating < 3).length,
      uniqueWords: new Set(todayEntries.map(h => h.wordId)).size
    };
  }

  function getWeeklyStats() {
    const history = getHistory();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayEntries = history.filter(h => {
        const t = new Date(h.timestamp);
        return t >= date && t < nextDay;
      });

      days.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count: dayEntries.length,
        correct: dayEntries.filter(h => h.rating >= 3).length
      });
    }
    return days;
  }

  function getOverallStats() {
    const words = getAllWords();
    const total = words.length;
    const mastered = words.filter(w => w.repetitions > 5 && w.easeFactor >= 2.5).length;
    const learning = words.filter(w => w.repetitions > 0 && w.repetitions <= 5).length;
    const newWords = words.filter(w => !w.repetitions || w.repetitions === 0).length;
    const due = getDueWords().length;

    return { total, mastered, learning, newWords, due };
  }

  // ── Selected Books ──

  function getSelectedBooks() {
    return _get(KEYS.SELECTED_BOOKS) || [];
  }

  function setSelectedBooks(books) {
    _set(KEYS.SELECTED_BOOKS, books);
  }

  function hasCompletedSetup() {
    const books = getSelectedBooks();
    return books.length > 0;
  }

  // ── Settings ──

  function getSettings() {
    return _get(KEYS.SETTINGS) || {
      dailyGoal: 20,
      newWordsPerDay: 10,
      autoPlaySound: false,
      showPhonetic: true,
      reviewOrder: 'due_first' // due_first, random, alphabetical
    };
  }

  function updateSettings(updates) {
    const settings = { ...getSettings(), ...updates };
    _set(KEYS.SETTINGS, settings);
    return settings;
  }

  // ── Export / Import ──

  function exportAllData() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      words: getAllWords(),
      history: getHistory(),
      settings: getSettings(),
      selectedBooks: getSelectedBooks()
    };
  }

  function importAllData(data) {
    if (data.words) _set(KEYS.WORDS, data.words);
    if (data.history) _set(KEYS.HISTORY, data.history);
    if (data.settings) _set(KEYS.SETTINGS, data.settings);
    if (data.selectedBooks) _set(KEYS.SELECTED_BOOKS, data.selectedBooks);
    return true;
  }

  function clearAllData() {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  // ── Search & Filter ──

  function searchWords(query, filters = {}) {
    let words = getAllWords();

    if (query) {
      const q = query.toLowerCase();
      words = words.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q)
      );
    }

    if (filters.book && filters.book !== 'all') {
      words = words.filter(w => w.book === filters.book);
    }

    if (filters.status) {
      switch (filters.status) {
        case 'new':
          words = words.filter(w => !w.repetitions || w.repetitions === 0);
          break;
        case 'learning':
          words = words.filter(w => w.repetitions > 0 && w.repetitions <= 5);
          break;
        case 'mastered':
          words = words.filter(w => w.repetitions > 5 && w.easeFactor >= 2.5);
          break;
        case 'due':
          words = words.filter(w => SRS.isDueForReview(w));
          break;
      }
    }

    // Sort
    switch (filters.sort) {
      case 'alpha':
        words.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'newest':
        words.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'due':
        words.sort((a, b) => new Date(a.nextReviewDate || 0) - new Date(b.nextReviewDate || 0));
        break;
      default:
        words.sort((a, b) => a.word.localeCompare(b.word));
    }

    return words;
  }

  return {
    getAllWords,
    getWordById,
    addWord,
    updateWord,
    deleteWord,
    importWords,
    getDueWords,
    recordReview,
    getHistory,
    getTodayStats,
    getWeeklyStats,
    getOverallStats,
    getSelectedBooks,
    setSelectedBooks,
    hasCompletedSetup,
    getSettings,
    updateSettings,
    exportAllData,
    importAllData,
    clearAllData,
    searchWords,
    generateId
  };
})();

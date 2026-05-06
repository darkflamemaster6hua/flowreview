/**
 * FlowReview — Word Bank Data Module
 * Loads vocabulary from external JSON files (CET-4: 7508, CET-6: 5651, TOEFL: 13477).
 * Source: https://github.com/KyleBing/english-vocabulary (MIT)
 */

const WordBanks = {
  books: [
    { id: 'cet4', name: 'CET-4 四级', count: 7508, icon: '🎓', file: 'data/cet4.json' },
    { id: 'cet6', name: 'CET-6 六级', count: 5651, icon: '📘', file: 'data/cet6.json' },
    { id: 'toefl', name: 'TOEFL 托福', count: 13477, icon: '🌍', file: 'data/toefl.json' },
  ],

  /**
   * Load a word bank JSON file asynchronously.
   * Returns array of { word, definition, example, exampleTrans }.
   */
  async load(bookId) {
    const book = this.books.find(b => b.id === bookId);
    if (!book) throw new Error(`Unknown book: ${bookId}`);

    const res = await fetch(book.file);
    if (!res.ok) throw new Error(`Failed to load ${book.file}`);
    return res.json();
  }
};

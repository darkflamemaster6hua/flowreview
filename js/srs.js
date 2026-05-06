/**
 * FlowReview — SM-2 Spaced Repetition Algorithm
 * 
 * Rating Scale:
 *   1 = 忘记 (Again)  — Reset interval
 *   2 = 困难 (Hard)   — Slow increase, decrease ease
 *   3 = 良好 (Good)   — Standard increase
 *   4 = 简单 (Easy)   — Big increase, boost ease
 */

const SRS = (() => {
  const MIN_EASE_FACTOR = 1.3;
  const DEFAULT_EASE_FACTOR = 2.5;

  /**
   * Calculate the next review schedule based on current stats and rating.
   * @param {Object} current - Current review stats
   * @param {number} current.intervalDays - Current interval in days
   * @param {number} current.easeFactor - Current ease factor
   * @param {number} current.repetitions - Number of successful repetitions
   * @param {number} rating - User rating 1-4
   * @returns {Object} Next review stats
   */
  function calculateNextReview(current, rating) {
    let { intervalDays, easeFactor, repetitions } = current;
    easeFactor = Number(easeFactor) || DEFAULT_EASE_FACTOR;
    intervalDays = Number(intervalDays) || 0;
    repetitions = Number(repetitions) || 0;

    let newInterval, newEase, newReps;

    if (rating === 1) {
      // Forgot — reset
      newInterval = 0; // Review again today (in minutes via learning steps)
      newEase = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
      newReps = 0;
    } else if (rating === 2) {
      // Hard
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 3;
      } else {
        newInterval = Math.round(intervalDays * 1.2);
      }
      newEase = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
      newReps = repetitions + 1;
    } else if (rating === 3) {
      // Good
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(intervalDays * easeFactor);
      }
      newEase = easeFactor;
      newReps = repetitions + 1;
    } else {
      // Easy (rating === 4)
      if (repetitions === 0) {
        newInterval = 4;
      } else if (repetitions === 1) {
        newInterval = 10;
      } else {
        newInterval = Math.round(intervalDays * easeFactor * 1.3);
      }
      newEase = easeFactor + 0.15;
      newReps = repetitions + 1;
    }

    // Calculate next review date
    const now = new Date();
    let nextReviewDate;
    if (newInterval === 0) {
      // Review again in 10 minutes
      nextReviewDate = new Date(now.getTime() + 10 * 60 * 1000);
    } else {
      nextReviewDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
    }

    return {
      intervalDays: newInterval,
      easeFactor: Math.round(newEase * 100) / 100,
      repetitions: newReps,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewDate: now.toISOString(),
      lastRating: rating
    };
  }

  /**
   * Create initial review stats for a new word.
   */
  function createInitialStats() {
    return {
      intervalDays: 0,
      easeFactor: DEFAULT_EASE_FACTOR,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
      lastReviewDate: null,
      lastRating: null,
      totalReviews: 0,
      correctCount: 0
    };
  }

  /**
   * Check if a word is due for review.
   */
  function isDueForReview(stats) {
    if (!stats || !stats.nextReviewDate) return true;
    return new Date(stats.nextReviewDate) <= new Date();
  }

  /**
   * Get mastery level label based on repetitions and ease.
   */
  function getMasteryLevel(stats) {
    if (!stats || stats.repetitions === 0) return { level: 'new', label: '新词', color: '#64748b' };
    if (stats.repetitions <= 2) return { level: 'learning', label: '学习中', color: '#f59e0b' };
    if (stats.repetitions <= 5) return { level: 'reviewing', label: '复习中', color: '#3b82f6' };
    if (stats.easeFactor >= 2.5 && stats.repetitions > 5) return { level: 'mastered', label: '已掌握', color: '#10b981' };
    return { level: 'reviewing', label: '复习中', color: '#3b82f6' };
  }

  /**
   * Get human-readable next review description.
   */
  function getNextReviewText(stats) {
    if (!stats || !stats.nextReviewDate) return '立即复习';
    const now = new Date();
    const next = new Date(stats.nextReviewDate);
    const diffMs = next - now;
    
    if (diffMs <= 0) return '立即复习';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} 分钟后`;
    if (diffHours < 24) return `${diffHours} 小时后`;
    if (diffDays === 1) return '明天';
    if (diffDays < 30) return `${diffDays} 天后`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月后`;
    return `${Math.floor(diffDays / 365)} 年后`;
  }

  return {
    calculateNextReview,
    createInitialStats,
    isDueForReview,
    getMasteryLevel,
    getNextReviewText,
    DEFAULT_EASE_FACTOR,
    MIN_EASE_FACTOR
  };
})();

/**
 * GAMIFICATION.JS
 * Achievement Badges, Leaderboards, Points, and Challenges
 *
 * Implements gamification features: achievement badges, leaderboards,
 * points system, progress tracking, and reward tiers.
 *
 * Usage:
 *   const gamification = new Gamification(config);
 *   gamification.initialize();
 *   gamification.unlockAchievement('plot-explorer');
 */

class Gamification {
  constructor(config = {}) {
    this.config = config;
    this.userId = config.userId || this.generateUserId();
    this.userProgress = {
      totalPoints: 0,
      level: 1,
      tier: 'bronze',
      achievements: [],
      completedChallenges: [],
      favoriteCount: 0,
      toursWatched: 0,
      plotsViewed: new Set()
    };

    // Badge definitions
    this.badges = {
      'plot-explorer': {
        id: 'plot-explorer',
        title: 'Plot Explorer',
        description: 'View 5 different plots',
        icon: '🗺️',
        requirement: 5,
        metric: 'plotsViewed'
      },
      'master-viewer': {
        id: 'master-viewer',
        title: 'Master Viewer',
        description: 'View 20 different plots',
        icon: '👁️',
        requirement: 20,
        metric: 'plotsViewed'
      },
      'tour-enthusiast': {
        id: 'tour-enthusiast',
        title: 'Tour Enthusiast',
        description: 'Watch 3 plot tours',
        icon: '🎬',
        requirement: 3,
        metric: 'toursWatched'
      },
      'favorite-lover': {
        id: 'favorite-lover',
        title: 'Favorite Lover',
        description: 'Add 5 plots to favorites',
        icon: '❤️',
        requirement: 5,
        metric: 'favoriteCount'
      },
      '360-veteran': {
        id: '360-veteran',
        title: '360° Veteran',
        description: 'Complete a 360° tour',
        icon: '🔄',
        requirement: 1,
        metric: '360Tour'
      },
      'measurement-master': {
        id: 'measurement-master',
        title: 'Measurement Master',
        description: 'Complete 5 measurements',
        icon: '📐',
        requirement: 5,
        metric: 'measurements'
      },
      'vr-pioneer': {
        id: 'vr-pioneer',
        title: 'VR Pioneer',
        description: 'Experience VR mode',
        icon: '🥽',
        requirement: 1,
        metric: 'vrUsage'
      },
      'ar-adventurer': {
        id: 'ar-adventurer',
        title: 'AR Adventurer',
        description: 'Try AR mode',
        icon: '📱',
        requirement: 1,
        metric: 'arUsage'
      }
    };

    // Challenge definitions
    this.challenges = {
      'find-best-value': {
        id: 'find-best-value',
        title: 'Find Best Value',
        description: 'Find the plot with best price-to-area ratio under 50L',
        reward: 500,
        difficulty: 'medium',
        category: 'price'
      },
      'metro-seeker': {
        id: 'metro-seeker',
        title: 'Metro Seeker',
        description: 'Find the plot closest to metro station',
        reward: 300,
        difficulty: 'easy',
        category: 'location'
      },
      'complete-comparison': {
        id: 'complete-comparison',
        title: 'Complete Comparison',
        description: 'Compare 3 plots side by side',
        reward: 400,
        difficulty: 'medium',
        category: 'comparison'
      },
      'virtual-walkthrough': {
        id: 'virtual-walkthrough',
        title: 'Virtual Walkthrough',
        description: 'Complete a full virtual tour',
        reward: 350,
        difficulty: 'easy',
        category: 'engagement'
      },
      'amenities-explorer': {
        id: 'amenities-explorer',
        title: 'Amenities Explorer',
        description: 'Check amenities of 5 different plots',
        reward: 250,
        difficulty: 'easy',
        category: 'discovery'
      }
    };

    // Tier definitions
    this.tiers = {
      bronze: { minPoints: 0, maxPoints: 999, badge: '🥉', benefits: [] },
      silver: { minPoints: 1000, maxPoints: 4999, badge: '🥈', benefits: ['exclusive-listings'] },
      gold: { minPoints: 5000, maxPoints: 9999, badge: '🥇', benefits: ['priority-support', 'exclusive-listings'] },
      platinum: { minPoints: 10000, maxPoints: Infinity, badge: '💎', benefits: ['vip-support', 'exclusive-listings', 'agent-priority'] }
    };

    // Points rules
    this.pointsRules = {
      'view-plot': 10,
      'add-favorite': 25,
      'share-link': 50,
      'complete-tour': 100,
      'measurement': 30,
      'use-vr': 150,
      'use-ar': 120,
      'challenge-completed': (reward) => reward,
      'achievement-unlocked': 200
    };

    // Leaderboard
    this.leaderboard = [];

    this.loadConfiguration();
  }

  /**
   * Load gamification configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.gamification };
        console.log('[Gamification] Configuration loaded');
      }
    } catch (err) {
      console.warn('[Gamification] Failed to load config:', err);
    }
  }

  /**
   * Initialize gamification
   */
  async initialize() {
    console.log('[Gamification] Initializing for user:', this.userId);

    // Load user progress from storage
    this.loadUserProgress();

    // Set up event listeners
    this.setupEventListeners();

    // Populate leaderboard
    this.loadLeaderboard();

    // Display HUD
    this.createGamificationHUD();

    this.emitGamificationInitialized();
    return true;
  }

  /**
   * Generate unique user ID
   */
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Load user progress from localStorage
   */
  loadUserProgress() {
    const stored = localStorage.getItem(`gv-infra:gamification:${this.userId}`);

    if (stored) {
      const saved = JSON.parse(stored);
      this.userProgress = {
        ...this.userProgress,
        ...saved,
        plotsViewed: new Set(saved.plotsViewed || [])
      };
      console.log('[Gamification] User progress loaded');
    }
  }

  /**
   * Save user progress to localStorage
   */
  saveUserProgress() {
    const toSave = {
      ...this.userProgress,
      plotsViewed: Array.from(this.userProgress.plotsViewed)
    };

    localStorage.setItem(`gv-infra:gamification:${this.userId}`, JSON.stringify(toSave));
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Track plot views
    window.addEventListener('plot:selected', (e) => {
      this.trackPlotView(e.detail.plotId || e.detail.id);
    });

    // Track favorites
    window.addEventListener('plot:add-favorite', (e) => {
      this.earnPoints('add-favorite');
      this.userProgress.favoriteCount++;
      this.checkAchievements();
    });

    // Track tours
    window.addEventListener('plot:start-tour', (e) => {
      this.earnPoints('complete-tour');
      this.userProgress.toursWatched++;
      this.checkAchievements();
    });

    // Track measurements
    window.addEventListener('measurement:completed', (e) => {
      this.earnPoints('measurement');
      this.checkAchievements();
    });

    // Track VR usage
    window.addEventListener('xr:session-started', (e) => {
      if (e.detail.mode === 'vr') {
        this.earnPoints('use-vr');
        this.userProgress.vrUsage = true;
        this.checkAchievements();
      }
    });

    // Track AR usage
    window.addEventListener('xr:session-started', (e) => {
      if (e.detail.mode === 'ar') {
        this.earnPoints('use-ar');
        this.userProgress.arUsage = true;
        this.checkAchievements();
      }
    });

    // Track sharing
    window.addEventListener('share:created', (e) => {
      this.earnPoints('share-link');
    });
  }

  /**
   * Track plot view
   */
  trackPlotView(plotId) {
    const newView = !this.userProgress.plotsViewed.has(plotId);

    if (newView) {
      this.userProgress.plotsViewed.add(plotId);
      this.earnPoints('view-plot');
      this.checkAchievements();
    }
  }

  /**
   * Earn points
   */
  earnPoints(action, metadata = {}) {
    const points = this.pointsRules[action];

    if (typeof points === 'function') {
      this.userProgress.totalPoints += points(metadata.reward || 0);
    } else if (typeof points === 'number') {
      this.userProgress.totalPoints += points;
    }

    // Update tier
    this.updateTier();

    // Update level (every 1000 points = 1 level)
    this.userProgress.level = Math.floor(this.userProgress.totalPoints / 1000) + 1;

    this.saveUserProgress();
    this.emitPointsEarned(action, points);
  }

  /**
   * Update user tier based on points
   */
  updateTier() {
    for (const [tierName, tierData] of Object.entries(this.tiers)) {
      if (
        this.userProgress.totalPoints >= tierData.minPoints &&
        this.userProgress.totalPoints < tierData.maxPoints
      ) {
        const oldTier = this.userProgress.tier;
        this.userProgress.tier = tierName;

        if (oldTier !== tierName) {
          this.emitTierChanged(oldTier, tierName);
          this.showTierUpNotification(tierName);
        }

        break;
      }
    }
  }

  /**
   * Check if any achievements should be unlocked
   */
  checkAchievements() {
    for (const [badgeId, badgeData] of Object.entries(this.badges)) {
      // Skip if already unlocked
      if (this.userProgress.achievements.includes(badgeId)) {
        continue;
      }

      // Check metric
      let metric = this.userProgress[badgeData.metric];
      if (metric instanceof Set) {
        metric = metric.size;
      }

      if (metric >= badgeData.requirement) {
        this.unlockAchievement(badgeId);
      }
    }
  }

  /**
   * Unlock achievement
   */
  unlockAchievement(badgeId) {
    if (this.userProgress.achievements.includes(badgeId)) {
      return false;
    }

    const badge = this.badges[badgeId];
    if (!badge) {
      console.warn('[Gamification] Unknown badge:', badgeId);
      return false;
    }

    this.userProgress.achievements.push(badgeId);
    this.earnPoints('achievement-unlocked');
    this.saveUserProgress();

    console.log('[Gamification] Achievement unlocked:', badge.title);
    this.showAchievementNotification(badge);
    this.emitAchievementUnlocked(badge);

    return true;
  }

  /**
   * Complete challenge
   */
  completeChallenge(challengeId) {
    if (this.userProgress.completedChallenges.includes(challengeId)) {
      console.warn('[Gamification] Challenge already completed:', challengeId);
      return false;
    }

    const challenge = this.challenges[challengeId];
    if (!challenge) {
      console.warn('[Gamification] Unknown challenge:', challengeId);
      return false;
    }

    this.userProgress.completedChallenges.push(challengeId);
    this.earnPoints('challenge-completed', { reward: challenge.reward });
    this.saveUserProgress();

    console.log('[Gamification] Challenge completed:', challenge.title);
    this.showChallengeCompletedNotification(challenge);

    return true;
  }

  /**
   * Show achievement notification with celebration animation
   */
  showAchievementNotification(badge) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-icon">${badge.icon}</div>
        <div class="achievement-text">
          <h3>Achievement Unlocked!</h3>
          <p><strong>${badge.title}</strong></p>
          <p class="achievement-desc">${badge.description}</p>
        </div>
        <div class="achievement-confetti"></div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Show challenge completed notification
   */
  showChallengeCompletedNotification(challenge) {
    const notification = document.createElement('div');
    notification.className = 'challenge-notification';
    notification.innerHTML = `
      <div class="challenge-content">
        <h3>Challenge Completed!</h3>
        <p><strong>${challenge.title}</strong></p>
        <p class="points-earned">+${challenge.reward} points</p>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Show tier up notification
   */
  showTierUpNotification(newTier) {
    const tierData = this.tiers[newTier];
    const notification = document.createElement('div');
    notification.className = 'tier-up-notification';
    notification.innerHTML = `
      <div class="tier-content">
        <div class="tier-badge">${tierData.badge}</div>
        <div class="tier-text">
          <h3>Tier Up!</h3>
          <p>You've reached <strong>${newTier.toUpperCase()}</strong> tier!</p>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  /**
   * Create gamification HUD
   */
  createGamificationHUD() {
    const hud = document.createElement('div');
    hud.className = 'gamification-hud';
    hud.id = 'gamification-hud';
    hud.innerHTML = `
      <div class="points-display">
        <span class="tier-badge">${this.tiers[this.userProgress.tier].badge}</span>
        <div class="points-info">
          <span class="level">Level ${this.userProgress.level}</span>
          <span class="points">${this.userProgress.totalPoints} pts</span>
        </div>
      </div>
      <div class="hud-buttons">
        <button class="hud-btn achievements-btn" title="Achievements">🏆</button>
        <button class="hud-btn leaderboard-btn" title="Leaderboard">🎖️</button>
        <button class="hud-btn challenges-btn" title="Challenges">⚡</button>
      </div>
    `;

    document.body.appendChild(hud);

    // Set up button handlers
    hud.querySelector('.achievements-btn').addEventListener('click', () => {
      this.showAchievementsDialog();
    });

    hud.querySelector('.leaderboard-btn').addEventListener('click', () => {
      this.showLeaderboardDialog();
    });

    hud.querySelector('.challenges-btn').addEventListener('click', () => {
      this.showChallengesDialog();
    });
  }

  /**
   * Show achievements dialog
   */
  showAchievementsDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'gamification-dialog achievements-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        <h2>🏆 Achievements</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-content achievements-list">
        ${Object.entries(this.badges)
          .map(([id, badge]) => {
            const unlocked = this.userProgress.achievements.includes(id);
            return `
              <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-badge">${badge.icon}</div>
                <div class="achievement-info">
                  <h4>${badge.title}</h4>
                  <p>${badge.description}</p>
                  ${!unlocked ? `<p class="requirement">Progress: ${this.getAchievementProgress(id)}/${badge.requirement}</p>` : '<p class="unlocked-label">✓ Unlocked</p>'}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  /**
   * Get achievement progress
   */
  getAchievementProgress(badgeId) {
    const badge = this.badges[badgeId];
    const metric = this.userProgress[badge.metric];

    if (metric instanceof Set) {
      return metric.size;
    }

    return metric || 0;
  }

  /**
   * Show leaderboard dialog
   */
  showLeaderboardDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'gamification-dialog leaderboard-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        <h2>🎖️ Leaderboard</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-content leaderboard">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Tier</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${this.leaderboard.slice(0, 10).map((player, idx) => `
              <tr ${player.userId === this.userId ? 'class="current-user"' : ''}>
                <td class="rank">${idx + 1}</td>
                <td class="player-name">${player.name}</td>
                <td class="tier">${this.tiers[player.tier].badge}</td>
                <td class="points">${player.points}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });
  }

  /**
   * Show challenges dialog
   */
  showChallengesDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'gamification-dialog challenges-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        <h2>⚡ Challenges</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-content challenges-list">
        ${Object.entries(this.challenges)
          .map(([id, challenge]) => {
            const completed = this.userProgress.completedChallenges.includes(id);
            return `
              <div class="challenge-card ${completed ? 'completed' : ''}">
                <div class="challenge-header">
                  <h4>${challenge.title}</h4>
                  <span class="difficulty ${challenge.difficulty}">${challenge.difficulty}</span>
                </div>
                <p class="challenge-desc">${challenge.description}</p>
                <div class="challenge-reward">
                  <span class="reward-points">+${challenge.reward} pts</span>
                  ${completed ? '<span class="completed-label">✓ Completed</span>' : '<button class="start-btn">Start</button>'}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    // Set up start buttons
    dialog.querySelectorAll('.start-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const challengeId = Object.keys(this.challenges)[idx];
        window.dispatchEvent(new CustomEvent('challenge:started', {
          detail: { challengeId }
        }));
      });
    });
  }

  /**
   * Load leaderboard from backend
   */
  async loadLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        this.leaderboard = await response.json();
        console.log('[Gamification] Leaderboard loaded');
      }
    } catch (err) {
      console.warn('[Gamification] Failed to load leaderboard:', err);
    }
  }

  /**
   * Export achievement cards for social sharing
   */
  exportAchievementCard(badgeId) {
    const badge = this.badges[badgeId];
    if (!badge) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;

    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#gold';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Icon
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(badge.icon, canvas.width / 2, 80);

    // Title
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(badge.title, canvas.width / 2, 180);

    // Description
    ctx.font = '16px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(badge.description, canvas.width / 2, 230);

    // Branding
    ctx.font = '12px Arial';
    ctx.fillStyle = '#999999';
    ctx.fillText('GV Infra God\'s Eye View', canvas.width / 2, 280);

    return canvas.toDataURL('image/png');
  }

  /**
   * Get user profile
   */
  getUserProfile() {
    return {
      userId: this.userId,
      tier: this.userProgress.tier,
      level: this.userProgress.level,
      totalPoints: this.userProgress.totalPoints,
      achievements: this.userProgress.achievements,
      completedChallenges: this.userProgress.completedChallenges,
      unlockedBadges: this.userProgress.achievements.length,
      totalBadges: Object.keys(this.badges).length
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit gamification initialized
   */
  emitGamificationInitialized() {
    window.dispatchEvent(new CustomEvent('gamification:initialized', {
      detail: { userId: this.userId }
    }));
  }

  /**
   * Emit achievement unlocked
   */
  emitAchievementUnlocked(badge) {
    window.dispatchEvent(new CustomEvent('gamification:achievement-unlocked', {
      detail: {
        badge: badge.id,
        title: badge.title,
        icon: badge.icon
      }
    }));
  }

  /**
   * Emit points earned
   */
  emitPointsEarned(action, points) {
    window.dispatchEvent(new CustomEvent('gamification:points-earned', {
      detail: { action, points, totalPoints: this.userProgress.totalPoints }
    }));
  }

  /**
   * Emit tier changed
   */
  emitTierChanged(oldTier, newTier) {
    window.dispatchEvent(new CustomEvent('gamification:tier-changed', {
      detail: { oldTier, newTier }
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.Gamification = Gamification;
}

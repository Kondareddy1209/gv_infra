/**
 * NOTIFICATION-SYSTEM.JS
 * In-App and Push Notifications
 *
 * Implements toast notifications, push notifications, notification preferences,
 * history, and smart retry logic.
 *
 * Usage:
 *   const notificationSystem = new NotificationSystem(config);
 *   notificationSystem.initialize();
 *   notificationSystem.showToast('Plot available!', 'success');
 */

class NotificationSystem {
  constructor(config = {}) {
    this.config = config;
    this.isEnabled = true;
    this.pushPermission = 'default';
    this.toastQueue = [];
    this.activeToasts = new Map();
    this.notificationHistory = [];
    this.maxHistoryLength = 50;

    // Preferences
    this.preferences = {
      enableToasts: true,
      enablePush: false,
      pushFrequency: 'daily', // 'realtime', 'daily', 'weekly'
      enablePlotAlerts: true,
      enablePriceAlerts: true,
      enableTourAlerts: true,
      enableSystemAlerts: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredLanguage: navigator.language
    };

    // Notification badges
    this.badges = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      plot: '🏘️',
      price: '💰',
      tour: '🎬'
    };

    // Notification queue for retry
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelayMs = 5000;

    this.loadConfiguration();
  }

  /**
   * Load notification configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.notifications };
        console.log('[NotificationSystem] Configuration loaded');
      }
    } catch (err) {
      console.warn('[NotificationSystem] Failed to load config:', err);
    }

    // Load preferences from storage
    this.loadPreferences();
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    console.log('[NotificationSystem] Initializing');

    // Request push notification permission
    this.requestPushPermission();

    // Set up event listeners
    this.setupEventListeners();

    // Check for service worker support
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        console.log('[NotificationSystem] Service Worker registered');
      } catch (err) {
        console.warn('[NotificationSystem] Service Worker registration failed:', err);
      }
    }

    // Create notification container
    this.createNotificationContainer();

    // Set up badge updates
    this.setupBadgeUpdates();

    this.emitNotificationSystemInitialized();
    return true;
  }

  /**
   * Request push notification permission
   */
  async requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('[NotificationSystem] Push notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      this.pushPermission = 'granted';
      console.log('[NotificationSystem] Push permission already granted');
    } else if (Notification.permission !== 'denied') {
      // Don't ask if already denied (respect user choice)
      console.log('[NotificationSystem] Push notifications require user permission');
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for spatial AI responses
    window.addEventListener('ai:response-received', (e) => {
      this.showToast(e.detail.message, 'info', {
        duration: 4000
      });
    });

    // Listen for plot status changes
    window.addEventListener('plot:status-changed', (e) => {
      if (this.preferences.enablePlotAlerts) {
        this.showNotification({
          type: 'plot',
          title: 'Plot Update',
          message: `Plot ${e.detail.plotId} status changed to ${e.detail.status}`,
          action: {
            text: 'View',
            callback: () => window.dispatchEvent(new CustomEvent('plot:select-request', {
              detail: { plotId: e.detail.plotId }
            }))
          }
        });
      }
    });

    // Listen for price changes
    window.addEventListener('plot:price-changed', (e) => {
      if (this.preferences.enablePriceAlerts) {
        const direction = e.detail.newPrice < e.detail.oldPrice ? '📉' : '📈';
        this.showNotification({
          type: 'price',
          title: 'Price Update',
          message: `${direction} Plot ${e.detail.plotId} price changed`,
          action: {
            text: 'Details',
            callback: () => window.dispatchEvent(new CustomEvent('plot:select-request', {
              detail: { plotId: e.detail.plotId }
            }))
          }
        });
      }
    });

    // Listen for tour reminders
    window.addEventListener('tour:scheduled', (e) => {
      if (this.preferences.enableTourAlerts) {
        this.scheduleNotification({
          type: 'tour',
          title: 'Tour Reminder',
          message: `Your tour is scheduled for ${e.detail.time}`,
          scheduledTime: e.detail.scheduledTime
        });
      }
    });

    // Listen for share notifications
    window.addEventListener('share:created', (e) => {
      if (this.preferences.enableSystemAlerts) {
        this.showToast('Link shared successfully!', 'success', {
          duration: 3000
        });
      }
    });
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', options = {}) {
    if (!this.preferences.enableToasts) {
      return;
    }

    const {
      duration = 3000,
      action = null,
      priority = 'normal'
    } = options;

    const toastId = 'toast_' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type} toast-${priority}`;

    const badge = this.badges[type] || 'ℹ';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-badge">${badge}</span>
        <span class="toast-message">${message}</span>
        ${action ? `<button class="toast-action-btn">${action.text}</button>` : ''}
      </div>
      <button class="toast-close">×</button>
    `;

    // Add to container
    const container = document.querySelector('.notification-container');
    if (container) {
      container.appendChild(toast);
    }

    // Set up event handlers
    if (action) {
      toast.querySelector('.toast-action-btn').addEventListener('click', () => {
        action.callback();
        this.closeToast(toastId);
      });
    }

    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.closeToast(toastId);
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.closeToast(toastId);
      }, duration);
    }

    // Animate in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    this.activeToasts.set(toastId, { type, message, timestamp: new Date() });
    this.addToHistory({ type: 'toast', message, type: type, timestamp: new Date() });

    this.emitNotificationSent({
      type: 'toast',
      message: message,
      notificationType: type
    });

    return toastId;
  }

  /**
   * Close toast
   */
  closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        this.activeToasts.delete(toastId);
      }, 300);
    }
  }

  /**
   * Show notification (with badge support)
   */
  async showNotification(config) {
    if (!this.preferences.enablePush && !this.preferences.enableToasts) {
      return;
    }

    const {
      type = 'info',
      title,
      message,
      action = null,
      icon = null,
      tag = null
    } = config;

    // First try push notification
    if (this.pushPermission === 'granted' && this.preferences.enablePush) {
      try {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification(title, {
          body: message,
          icon: icon || `/img/notification-${type}.png`,
          badge: `/img/badge-${type}.png`,
          tag: tag || Date.now().toString(),
          requireInteraction: true,
          actions: action ? [{
            action: 'open',
            title: action.text
          }] : []
        });

        this.addToHistory({
          type: 'push',
          title: title,
          message: message,
          timestamp: new Date()
        });
      } catch (err) {
        console.warn('[NotificationSystem] Push notification failed:', err);
        // Fall back to toast
        this.showToast(message, type, { action });
      }
    } else {
      // Fall back to toast
      this.showToast(message, type, { action });
    }

    this.emitNotificationSent({
      type: 'notification',
      title: title,
      message: message,
      notificationType: type
    });
  }

  /**
   * Schedule notification for later
   */
  scheduleNotification(config) {
    const {
      type = 'info',
      title,
      message,
      scheduledTime
    } = config;

    const delay = new Date(scheduledTime).getTime() - Date.now();

    if (delay <= 0) {
      this.showNotification({ type, title, message });
      return;
    }

    const timeoutId = setTimeout(() => {
      this.showNotification({ type, title, message });
    }, delay);

    return timeoutId;
  }

  /**
   * Show notification with retry logic
   */
  async showNotificationWithRetry(config, attempt = 0) {
    try {
      await this.showNotification(config);
    } catch (err) {
      if (attempt < this.maxRetries) {
        console.warn(`[NotificationSystem] Retry attempt ${attempt + 1}/${this.maxRetries}`);

        setTimeout(() => {
          this.showNotificationWithRetry(config, attempt + 1);
        }, this.retryDelayMs * (attempt + 1));
      } else {
        console.error('[NotificationSystem] Failed after max retries:', err);
      }
    }
  }

  /**
   * Create notification container
   */
  createNotificationContainer() {
    let container = document.querySelector('.notification-container');

    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  }

  /**
   * Set up badge updates (unread notification count)
   */
  setupBadgeUpdates() {
    if ('setAppBadge' in navigator) {
      // Update badge with notification count
      window.addEventListener('notification:added', () => {
        const unreadCount = this.notificationHistory.filter(n => !n.read).length;
        navigator.setAppBadge(unreadCount);
      });
    }
  }

  /**
   * Add notification to history
   */
  addToHistory(notification) {
    this.notificationHistory.unshift({
      ...notification,
      read: false,
      id: 'notif_' + Date.now()
    });

    // Limit history size
    if (this.notificationHistory.length > this.maxHistoryLength) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistoryLength);
    }

    // Persist to storage
    localStorage.setItem('gv-infra:notification-history', JSON.stringify(this.notificationHistory));

    window.dispatchEvent(new CustomEvent('notification:added'));
  }

  /**
   * Get notification history
   */
  getHistory(options = {}) {
    const {
      limit = 10,
      unreadOnly = false,
      type = null
    } = options;

    let history = this.notificationHistory;

    if (unreadOnly) {
      history = history.filter(n => !n.read);
    }

    if (type) {
      history = history.filter(n => n.type === type);
    }

    return history.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const notification = this.notificationHistory.find(n => n.id === notificationId);

    if (notification) {
      notification.read = true;
      localStorage.setItem('gv-infra:notification-history', JSON.stringify(this.notificationHistory));
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.notificationHistory.forEach(n => {
      n.read = true;
    });

    localStorage.setItem('gv-infra:notification-history', JSON.stringify(this.notificationHistory));
  }

  /**
   * Clear notification history
   */
  clearHistory() {
    this.notificationHistory = [];
    localStorage.removeItem('gv-infra:notification-history');
  }

  /**
   * Load preferences from storage
   */
  loadPreferences() {
    const stored = localStorage.getItem('gv-infra:notification-preferences');

    if (stored) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
        console.log('[NotificationSystem] Preferences loaded');
      } catch (err) {
        console.warn('[NotificationSystem] Failed to load preferences:', err);
      }
    }
  }

  /**
   * Save preferences
   */
  savePreferences() {
    localStorage.setItem('gv-infra:notification-preferences', JSON.stringify(this.preferences));
    console.log('[NotificationSystem] Preferences saved');
  }

  /**
   * Update preferences
   */
  updatePreferences(updates) {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    console.log('[NotificationSystem] Preferences updated');
  }

  /**
   * Show notification preferences dialog
   */
  showPreferencesDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'notification-preferences-dialog';
    dialog.innerHTML = `
      <div class="preferences-header">
        <h2>🔔 Notification Preferences</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="preferences-content">
        <div class="preference-group">
          <h3>Notification Channels</h3>
          <label class="preference-item">
            <input type="checkbox" name="enableToasts" ${this.preferences.enableToasts ? 'checked' : ''}>
            <span>In-App Toasts</span>
          </label>
          <label class="preference-item">
            <input type="checkbox" name="enablePush" ${this.preferences.enablePush ? 'checked' : ''}>
            <span>Push Notifications</span>
          </label>
        </div>

        <div class="preference-group">
          <h3>Alert Types</h3>
          <label class="preference-item">
            <input type="checkbox" name="enablePlotAlerts" ${this.preferences.enablePlotAlerts ? 'checked' : ''}>
            <span>Plot Updates</span>
          </label>
          <label class="preference-item">
            <input type="checkbox" name="enablePriceAlerts" ${this.preferences.enablePriceAlerts ? 'checked' : ''}>
            <span>Price Changes</span>
          </label>
          <label class="preference-item">
            <input type="checkbox" name="enableTourAlerts" ${this.preferences.enableTourAlerts ? 'checked' : ''}>
            <span>Tour Reminders</span>
          </label>
          <label class="preference-item">
            <input type="checkbox" name="enableSystemAlerts" ${this.preferences.enableSystemAlerts ? 'checked' : ''}>
            <span>System Alerts</span>
          </label>
        </div>

        <div class="preference-group">
          <h3>Frequency</h3>
          <label class="preference-item">
            <input type="radio" name="pushFrequency" value="realtime" ${this.preferences.pushFrequency === 'realtime' ? 'checked' : ''}>
            <span>Real-time</span>
          </label>
          <label class="preference-item">
            <input type="radio" name="pushFrequency" value="daily" ${this.preferences.pushFrequency === 'daily' ? 'checked' : ''}>
            <span>Daily Digest</span>
          </label>
          <label class="preference-item">
            <input type="radio" name="pushFrequency" value="weekly" ${this.preferences.pushFrequency === 'weekly' ? 'checked' : ''}>
            <span>Weekly Digest</span>
          </label>
        </div>

        <div class="preference-actions">
          <button class="btn-save">💾 Save</button>
          <button class="btn-reset">↻ Reset</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Event handlers
    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelector('.btn-save').addEventListener('click', () => {
      const checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
      const radios = dialog.querySelectorAll('input[type="radio"]');

      checkboxes.forEach(cb => {
        if (cb.name in this.preferences) {
          this.preferences[cb.name] = cb.checked;
        }
      });

      radios.forEach(rb => {
        if (rb.checked && rb.name in this.preferences) {
          this.preferences[rb.name] = rb.value;
        }
      });

      this.savePreferences();
      this.showToast('Preferences saved!', 'success');
      dialog.remove();
    });

    dialog.querySelector('.btn-reset').addEventListener('click', () => {
      if (confirm('Reset all preferences to defaults?')) {
        this.preferences = {
          enableToasts: true,
          enablePush: false,
          pushFrequency: 'daily',
          enablePlotAlerts: true,
          enablePriceAlerts: true,
          enableTourAlerts: true,
          enableSystemAlerts: true
        };
        this.savePreferences();
        dialog.remove();
      }
    });
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      pushPermission: this.pushPermission,
      activeToasts: this.activeToasts.size,
      historyLength: this.notificationHistory.length,
      unreadCount: this.notificationHistory.filter(n => !n.read).length,
      preferences: this.preferences
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit notification system initialized
   */
  emitNotificationSystemInitialized() {
    window.dispatchEvent(new CustomEvent('notification:system-initialized'));
  }

  /**
   * Emit notification sent
   */
  emitNotificationSent(data) {
    window.dispatchEvent(new CustomEvent('notification:sent', {
      detail: data
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.NotificationSystem = NotificationSystem;
}

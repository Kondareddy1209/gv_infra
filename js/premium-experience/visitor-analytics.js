/**
 * VISITOR-ANALYTICS.JS
 * Session Tracking and Analytics Collection
 *
 * Tracks user sessions, interactions, heatmaps, device/browser info,
 * engagement metrics, errors, performance, and GDPR-compliant event logging.
 *
 * Usage:
 *   const analytics = new VisitorAnalytics(config);
 *   await analytics.initialize();
 *   analytics.trackEvent('plot-clicked', { plotId: '123' });
 */

class VisitorAnalytics {
  constructor(config = {}) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.sessionEnd = null;
    this.isEnabled = true;

    // Event tracking
    this.events = [];
    this.batchSize = 50;
    this.flushInterval = 30000; // 30 seconds
    this.flushTimer = null;

    // Session metrics
    this.pageViews = [];
    this.timeOnPage = 0;
    this.interactionCount = 0;
    this.plotInteractions = {};

    // Device/browser tracking
    this.deviceInfo = {
      type: this.detectDeviceType(),
      browser: this.detectBrowser(),
      os: this.detectOS(),
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language
    };

    // Heatmap data
    this.heatmapData = [];
    this.plotViewHeatmap = new Map();

    // Performance metrics
    this.performanceMetrics = {
      pageLoadTime: 0,
      fps: 0,
      memoryUsage: 0,
      networkLatency: 0,
      errors: []
    };

    // Offline queue for offline support
    this.offlineQueue = [];

    this.loadConfiguration();
  }

  /**
   * Load analytics configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.analytics };
        console.log('[VisitorAnalytics] Configuration loaded');
      }
    } catch (err) {
      console.warn('[VisitorAnalytics] Failed to load config:', err);
    }
  }

  /**
   * Initialize analytics tracking
   */
  async initialize() {
    console.log('[VisitorAnalytics] Initializing with session ID:', this.sessionId);

    // Check privacy settings
    if (!this.checkPrivacyConsent()) {
      console.log('[VisitorAnalytics] Analytics disabled due to privacy settings');
      this.isEnabled = false;
      return false;
    }

    // Bind event listeners
    this.setupEventListeners();

    // Track page load performance
    this.trackPageLoadPerformance();

    // Track all custom events
    this.bindCustomEventTracking();

    // Start offline detection
    this.setupOfflineDetection();

    // Start periodic flush
    this.startPeriodicFlush();

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.sessionEnd = new Date();
      this.flushEvents(); // Sync flush on unload
    });

    this.emitAnalyticsInitialized();
    return true;
  }

  /**
   * Check privacy consent (GDPR compliance)
   */
  checkPrivacyConsent() {
    // Check for privacy preference in localStorage
    const privacyConsent = localStorage.getItem('gv-infra:privacy-analytics');

    if (privacyConsent === 'denied') {
      return false;
    }

    // Check for do-not-track header
    if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') {
      return false;
    }

    return true;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Set up event listeners for user interactions
   */
  setupEventListeners() {
    // Track clicks on 3D viewer
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-viewer]')) {
        this.trackInteraction('viewer_click', { target: e.target.className });
      }
    });

    // Track window focus/blur
    window.addEventListener('focus', () => {
      this.trackEvent('session:focus');
    });

    window.addEventListener('blur', () => {
      this.trackEvent('session:blur');
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session:hidden');
      } else {
        this.trackEvent('session:visible');
      }
    });
  }

  /**
   * Track page load performance (Core Web Vitals)
   */
  trackPageLoadPerformance() {
    // Page load time
    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

      this.performanceMetrics.pageLoadTime = pageLoadTime;

      this.trackEvent('performance:page-load', {
        loadTime: pageLoadTime,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        firstContentfulPaint: this.getFirstContentfulPaint()
      });
    });

    // Detect FPS
    this.trackFPS();

    // Track memory usage (if available)
    if (performance.memory) {
      setInterval(() => {
        this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
      }, 5000);
    }

    // Track network latency
    this.trackNetworkLatency();
  }

  /**
   * Get First Contentful Paint time
   */
  getFirstContentfulPaint() {
    try {
      const perfEntries = performance.getEntriesByName('first-contentful-paint');
      return perfEntries.length > 0 ? perfEntries[0].startTime : 0;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Track FPS
   */
  trackFPS() {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrame = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        this.performanceMetrics.fps = frameCount;
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Track network latency
   */
  trackNetworkLatency() {
    const beacon = new Image();
    const startTime = performance.now();

    beacon.onload = beacon.onerror = () => {
      const latency = performance.now() - startTime;
      this.performanceMetrics.networkLatency = latency;
    };

    beacon.src = `about:blank?t=${Date.now()}`;
  }

  /**
   * Bind custom event tracking
   */
  bindCustomEventTracking() {
    // Track plot selection
    window.addEventListener('plot:selected', (e) => {
      this.trackPlotInteraction('selected', e.detail);
    });

    // Track plot details view
    window.addEventListener('plot:details-viewed', (e) => {
      this.trackPlotInteraction('details-viewed', e.detail);
    });

    // Track tour started
    window.addEventListener('plot:start-tour', (e) => {
      this.trackPlotInteraction('tour-started', e.detail);
    });

    // Track measurements
    window.addEventListener('measurement:completed', (e) => {
      this.trackEvent('measurement:completed', {
        type: e.detail.type,
        value: e.detail.value
      });
    });

    // Track camera movements
    window.addEventListener('camera:moved', (e) => {
      this.trackInteraction('camera:moved', e.detail);
    });

    // Track errors
    window.addEventListener('error', (e) => {
      this.trackError({
        type: 'javascript',
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno
      });
    });
  }

  /**
   * Track plot interaction
   */
  trackPlotInteraction(action, detail) {
    const plotId = detail.plotId || detail.id;

    // Update heatmap
    if (!this.plotViewHeatmap.has(plotId)) {
      this.plotViewHeatmap.set(plotId, 0);
    }
    this.plotViewHeatmap.set(plotId, this.plotViewHeatmap.get(plotId) + 1);

    // Update interaction count
    if (!this.plotInteractions[plotId]) {
      this.plotInteractions[plotId] = {};
    }
    this.plotInteractions[plotId][action] = (this.plotInteractions[plotId][action] || 0) + 1;

    this.trackEvent(`plot:${action}`, {
      plotId,
      ...detail
    });

    this.interactionCount++;
  }

  /**
   * Track generic event
   */
  trackEvent(category, data = {}) {
    if (!this.isEnabled) return;

    const event = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      category: category,
      data: data,
      deviceInfo: this.deviceInfo,
      url: window.location.href
    };

    this.events.push(event);

    // Flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flushEvents();
    }

    this.emitAnalyticsEvent(category, data);
  }

  /**
   * Track interaction
   */
  trackInteraction(action, data = {}) {
    this.trackEvent(`interaction:${action}`, data);
  }

  /**
   * Track error
   */
  trackError(errorData) {
    this.performanceMetrics.errors.push({
      timestamp: new Date(),
      ...errorData
    });

    this.trackEvent('error:reported', errorData);
  }

  /**
   * Detect device type
   */
  detectDeviceType() {
    const ua = navigator.userAgent;
    if (/mobile|android/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  /**
   * Detect browser
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    return 'Unknown';
  }

  /**
   * Detect OS
   */
  detectOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Unknown';
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Flush events to backend
   */
  async flushEvents() {
    if (this.events.length === 0) {
      return;
    }

    const eventBatch = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      events: this.events,
      metrics: this.performanceMetrics,
      heatmap: Array.from(this.plotViewHeatmap.entries()),
      interactions: this.plotInteractions,
      duration: new Date() - this.sessionStart
    };

    try {
      if (navigator.onLine) {
        const response = await fetch(this.config.analyticsEndpoint || '/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBatch)
        });

        if (response.ok) {
          // Clear flushed events
          this.events = [];

          // Clear offline queue on successful sync
          if (this.offlineQueue.length > 0) {
            this.offlineQueue = [];
            console.log('[VisitorAnalytics] Offline queue cleared');
          }

          console.log('[VisitorAnalytics] Events flushed:', eventBatch.events.length);
        } else {
          console.warn('[VisitorAnalytics] Failed to flush events:', response.status);
          this.queueForOfflineSync(eventBatch);
        }
      } else {
        // Queue for later if offline
        this.queueForOfflineSync(eventBatch);
      }
    } catch (err) {
      console.error('[VisitorAnalytics] Failed to flush events:', err);
      this.queueForOfflineSync(eventBatch);
    }
  }

  /**
   * Queue events for offline sync
   */
  queueForOfflineSync(eventBatch) {
    this.offlineQueue.push(eventBatch);
    localStorage.setItem('gv-infra:analytics-queue', JSON.stringify(this.offlineQueue));
    console.log('[VisitorAnalytics] Events queued for offline sync');
  }

  /**
   * Set up offline detection
   */
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('[VisitorAnalytics] Connection restored, syncing queued events');
      this.syncOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[VisitorAnalytics] Connection lost, queuing events');
    });
  }

  /**
   * Sync offline queue when connection restored
   */
  async syncOfflineQueue() {
    const queuedData = localStorage.getItem('gv-infra:analytics-queue');
    if (!queuedData) return;

    try {
      const queue = JSON.parse(queuedData);

      for (const batch of queue) {
        const response = await fetch(this.config.analyticsEndpoint || '/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        });

        if (response.ok) {
          console.log('[VisitorAnalytics] Offline batch synced');
        }
      }

      // Clear queue on successful sync
      localStorage.removeItem('gv-infra:analytics-queue');
      this.offlineQueue = [];
    } catch (err) {
      console.warn('[VisitorAnalytics] Offline sync failed:', err);
    }
  }

  /**
   * Get heatmap of most-viewed plots
   */
  getViewHeatmap() {
    const heatmap = {};

    this.plotViewHeatmap.forEach((views, plotId) => {
      heatmap[plotId] = views;
    });

    // Sort by views (descending)
    return Object.entries(heatmap)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [id, views]) => {
        obj[id] = views;
        return obj;
      }, {});
  }

  /**
   * Get engagement metrics
   */
  getEngagementMetrics() {
    const sessionDuration = new Date() - this.sessionStart;

    return {
      sessionId: this.sessionId,
      sessionDuration: sessionDuration,
      interactionCount: this.interactionCount,
      plotsViewed: Object.keys(this.plotInteractions).length,
      plotInteractions: this.plotInteractions,
      averageTimePerInteraction: sessionDuration / Math.max(this.interactionCount, 1),
      errorCount: this.performanceMetrics.errors.length,
      deviceInfo: this.deviceInfo,
      performanceMetrics: this.performanceMetrics
    };
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      sessionId: this.sessionId,
      isEnabled: this.isEnabled,
      sessionStart: this.sessionStart,
      duration: new Date() - this.sessionStart,
      eventCount: this.events.length,
      queuedEvents: this.offlineQueue.length,
      metrics: this.getEngagementMetrics()
    };
  }

  /**
   * Disable analytics (privacy opt-out)
   */
  disableAnalytics() {
    this.isEnabled = false;
    localStorage.setItem('gv-infra:privacy-analytics', 'denied');
    console.log('[VisitorAnalytics] Analytics disabled');
  }

  /**
   * Enable analytics (privacy opt-in)
   */
  enableAnalytics() {
    this.isEnabled = true;
    localStorage.setItem('gv-infra:privacy-analytics', 'allowed');
    console.log('[VisitorAnalytics] Analytics enabled');
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.sessionEnd = new Date();
    this.flushEvents(); // Final flush
    console.log('[VisitorAnalytics] Destroyed');
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit analytics initialized
   */
  emitAnalyticsInitialized() {
    window.dispatchEvent(new CustomEvent('analytics:initialized', {
      detail: { sessionId: this.sessionId }
    }));
  }

  /**
   * Emit analytics event
   */
  emitAnalyticsEvent(category, data) {
    window.dispatchEvent(new CustomEvent('analytics:event', {
      detail: {
        category: category,
        action: data.action || null,
        label: data.label || null,
        value: data.value || null
      }
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.VisitorAnalytics = VisitorAnalytics;
}

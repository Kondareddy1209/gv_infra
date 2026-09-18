/**
 * SHAREABLE-URLS.JS
 * URL Generation and Sharing with Camera State Encoding
 *
 * Generates short URLs with encoded camera position/rotation, viewport state,
 * QR codes, deep links, expiring shares, and view-only modes.
 *
 * Usage:
 *   const shareManager = new ShareableURLs(config);
 *   const shareLink = await shareManager.generateShareURL(cameraState);
 *   shareManager.openQRCodeDialog(shareLink);
 */

class ShareableURLs {
  constructor(config = {}) {
    this.config = config;
    this.baseURL = window.location.origin;
    this.shortURLService = config.shortURLService || 'https://api.example.com/shorten';
    this.shareLinks = new Map();
    this.analytics = new Map();

    this.loadConfiguration();
  }

  /**
   * Load sharing configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.sharing };
        console.log('[ShareableURLs] Configuration loaded');
      }
    } catch (err) {
      console.warn('[ShareableURLs] Failed to load config:', err);
    }
  }

  /**
   * Generate shareable URL with encoded camera state
   */
  async generateShareURL(cameraState, options = {}) {
    const {
      expiresIn = 7,
      viewOnly = false,
      password = null,
      selectedPlots = [],
      measurements = [],
      atmosphere = {}
    } = options;

    // Encode camera position and rotation
    const encoded = this.encodeViewportState({
      camera: cameraState,
      selectedPlots,
      measurements,
      atmosphere
    });

    // Create share URL with encoded state
    const params = new URLSearchParams({
      state: encoded,
      viewonly: viewOnly ? '1' : '0'
    });

    if (password) {
      params.append('protected', '1');
    }

    const fullURL = `${this.baseURL}/view?${params.toString()}`;
    const shareId = this.generateShareId();

    // Create share link object
    const shareLink = {
      id: shareId,
      fullURL: fullURL,
      shortURL: '',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
      viewOnly: viewOnly,
      protected: !!password,
      passwordHash: password ? this.hashPassword(password) : null,
      viewCount: 0,
      lastViewed: null,
      analytics: []
    };

    // Generate short URL
    try {
      shareLink.shortURL = await this.generateShortURL(fullURL);
    } catch (err) {
      console.warn('[ShareableURLs] Short URL generation failed:', err);
      shareLink.shortURL = fullURL;
    }

    // Store share link
    this.shareLinks.set(shareId, shareLink);

    console.log('[ShareableURLs] Share URL generated:', shareLink.shortURL);
    this.emitShareCreated(shareLink);

    return shareLink;
  }

  /**
   * Encode viewport state to compact string
   */
  encodeViewportState(state) {
    const json = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(json)));
  }

  /**
   * Decode viewport state from URL
   */
  decodeViewportState(encoded) {
    try {
      const json = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(json);
    } catch (err) {
      console.error('[ShareableURLs] Failed to decode viewport state:', err);
      return null;
    }
  }

  /**
   * Generate short URL using service
   */
  async generateShortURL(fullURL) {
    try {
      const response = await fetch(this.shortURLService, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullURL })
      });

      if (response.ok) {
        const data = await response.json();
        return data.shortURL || fullURL;
      }

      return fullURL;
    } catch (err) {
      console.warn('[ShareableURLs] Short URL service unavailable:', err);
      return fullURL;
    }
  }

  /**
   * Generate unique share ID
   */
  generateShareId() {
    return 'share_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Hash password for storage
   */
  hashPassword(password) {
    // Simple hash for demo (use bcrypt in production)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Verify share link access
   */
  verifyShareAccess(shareId, password = null) {
    const shareLink = this.shareLinks.get(shareId);

    if (!shareLink) {
      console.warn('[ShareableURLs] Share link not found:', shareId);
      return { valid: false, reason: 'not_found' };
    }

    // Check expiration
    if (shareLink.expiresAt < new Date()) {
      console.warn('[ShareableURLs] Share link expired:', shareId);
      return { valid: false, reason: 'expired' };
    }

    // Check password protection
    if (shareLink.protected) {
      if (!password || this.hashPassword(password) !== shareLink.passwordHash) {
        console.warn('[ShareableURLs] Invalid password for protected share');
        return { valid: false, reason: 'password_required' };
      }
    }

    // Update analytics
    shareLink.viewCount++;
    shareLink.lastViewed = new Date();
    shareLink.analytics.push({
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType(),
      referrer: document.referrer
    });

    return { valid: true, shareLink };
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
   * Generate QR code for URL
   */
  async generateQRCode(url) {
    try {
      // Use QR code generation library (e.g., qrcode.js)
      const QRCode = window.QRCode || null;

      if (!QRCode) {
        console.warn('[ShareableURLs] QR code library not available');
        return null;
      }

      const canvas = document.createElement('canvas');
      new QRCode({
        text: url,
        width: 300,
        height: 300,
        correctLevel: QRCode.CorrectLevel.H,
        useSVG: false,
        colorDark: '#000000',
        colorLight: '#FFFFFF'
      });

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('[ShareableURLs] QR code generation failed:', err);
      return null;
    }
  }

  /**
   * Open QR code dialog
   */
  async openQRCodeDialog(shareLink) {
    const qrCodeDataURL = await this.generateQRCode(shareLink.shortURL || shareLink.fullURL);

    const dialog = document.createElement('div');
    dialog.className = 'qr-code-dialog';
    dialog.innerHTML = `
      <div class="qr-dialog-content">
        <button class="close-btn">×</button>
        <h2>Share This View</h2>
        <div class="qr-code-container">
          ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-image" />` : '<p>QR code unavailable</p>'}
        </div>
        <div class="share-url-section">
          <label>Share Link:</label>
          <input type="text" class="share-url-input" value="${shareLink.shortURL || shareLink.fullURL}" readonly>
          <button class="copy-btn">📋 Copy</button>
        </div>
        <div class="share-buttons">
          <button class="share-btn whatsapp-share">WhatsApp</button>
          <button class="share-btn email-share">Email</button>
          <button class="share-btn facebook-share">Facebook</button>
          <button class="share-btn twitter-share">Twitter</button>
        </div>
        <div class="qr-download">
          <button class="download-qr-btn">⬇ Download QR Code</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Set up event handlers
    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelector('.copy-btn').addEventListener('click', () => {
      const input = dialog.querySelector('.share-url-input');
      input.select();
      document.execCommand('copy');

      const btn = dialog.querySelector('.copy-btn');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = originalText; }, 2000);
    });

    dialog.querySelector('.whatsapp-share').addEventListener('click', () => {
      const text = `Check out this property view: ${shareLink.shortURL || shareLink.fullURL}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    });

    dialog.querySelector('.email-share').addEventListener('click', () => {
      const subject = 'Check out this property view';
      const body = `I wanted to share this property view with you: ${shareLink.shortURL || shareLink.fullURL}`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    });

    dialog.querySelector('.facebook-share').addEventListener('click', () => {
      const url = shareLink.shortURL || shareLink.fullURL;
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    });

    dialog.querySelector('.twitter-share').addEventListener('click', () => {
      const text = `Check out this property view: ${shareLink.shortURL || shareLink.fullURL}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
    });

    dialog.querySelector('.download-qr-btn').addEventListener('click', async () => {
      if (qrCodeDataURL) {
        const a = document.createElement('a');
        a.href = qrCodeDataURL;
        a.download = `gv-infra-share-${shareLink.id}.png`;
        a.click();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog.parentElement) {
        dialog.remove();
      }
    });
  }

  /**
   * Load shared view from URL parameters
   */
  loadSharedView(viewer, shareId) {
    const shareLink = this.shareLinks.get(shareId);

    if (!shareLink) {
      console.error('[ShareableURLs] Share link not found:', shareId);
      return false;
    }

    const viewportState = this.decodeViewportState(
      new URLSearchParams(window.location.search).get('state')
    );

    if (!viewportState) {
      console.error('[ShareableURLs] Failed to decode viewport state');
      return false;
    }

    // Apply camera state
    if (viewportState.camera && viewer) {
      const camera = viewer.camera;
      const cam = viewportState.camera;

      camera.setView({
        destination: new Cesium.Cartesian3(cam.position.x, cam.position.y, cam.position.z),
        orientation: {
          heading: Cesium.Math.toRadians(cam.heading),
          pitch: Cesium.Math.toRadians(cam.pitch),
          roll: Cesium.Math.toRadians(cam.roll)
        }
      });
    }

    // Apply atmosphere settings
    if (viewportState.atmosphere) {
      window.dispatchEvent(new CustomEvent('atmosphere:apply-settings', {
        detail: viewportState.atmosphere
      }));
    }

    // Select plots
    if (viewportState.selectedPlots && viewportState.selectedPlots.length > 0) {
      viewportState.selectedPlots.forEach(plotId => {
        window.dispatchEvent(new CustomEvent('plot:select-request', {
          detail: { plotId }
        }));
      });
    }

    // Apply measurements
    if (viewportState.measurements && viewportState.measurements.length > 0) {
      window.dispatchEvent(new CustomEvent('measurement:apply-saved', {
        detail: { measurements: viewportState.measurements }
      }));
    }

    // Set view-only mode if applicable
    if (shareLink.viewOnly) {
      this.enableViewOnlyMode();
    }

    console.log('[ShareableURLs] Shared view loaded');
    this.emitShareLinkLoaded(shareLink);

    return true;
  }

  /**
   * Enable view-only mode (disable interactions)
   */
  enableViewOnlyMode() {
    // Disable all interactive buttons
    document.querySelectorAll('button[data-action]').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    // Disable right-click menu on 3D view
    const container = document.querySelector('[data-viewer="cesium"]') ||
                      document.getElementById('cesium-container');

    if (container) {
      container.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    console.log('[ShareableURLs] View-only mode enabled');
  }

  /**
   * Get share link analytics
   */
  getShareAnalytics(shareId) {
    const shareLink = this.shareLinks.get(shareId);

    if (!shareLink) {
      return null;
    }

    return {
      shareId: shareId,
      viewCount: shareLink.viewCount,
      lastViewed: shareLink.lastViewed,
      createdAt: shareLink.createdAt,
      expiresAt: shareLink.expiresAt,
      isExpired: shareLink.expiresAt < new Date(),
      deviceBreakdown: this.getDeviceBreakdown(shareLink.analytics),
      analytics: shareLink.analytics
    };
  }

  /**
   * Get device breakdown from analytics
   */
  getDeviceBreakdown(analytics) {
    const breakdown = {
      mobile: 0,
      tablet: 0,
      desktop: 0
    };

    analytics.forEach(event => {
      breakdown[event.deviceType] = (breakdown[event.deviceType] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Clean up expired share links
   */
  cleanupExpiredLinks() {
    const now = new Date();
    const expiredIds = [];

    this.shareLinks.forEach((link, id) => {
      if (link.expiresAt < now) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.shareLinks.delete(id);
      console.log('[ShareableURLs] Expired share link removed:', id);
    });

    return expiredIds.length;
  }

  /**
   * Get deep link for mobile app
   */
  generateDeepLink(cameraState, options = {}) {
    const encoded = this.encodeViewportState({
      camera: cameraState,
      selectedPlots: options.selectedPlots || [],
      measurements: options.measurements || []
    });

    // Generate deep link URL (app-specific)
    return `gv-infra://view?state=${encoded}`;
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit share created
   */
  emitShareCreated(shareLink) {
    window.dispatchEvent(new CustomEvent('share:created', {
      detail: {
        url: shareLink.shortURL || shareLink.fullURL,
        shareId: shareLink.id,
        expiresAt: shareLink.expiresAt,
        viewCount: shareLink.viewCount
      }
    }));
  }

  /**
   * Emit share link loaded
   */
  emitShareLinkLoaded(shareLink) {
    window.dispatchEvent(new CustomEvent('share:link-loaded', {
      detail: {
        shareId: shareLink.id,
        viewOnly: shareLink.viewOnly,
        expiresAt: shareLink.expiresAt
      }
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.ShareableURLs = ShareableURLs;
}

/**
 * GV INFRA PROJECTS — Client-Side Demo Authentication Module (js/auth.js)
 * Architecture: Cleanly decoupled authentication provider for MVP static application.
 *
 * NOTE: This is a client-side prototype/demo authentication layer.
 * In a production deployment, this module is designed to be replaced by a secure
 * backend API service (e.g. JWT / OAuth 2.0 / Firebase Auth) without modifying
 * the website's navigation or header architecture.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'gv_infra_auth_v1';
  const SAVED_PLOTS_KEY = 'gv_saved_plots';

  // Centralized Demo Accounts (Kept strictly within this auth module)
  const DEMO_ACCOUNTS = {
    admin: {
      email: 'admin@gvinfra.com',
      password: 'admin123',
      name: 'GV Infra Administrator',
      role: 'admin',
      phone: '+91 9392887268'
    },
    user: {
      email: 'demo@investor.com',
      password: 'user123',
      name: 'K. Venkateshwar Rao',
      role: 'user',
      phone: '+91 9848012345'
    }
  };

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.usersDb = [];
      this.loadSession();
      this.initListeners();
    }

    loadSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          this.currentUser = data.currentUser || null;
          this.usersDb = data.usersDb || [DEMO_ACCOUNTS.user];
        } else {
          this.currentUser = null;
          this.usersDb = [DEMO_ACCOUNTS.user];
          this.persist();
        }
      } catch (err) {
        console.warn('[GV Auth] Error reading session storage:', err);
        this.currentUser = null;
      }
    }

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          currentUser: this.currentUser,
          usersDb: this.usersDb
        }));
      } catch (err) {
        console.warn('[GV Auth] Error persisting session:', err);
      }
      this.broadcastChange();
    }

    broadcastChange() {
      window.dispatchEvent(new CustomEvent('gv-auth-change', {
        detail: { user: this.currentUser }
      }));
      this.updateHeaderNav();
    }

    initListeners() {
      // Cross-tab synchronization
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.loadSession();
          window.dispatchEvent(new CustomEvent('gv-auth-change', {
            detail: { user: this.currentUser }
          }));
          this.updateHeaderNav();
        }
      });

      // Update headers on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.updateHeaderNav();
          this.setupAccountTriggers();
        });
      } else {
        this.updateHeaderNav();
        this.setupAccountTriggers();
      }
    }

    /**
     * Authenticate user or admin
     */
    login(email, password) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      // Check Demo Admin
      if (cleanEmail === DEMO_ACCOUNTS.admin.email.toLowerCase() && cleanPass === DEMO_ACCOUNTS.admin.password) {
        this.currentUser = {
          name: DEMO_ACCOUNTS.admin.name,
          email: DEMO_ACCOUNTS.admin.email,
          role: 'admin',
          phone: DEMO_ACCOUNTS.admin.phone,
          loginTime: new Date().toISOString()
        };
        this.persist();
        return { success: true, user: this.currentUser };
      }

      // Check Demo User or registered users
      const match = this.usersDb.find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPass);
      if (match) {
        this.currentUser = {
          name: match.name,
          email: match.email,
          role: 'user',
          phone: match.phone || '',
          loginTime: new Date().toISOString()
        };
        this.persist();
        return { success: true, user: this.currentUser };
      }

      return { success: false, message: 'Invalid email or password. Please check your credentials.' };
    }

    /**
     * Register a new normal user account
     */
    registerUser(name, email, phone, password) {
      const cleanName = (name || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPhone = (phone || '').trim();
      const cleanPass = (password || '').trim();

      if (!cleanName || !cleanEmail || !cleanPass) {
        return { success: false, message: 'Name, email, and password are required.' };
      }

      // Disallow using admin email
      if (cleanEmail === DEMO_ACCOUNTS.admin.email.toLowerCase()) {
        return { success: false, message: 'This email is reserved for administrative operations.' };
      }

      // Check if user exists
      const existing = this.usersDb.find(u => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { success: false, message: 'An account with this email already exists.' };
      }

      const newUser = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPass,
        role: 'user',
        createdAt: new Date().toISOString()
      };

      this.usersDb.push(newUser);
      this.currentUser = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: 'user',
        loginTime: new Date().toISOString()
      };

      this.persist();
      return { success: true, user: this.currentUser };
    }

    logout() {
      this.currentUser = null;
      this.persist();
      return { success: true };
    }

    getCurrentUser() {
      return this.currentUser;
    }

    isAuthenticated() {
      return this.currentUser !== null;
    }

    isAdmin() {
      return this.currentUser !== null && this.currentUser.role === 'admin';
    }

    getDemoCredentials() {
      return {
        user: { email: DEMO_ACCOUNTS.user.email, password: DEMO_ACCOUNTS.user.password },
        admin: { email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password }
      };
    }

    getSavedPlots() {
      try {
        const raw = localStorage.getItem(SAVED_PLOTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    /**
     * Reflect account state in navigation across all pages
     */
    updateHeaderNav() {
      const accountBtns = document.querySelectorAll('.nav-account-btn, [data-gv-action="account"]');
      const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      accountBtns.forEach(btn => {
        if (this.isAdmin()) {
          btn.innerHTML = `${svgIcon}<span class="account-btn-label">ADMIN</span>`;
          btn.classList.add('is-admin');
          btn.classList.remove('is-user');
          btn.setAttribute('aria-label', 'Admin Account: Operations Console');
        } else if (this.isAuthenticated()) {
          btn.innerHTML = `${svgIcon}<span class="account-btn-label">MY ACCOUNT</span>`;
          btn.classList.add('is-user');
          btn.classList.remove('is-admin');
          btn.setAttribute('aria-label', `User Account: ${this.currentUser.name}`);
        } else {
          btn.innerHTML = `${svgIcon}<span class="account-btn-label">ACCOUNT</span>`;
          btn.classList.remove('is-admin', 'is-user');
          btn.setAttribute('aria-label', 'Open Account / Sign In');
        }
      });
    }

    setupAccountTriggers() {
      document.addEventListener('click', (e) => {
        const target = e.target.closest('.nav-account-btn, [data-gv-action="account"]');
        if (target) {
          e.preventDefault();
          this.openAccountModal();
        }
      });
    }

    /**
     * Mount and display the editorial Account Modal
     */
    openAccountModal(tab = 'login') {
      let modal = document.getElementById('gv-account-modal');
      if (!modal) {
        modal = this.createAccountModalDOM();
        document.body.appendChild(modal);
      }

      this.renderModalContent(tab);
      modal.style.display = 'flex';
      modal.classList.add('is-open');
      document.body.classList.add('gv-modal-open');

      const firstInput = modal.querySelector('input:not([type=hidden])');
      if (firstInput) setTimeout(() => firstInput.focus(), 150);
    }

    closeAccountModal() {
      const modal = document.getElementById('gv-account-modal');
      if (modal) {
        modal.classList.remove('is-open');
        modal.style.display = 'none';
        document.body.classList.remove('gv-modal-open');
      }
    }

    createAccountModalDOM() {
      const overlay = document.createElement('div');
      overlay.id = 'gv-account-modal';
      overlay.className = 'gv-account-modal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'GV Infra Account');

      overlay.innerHTML = `
        <div class="gv-account-backdrop" id="gv-account-backdrop"></div>
        <div class="gv-account-dialog">
          <div class="gv-account-dialog-head">
            <div class="gv-account-brand-tag">
              <span class="gv-account-kicker">GV INFRA PLATFORM</span>
              <h3 id="gv-account-modal-title">Property Account</h3>
            </div>
            <button type="button" class="gv-account-close-btn" id="gv-account-close-btn" aria-label="Close dialog">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="gv-account-dialog-body" id="gv-account-dialog-content"></div>
        </div>
      `;

      overlay.querySelector('#gv-account-backdrop').addEventListener('click', () => this.closeAccountModal());
      overlay.querySelector('#gv-account-close-btn').addEventListener('click', () => this.closeAccountModal());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
          this.closeAccountModal();
        }
      });

      return overlay;
    }

    renderModalContent(activeTab = 'login') {
      const container = document.getElementById('gv-account-dialog-content');
      const titleEl = document.getElementById('gv-account-modal-title');
      if (!container) return;

      if (this.isAdmin()) {
        if (titleEl) titleEl.textContent = 'Administrator';
        container.innerHTML = this.renderAdminProfileHTML();
        this.attachProfileEvents();
        return;
      }

      if (this.isAuthenticated()) {
        if (titleEl) titleEl.textContent = 'Investor Account';
        container.innerHTML = this.renderUserProfileHTML();
        this.attachProfileEvents();
        return;
      }

      if (titleEl) titleEl.textContent = 'Property Account';

      // Unauthenticated: Show Tabs (Login, Register, Admin)
      container.innerHTML = `
        <div class="gv-account-tabs" role="tablist">
          <button class="gv-account-tab ${activeTab === 'login' ? 'active' : ''}" data-tab="login">Sign In</button>
          <button class="gv-account-tab ${activeTab === 'register' ? 'active' : ''}" data-tab="register">Create Account</button>
          <button class="gv-account-tab ${activeTab === 'admin' ? 'active' : ''}" data-tab="admin">Admin Access</button>
        </div>

        <div class="gv-account-tab-pane ${activeTab === 'login' ? 'active' : ''}" id="gv-pane-login">
          <form id="gv-login-form" class="gv-auth-form">
            <div class="gv-auth-field">
              <label for="gv-login-email">Email Address</label>
              <input type="email" id="gv-login-email" required placeholder="name@domain.com" autocomplete="email">
            </div>
            <div class="gv-auth-field">
              <label for="gv-login-password">Password</label>
              <input type="password" id="gv-login-password" required placeholder="••••••••" autocomplete="current-password">
            </div>
            <div class="gv-auth-error" id="gv-login-error"></div>
            <button type="submit" class="btn btn-primary gv-auth-submit-btn">Sign In to Account</button>
            <div class="gv-demo-shortcut">
              <span>Quick Evaluation:</span>
              <button type="button" class="gv-demo-btn" id="gv-btn-quick-user">Fill Demo User</button>
            </div>
          </form>
        </div>

        <div class="gv-account-tab-pane ${activeTab === 'register' ? 'active' : ''}" id="gv-pane-register">
          <form id="gv-register-form" class="gv-auth-form">
            <div class="gv-auth-field">
              <label for="gv-reg-name">Full Name</label>
              <input type="text" id="gv-reg-name" required placeholder="e.g. Anand Sharma">
            </div>
            <div class="gv-auth-field">
              <label for="gv-reg-email">Email Address</label>
              <input type="email" id="gv-reg-email" required placeholder="name@domain.com">
            </div>
            <div class="gv-auth-field">
              <label for="gv-reg-phone">Phone Number</label>
              <input type="tel" id="gv-reg-phone" placeholder="+91 98480 00000">
            </div>
            <div class="gv-auth-field">
              <label for="gv-reg-password">Create Password</label>
              <input type="password" id="gv-reg-password" required placeholder="Minimum 6 characters">
            </div>
            <div class="gv-auth-error" id="gv-reg-error"></div>
            <button type="submit" class="btn btn-primary gv-auth-submit-btn">Create Investor Account</button>
          </form>
        </div>

        <div class="gv-account-tab-pane ${activeTab === 'admin' ? 'active' : ''}" id="gv-pane-admin">
          <form id="gv-admin-form" class="gv-auth-form">
            <div class="gv-auth-notice">
              <strong>Administrative Access:</strong> Authorizes access to the Operations Console (inventory management, CRM leads, and pricing).
            </div>
            <div class="gv-auth-field">
              <label for="gv-admin-email">Admin Email</label>
              <input type="email" id="gv-admin-email" required placeholder="admin@gvinfra.com">
            </div>
            <div class="gv-auth-field">
              <label for="gv-admin-password">Admin Security Key</label>
              <input type="password" id="gv-admin-password" required placeholder="••••••••">
            </div>
            <div class="gv-auth-error" id="gv-admin-error"></div>
            <button type="submit" class="btn btn-primary gv-auth-submit-btn">Authenticate Admin</button>
            <div class="gv-demo-shortcut">
              <span>Admin Evaluation:</span>
              <button type="button" class="gv-demo-btn" id="gv-btn-quick-admin">Fill Demo Admin</button>
            </div>
          </form>
        </div>

        <div class="gv-auth-disclaimer">
          <span class="gv-auth-badge-demo">Demo / MVP Authentication</span>
          <p>Client-side prototype layer for static MVP evaluation. Passwords and sessions are held in local state and replaceable by an enterprise auth backend.</p>
        </div>
      `;

      this.attachFormEvents();
    }

    renderUserProfileHTML() {
      const user = this.currentUser;
      const savedPlotIds = this.getSavedPlots();
      let savedHtml = '';

      if (savedPlotIds.length > 0) {
        savedHtml = `
          <div class="gv-account-saved-section">
            <div class="gv-account-saved-header">
              <div>
                <div class="gv-account-section-title">Saved Shortlisted Plots</div>
                <div class="gv-account-saved-count">${savedPlotIds.length} ${savedPlotIds.length === 1 ? 'Plot' : 'Plots'} Saved</div>
              </div>
              <a href="project.html" class="btn btn-outline btn-small gv-view-saved-btn">View Saved Plots ↗</a>
            </div>
            <div class="gv-account-saved-list">
              ${savedPlotIds.map(id => `
                <div class="gv-account-saved-item">
                  <div class="gv-saved-item-info">
                    <span class="gv-saved-item-icon">📍</span>
                    <span class="gv-saved-item-id">Plot #${id}</span>
                  </div>
                  <a href="project.html?plot=${id}" class="gv-saved-link">Open in 3D Masterplan &rarr;</a>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        savedHtml = `
          <div class="gv-account-saved-section">
            <div class="gv-account-saved-header">
              <div>
                <div class="gv-account-section-title">Saved Shortlisted Plots</div>
                <div class="gv-account-saved-count">0 Plots Saved</div>
              </div>
              <a href="project.html" class="btn btn-outline btn-small gv-view-saved-btn">Explore 3D Masterplan ↗</a>
            </div>
            <p class="gv-account-empty-text">No plots shortlisted yet. Shortlist plots directly from the 3D Masterplan to review them here.</p>
          </div>
        `;
      }

      return `
        <div class="gv-account-profile-card">
          <div class="gv-account-avatar">
            <span>${(user.name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <div class="gv-account-meta">
            <div class="gv-account-role-badge">
              <span class="gv-account-role-tag">MY ACCOUNT · INVESTOR ACCOUNT</span>
            </div>
            <h4>${user.name}</h4>
            <div class="gv-account-contact-info">
              <span class="gv-contact-val">${user.email}</span>
              ${user.phone ? `<span class="gv-contact-dot">·</span><span class="gv-contact-val">${user.phone}</span>` : ''}
            </div>
          </div>
        </div>

        ${savedHtml}

        <div class="gv-account-card-actions">
          <button type="button" class="gv-account-signout-btn" id="gv-account-logout-btn">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign Out</span>
          </button>
        </div>

        <div class="gv-auth-disclaimer">
          <span class="gv-auth-badge-demo">Demo Session Active</span>
          <p>Session active in browser localStorage. Signing out clears client authentication immediately.</p>
        </div>
      `;
    }

    renderAdminProfileHTML() {
      const admin = this.currentUser;
      return `
        <div class="gv-account-profile-card is-admin-card">
          <div class="gv-account-avatar admin-avatar">
            <span>GV</span>
          </div>
          <div class="gv-account-meta">
            <div class="gv-account-role-badge">
              <span class="gv-account-role-tag admin-tag">ADMINISTRATOR</span>
            </div>
            <h4>${admin.name}</h4>
            <div class="gv-account-contact-info">
              <span class="gv-contact-val">${admin.email}</span>
              ${admin.phone ? `<span class="gv-contact-dot">·</span><span class="gv-contact-val">${admin.phone}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="gv-account-admin-panel">
          <div class="gv-account-section-title">Property Operations Management</div>
          <p class="gv-account-empty-text" style="color: var(--ink);">
            Authorized access to live plot allocations, inbound CRM leads, and pricing controls.
          </p>
          <a href="admin.html" class="btn btn-primary gv-admin-launch-btn" style="width: 100%; justify-content: center; margin-top: 14px; font-weight: 700; letter-spacing: 0.06em;">
            Open Operations Console ↗
          </a>
        </div>

        <div class="gv-account-card-actions">
          <button type="button" class="gv-account-signout-btn" id="gv-account-logout-btn">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign Out</span>
          </button>
        </div>

        <div class="gv-auth-disclaimer">
          <span class="gv-auth-badge-demo">Admin Session Active</span>
          <p>Full administrative privileges enabled for this browser session.</p>
        </div>
      `;
    }

    attachFormEvents() {
      const container = document.getElementById('gv-account-dialog-content');
      if (!container) return;

      // Tab switching
      container.querySelectorAll('.gv-account-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const tabKey = tab.getAttribute('data-tab');
          this.renderModalContent(tabKey);
        });
      });

      // Quick Demo Fillers
      const btnQuickUser = container.querySelector('#gv-btn-quick-user');
      if (btnQuickUser) {
        btnQuickUser.addEventListener('click', () => {
          const creds = this.getDemoCredentials();
          container.querySelector('#gv-login-email').value = creds.user.email;
          container.querySelector('#gv-login-password').value = creds.user.password;
        });
      }

      const btnQuickAdmin = container.querySelector('#gv-btn-quick-admin');
      if (btnQuickAdmin) {
        btnQuickAdmin.addEventListener('click', () => {
          const creds = this.getDemoCredentials();
          container.querySelector('#gv-admin-email').value = creds.admin.email;
          container.querySelector('#gv-admin-password').value = creds.admin.password;
        });
      }

      // Login Form
      const loginForm = container.querySelector('#gv-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = container.querySelector('#gv-login-email').value;
          const pass = container.querySelector('#gv-login-password').value;
          const res = this.login(email, pass);
          if (res.success) {
            this.closeAccountModal();
          } else {
            const errEl = container.querySelector('#gv-login-error');
            if (errEl) errEl.textContent = res.message;
          }
        });
      }

      // Register Form
      const regForm = container.querySelector('#gv-register-form');
      if (regForm) {
        regForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = container.querySelector('#gv-reg-name').value;
          const email = container.querySelector('#gv-reg-email').value;
          const phone = container.querySelector('#gv-reg-phone').value;
          const pass = container.querySelector('#gv-reg-password').value;
          const res = this.registerUser(name, email, phone, pass);
          if (res.success) {
            this.closeAccountModal();
          } else {
            const errEl = container.querySelector('#gv-reg-error');
            if (errEl) errEl.textContent = res.message;
          }
        });
      }

      // Admin Form
      const adminForm = container.querySelector('#gv-admin-form');
      if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = container.querySelector('#gv-admin-email').value;
          const pass = container.querySelector('#gv-admin-password').value;
          const res = this.login(email, pass);
          if (res.success) {
            if (this.isAdmin()) {
              // If on admin.html, unlock immediately
              if (window.location.pathname.includes('admin.html')) {
                window.location.reload();
              } else {
                this.closeAccountModal();
              }
            } else {
              const errEl = container.querySelector('#gv-admin-error');
              if (errEl) errEl.textContent = 'Account authenticated but does not possess administrator privileges.';
            }
          } else {
            const errEl = container.querySelector('#gv-admin-error');
            if (errEl) errEl.textContent = res.message;
          }
        });
      }
    }

    attachProfileEvents() {
      const container = document.getElementById('gv-account-dialog-content');
      if (!container) return;

      const logoutBtn = container.querySelector('#gv-account-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
          if (window.location.pathname.includes('admin.html')) {
            window.location.reload();
          } else {
            // Re-render modal to unauthenticated tabs state
            this.renderModalContent('login');
            // Close the modal cleanly
            this.closeAccountModal();
          }
        });
      }
    }
  }

  // Export Singleton
  const authInstance = new AuthManager();
  window.GV_AUTH = authInstance;

})();

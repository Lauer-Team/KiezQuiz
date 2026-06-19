/**
 * AuthManager — optionale Supabase E-Mail/Passwort-Authentifizierung.
 * Ohne gültige Keys in supabaseConfig.js bleibt die App im Gast-Modus.
 */
class AuthManager {
  constructor(config = {}) {
    this.config = config;
    this.supabase = null;
    this.user = null;
    this.profile = null;
    this._listeners = [];
    this._ready = false;
    this._readyPromise = null;
    this._resolveReady = null;
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
  }

  isConfigured() {
    const { url, anonKey } = this.config || {};
    if (!url || !anonKey) return false;
    if (url.includes('HIER_DEINE') || anonKey.includes('HIER_DEIN')) return false;
    return true;
  }

  isLoggedIn() {
    return !!this.user;
  }

  getAuthRedirectUrl() {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/profile/?section=account`;
    }
    return 'https://kiezquiz.de/profile/?section=account';
  }

  getDisplayName() {
    return this.profile?.username || this.user?.email?.split('@')[0] || t('auth.player');
  }

  onAuthChange(callback) {
    this._listeners.push(callback);
    if (this._ready) callback(this.user, this.profile);
  }

  _notify(user, profile) {
    this.user = user;
    this.profile = profile;
    this._listeners.forEach((cb) => {
      try {
        const result = cb(user, profile);
        if (result && typeof result.then === 'function') {
          this._pendingAuthTasks = (this._pendingAuthTasks || []).concat([result]);
        }
      } catch (e) {
        console.warn('Auth listener failed:', e);
      }
    });
  }

  async waitForPendingAuthTasks() {
    const tasks = this._pendingAuthTasks || [];
    this._pendingAuthTasks = [];
    await Promise.allSettled(tasks);
  }

  async init() {
    if (!this.isConfigured() || typeof supabase === 'undefined') {
      this._ready = true;
      this._resolveReady();
      this._notify(null, null);
      return;
    }

    this.supabase = supabase.createClient(this.config.url, this.config.anonKey);

    const AUTH_INIT_MS = 8000;
    const sessionResult = await Promise.race([
      this.supabase.auth.getSession(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Supabase getSession timeout')), AUTH_INIT_MS);
      })
    ]).catch((err) => {
      console.warn('Auth session check skipped:', err.message || err);
      return { data: { session: null } };
    });
    const { data: { session } } = sessionResult;
    if (session?.user) {
      const profile = await this._loadProfile(session.user.id);
      this._notify(session.user, profile);
      void window.kiezAnalytics?.linkGuestToUser?.();
    } else {
      this._notify(null, null);
    }

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this._pendingPasswordRecovery = true;
        this._schedulePasswordRecoveryModal();
      }
      if (session?.user) {
        const profile = await this._loadProfile(session.user.id);
        this._notify(session.user, profile);
        void window.kiezAnalytics?.linkGuestToUser?.();
      } else {
        this._notify(null, null);
      }
    });

    this._ready = true;
    this._resolveReady();
  }

  waitForReady() {
    return this._readyPromise;
  }

  async _loadProfile(userId) {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Profil laden fehlgeschlagen:', error.message);
      return null;
    }
    return data;
  }

  _mapAuthError(message) {
    const msg = (message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return t('auth.emailRegistered');
    }
    if (msg.includes('invalid login credentials')) {
      return t('auth.invalidCredentials');
    }
    if (msg.includes('password') && msg.includes('6')) {
      return t('auth.passwordMin');
    }
    if (msg.includes('valid email')) {
      return t('auth.invalidEmail');
    }
    return message || t('auth.genericError');
  }

  async _resolveEmail(identifier) {
    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return { email: null, error: t('auth.identifierRequired') };
    }
    if (trimmed.includes('@')) {
      return { email: trimmed, error: null };
    }
    const { data, error } = await this.supabase.rpc('get_email_for_username', { p_username: trimmed });
    if (error) {
      console.warn('Username-Lookup fehlgeschlagen:', error.message);
      return { email: null, error: t('auth.invalidCredentials') };
    }
    if (!data) {
      return { email: null, error: t('auth.invalidCredentials') };
    }
    return { email: data, error: null };
  }

  _cleanAuthHashFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (url.hash && (url.hash.includes('access_token') || url.hash.includes('type='))) {
        history.replaceState(null, '', url.pathname + url.search);
      }
    } catch (_) { /* ignore */ }
  }

  _schedulePasswordRecoveryModal() {
    if (this._passwordRecoveryScheduled) return;
    this._passwordRecoveryScheduled = true;
    const show = () => {
      this._passwordRecoveryScheduled = false;
      if (!this._pendingPasswordRecovery) return;
      this._pendingPasswordRecovery = false;
      void this.showPasswordResetModal();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', show, { once: true });
    } else {
      setTimeout(show, 150);
    }
  }

  async requestPasswordReset(identifier) {
    if (!this.supabase) {
      return { error: t('auth.cloudNotConfigured') };
    }
    const { email, error: resolveError } = await this._resolveEmail(identifier);
    if (resolveError) {
      return { error: resolveError };
    }
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.getAuthRedirectUrl()
    });
    if (error) {
      return { error: this._mapAuthError(error.message) };
    }
    return { error: null };
  }

  async updatePassword(newPassword) {
    if (!this.supabase) {
      return { error: t('auth.cloudNotConfigured') };
    }
    if ((newPassword || '').length < 8) {
      return { error: t('auth.passwordMin') };
    }
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: this._mapAuthError(error.message) };
    }
    return { error: null };
  }

  async changeEmail(newEmail) {
    if (!this.supabase) {
      return { error: t('auth.cloudNotConfigured') };
    }
    const trimmed = (newEmail || '').trim();
    if (!trimmed.includes('@')) {
      return { error: t('auth.invalidEmail') };
    }
    const { error } = await this.supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: this.getAuthRedirectUrl() }
    );
    if (error) {
      return { error: this._mapAuthError(error.message) };
    }
    return { error: null };
  }

  async signUp(username, email, password) {
    if (!this.supabase) {
      return { error: t('auth.cloudNotConfigured') };
    }
    const trimmedName = (username || '').trim();
    if (!trimmedName) {
      return { error: t('auth.usernameRequired') };
    }
    if ((password || '').length < 8) {
      return { error: t('auth.passwordMin') };
    }

    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: trimmedName },
        emailRedirectTo: this.getAuthRedirectUrl()
      }
    });

    if (error) {
      return { error: this._mapAuthError(error.message) };
    }

    if (data.user) {
      const profile = await this._loadProfile(data.user.id);
      this._notify(data.user, profile);
    }
    return { error: null };
  }

  async signIn(identifier, password) {
    if (!this.supabase) {
      return { error: t('auth.cloudNotConfigured') };
    }

    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return { error: t('auth.identifierRequired') };
    }

    const { email: resolvedEmail, error: resolveError } = await this._resolveEmail(trimmed);
    if (resolveError) {
      return { error: resolveError };
    }
    const email = resolvedEmail;

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: this._mapAuthError(error.message) };
    }

    if (data.user) {
      const profile = await this._loadProfile(data.user.id);
      this._notify(data.user, profile);
    }
    return { error: null };
  }

  async signOut() {
    if (window.cloudSync) {
      await window.cloudSync.flushSaveNow();
    }
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this._notify(null, null);
  }

  updateHeaderUI() {
    const pills = document.querySelectorAll('.auth-pill');
    if (!pills.length) return;

    const loggedInHtml = `
        <span class="auth-pill-icon">👤</span>
        <a href="/profile/" class="auth-pill-name auth-pill-profile-link" title="${t('header.profileTitle')}">${this._escapeHtml(this.getDisplayName())}</a>
        <button type="button" class="auth-pill-action btn-auth-logout" title="${t('header.logout')}">${t('header.logout')}</button>
      `;
    const guestHtml = `
        <span class="auth-pill-icon">👤</span>
        <a href="/profile/" class="auth-pill-label auth-pill-profile-link" title="${t('header.profileTitle')}">${t('header.guest')}</a>
        <button type="button" class="auth-pill-action btn-auth-login">${t('header.login')}</button>
      `;

    pills.forEach((pill) => {
      if (this.isLoggedIn()) {
        pill.classList.add('auth-pill--logged-in');
        pill.innerHTML = loggedInHtml;
      } else {
        pill.classList.remove('auth-pill--logged-in');
        pill.innerHTML = guestHtml;
      }
    });

    document.querySelectorAll('.btn-auth-logout').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.signOut();
      });
    });

    document.querySelectorAll('.btn-auth-login').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showAuthModal();
      });
    });

    window.kiezHub?.refreshHubNav?.();
    window.kiezGlobalHeader?.syncDashboardNavLink?.();
  }

  initUI() {
    if (this._uiBound) {
      this.updateHeaderUI();
      return;
    }
    this._uiBound = true;

    document.body.addEventListener('click', (e) => {
      const pill = e.target.closest('.auth-pill');
      if (!pill) return;
      if (e.target.closest('.btn-auth-logout')) return;
      if (e.target.closest('.btn-auth-login')) return;
      if (e.target.closest('.auth-pill-profile-link')) return;
      if (this.isLoggedIn()) return;
      const onProfile = /^\/profile\/?/.test(window.location.pathname);
      if (!onProfile) {
        window.location.href = '/profile/';
        return;
      }
      this.showAuthModal();
    });

    this.updateHeaderUI();
  }

  async showAuthModal() {
    if (typeof openOverlayModal !== 'function') {
      if (typeof window.loadGameCore === 'function') {
        await window.loadGameCore();
      }
    }
    if (typeof openOverlayModal !== 'function') return;

    let activeTab = 'login';
    const modal = openOverlayModal(`
      <div class="modal-content auth-modal-content">
        <h2>${t('auth.cloudTitle')}</h2>
        <p class="auth-modal-intro">${t('auth.cloudIntro')}</p>
        <div class="auth-tabs">
          <button type="button" class="auth-tab auth-tab--active" data-tab="login">${t('auth.loginTab')}</button>
          <button type="button" class="auth-tab" data-tab="register">${t('auth.registerTab')}</button>
        </div>
        <form class="auth-form" id="auth-form-login">
          <label class="auth-field">
            <span>${t('auth.usernameOrEmail')}</span>
            <input type="text" id="auth-email" autocomplete="username" required>
          </label>
          <label class="auth-field">
            <span>${t('auth.password')}</span>
            <input type="password" id="auth-password" autocomplete="current-password" required minlength="8">
          </label>
          <p class="auth-forgot-wrap">
            <button type="button" class="auth-link-btn" id="auth-forgot-password">${t('auth.forgotPassword')}</button>
          </p>
          <p class="auth-error" id="auth-error" hidden></p>
          <button type="submit" class="primary-btn auth-submit">${t('auth.loginSubmit')}</button>
        </form>
        <form class="auth-form" id="auth-form-register" hidden>
          <label class="auth-field">
            <span>${t('auth.username')}</span>
            <input type="text" id="auth-username" autocomplete="username" required minlength="2" maxlength="30">
          </label>
          <label class="auth-field">
            <span>${t('auth.email')}</span>
            <input type="email" id="auth-email-reg" autocomplete="email" required>
          </label>
          <label class="auth-field">
            <span>${t('auth.password')}</span>
            <input type="password" id="auth-password-reg" autocomplete="new-password" required minlength="8">
          </label>
          <label class="auth-terms">
            <input type="checkbox" id="auth-age-confirm" required>
            <span>${t('auth.ageLabel')}</span>
          </label>
          <label class="auth-terms">
            <input type="checkbox" id="auth-terms-accept" required>
            <span>${t('auth.termsLabel')}</span>
          </label>
          <label class="auth-terms">
            <input type="checkbox" id="auth-immediate-service" required>
            <span>${t('auth.immediateServiceLabel')}</span>
          </label>
          <p class="auth-error" id="auth-error-reg" hidden></p>
          <button type="submit" class="primary-btn auth-submit">${t('auth.registerSubmit')}</button>
        </form>
        <button type="button" class="secondary-btn auth-cancel" id="btn-auth-cancel">${t('auth.cancel')}</button>
      </div>
    `, { closeOnBackdrop: true });

    const loginForm = document.getElementById('auth-form-login');
    const registerForm = document.getElementById('auth-form-register');
    const tabs = modal.querySelectorAll('.auth-tab');

    const setTab = (tab) => {
      activeTab = tab;
      tabs.forEach((tEl) => tEl.classList.toggle('auth-tab--active', tEl.dataset.tab === tab));
      loginForm.hidden = tab !== 'login';
      registerForm.hidden = tab !== 'register';
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setTab(tab.dataset.tab));
    });

    document.getElementById('btn-auth-cancel')?.addEventListener('click', () => closeOverlayModal(modal));

    document.getElementById('auth-forgot-password')?.addEventListener('click', () => {
      closeOverlayModal(modal);
      void this.showForgotPasswordModal();
    });

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-error');
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      errEl.hidden = true;

      const submitBtn = loginForm.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.loggingIn');

      const { error } = await this.signIn(email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.loginSubmit');

      if (error) {
        errEl.textContent = error;
        errEl.hidden = false;
        return;
      }
      closeOverlayModal(modal);
      this.updateHeaderUI();
    });

    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-error-reg');
      const username = document.getElementById('auth-username').value;
      const email = document.getElementById('auth-email-reg').value;
      const password = document.getElementById('auth-password-reg').value;
      const termsAccepted = document.getElementById('auth-terms-accept')?.checked;
      const ageConfirmed = document.getElementById('auth-age-confirm')?.checked;
      const immediateService = document.getElementById('auth-immediate-service')?.checked;
      errEl.hidden = true;

      if (!ageConfirmed) {
        errEl.textContent = t('auth.ageRequired');
        errEl.hidden = false;
        return;
      }

      if (!termsAccepted) {
        errEl.textContent = t('auth.termsRequired');
        errEl.hidden = false;
        return;
      }

      if (!immediateService) {
        errEl.textContent = t('auth.immediateServiceRequired');
        errEl.hidden = false;
        return;
      }

      const submitBtn = registerForm.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.registering');

      const { error } = await this.signUp(username, email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.registerSubmit');

      if (error) {
        errEl.textContent = error;
        errEl.hidden = false;
        return;
      }
      closeOverlayModal(modal);
      this.updateHeaderUI();
    });
  }

  async showForgotPasswordModal() {
    if (typeof openOverlayModal !== 'function') {
      if (typeof window.loadGameCore === 'function') {
        await window.loadGameCore();
      }
    }
    if (typeof openOverlayModal !== 'function') return;

    const modal = openOverlayModal(`
      <div class="modal-content auth-modal-content">
        <h2>${t('auth.forgotTitle')}</h2>
        <p class="auth-modal-intro">${t('auth.forgotIntro')}</p>
        <form class="auth-form" id="auth-form-forgot">
          <label class="auth-field">
            <span>${t('auth.usernameOrEmail')}</span>
            <input type="text" id="auth-forgot-identifier" autocomplete="username" required>
          </label>
          <p class="auth-error" id="auth-forgot-error" hidden></p>
          <p class="auth-success" id="auth-forgot-success" hidden></p>
          <button type="submit" class="primary-btn auth-submit">${t('auth.forgotSubmit')}</button>
        </form>
        <button type="button" class="secondary-btn auth-cancel" id="btn-forgot-cancel">${t('auth.cancel')}</button>
      </div>
    `, { closeOnBackdrop: true });

    const form = document.getElementById('auth-form-forgot');
    document.getElementById('btn-forgot-cancel')?.addEventListener('click', () => closeOverlayModal(modal));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-forgot-error');
      const okEl = document.getElementById('auth-forgot-success');
      const identifier = document.getElementById('auth-forgot-identifier').value;
      errEl.hidden = true;
      okEl.hidden = true;

      const submitBtn = form.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.forgotSending');

      const { error } = await this.requestPasswordReset(identifier);
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.forgotSubmit');

      if (error) {
        errEl.textContent = error;
        errEl.hidden = false;
        return;
      }
      okEl.textContent = t('auth.forgotSuccess');
      okEl.hidden = false;
      form.querySelector('#auth-forgot-identifier').disabled = true;
      submitBtn.disabled = true;
    });
  }

  async showPasswordResetModal() {
    if (typeof openOverlayModal !== 'function') {
      if (typeof window.loadGameCore === 'function') {
        await window.loadGameCore();
      }
    }
    if (typeof openOverlayModal !== 'function') return;

    const modal = openOverlayModal(`
      <div class="modal-content auth-modal-content">
        <h2>${t('auth.resetTitle')}</h2>
        <p class="auth-modal-intro">${t('auth.resetIntro')}</p>
        <form class="auth-form" id="auth-form-reset">
          <label class="auth-field">
            <span>${t('auth.newPassword')}</span>
            <input type="password" id="auth-new-password" autocomplete="new-password" required minlength="8">
          </label>
          <label class="auth-field">
            <span>${t('auth.confirmPassword')}</span>
            <input type="password" id="auth-confirm-password" autocomplete="new-password" required minlength="8">
          </label>
          <p class="auth-error" id="auth-reset-error" hidden></p>
          <button type="submit" class="primary-btn auth-submit">${t('auth.resetSubmit')}</button>
        </form>
      </div>
    `, { closeOnBackdrop: false });

    document.getElementById('auth-form-reset')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-reset-error');
      const password = document.getElementById('auth-new-password').value;
      const confirm = document.getElementById('auth-confirm-password').value;
      errEl.hidden = true;

      if (password !== confirm) {
        errEl.textContent = t('auth.passwordMismatch');
        errEl.hidden = false;
        return;
      }

      const submitBtn = e.target.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.resetSaving');

      const { error } = await this.updatePassword(password);
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.resetSubmit');

      if (error) {
        errEl.textContent = error;
        errEl.hidden = false;
        return;
      }

      this._cleanAuthHashFromUrl();
      closeOverlayModal(modal);
      this.updateHeaderUI();

      if (typeof openOverlayModal === 'function') {
        const doneModal = openOverlayModal(`
          <div class="modal-content auth-modal-content">
            <h2>${t('auth.resetDoneTitle')}</h2>
            <p class="auth-modal-intro">${t('auth.resetDoneBody')}</p>
            <button type="button" class="primary-btn auth-submit" id="auth-reset-done-close">${t('auth.close')}</button>
          </div>
        `, { closeOnBackdrop: true });
        doneModal.querySelector('#auth-reset-done-close')?.addEventListener('click', () => closeOverlayModal(doneModal));
      }
    });
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

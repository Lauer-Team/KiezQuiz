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

  getDisplayName() {
    return this.profile?.username || this.user?.email?.split('@')[0] || 'Spieler';
  }

  onAuthChange(callback) {
    this._listeners.push(callback);
    if (this._ready) callback(this.user, this.profile);
  }

  _notify(user, profile) {
    this.user = user;
    this.profile = profile;
    this._listeners.forEach((cb) => cb(user, profile));
  }

  async init() {
    if (!this.isConfigured() || typeof supabase === 'undefined') {
      this._ready = true;
      this._resolveReady();
      this._notify(null, null);
      return;
    }

    this.supabase = supabase.createClient(this.config.url, this.config.anonKey);

    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      const profile = await this._loadProfile(session.user.id);
      this._notify(session.user, profile);
    } else {
      this._notify(null, null);
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await this._loadProfile(session.user.id);
        this._notify(session.user, profile);
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
      return 'E-Mail bereits registriert.';
    }
    if (msg.includes('invalid login credentials')) {
      return 'Benutzername, E-Mail oder Passwort falsch.';
    }
    if (msg.includes('password') && msg.includes('6')) {
      return 'Passwort muss mindestens 6 Zeichen haben.';
    }
    if (msg.includes('valid email')) {
      return 'Bitte eine gültige E-Mail-Adresse eingeben.';
    }
    return message || 'Ein Fehler ist aufgetreten.';
  }

  async signUp(username, email, password) {
    if (!this.supabase) {
      return { error: 'Cloud-Speicherung ist nicht konfiguriert.' };
    }
    const trimmedName = (username || '').trim();
    if (!trimmedName) {
      return { error: 'Bitte einen Benutzernamen eingeben.' };
    }
    if ((password || '').length < 6) {
      return { error: 'Passwort muss mindestens 6 Zeichen haben.' };
    }

    const { data, error } = await this.supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: trimmedName } }
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
      return { error: 'Cloud-Speicherung ist nicht konfiguriert.' };
    }

    const trimmed = (identifier || '').trim();
    if (!trimmed) {
      return { error: 'Bitte Benutzername oder E-Mail eingeben.' };
    }

    let email = trimmed;
    if (!trimmed.includes('@')) {
      const { data: resolvedEmail, error: lookupError } = await this.supabase
        .rpc('get_email_for_username', { p_username: trimmed });
      if (lookupError) {
        console.warn('Username-Lookup fehlgeschlagen:', lookupError.message);
        return { error: 'Benutzername, E-Mail oder Passwort falsch.' };
      }
      if (!resolvedEmail) {
        return { error: 'Benutzername, E-Mail oder Passwort falsch.' };
      }
      email = resolvedEmail;
    }

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
    const pill = document.getElementById('auth-pill');
    if (!pill) return;

    if (this.isLoggedIn()) {
      pill.classList.add('auth-pill--logged-in');
      pill.innerHTML = `
        <span class="auth-pill-icon">👤</span>
        <span class="auth-pill-name">${this._escapeHtml(this.getDisplayName())}</span>
        <button type="button" class="auth-pill-action" id="btn-auth-logout" title="Abmelden">Abmelden</button>
      `;
      document.getElementById('btn-auth-logout')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.signOut();
      });
    } else {
      pill.classList.remove('auth-pill--logged-in');
      pill.innerHTML = `
        <span class="auth-pill-icon">👤</span>
        <span class="auth-pill-label">Gast</span>
        <span class="auth-pill-action">Anmelden</span>
      `;
    }
  }

  initUI() {
    const pill = document.getElementById('auth-pill');
    if (!pill) return;

    pill.addEventListener('click', (e) => {
      if (e.target.closest('#btn-auth-logout')) return;
      if (this.isLoggedIn()) return;
      this.showAuthModal();
    });

    this.updateHeaderUI();
  }

  showAuthModal() {
    if (typeof openOverlayModal !== 'function') return;

    let activeTab = 'login';
    const modal = openOverlayModal(`
      <div class="modal-content auth-modal-content">
        <h2>☁️ Cloud-Speicherung</h2>
        <p class="auth-modal-intro">Optional: Mit Account wird dein Spielstand geräteübergreifend gesichert. Ohne Login spielst du weiter als Gast (nur lokal).</p>
        <div class="auth-tabs">
          <button type="button" class="auth-tab auth-tab--active" data-tab="login">Anmelden</button>
          <button type="button" class="auth-tab" data-tab="register">Registrieren</button>
        </div>
        <form class="auth-form" id="auth-form-login">
          <label class="auth-field">
            <span>Benutzername oder E-Mail</span>
            <input type="text" id="auth-email" autocomplete="username" required>
          </label>
          <label class="auth-field">
            <span>Passwort</span>
            <input type="password" id="auth-password" autocomplete="current-password" required minlength="6">
          </label>
          <p class="auth-error" id="auth-error" hidden></p>
          <button type="submit" class="primary-btn auth-submit">Anmelden</button>
        </form>
        <form class="auth-form" id="auth-form-register" hidden>
          <label class="auth-field">
            <span>Benutzername</span>
            <input type="text" id="auth-username" autocomplete="username" required minlength="2" maxlength="30">
          </label>
          <label class="auth-field">
            <span>E-Mail</span>
            <input type="email" id="auth-email-reg" autocomplete="email" required>
          </label>
          <label class="auth-field">
            <span>Passwort</span>
            <input type="password" id="auth-password-reg" autocomplete="new-password" required minlength="6">
          </label>
          <p class="auth-error" id="auth-error-reg" hidden></p>
          <button type="submit" class="primary-btn auth-submit">Registrieren</button>
        </form>
        <button type="button" class="secondary-btn auth-cancel" id="btn-auth-cancel">Abbrechen</button>
      </div>
    `, { closeOnBackdrop: true });

    const loginForm = document.getElementById('auth-form-login');
    const registerForm = document.getElementById('auth-form-register');
    const tabs = modal.querySelectorAll('.auth-tab');

    const setTab = (tab) => {
      activeTab = tab;
      tabs.forEach((t) => t.classList.toggle('auth-tab--active', t.dataset.tab === tab));
      loginForm.hidden = tab !== 'login';
      registerForm.hidden = tab !== 'register';
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setTab(tab.dataset.tab));
    });

    document.getElementById('btn-auth-cancel')?.addEventListener('click', () => closeOverlayModal(modal));

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('auth-error');
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      errEl.hidden = true;

      const submitBtn = loginForm.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird angemeldet…';

      const { error } = await this.signIn(email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Anmelden';

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
      errEl.hidden = true;

      const submitBtn = registerForm.querySelector('.auth-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird registriert…';

      const { error } = await this.signUp(username, email, password);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrieren';

      if (error) {
        errEl.textContent = error;
        errEl.hidden = false;
        return;
      }
      closeOverlayModal(modal);
      this.updateHeaderUI();
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

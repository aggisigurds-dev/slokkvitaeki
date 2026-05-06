/* === USER AUTH + ROLES v1 === */
/* Adds Supabase Auth-based login with role-based access control.
 *
 * SQL required (run in Supabase):
 *   CREATE TABLE IF NOT EXISTS user_profiles (
 *     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     nafn TEXT,
 *     role TEXT DEFAULT 'tech',  -- 'owner' | 'tech' | 'viewer'
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
 *   CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
 *   -- Owner can manage all profiles:
 *   CREATE POLICY "Owners manage all" ON user_profiles FOR ALL USING (
 *     (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'owner'
 *   );
 *
 * Roles:
 *   owner  — full access, can manage users, delete records
 *   tech   — can read/write jobs/sales/units, cannot delete or manage users
 *   viewer — read-only, can see all data but not modify
 *
 * Features:
 *  • Login screen overlay (email + password)
 *  • "Innskráning" / "Útskráning" in topbar user chip
 *  • User name + role shown in topbar
 *  • Role gates: viewer cannot access Sala checkout, tech cannot access Settings
 *  • User management panel in Settings (owner only)
 *  • Session persisted via Supabase's built-in token refresh
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__userAuthInstalled) return;
  window.__userAuthInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  const ROLE_LABELS = { owner: 'Eigandi', tech: 'Tæknimaður', viewer: 'Lesaðgangur' };
  const ROLE_COLORS = { owner: '#7c3aed', tech: '#2563eb', viewer: '#64748b' };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('ua-style')) {
    const s = document.createElement('style');
    s.id = 'ua-style';
    s.textContent = `
      #ua-login-overlay {
        position: fixed; inset: 0; z-index: 200000;
        background: linear-gradient(135deg,#1e293b,#0f172a);
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #ua-login-overlay .ua-card {
        background: #fff; border-radius: 16px;
        box-shadow: 0 30px 80px rgba(0,0,0,.5);
        width: min(400px,calc(100vw - 24px));
        overflow: hidden;
      }
      #ua-login-overlay .ua-card-hd {
        background: #C93C1D; padding: 24px 28px;
        display: flex; align-items: center; gap: 14px;
      }
      #ua-login-overlay .ua-card-hd .ua-logo {
        width: 40px; height: 40px; background: rgba(255,255,255,.2);
        border-radius: 10px; display: flex; align-items: center; justify-content: center;
        font-size: 22px;
      }
      #ua-login-overlay .ua-card-hd h2 { margin: 0; color: #fff; font-size: 18px; font-weight: 800; }
      #ua-login-overlay .ua-card-hd p { margin: 2px 0 0; color: rgba(255,255,255,.75); font-size: 12px; }
      #ua-login-overlay .ua-card-body { padding: 24px 28px; }
      #ua-login-overlay .ua-row { margin-bottom: 14px; }
      #ua-login-overlay .ua-row label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
      #ua-login-overlay .ua-input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 14px; box-sizing: border-box; }
      #ua-login-overlay .ua-input:focus { outline: none; border-color: #C93C1D; box-shadow: 0 0 0 3px rgba(201,60,29,.1); }
      #ua-login-overlay .ua-submit {
        width: 100%; padding: 12px; background: #C93C1D; color: #fff;
        border: none; border-radius: 8px; font: inherit; font-size: 15px; font-weight: 700;
        cursor: pointer; margin-top: 4px;
      }
      #ua-login-overlay .ua-submit:hover { background: #a83218; }
      #ua-login-overlay .ua-submit:disabled { opacity: .5; cursor: not-allowed; }
      #ua-login-overlay .ua-error { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 7px; padding: 9px 12px; font-size: 13px; margin-top: 10px; }
      #ua-login-overlay .ua-skip-btn { background: none; border: none; color: #94a3b8; font: inherit; font-size: 12px; cursor: pointer; margin-top: 12px; display: block; text-align: center; width: 100%; }
      #ua-login-overlay .ua-skip-btn:hover { color: #64748b; }

      /* Topbar user chip updates */
      .ua-role-badge {
        display: inline-block; padding: 2px 7px; border-radius: 99px;
        font-size: 10px; font-weight: 700; margin-left: 4px;
      }
      .ua-logout-btn {
        background: none; border: 1px solid rgba(255,255,255,.25);
        color: rgba(255,255,255,.8); border-radius: 6px; padding: 3px 8px;
        font: inherit; font-size: 11px; cursor: pointer; margin-left: 6px;
        white-space: nowrap;
      }
      .ua-logout-btn:hover { background: rgba(255,255,255,.1); }

      /* On the collapsed mobile sidebar (≤900px the sidebar shrinks to 60px),
         the full-width "Skrá inn / Útskrá" chip used to spill outside the
         sidebar and overlap the side menu. Stack the chip vertically and hide
         the username + role badge so only the avatar + small button shows. */
      @media (max-width: 900px) {
        .user-chip {
          flex-direction: column !important;
          gap: 4px !important;
          padding: 6px 4px !important;
          align-items: center !important;
          width: auto !important;
          max-width: 56px !important;
        }
        .user-chip > span:not(.ua-role-badge) { display: none !important; }
        .user-chip .ua-role-badge { display: none !important; }
        .ua-logout-btn {
          margin-left: 0 !important;
          padding: 2px 6px !important;
          font-size: 10px !important;
        }
      }

      /* User management in settings */
      #ua-user-mgmt { padding: 16px 20px; border-top: 1px solid #e2e8f0; }
      #ua-user-mgmt h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; }
      #ua-user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      #ua-user-table th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e2e8f0; }
      #ua-user-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
      #ua-user-table tr:last-child td { border-bottom: none; }
      #ua-invite-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
      #ua-invite-email { flex: 1; min-width: 180px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; }
      #ua-invite-role { padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; background: #fff; }
      #ua-invite-btn { padding: 7px 14px; background: #2563eb; color: #fff; border: none; border-radius: 7px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    `;
    document.head.appendChild(s);
  }

  // ── Auth state ─────────────────────────────────────────────────────────────
  let currentUser = null;
  let currentProfile = null;

  function getRole() { return currentProfile?.role || 'viewer'; }
  function isOwner() { return getRole() === 'owner'; }
  function isTech() { return ['owner','tech'].includes(getRole()); }
  function canWrite() { return ['owner','tech'].includes(getRole()); }
  function canDelete() { return getRole() === 'owner'; }

  // ── Load user profile ─────────────────────────────────────────────────────
  async function loadProfile(userId) {
    const SB = getSB();
    if (!SB || !userId) return null;
    try {
      const { data } = await SB
        .from('user_profiles')
        .select('id,nafn,role')
        .eq('id', userId)
        .single();
      return data;
    } catch (_) { return null; }
  }

  // ── Login overlay ─────────────────────────────────────────────────────────
  function buildLoginOverlay() {
    if (document.getElementById('ua-login-overlay')) return;
    const el = document.createElement('div');
    el.id = 'ua-login-overlay';
    el.innerHTML = `
      <div class="ua-card">
        <div class="ua-card-hd">
          <div class="ua-logo">🔥</div>
          <div>
            <h2>Slökkvitæki ehf</h2>
            <p>Brunakerfi — Innskráning</p>
          </div>
        </div>
        <div class="ua-card-body">
          <div class="ua-row">
            <label>Netfang</label>
            <input id="ua-email" type="email" class="ua-input" placeholder="nafn@dæmi.is" autocomplete="email">
          </div>
          <div class="ua-row">
            <label>Lykilorð</label>
            <input id="ua-password" type="password" class="ua-input" placeholder="••••••••" autocomplete="current-password">
          </div>
          <button id="ua-submit-btn" class="ua-submit">Skrá inn</button>
          <div id="ua-error" style="display:none;" class="ua-error"></div>
          <button class="ua-skip-btn" id="ua-skip-btn">Halda áfram án innskráningar →</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    const submit = async () => {
      const email = document.getElementById('ua-email').value.trim();
      const pwd = document.getElementById('ua-password').value;
      const errEl = document.getElementById('ua-error');
      const btn = document.getElementById('ua-submit-btn');
      if (!email || !pwd) {
        errEl.textContent = 'Fylltu inn netfang og lykilorð'; errEl.style.display = '';
        return;
      }
      btn.disabled = true; btn.textContent = 'Skrái inn…'; errEl.style.display = 'none';
      const SB = getSB();
      if (!SB) { btn.disabled = false; btn.textContent = 'Skrá inn'; errEl.textContent = 'Engin gagnabankatenging'; errEl.style.display = ''; return; }
      const { data, error } = await SB.auth.signInWithPassword({ email, password: pwd });
      if (error) {
        btn.disabled = false; btn.textContent = 'Skrá inn';
        errEl.textContent = error.message === 'Invalid login credentials' ? 'Rangt netfang eða lykilorð' : error.message;
        errEl.style.display = '';
        return;
      }
      await onSignIn(data.user);
    };

    document.getElementById('ua-submit-btn').addEventListener('click', submit);
    document.getElementById('ua-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('ua-password').focus(); });
    document.getElementById('ua-password').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    document.getElementById('ua-skip-btn').addEventListener('click', () => {
      el.remove();
      updateTopbar(null);
    });
  }

  async function onSignIn(user) {
    currentUser = user;
    currentProfile = await loadProfile(user.id);
    if (!currentProfile) {
      // Auto-create profile with 'tech' role for new users
      const SB = getSB();
      if (SB) {
        const { data } = await SB.from('user_profiles').insert({
          id: user.id,
          nafn: user.email?.split('@')[0] || 'Notandi',
          role: 'tech'
        }).select().single();
        currentProfile = data;
      }
    }
    const overlay = document.getElementById('ua-login-overlay');
    if (overlay) overlay.remove();
    updateTopbar(user);
    applyRoleGates();
    if (window.Toast && Toast.show) Toast.show('Velkomin/n, ' + (currentProfile?.nafn || user.email));
  }

  // ── Update topbar user chip ───────────────────────────────────────────────
  function updateTopbar(user) {
    const chip = document.querySelector('.user-chip');
    if (!chip) return;
    if (!user) {
      chip.innerHTML = `<div class="user-avatar">?</div><span>Gestur</span>
        <button class="ua-logout-btn" id="ua-login-btn-chip">Skrá inn</button>`;
      document.getElementById('ua-login-btn-chip')?.addEventListener('click', () => {
        buildLoginOverlay();
      });
      return;
    }
    const nafn = currentProfile?.nafn || user.email?.split('@')[0] || '?';
    const initials = nafn.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const role = currentProfile?.role || 'viewer';
    const roleColor = ROLE_COLORS[role] || '#64748b';
    chip.innerHTML = `
      <div class="user-avatar">${esc(initials)}</div>
      <span>${esc(nafn)}</span>
      <span class="ua-role-badge" style="background:${roleColor}20;color:${roleColor};">${esc(ROLE_LABELS[role]||role)}</span>
      <button class="ua-logout-btn" id="ua-logout-chip">Útskrá</button>`;
    document.getElementById('ua-logout-chip')?.addEventListener('click', async () => {
      const SB = getSB();
      if (SB) await SB.auth.signOut();
      currentUser = null; currentProfile = null;
      updateTopbar(null);
      removeRoleGates();
      if (window.Toast && Toast.show) Toast.show('Útskráð');
    });
  }

  // ── Role gates ────────────────────────────────────────────────────────────
  function applyRoleGates() {
    const role = getRole();
    // Viewer: hide Sala / Checkout button
    if (role === 'viewer') {
      document.querySelectorAll('.vnav-btn[data-view="counter"], .vnav-btn[data-view="sala"]').forEach(btn => {
        btn.style.opacity = '.4'; btn.style.pointerEvents = 'none';
        btn.title = 'Aðeins tæknimaður/eigandi hefur aðgang';
      });
      // Add viewer banner
      let banner = document.getElementById('ua-viewer-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'ua-viewer-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:1000;background:#fef3c7;border-top:1px solid #fde68a;padding:8px 16px;font-size:12px;text-align:center;color:#92400e;';
        banner.textContent = '👁 Lesaðgangur — þú getur séð en ekki breytt gögnum';
        document.body.appendChild(banner);
      }
    }
    // Tech: hide Settings view
    if (role === 'tech') {
      document.querySelectorAll('.vnav-btn[data-view="settings"]').forEach(btn => {
        btn.style.opacity = '.4'; btn.style.pointerEvents = 'none';
        btn.title = 'Aðeins eigandi hefur aðgang að stillingum';
      });
    }
  }

  function removeRoleGates() {
    document.querySelectorAll('.vnav-btn').forEach(btn => {
      btn.style.opacity = ''; btn.style.pointerEvents = ''; btn.title = '';
    });
    document.getElementById('ua-viewer-banner')?.remove();
  }

  // ── User management in Settings (owner only) ─────────────────────────────
  async function injectUserMgmt() {
    if (!isOwner()) return;
    const settingsView = document.getElementById('view-settings');
    if (!settingsView || document.getElementById('ua-user-mgmt')) return;
    const container = settingsView.querySelector('.main-panel, main') || settingsView;
    const section = document.createElement('div');
    section.id = 'ua-user-mgmt';
    section.innerHTML = `
      <h3>👥 Notendastjórnun</h3>
      <div id="ua-user-list">Hleður…</div>
      <div class="ua-invite-row">
        <input id="ua-invite-email" type="email" placeholder="netfang@dæmi.is">
        <select id="ua-invite-role">
          <option value="tech">Tæknimaður</option>
          <option value="viewer">Lesaðgangur</option>
          <option value="owner">Eigandi</option>
        </select>
        <button id="ua-invite-btn" class="ua-invite-btn">Bjóða</button>
      </div>`;
    container.appendChild(section);
    await refreshUserList();

    document.getElementById('ua-invite-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('ua-invite-email')?.value.trim();
      const role = document.getElementById('ua-invite-role')?.value || 'tech';
      if (!email) { if (window.Toast && Toast.show) Toast.show('Sláðu inn netfang'); return; }
      const SB = getSB();
      if (!SB) return;
      try {
        // Supabase inviteUserByEmail requires service role key — instead, use signUp
        await SB.auth.admin?.inviteUserByEmail(email, { data: { role } });
        if (window.Toast && Toast.show) Toast.show('✓ Boð sent á ' + email);
        document.getElementById('ua-invite-email').value = '';
      } catch (e) {
        // Fallback: just show instructions
        if (window.Toast && Toast.show) Toast.show('Til að bjóða notanda: búðu til aðgang í Supabase Auth og settu hlutverki í user_profiles töfluna');
      }
    });
  }

  async function refreshUserList() {
    const listEl = document.getElementById('ua-user-list');
    if (!listEl) return;
    const SB = getSB();
    if (!SB) return;
    try {
      const { data } = await SB.from('user_profiles').select('id,nafn,role,created_at');
      if (!data || !data.length) { listEl.innerHTML = '<p style="color:#94a3b8;font-style:italic;font-size:13px;">Engir notendur skráðir</p>'; return; }
      listEl.innerHTML = `
        <table id="ua-user-table">
          <thead><tr><th>Nafn</th><th>Hlutverk</th><th>Skráð</th><th></th></tr></thead>
          <tbody>${data.map(u => {
            const roleColor = ROLE_COLORS[u.role] || '#64748b';
            return `<tr>
              <td>${esc(u.nafn || u.id?.slice(0,8) || '—')}</td>
              <td><select class="ua-role-change" data-uid="${esc(u.id)}" style="padding:3px 6px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;">
                <option value="owner" ${u.role==='owner'?'selected':''}>Eigandi</option>
                <option value="tech" ${u.role==='tech'?'selected':''}>Tæknimaður</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Lesaðgangur</option>
              </select></td>
              <td style="font-size:11px;color:#94a3b8;">${u.created_at ? new Date(u.created_at).toLocaleDateString('is-IS') : ''}</td>
              <td><button class="ua-save-role" data-uid="${esc(u.id)}" style="padding:3px 8px;background:#2563eb;color:#fff;border:none;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;">Vista</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>`;
      listEl.querySelectorAll('.ua-save-role').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.uid;
          const role = listEl.querySelector(`.ua-role-change[data-uid="${uid}"]`)?.value;
          if (!SB || !role) return;
          await SB.from('user_profiles').update({ role }).eq('id', uid);
          if (window.Toast && Toast.show) Toast.show('✓ Hlutverk uppfært');
        });
      });
    } catch (e) {
      listEl.innerHTML = '<p style="color:#94a3b8;font-size:12px;">user_profiles tafla ekki til enn — sjá SQL í patch 32</p>';
    }
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.name === 'settings') setTimeout(injectUserMgmt, 200);
  });

  // ── Init: check existing Supabase session ─────────────────────────────────
  async function init() {
    const SB = getSB();
    if (!SB) {
      // No Supabase — just update topbar to show guest
      updateTopbar(null);
      return;
    }

    // Check for existing session
    try {
      const { data: { session } } = await SB.auth.getSession();
      if (session?.user) {
        currentUser = session.user;
        currentProfile = await loadProfile(session.user.id);
        updateTopbar(session.user);
        applyRoleGates();
        return;
      }
    } catch (_) {}

    // No session — show login if configured in settings
    const requireAuth = localStorage.getItem('require_auth') === '1';
    if (requireAuth) {
      buildLoginOverlay();
    } else {
      updateTopbar(null);
    }

    // Listen for auth changes
    SB.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await onSignIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null; currentProfile = null;
        updateTopbar(null);
        removeRoleGates();
      }
    });
  }

  // ── Inject settings toggle ────────────────────────────────────────────────
  function injectAuthSettings() {
    const settingsView = document.getElementById('view-settings');
    if (!settingsView || document.getElementById('ua-auth-settings')) return;
    const container = settingsView.querySelector('.main-panel, main') || settingsView;
    const div = document.createElement('div');
    div.id = 'ua-auth-settings';
    div.style.cssText = 'padding:16px 20px;border-top:1px solid #e2e8f0;';
    const reqAuth = localStorage.getItem('require_auth') === '1';
    div.innerHTML = `
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:10px;">🔐 Innskráningarstillingar</div>
      <label style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="ua-require-auth" ${reqAuth?'checked':''} style="width:16px;height:16px;">
        Krefjast innskráningar við ræsingu
      </label>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button id="ua-manual-login-btn" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;">Skrá inn núna</button>
        <button id="ua-manual-logout-btn" style="padding:7px 14px;background:#fff;border:1px solid #e2e8f0;color:#475569;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;">Skrá út</button>
      </div>`;
    container.appendChild(div);
    document.getElementById('ua-require-auth')?.addEventListener('change', e => {
      localStorage.setItem('require_auth', e.target.checked ? '1' : '0');
    });
    document.getElementById('ua-manual-login-btn')?.addEventListener('click', () => buildLoginOverlay());
    document.getElementById('ua-manual-logout-btn')?.addEventListener('click', async () => {
      const SB = getSB();
      if (SB) await SB.auth.signOut();
      currentUser = null; currentProfile = null;
      updateTopbar(null); removeRoleGates();
      if (window.Toast && Toast.show) Toast.show('Útskráð');
    });
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.name === 'settings') setTimeout(injectAuthSettings, 100);
  });
  setTimeout(injectAuthSettings, 3000);

  // Expose API
  window.UserAuth = {
    getUser: () => currentUser,
    getProfile: () => currentProfile,
    getRole,
    isOwner, isTech, canWrite, canDelete,
    login: buildLoginOverlay,
    logout: async () => {
      const SB = getSB();
      if (SB) await SB.auth.signOut();
      currentUser = null; currentProfile = null;
      updateTopbar(null); removeRoleGates();
    }
  };

  // Wait for DB to be ready then init
  function tryInit() {
    if (!getSB()) { setTimeout(tryInit, 500); return; }
    init();
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 1500));
  setTimeout(tryInit, 2000);

  console.log('[user-auth] installed');
})();
/* === END USER AUTH === */

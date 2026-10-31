/* 测试用 WorkBuddy 云 SDK 替身。
 * 由 Playwright 在 CDN 地址处注入，替换真实 SDK；接口形状与 cloud-sync.js 的调用完全一致。
 * 会话存于 localStorage（每个浏览器上下文独立）→ 等价于"每台设备各自持有一个登录态"。
 */
(() => {
  const BASE = location.origin + '/mock';
  const TOK = 'mock_sdk_token';
  const USR = 'mock_sdk_user';

  async function call(path, body) {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    let json = {};
    try { json = await r.json(); } catch (_) { }
    if (!r.ok && !json.error) json = { data: null, error: { message: 'HTTP ' + r.status, status: r.status } };
    return { status: r.status, json };
  }

  function b64(ab) {
    const bytes = new Uint8Array(ab);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(s);
  }

  window.WorkBuddyCloud = {
    createWorkBuddyCloud(options) {
      window.__mockSdkOptions = options;
      let token = null;
      let user = null;
      try { token = localStorage.getItem(TOK) || null; } catch (_) { }
      try { user = JSON.parse(localStorage.getItem(USR) || 'null'); } catch (_) { }
      const subs = [];
      const emit = (ev, s) => { for (const cb of subs) { try { cb(ev, s); } catch (_) { } } };
      const persist = s => {
        token = s.access_token || 'tok'; user = s.user;
        try { localStorage.setItem(TOK, token); localStorage.setItem(USR, JSON.stringify(user)); } catch (_) { }
      };
      const clear = () => {
        token = null; user = null;
        try { localStorage.removeItem(TOK); localStorage.removeItem(USR); } catch (_) { }
      };

      const auth = {
        async getSession() {
          if (!token) return { data: { session: null } };
          const { json } = await call('/session', { token });
          if (json && json.user) {
            user = json.user;
            return { data: { session: { user: json.user, access_token: token } } };
          }
          clear();
          return { data: { session: null } };
        },
        onAuthStateChange(cb) {
          subs.push(cb);
          return { data: { subscription: { unsubscribe() { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); } } } };
        },
        async signInWithPassword({ email, password }) {
          const { json } = await call('/auth/password', { email, password });
          if (json.data && json.data.user) { persist(json.data); return { data: json.data }; }
          return { data: null, error: (json.error || { message: 'login failed' }) };
        },
        async signInWithOtp({ email }) {
          const { json } = await call('/auth/otp', { email });
          if (!json.data) return { data: null, error: json.error || { message: 'otp failed' } };
          const vid = json.data.verificationId;
          return {
            data: {
              verificationId: vid,
              isExistingUser: !!json.data.isExistingUser,
              verify: async ({ token: code, password }) => {
                const r = await call('/auth/otp_verify', {
                  verificationId: vid, token: code, password
                });
                if (r.json.data && r.json.data.user) { persist(r.json.data); return { data: r.json.data }; }
                return { data: null, error: r.json.error || { message: 'bad code' } };
              }
            }
          };
        },
        async resetPasswordForEmail(email) {
          const { json } = await call('/auth/reset', { email });
          if (!json.data) return { data: null, error: json.error || { message: 'reset failed' } };
          const vid = json.data.verificationId;
          return {
            data: {
              updateUser: async ({ nonce, password }) => {
                const r = await call('/auth/reset_verify', {
                  verificationId: vid, nonce, password
                });
                if (r.json.data && r.json.data.user) { persist(r.json.data); return { data: r.json.data }; }
                return { data: null, error: r.json.error || { message: 'bad code or password' } };
              }
            }
          };
        },
        async signUp() { throw Error('signUp must never be called'); },
        async signOut() {
          await call('/auth/signout', { token });
          clear();
          emit('SIGNED_OUT', null);
          return { data: true };
        }
      };

      const database = {
        from() {
          return {
            select() {
              return {
                async maybeSingle() {
                  const { status, json } = await call('/db/get', { token });
                  if (status === 401) {
                    return { data: null, error: { code: 'DATABASE_42501', message: 'permission denied' }, status: 401, success: false };
                  }
                  return json;
                }
              };
            },
            insert(input) {
              return {
                async select() {
                  const { status, json } = await call('/db/insert', Object.assign({ token }, input));
                  if (status === 409) {
                    return { data: null, error: { message: 'already exists', status: 409 }, status: 409, success: false };
                  }
                  return json;
                }
              };
            },
            update(input) {
              return {
                eq(key, expected) {
                  return {
                    async select() {
                      const { status, json } = await call('/db/update', {
                        token, expected: Number(expected), revision: input.revision, payload: input.payload
                      });
                      if (status === 401) {
                        return { data: null, error: { code: 'DATABASE_42501', message: 'permission denied' }, status: 401, success: false };
                      }
                      return json;
                    }
                  };
                }
              };
            }
          };
        }
      };

      const storage = {
        userPath(uid, name) { return String(uid) + '/' + String(name); },
        async upload(path, file, opts) {
          try {
            const buf = await file.arrayBuffer();
            const { status, json } = await call('/storage/upload', {
              token, path, b64: b64(buf), upsert: !!(opts && opts.upsert)
            });
            if (status === 200) return { data: { path }, success: true, status: 200 };
            return json;
          } catch (e) {
            return { error: { message: String(e && e.message || e) }, status: 0, success: false };
          }
        },
        async download(path) {
          const { status, json } = await call('/storage/download', { token, path });
          if (status !== 200) return json;
          const raw = atob(json.data.b64 || '');
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          return { blob: new Blob([bytes], { type: 'application/pdf' }), success: true, status: 200 };
        }
      };

      return { auth, database, storage };
    }
  };
  window.__mockSdkReady = true;
})();

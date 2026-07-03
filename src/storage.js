// storage.js — installs the window.storage shim that useProgress.js expects.
// Contract (matched exactly by useProgress.js):
//   window.storage.get(key)        → Promise resolving to { value: string } or null
//   window.storage.set(key, value) → Promise (errors surfaced via rejection)
// Backed by localStorage when available; falls back to an in-module Map when it
// isn't (private mode, sandboxed iframes, storage disabled).

function makeBackend() {
  try {
    const probe = '__rlc-storage-probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return {
      get(key) { return window.localStorage.getItem(key); },
      set(key, value) { window.localStorage.setItem(key, value); },
    };
  } catch (e) {
    const mem = new Map();
    return {
      get(key) { return mem.has(key) ? mem.get(key) : null; },
      set(key, value) { mem.set(key, value); },
    };
  }
}

if (typeof window !== 'undefined' && !window.storage) {
  const backend = makeBackend();
  window.storage = {
    async get(key) {
      const value = backend.get(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      backend.set(key, String(value));
    },
  };
}

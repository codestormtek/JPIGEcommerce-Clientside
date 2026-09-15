import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  clear() {
    this.#values.clear();
  }
}

function response(status, body, contentType = 'application/json') {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    async json() {
      return body;
    },
    async blob() {
      return body;
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = { location: { href: '' } };

const { apiDownload, apiGet, apiUpload, saveTokens } = await import('./apiClient.js');

function setSession() {
  localStorage.clear();
  window.location.href = '';
  saveTokens({ accessToken: 'access-old', refreshToken: 'refresh-old' });
}

test('shares one refresh across concurrent JSON, download, and upload 401s', async () => {
  setSession();
  let refreshCalls = 0;
  const refreshGate = deferred();

  globalThis.fetch = async (url, options = {}) => {
    const authorization = options.headers?.Authorization;
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      assert.equal(JSON.parse(options.body).refreshToken, 'refresh-old');
      return refreshGate.promise;
    }
    if (authorization === 'Bearer access-old') return response(401, {});
    assert.equal(authorization, 'Bearer access-new');
    if (url.endsWith('/binary')) return response(200, 'image-bytes', 'image/png');
    return response(200, { ok: true });
  };

  const jsonRequest = apiGet('/json');
  const downloadRequest = apiDownload('/binary');
  const uploadRequest = apiUpload('/upload', { name: 'image' });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshCalls, 1);
  refreshGate.resolve(response(200, {
    data: { accessToken: 'access-new', refreshToken: 'refresh-new' },
  }));

  const [json, binary, upload] = await Promise.all([
    jsonRequest,
    downloadRequest,
    uploadRequest,
  ]);
  assert.deepEqual(json, { ok: true });
  assert.equal(binary, 'image-bytes');
  assert.deepEqual(upload, { ok: true });
  assert.equal(refreshCalls, 1);
  assert.equal(localStorage.getItem('refreshToken'), 'refresh-new');
});

test('retries a late 401 with the token another request already installed', async () => {
  setSession();
  let refreshCalls = 0;
  const lateUnauthorized = deferred();
  let lateRequest;

  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      return response(200, {
        data: { accessToken: 'access-new', refreshToken: 'refresh-new' },
      });
    }
    if (url.endsWith('/late') && options.headers?.Authorization === 'Bearer access-old') {
      lateRequest = options;
      return lateUnauthorized.promise;
    }
    if (options.headers?.Authorization === 'Bearer access-old') return response(401, {});
    assert.equal(options.headers?.Authorization, 'Bearer access-new');
    return response(200, { path: url });
  };

  const lateRequestResult = apiGet('/late');
  const firstRequestResult = await apiGet('/first');
  assert.deepEqual(firstRequestResult, { path: '/api/v1/first' });
  assert.equal(refreshCalls, 1);

  lateUnauthorized.resolve(response(401, {}));
  assert.equal(lateRequest.headers.Authorization, 'Bearer access-old');
  assert.deepEqual(await lateRequestResult, { path: '/api/v1/late' });
  assert.equal(refreshCalls, 1);
});

test('clears the session and redirects when the shared refresh definitively fails', async () => {
  setSession();
  let refreshCalls = 0;

  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      assert.equal(JSON.parse(options.body).refreshToken, 'refresh-old');
      return response(401, {});
    }
    return response(401, {});
  };

  const [json, binary] = await Promise.all([
    apiGet('/json'),
    apiDownload('/binary'),
  ]);
  assert.equal(json, undefined);
  assert.equal(binary, null);
  assert.equal(refreshCalls, 1);
  assert.equal(localStorage.getItem('accessToken'), null);
  assert.equal(localStorage.getItem('refreshToken'), null);
  assert.equal(window.location.href, '/auth-login');
});
const DEFAULT_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:5000';

function joinUrl(baseUrl, path) {
  const base = String(baseUrl).replace(/\/+$/, '');
  const p = String(path).replace(/^\/+/, '');
  return `${base}/${p}`;
}

function createHttpError({ status, statusText, url, body }) {
  const err = new Error(`HTTP ${status} ${statusText} (${url})`);
  err.status = status;
  err.url = url;
  err.body = body;
  return err;
}

async function parseResponseBody(res) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
}

export async function request(path, { method = 'GET', baseUrl = DEFAULT_BASE_URL, body, headers, signal } = {}) {
  const url = joinUrl(baseUrl, path);

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const init = {
    method,
    headers: {
      ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    ...(body !== undefined
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
    ...(signal ? { signal } : {}),
  };

  const res = await fetch(url, init);
  const responseBody = await parseResponseBody(res);

  if (!res.ok) {
    throw createHttpError({
      status: res.status,
      statusText: res.statusText,
      url,
      body: responseBody,
    });
  }

  return responseBody;
}

export function createResourceService(resourcePath) {
  const base = String(resourcePath).replace(/^\/+/, '').replace(/\/+$/, '');
  return {
    list: () => request(`/${base}`),
    getById: (id) => request(`/${base}/${encodeURIComponent(id)}`),
    create: (data) => request(`/${base}`, { method: 'POST', body: data }),
    update: (id, data) =>
      request(`/${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}


import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

// Render's free tier can take 30–60 seconds to wake from sleep. Keep the
// request alive long enough for the first response after a cold start.
const COLD_START_STATUSES = new Set([502, 503, 504]);
const COLD_START_RETRY_DELAYS = [5_000, 15_000];

export const client = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

function canRetryColdStart(config, status) {
  if (!config || !COLD_START_STATUSES.has(status)) return false;
  if ((config._coldStartRetries || 0) >= COLD_START_RETRY_DELAYS.length) return false;

  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';

  // Replaying reads and the two auth entry points is safe. Do not replay
  // mutations such as creating a transaction.
  return method === 'get' || url.includes('/auth/login') || url.includes('/auth/register');
}

client.interceptors.request.use((config) => {
  const csrf = readCookie('sw_csrf');
  if (csrf) config.headers['X-CSRF-Token'] = csrf;
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    if (canRetryColdStart(original, status)) {
      original._coldStartRetries = (original._coldStartRetries || 0) + 1;
      const delay = COLD_START_RETRY_DELAYS[original._coldStartRetries - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
      return client(original);
    }

    const skipRefresh =
      !original ||
      original._retried ||
      status !== 401 ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (skipRefresh) return Promise.reject(error);

    original._retried = true;
    try {
      refreshPromise ||= client
        .post('/api/auth/refresh')
        .finally(() => {
          refreshPromise = null;
        });
      await refreshPromise;
      return client(original);
    } catch {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('spendwise:auth-expired'));
      }
      return Promise.reject(error);
    }
  },
);

export function unwrap(request) {
  return request.then((response) => response.data.data);
}

export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.error?.message ||
    (error?.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : null) ||
    (error?.message === 'Network Error'
      ? 'Cannot reach the server. Check that the API is running.'
      : null) ||
    fallback
  );
}

export const authApi = {
  register: (payload) => unwrap(client.post('/api/auth/register', payload)),
  login: (payload) => unwrap(client.post('/api/auth/login', payload)),
  logout: () => unwrap(client.post('/api/auth/logout')),
  me: () => unwrap(client.get('/api/auth/me')),
  updateProfile: (payload) => unwrap(client.put('/api/auth/profile', payload)),
  changePassword: (payload) => unwrap(client.put('/api/auth/password', payload)),
};

export const dashboardApi = {
  summary: (params) => unwrap(client.get('/api/dashboard/summary', { params: cleanParams(params) })),
};

export const transactionsApi = {
  list: (params) => unwrap(client.get('/api/transactions', { params: cleanParams(params) })),
  get: (id) => unwrap(client.get(`/api/transactions/${id}`)),
  create: (payload) => unwrap(client.post('/api/transactions', payload)),
  update: (id, payload) => unwrap(client.put(`/api/transactions/${id}`, payload)),
  remove: (id) => unwrap(client.delete(`/api/transactions/${id}`)),
};

export const categoriesApi = {
  list: (params) => unwrap(client.get('/api/categories', { params: cleanParams(params) })),
  create: (payload) => unwrap(client.post('/api/categories', payload)),
  update: (id, payload) => unwrap(client.put(`/api/categories/${id}`, payload)),
  remove: (id) => unwrap(client.delete(`/api/categories/${id}`)),
};

export const budgetsApi = {
  list: (params) => unwrap(client.get('/api/budgets', { params: cleanParams(params) })),
  create: (payload) => unwrap(client.post('/api/budgets', payload)),
  update: (id, payload) => unwrap(client.put(`/api/budgets/${id}`, payload)),
  remove: (id) => unwrap(client.delete(`/api/budgets/${id}`)),
};

export const analyticsApi = {
  categories: (params) =>
    unwrap(client.get('/api/analytics/categories', { params: cleanParams(params) })),
  topCategories: (params) =>
    unwrap(client.get('/api/analytics/top-categories', { params: cleanParams(params) })),
  trends: (params) => unwrap(client.get('/api/analytics/trends', { params: cleanParams(params) })),
  incomeExpenses: (params) =>
    unwrap(client.get('/api/analytics/income-expenses', { params: cleanParams(params) })),
  daily: (params) => unwrap(client.get('/api/analytics/daily', { params: cleanParams(params) })),
};

export const recurringApi = {
  list: () => unwrap(client.get('/api/recurring-transactions')),
  create: (payload) => unwrap(client.post('/api/recurring-transactions', payload)),
  update: (id, payload) => unwrap(client.put(`/api/recurring-transactions/${id}`, payload)),
  remove: (id) => unwrap(client.delete(`/api/recurring-transactions/${id}`)),
  process: () => unwrap(client.post('/api/recurring-transactions/process')),
};

export const reportsApi = {
  summary: (params) => unwrap(client.get('/api/reports/summary', { params: cleanParams(params) })),
  exportCsv: (params) =>
    client.get('/api/reports/export', {
      params: cleanParams(params),
      responseType: 'blob',
    }),
};

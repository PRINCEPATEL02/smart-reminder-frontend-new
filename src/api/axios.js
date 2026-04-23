import axios from 'axios';

// ── URL Configuration ─────────────────────────────────────────────────────────
// Primary: localhost (from .env or hardcoded default)
// Fallback: Render production backend (used automatically if localhost is down)
const LOCAL_URL  = import.meta.env.VITE_API_URL   || 'http://localhost:5000';
const RENDER_URL = import.meta.env.VITE_RENDER_URL || 'https://smart-reminder-backend-nhvj.onrender.com';

const LOCAL_BASE  = `${LOCAL_URL}/api`;
const RENDER_BASE = `${RENDER_URL}/api`;

// Start with localhost
let activeBase = LOCAL_BASE;
let usingRender = false;

const api = axios.create({
  baseURL: activeBase,
  timeout: 8000,               // shorter timeout so fallback kicks in fast
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Always use the currently active base URL
    config.baseURL = activeBase;

    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: fallback + token refresh ──────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
};

/**
 * Returns true for errors that indicate the server is unreachable
 * (network error, ECONNREFUSED, timeout before any response).
 */
const isConnectError = (error) =>
  !error.response &&                         // no HTTP response at all
  (error.code === 'ERR_NETWORK' ||
   error.code === 'ECONNABORTED' ||
   error.message === 'Network Error');

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── Localhost → Render fallback ────────────────────────────────────────
    if (isConnectError(error) && !usingRender && !originalRequest._fallback) {
      console.warn('[axios] localhost unreachable – switching to Render backend');
      usingRender  = true;
      activeBase   = RENDER_BASE;

      // Retry the failed request against Render
      originalRequest._fallback = true;
      originalRequest.baseURL   = RENDER_BASE;
      // Rebuild the full URL (replace local origin with render origin)
      originalRequest.url = originalRequest.url?.replace(LOCAL_BASE, RENDER_BASE) ?? originalRequest.url;
      return api(originalRequest);
    }

    // ── 401 / Token refresh ────────────────────────────────────────────────
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${activeBase}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken',  data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        api.defaults.headers.Authorization      = `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization   = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

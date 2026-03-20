import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const getAccessToken = () => localStorage.getItem('hm_access_token');
const getRefreshToken = () => localStorage.getItem('hm_refresh_token');
const setAccessToken = (token) => localStorage.setItem('hm_access_token', token);

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return Promise.reject(error);

      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch (_refreshError) {
        localStorage.removeItem('hm_access_token');
        localStorage.removeItem('hm_refresh_token');
        localStorage.removeItem('hm_user');
      }
    }
    return Promise.reject(error);
  }
);

export default client;

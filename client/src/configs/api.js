import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // أرسل الكوكي HttpOnly مع الطلب
});

// Check if there's a token in the cookies and add it to the headers if it exists
api.interceptors.request.use(
  (config) => {
    // اقرأ التوكن من localStorage أولاً ثم من الكوكي كاحتياطي
    const lsToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const cookieToken = Cookies.get('authToken');
    const token = lsToken || cookieToken;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

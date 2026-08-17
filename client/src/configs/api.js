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

// لو التوكن منتهي/غير صالح، امسحه ورجّع المستخدم لصفحة الدخول بدل ما يفشل بصمت
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      Cookies.remove('authToken');
      if (!window.location.pathname.includes('/dashboard/login')) {
        window.location.href = '/dashboard/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

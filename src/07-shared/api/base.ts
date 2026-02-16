import axios from 'axios';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'https://mind-signal-backend-74ab2db9e087.herokuapp.com'}/api`;

// 1. 'export const api'로 변경하여 외부에서 { api }로 부를 수 있게 합니다.
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // 2. 백엔드 미들웨어 규격에 맞게 'Bearer '를 붙여줍니다.
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

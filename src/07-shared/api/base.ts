import axios from 'axios';
import { config as appConfig } from '@07-shared/config/config';

// 1. 'export const api'로 변경하여 외부에서 { api }로 부를 수 있게 합니다.
export const api = axios.create({
  baseURL: appConfig.api.baseUrl,
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

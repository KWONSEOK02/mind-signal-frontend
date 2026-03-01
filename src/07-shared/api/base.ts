import axios from 'axios';
import { config as appConfig } from '@07-shared/config/config';

/**
 * Axios 인스턴스 기본 설정 수행함
 */
export const api = axios.create({
  baseURL: appConfig.api.baseUrl,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 요청 인터셉터를 통해 로컬 스토리지의 토큰을 Bearer 헤더에 주입함
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;

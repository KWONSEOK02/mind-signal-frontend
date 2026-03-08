'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/07-shared/api/auth';
import { PageType } from '@/07-shared/types';

interface UIContextType {
  theme: 'dark' | 'light';
  isLoggedIn: boolean;
  userName: string;
  isAuthModalOpen: boolean;
  toggleTheme: () => void;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setUserName: React.Dispatch<React.SetStateAction<string>>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  handlePageChange: (page: PageType) => void;
  refreshUser: () => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await authApi.getMe();
      setIsLoggedIn(true);
      setUserName(response.data.user.name);
    } catch (error) {
      console.error('인증 상태 확인 실패함:', error);
      try {
        localStorage.removeItem('token');
      } catch {
        // 에러 무시함
      }
      setIsLoggedIn(false);
      setUserName('');
    }
  }, []);

  /**
   * 비동기 즉시 실행 함수를 사용하여 동기적 setState 경고 해결함
   * 렌더링 흐름을 방해하지 않고 사이드 이펙트로 세션 복구 수행함
   */
  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
    };
    initAuth();
  }, [refreshUser]);

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    []
  );
  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  /**
   * 쿼리 파라미터 조작 대신 Next.js App Router 기반의 실제 경로 이동 수행함
   */
  const handlePageChange = useCallback(
    (page: PageType) => {
      const path = page === 'home' ? '/' : `/${page}`;
      router.push(path);
    },
    [router]
  );

  return (
    <UIContext.Provider
      value={{
        theme,
        isLoggedIn,
        userName,
        isAuthModalOpen,
        toggleTheme,
        setIsLoggedIn,
        setUserName,
        openAuthModal,
        closeAuthModal,
        handlePageChange,
        refreshUser,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI는 UIProvider 내부에서 사용해야 함');
  return context;
};

export default UIProvider;

import mockRouter from 'next-router-mock';
import { vi } from 'vitest';

/**
 * [Type] Router 모킹 객체 인터페이스 정의함
 */
interface RouterMockConfig {
  getRouter: () => typeof mockRouter;
  router: typeof mockRouter;
  __router: typeof mockRouter;
}

/**
 * [Type] Storybook UI 환경용 expect 매처 인터페이스 정의함
 */
interface ExpectMatcher {
  toBeDefined: () => boolean;
  toBe: (expected: unknown) => boolean;
  toBeNull: () => boolean;
  toBeInTheDocument: () => boolean;
  toEqual: (expected: unknown) => boolean;
}

/**
 * [Type] TypeScript 전역 객체 확장 정의함
 * 전역 변수 및 window 객체의 타입을 명시함
 */
declare global {
  var __NEXT_ROUTER_MOCKS__: RouterMockConfig | undefined;
  interface Window {
    expect: (actual: unknown) => ExpectMatcher;
  }
}

/**
 * [Checklist] Vitest Setup 실행 여부 확인 로그 출력함
 */
console.log('✅ Vitest Setup: Initializing Typed Router Mocks');

/**
 * [Fix] Storybook UI 환경에서 Vitest 코어 로드 실패 시 발생하는 에러 방지용 shim 정의함
 * window 객체에 타입이 정의된 expect 객체 할당 수행함
 */
if (typeof window !== 'undefined' && !window.expect) {
  window.expect = (actual: unknown): ExpectMatcher => ({
    toBeDefined: () => actual !== undefined,
    toBe: (expected: unknown) => actual === expected,
    toBeNull: () => actual === null,
    toBeInTheDocument: () => true,
    toEqual: (expected: unknown) => JSON.stringify(actual) === JSON.stringify(expected),
  });
}

/**
 * [Setup] Storybook 엔진이 기대하는 라우터 모킹 구조를 전역에 할당함
 */
const routerConfig: RouterMockConfig = {
  getRouter: () => mockRouter,
  router: mockRouter,
  __router: mockRouter,
};

globalThis.__NEXT_ROUTER_MOCKS__ = routerConfig;

/**
 * [Setup] next/navigation (App Router) 전역 모킹 수행함
 * 인자 및 반환 값에 구체적인 타입을 부여하여 린트 규칙 준수함
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (url: string | object, as?: string | object, options?: object) =>
      mockRouter.push(url, as, options),
    replace: (url: string | object, as?: string | object, options?: object) =>
      mockRouter.replace(url, as, options),
    back: () => mockRouter.back(),
    forward: () => mockRouter.forward(),
    prefetch: () => Promise.resolve(),
    refresh: () => {},
  }),
  usePathname: () => mockRouter.asPath?.split('?')[0] || '/',
  useSearchParams: () => {
    const params = new URLSearchParams(mockRouter.asPath?.split('?')[1] || '');
    return {
      get: (k: string) => params.get(k),
      getAll: (k: string) => params.getAll(k),
      has: (k: string) => params.has(k),
      forEach: (cb: (value: string, key: string) => void) => params.forEach(cb),
      entries: () => params.entries(),
      keys: () => params.keys(),
      values: () => params.values(),
      toString: () => params.toString(),
    };
  },
  useParams: () => ({}),
}));
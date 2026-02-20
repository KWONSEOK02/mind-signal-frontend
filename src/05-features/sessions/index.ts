// 비즈니스 로직 훅 내보냄
export { default as usePairing } from './model/use-pairing';
// 호스트용 QR 코드 생성 컴포넌트 내보냄
export { default as QRGenerator } from './ui/qr-generator';
// 클라이언트용 QR 스캔 컴포넌트 내보냄
export { default as QRScanner } from './ui/qr-scanner';

/**
 * Note: 현재 UI 컴포넌트들은 'export const'로 선언되어 있어
 * 사용자가 요청한 'export { default as ... }' 형식을 따르기 위해
 * 아래와 같이 구조를 통일하여 내보냄
 */

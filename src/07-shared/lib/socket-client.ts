import { io, Socket } from 'socket.io-client';

// Socket.io 클라이언트 싱글톤 인스턴스 보관함
let socket: Socket | null = null;

/**
 * Socket.io 클라이언트 싱글톤 반환함
 * 동일 URL에 대해 중복 연결 방지 처리함
 */
export const getSocket = (url: string): Socket => {
  if (!socket) {
    // WebSocket 전용 transport 사용함
    socket = io(url, { transports: ['websocket'] });
  }
  return socket;
};

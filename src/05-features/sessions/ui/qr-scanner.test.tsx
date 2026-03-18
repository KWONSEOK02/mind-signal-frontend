import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QRScanner from './qr-scanner';

/**
 * vi.mock은 파일 상단으로 호이스팅되므로 vi.hoisted로 공유 변수 정의 수행함
 */
const { mockStart, mockStop, mockClear, isScanningRef } = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockStop: vi.fn(),
  mockClear: vi.fn(),
  isScanningRef: { current: false } as { current: boolean },
}));

/**
 * Html5Qrcode 클래스 모의 처리 수행함
 * 생성자 함수 방식으로 정의하여 new 연산자 호환성 확보함
 */
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.start = mockStart;
    this.stop = mockStop;
    this.clear = mockClear;
    Object.defineProperty(this, 'isScanning', {
      get: () => isScanningRef.current,
      configurable: true,
    });
  }),
}));

/**
 * lucide-react 아이콘 모의 처리 수행함
 */
vi.mock('lucide-react', () => ({
  Camera: () => <span data-testid="icon-camera" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  X: () => <span data-testid="icon-x" />,
}));

describe('QRScanner 컴포넌트 테스트 수행함', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    isScanningRef.current = false;
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
    mockClear.mockReturnValue(undefined);
  });

  it('마운트 시 올바른 설정으로 start()가 호출되어야 함', async () => {
    render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        { facingMode: 'environment' },
        { fps: 20, qrbox: { width: 220, height: 220 } },
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  it('QR 스캔 성공 시 onScanSuccess가 디코딩된 텍스트와 함께 호출되어야 함', async () => {
    const decodedText = 'https://example.com/join?token=TEST-TOKEN';

    mockStart.mockImplementation(
      async (
        _config: unknown,
        _options: unknown,
        successCallback: (text: string) => void
      ) => {
        successCallback(decodedText);
      }
    );

    render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith(decodedText);
    });
  });

  it('NotAllowedError 발생 시 카메라 권한 에러 메시지가 표시되어야 함', async () => {
    const error = Object.assign(new Error('Permission denied'), {
      name: 'NotAllowedError',
    });
    mockStart.mockRejectedValue(error);

    render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText(/카메라 접근 권한이 필요함/)).toBeDefined();
    });
  });

  it('NotFoundError 발생 시 카메라 미발견 에러 메시지가 표시되어야 함', async () => {
    const error = Object.assign(new Error('Device not found'), {
      name: 'NotFoundError',
    });
    mockStart.mockRejectedValue(error);

    render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText(/카메라 장치를 찾을 수 없음/)).toBeDefined();
    });
  });

  it('닫기 버튼 클릭 시 onClose가 호출되어야 함', () => {
    render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByLabelText('Close scanner'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('언마운트 시 isScanning=true이면 stop() → clear() 순서로 호출되어야 함', async () => {
    isScanningRef.current = true;

    const { unmount } = render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    unmount();

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });

  it('언마운트 시 isScanning=false이면 clear()만 호출되어야 함', async () => {
    isScanningRef.current = false;

    const { unmount } = render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    unmount();

    await waitFor(() => {
      expect(mockStop).not.toHaveBeenCalled();
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });

  it('언마운트 후 스캔 콜백이 실행되어도 onScanSuccess가 호출되지 않아야 함 (cancelled 플래그 검증)', async () => {
    // start() 호출 시 successCallback을 캡처하되 즉시 실행하지 않음
    let capturedSuccessCallback: ((text: string) => void) | null = null;
    mockStart.mockImplementation(
      async (
        _config: unknown,
        _options: unknown,
        successCallback: (text: string) => void
      ) => {
        capturedSuccessCallback = successCallback;
      }
    );

    const { unmount } = render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    await waitFor(() => expect(capturedSuccessCallback).not.toBeNull());

    // 언마운트로 cancelled = true 설정함
    unmount();

    // 언마운트 이후 콜백 강제 실행 시도함
    act(() => {
      capturedSuccessCallback?.('LATE_DECODE');
    });

    expect(mockOnScanSuccess).not.toHaveBeenCalled();
  });

  it('start() pending 중 언마운트되어도 완료 후 stop() → clear()가 호출되어야 함 (경쟁 조건 검증)', async () => {
    isScanningRef.current = true;

    let resolveStart!: () => void;
    mockStart.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      })
    );

    const { unmount } = render(
      <QRScanner onScanSuccess={mockOnScanSuccess} onClose={mockOnClose} />
    );

    // start()가 pending 상태에서 언마운트 수행함
    unmount();

    // cleanup 시점엔 아직 stop/clear 미실행이어야 함
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();

    // start() 완료 후 cleanup 체인 실행 검증함
    act(() => {
      resolveStart();
    });

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(mockClear).toHaveBeenCalledTimes(1);
    });
  });
});

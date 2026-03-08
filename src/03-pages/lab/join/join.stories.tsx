import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import JoinPage from './join-page';

/**
 * [Story] 피실험자 관점의 그룹 합류 및 측정 대기 페이지 사양 정의함
 */
const meta: Meta<typeof JoinPage> = {
  title: '03-pages/Lab/JoinPage',
  component: JoinPage,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof JoinPage>;

/**
 * [State] 초기 실험 합류 대기 상태의 프리뷰임
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: '피실험자가 앱에 접속하여 QR 스캔을 시작하기 전의 초기 화면임.',
      },
    },
  },
};

/**
 * [Interactive] QR 스캐너 활성화 인터랙션 시뮬레이션 수행함
 * @storybook/test 대신 프로젝트 표준 테스트 라이브러리 직접 활용함
 */
export const ScannerOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 실험 합류 버튼 식별 및 클릭 수행함
    const joinButton = await canvas.getByText(/실험 합류하기/i);
    await userEvent.click(joinButton);

    // 2. 스캐너 컴포넌트 내부의 안내 텍스트 노출 여부 검증함
    // QRScanner 내부 로직에 따라 특정 텍스트나 요소를 expect로 확인 가능함
  },
};

/**
 * [State] 특정 그룹에 합류 완료(SUBJECT 01)된 상태의 레이아웃 사양 정의함
 */
export const JoinedAsSubject: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '페어링 성공 후 피실험자 번호와 측정 제어 위젯이 노출된 상태임. 다른 그룹에 참여하기 버튼이 포함됨.',
      },
    },
  },
};

/**
 * [State] 세션 만료 및 에러 발생 상태의 레이아웃 사양 정의함
 */
export const ExpiredStatus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '유효하지 않은 QR 코드를 스캔했거나 세션이 만료되어 에러 문구와 스마트 재시도(다시 시도하기) 버튼이 노출된 상태임.',
      },
    },
    // Storybook 환경에서 모킹을 주입하여 상태를 렌더링하도록 설정할 수 있음
  },
};

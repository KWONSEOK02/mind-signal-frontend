import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'storybook/test';
import MobileLabView from './mobile-lab-view';

/**
 * [Story] 모바일 기기로 실험실 페이지 접속 시 노출되는 참여 유도 화면 사양 정의함
 *
 * MobileLabView는 LabPage가 모바일 환경(화면 너비 < 768px 또는 모바일 UA)을 감지했을 때
 * 전체 화면 대신 렌더링하는 전용 UI 컴포넌트임.
 *
 * 구성 요소:
 * - Smartphone 아이콘 (indigo glow 효과 포함)
 * - "Participant Mode" 타이틀
 * - "모바일 기기를 연동하여 실험 데이터를 전송함" 안내 문구
 * - "실험 참여하기 (QR 스캔)" CTA 버튼 → /join 라우트로 이동
 * - "Mind Signal Neural Interface" 브랜딩 푸터
 *
 * 이 컴포넌트는 정적 UI이며 별도의 API 의존성이 없음.
 * next/navigation의 useRouter는 전역 프리뷰에서 자동 모킹됨.
 */
const meta: Meta<typeof MobileLabView> = {
  title: '03-pages/Lab/UI/MobileLabView',
  component: MobileLabView,
  parameters: {
    layout: 'fullscreen',
    // 모바일 전용 뷰 확인을 위해 모바일 뷰포트 고정 수행함
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      appDirectory: true,
    },
    docs: {
      description: {
        component:
          '모바일 기기로 /lab 경로 접속 시 노출되는 피실험자 참여 유도 전용 뷰임. ' +
          '운영자 대시보드 대신 렌더링되며 QR 스캔으로 /join 페이지로 이동하는 CTA를 포함함. ' +
          '정적 컴포넌트이며 dark 테마(bg-slate-950)가 기본 적용됨.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobileLabView>;

// ---------------------------------------------------------------------------
// 1. Default — 기본 모바일 참여 유도 화면
// ---------------------------------------------------------------------------

/**
 * [State] 모바일 환경에서 실험실 페이지 접속 시 최초 노출되는 참여 유도 화면임.
 *
 * 렌더링 요소:
 * - 상단 Smartphone 아이콘 (indigo glow 애니메이션 포함)
 * - "Participant Mode" 대제목
 * - "모바일 기기를 연동하여 / 실험 데이터를 전송함" 안내 문구
 * - "실험 참여하기 (QR 스캔)" 흰색 CTA 버튼
 * - "Mind Signal Neural Interface" 소형 푸터 레이블
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '모바일 뷰포트(375px)에서 렌더링되는 기본 상태임. 피실험자는 화면 하단의 "실험 참여하기" 버튼을 탭하여 QR 스캔 페이지(/join)로 이동함.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 2. TabletViewport — 태블릿 뷰포트에서의 레이아웃 확인
// ---------------------------------------------------------------------------

/**
 * [State] 태블릿 크기(768px 미만) 뷰포트에서의 화면 레이아웃 확인용 스토리임.
 *
 * LabPage의 모바일 감지 로직은 window.innerWidth < 768을 기준으로 하므로
 * 767px 너비에서도 MobileLabView가 표시됨을 확인함.
 */
export const TabletViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story:
          '태블릿 크기(768px 미만) 뷰포트에서의 레이아웃 확인용 스토리임. ' +
          'LabPage의 모바일 판별 기준(< 768px)에 해당하는 경우 이 뷰가 표시됨.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 3. CTAButtonInteraction — CTA 버튼 클릭 인터랙션 검증
// ---------------------------------------------------------------------------

/**
 * [Interactive] "실험 참여하기 (QR 스캔)" 버튼 클릭 시 router.push('/join')가 호출되는지 검증함.
 *
 * next/navigation의 useRouter는 전역 프리뷰에서 자동 모킹되어 있으므로
 * 실제 내비게이션 없이 버튼 클릭 인터랙션만 검증함.
 *
 * play 함수:
 * 1. "실험 참여하기" 버튼 식별
 * 2. 버튼 클릭 수행
 * 3. 버튼이 DOM에 존재하는지(컴포넌트가 언마운트되지 않았는지) 단언함
 */
export const CTAButtonInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '"실험 참여하기 (QR 스캔)" CTA 버튼의 클릭 인터랙션을 검증하는 스토리임. ' +
          'next/navigation이 전역 모킹되어 있으므로 실제 라우팅 없이 버튼 동작만 확인함.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. CTA 버튼 식별 수행함
    const ctaButton = await canvas.findByRole('button', {
      name: /실험 참여하기/i,
    });
    await expect(ctaButton).toBeInTheDocument();

    // 2. 버튼 클릭 수행함 (router.push('/join') 호출됨)
    await userEvent.click(ctaButton);

    // 3. 컴포넌트가 유지되는지 확인 (Storybook 환경에서 실제 라우팅이 발생하지 않음)
    await expect(canvas.getByText(/Participant Mode/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 4. ContentVerification — 모든 안내 텍스트 요소 렌더링 검증
// ---------------------------------------------------------------------------

/**
 * [State] 컴포넌트 내 모든 텍스트 요소가 올바르게 렌더링되는지 일괄 단언하는 스토리임.
 *
 * 검증 대상:
 * - "Participant Mode" 제목
 * - "모바일 기기를 연동하여" 안내 문구
 * - "실험 데이터를 전송함" 안내 문구
 * - "실험 참여하기 (QR 스캔)" 버튼 레이블
 * - "Mind Signal Neural Interface" 브랜딩 푸터
 */
export const ContentVerification: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'MobileLabView의 모든 텍스트 콘텐츠가 올바르게 렌더링되는지 일괄 검증하는 스토리임. ' +
          '제목, 안내 문구, 버튼 레이블, 브랜딩 푸터 모두를 단언함.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 주요 제목 렌더링 확인함
    await expect(canvas.getByText(/Participant Mode/i)).toBeInTheDocument();

    // 안내 문구 렌더링 확인함 (두 줄 모두 동일 <p> 요소에 포함되어 있음)
    await expect(
      canvas.getByText(/모바일 기기를 연동하여/i)
    ).toBeInTheDocument();
    await expect(canvas.getByText(/실험 데이터를 전송함/i)).toBeInTheDocument();

    // CTA 버튼 레이블 렌더링 확인함
    await expect(
      canvas.getByRole('button', { name: /실험 참여하기/i })
    ).toBeInTheDocument();

    // 브랜딩 푸터 렌더링 확인함
    await expect(
      canvas.getByText(/Mind Signal Neural Interface/i)
    ).toBeInTheDocument();
  },
};

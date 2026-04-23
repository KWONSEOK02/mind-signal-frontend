// 모바일 페어링 참여 페이지 모듈 외부에 노출함
export { default as JoinPage } from './join/join-page';
// pc의 실험실 페이지 모듈 외부에 노출함
export { default as LabPage } from './lab/lab-page';
// 모바일 전용 뷰를 테스트나 스토리북에서 단독으로 사용하기 위해 내보냄
export { default as MobileLabView } from './lab/ui/mobile-lab-view';
// 운영자 2PC 합류 페이지 모듈 외부에 노출함 (Phase 16)
export { default as OperatorJoinPage } from './operator-join/operator-join-page';

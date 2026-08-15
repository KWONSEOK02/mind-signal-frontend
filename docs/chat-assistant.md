# NEURO 채팅 도우미 정리

## 목적

우측 하단의 `NEURO` 채팅 도우미는 프로젝트 안내, 실험 안내, 결과 확인과
개인 분석 리포트 관련 질문을 처리한다. 화면 컴포넌트는 응답을 표시만 하고,
답변 생성과 분석 자료 조회는 백엔드가 담당한다.

## 프론트엔드 구성

| 항목 | 위치 | 역할 |
| --- | --- | --- |
| 채팅 UI | `src/05-features/chat-assistant/chat-assistant.tsx` | 메시지 입력, 로딩 상태, 답변 및 문의 폼 표시 |
| API 클라이언트 | `src/07-shared/api/chat.ts` | `/chat`, `/chat/ask` 요청 전송 |
| 표시 위치 | 각 페이지의 `ChatAssistant` 사용 지점 | 선택적으로 현재 `groupId` 전달 |

## API 계약

### `POST /api/chat`

요청 본문:

```json
{ "message": "결과는 어디에서 보나요?", "groupId": "선택 사항" }
```

응답 필드:

| 필드 | 의미 |
| --- | --- |
| `message` | 사용자에게 표시할 답변 |
| `url` | 페이지 추천 시 이동할 주소. 없으면 빈 문자열 |
| `level` | `1`: 페이지 안내, `2`: AI 답변, `3`: 답변 불가 및 문의 폼 표시 |

`groupId`는 로그인한 사용자의 분석 결과에 한해서만 백엔드가 참고한다. 로그인하지
않았거나 소유하지 않은 그룹의 분석 자료는 답변 문맥에 포함되지 않는다.

### `POST /api/chat/ask`

이메일과 문의 내용을 보내 담당자에게 전달한다. `level: 3` 응답 뒤에만 UI에서
문의 폼을 노출한다.

## 백엔드 답변 흐름

1. `소개`, `실험`, `결과확인` 같은 직접 페이지 키워드를 즉시 매칭한다.
2. 필요하면 현재 사용자가 소유한 `groupId`의 분석 Markdown을 조회한다.
3. Amazon Bedrock Converse API에 프로젝트 지식 베이스, 허용된 분석 문맥, 사용자
   질문을 전달한다.
4. 응답의 `Keyword:` / `NoAnswer` 형식을 프론트엔드 `level` 계약으로 변환한다.

## 환경 변수

실제 값은 `mind-signal-backend/.env.local`에 두고 커밋하지 않는다. CI에서는
동일한 이름의 GitHub Secrets를 GitHub Actions 환경 변수로 주입한다.

```dotenv
AWS_REGION=ap-northeast-2
BEDROCK_ACCESS_KEY_ID=...
BEDROCK_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=...
BEDROCK_INFERENCE_PROFILE_ID=...
```

`BEDROCK_INFERENCE_PROFILE_ID`가 있으면 이를 우선 호출하고, 없으면
`BEDROCK_MODEL_ID`를 사용한다. 채팅 서비스는 위 5개 변수 외의 AWS 인증 변수나
기본 자격 증명 체인을 사용하지 않는다.

로컬에서 채팅만 확인할 때는 백엔드 `.env.local`에
`CHAT_ONLY_MODE=true`를 설정한다. 이 모드에서는 MongoDB와 나머지 API를 시작하지
않고 `/api/chat`만 제공한다.

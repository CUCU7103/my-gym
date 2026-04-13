# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 모노레포 구조

```
my-gym/
├── frontend/    ← React 19 + Vite PWA (헬스장 운동 기록 앱)
├── backend/     ← Node.js Express + PostgreSQL API 서버
├── terraform/   ← AWS EC2 인프라 (Terraform)
└── docker-compose.yml
```

## 개발 명령어

### 프론트엔드 (frontend/)
```bash
cd frontend
npm run dev          # Vite 개발 서버 시작
npm run build        # TypeScript 컴파일 + Vite 번들링
npm run lint         # ESLint 검사
npm run test         # Vitest watch 모드 실행
npm run coverage     # 테스트 커버리지 생성
```

단일 테스트 실행:
```bash
cd frontend
npx vitest run src/test/hooks/useWorkoutRecords.test.ts
npx vitest run --reporter=verbose  # 상세 출력
```

### 백엔드 (backend/)
```bash
cd backend
npm run dev          # ts-node 개발 서버 시작
npm run build        # TypeScript 컴파일
npm run start        # 컴파일된 서버 실행
npm run test         # Jest 통합 테스트 (PostgreSQL 필요)
npm run migrate      # DB 마이그레이션 실행
```

### Docker
```bash
docker compose up --build -d   # 전체 앱 실행 (app + db)
docker compose down            # 종료
```

## 프론트엔드 아키텍처

**React 19 + Vite + TypeScript** 기반 PWA.

### 레이어 구조

```
frontend/src/
components/   → UI 렌더링 (화면별: home/, records/, settings/, shared/)
context/      → AppContext: 전역 상태 (activeTab + 훅 통합)
hooks/        → useWorkoutRecords, useSettings (비즈니스 로직)
db/           → Dexie IndexedDB 스키마 정의
types/        → WorkoutRecord, UserSettings, WorkoutStats
utils/        → date.ts (KST 기준 날짜 계산)
```

### 상태 관리 패턴

`AppContext`가 두 커스텀 훅의 반환값을 통합해 전역으로 제공:

```typescript
type AppContextValue =
  { activeTab, setActiveTab }
  & ReturnType<typeof useWorkoutRecords>
  & ReturnType<typeof useSettings>
```

컴포넌트는 `useAppContext()` 훅 하나로 모든 상태와 액션에 접근한다.

### 데이터 저장소

**IndexedDB (Dexie 4)** — 서버 없이 로컬에만 저장.

| 테이블 | 주요 필드 |
|--------|----------|
| `workoutRecords` | `id` (UUID), `recordedDate` (YYYY-MM-DD, 통계 기준), `recordedAt`, `source`, `label?` |
| `userSettings` | `id: 1` (싱글톤), `weeklyGoal` (1~7, 기본 3) |

`recordedDate`는 항상 **Asia/Seoul** 기준 `YYYY-MM-DD`로 저장된다.

### 날짜/시간 처리

모든 날짜 계산은 `utils/date.ts`의 KST 헬퍼 함수를 사용:

```typescript
getTodayKST()          // 오늘 날짜 (Asia/Seoul)
isThisWeekKST(date)    // 이번 주 여부
isThisMonthKST(date)   // 이번 달 여부
```

브라우저 로컬 시간이 아닌 `toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })` 방식을 사용한다.

## 테스트 전략

- **Dexie 메모리 모킹**: `frontend/src/test/setup.ts`에서 IndexedDB 실사용 없이 인메모리로 동작
- **시간 조작**: `vi.useFakeTimers()` + `vi.setSystemTime()`으로 날짜 의존 로직 테스트
- **훅 테스트**: `renderHook` + `act` 패턴 사용
- 테스트 파일은 `frontend/src/test/` 하위에 소스 구조 그대로 mirror

## CSS 컨벤션

다크 테마 전용. `frontend/src/styles/global.css`에 CSS 변수 정의:

```css
--bg: #0f0f0f        /* 배경 */
--surface: #1a1a1a   /* 카드/모달 */
--blue: #3B82F6      /* 주요 액션 */
--text: #f1f1f1      /* 기본 텍스트 */
```

인라인 스타일보다 CSS 변수를 우선 사용한다.

## 주요 제약사항

- 같은 날 여러 세션 기록 가능 (날짜 중복 허용) — 백엔드 DB에도 UNIQUE 제약 없음
- `userSettings` 테이블은 항상 `id: 1` (프론트) / `user_id` (백엔드) 싱글톤 레코드만 유지
- Dexie 스키마 변경 시 반드시 버전 업(`.version(n)`) 처리 필요
- 백엔드 DB: PostgreSQL 16, Docker Compose로 로컬 실행

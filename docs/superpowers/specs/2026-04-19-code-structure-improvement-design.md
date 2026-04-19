# 코드 구조 개선 설계 문서

**날짜:** 2026-04-19  
**범위:** 프론트엔드 컨텍스트 분리, API 클라이언트 통합, 공유 타입, 백엔드 에러 핸들러  
**목적:** 포트폴리오/학습 프로젝트의 코드 품질 향상 — 결합도 낮추기, 중복 제거, 유지보수성 개선

---

## 배경

my-gym 모노레포는 기능적으로 완성되어 있으나 다음 구조적 문제가 있다:

1. `AppContext`가 탭 상태 + 운동 기록 + 설정을 단일 컨텍스트에서 관리 → 설정 변경 시 전체 리렌더
2. `api/auth.ts`가 `apiFetch` 래퍼를 사용하지 않아 401 토큰 갱신 로직이 적용되지 않음
3. `WorkoutRecord`, `UserSettings` 타입이 프론트/백엔드에 각각 정의되어 동기화 위험
4. 백엔드 라우트마다 try-catch + 동일한 500 응답 코드가 10회 중복

---

## 개선 항목 1: AppContext 책임 분리

### 현재 구조

```
AppContext (단일)
  ├── activeTab + setActiveTab
  ├── useWorkoutRecords 반환값 전체
  └── useSettings 반환값 전체
```

`settings.weeklyGoal`이 변경되면 `AppContext` 구독 컴포넌트 전체가 리렌더된다.

### 컴포넌트별 실제 소비 패턴

| 컴포넌트 | 사용 값 |
|---------|--------|
| `TabBar` | `activeTab`, `setActiveTab` |
| `App` | `activeTab` |
| `HomePage` | `stats`, `settings`, `records`, `recordToday`, `cancelToday`, `addManual` |
| `RecordsPage` | `records`, `stats`, `deleteRecord`, `addManual` |
| `SettingsPage` | `settings`, `updateWeeklyGoal`, `stats`, `deleteAllRecords` |

### 목표 구조

**`SettingsContext`** — 설정 전용
```typescript
type SettingsContextValue = {
  settings: UserSettings
  updateWeeklyGoal: (goal: number) => Promise<void>
}
```

**`WorkoutContext`** — 운동 기록 전용
- 내부적으로 `useSettings()`를 호출해 `weeklyGoal` 의존성을 명시적으로 처리
- `AppContext`를 통한 암묵적 주입 제거

**`activeTab`** — App 컴포넌트 로컬 상태
- `TabBar`에 props로 전달 (App → TabBar 한 단계뿐, Context 불필요)

### Provider 중첩 구조

```tsx
// App.tsx
<AuthProvider>
  <SettingsProvider>
    <WorkoutProvider>
      {/* activeTab은 App 로컬 상태 */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <PageContent activeTab={activeTab} />
    </WorkoutProvider>
  </SettingsProvider>
</AuthProvider>
```

### 파일 변경 목록

| 파일 | 변경 내용 |
|------|---------|
| `context/AppContext.tsx` | 삭제 |
| `context/SettingsContext.tsx` | 신규 생성 |
| `context/WorkoutContext.tsx` | 신규 생성 |
| `App.tsx` | activeTab 로컬 상태로 이동, Provider 중첩 구조 변경 |
| `components/TabBar.tsx` | props로 activeTab 수신 |
| `components/home/HomePage.tsx` | useWorkoutContext + useSettingsContext 사용 |
| `components/records/RecordsPage.tsx` | useWorkoutContext 사용 |
| `components/settings/SettingsPage.tsx` | useSettingsContext + useWorkoutContext 사용 |

---

## 개선 항목 2: API 클라이언트 통합

### 현재 문제

`api/auth.ts`는 `fetch`를 직접 호출하므로:
- `apiFetch`의 401 자동 갱신 로직이 적용되지 않음
- `BASE_URL`이 `auth.ts`와 `client.ts` 두 곳에 중복 선언

### 변경 방향

| 함수 | 변경 전 | 변경 후 | 이유 |
|------|--------|--------|------|
| `login` | raw fetch | `apiFetch` | 일반 API 호출과 동일하게 처리 |
| `register` | raw fetch | `apiFetch` | 동일 |
| `logout` | raw fetch | `apiFetch` | 동일 |
| `refreshToken` | raw fetch | **유지** | 실패 시 `null` 반환 — 조용한 재인증용으로 의미론이 다름 |

`auth.ts`의 `BASE_URL` 선언 제거 → `client.ts`에서 가져온 `apiFetch`가 내부적으로 처리.

### 주의사항

`apiFetch`의 인증 엔드포인트 예외 처리 (`isAuthEndpoint` 체크)는 이미 `/api/auth/login`, `/api/auth/register`를 제외하고 있어 변경 불필요.

---

## 개선 항목 3: 공유 타입 분리

### 현재 중복

```
frontend/src/types/index.ts   ← WorkoutRecord, UserSettings 정의
backend/src/types.ts          ← WorkoutRecord, UserSettings 동일하게 재정의
```

한쪽을 수정하면 다른 쪽이 자동으로 업데이트되지 않는다.

### 목표 구조

```
my-gym/
├── shared/
│   └── types.ts     ← WorkoutRecord, UserSettings (공통 타입만)
├── frontend/
│   ├── tsconfig.app.json  ← paths: { "@shared/*": ["../../shared/*"] }
│   └── vite.config.ts     ← resolve.alias 추가
└── backend/
    └── tsconfig.json      ← paths: { "@shared/*": ["../../shared/*"] }
```

### 이동할 타입

| 타입 | 이동 대상 | 이유 |
|------|---------|------|
| `WorkoutRecord` | `shared/types.ts` | 양쪽 동일 정의 |
| `UserSettings` | `shared/types.ts` | 양쪽 동일 정의 |
| `ActiveTab` | 프론트엔드 유지 | 백엔드 불필요 |
| `WorkoutStats` | 프론트엔드 유지 | 백엔드 불필요 |

### import 패턴 변경

```typescript
// 변경 전
import type { WorkoutRecord } from '../types'          // frontend
import type { WorkoutRecord } from '../types'          // backend

// 변경 후
import type { WorkoutRecord } from '@shared/types'    // frontend & backend 모두
```

---

## 개선 항목 4: 백엔드 전역 에러 핸들러

### 현재 중복

records.ts 4곳, settings.ts 2곳, auth.ts 4곳 = **총 10곳**에 동일한 패턴 반복:
```typescript
} catch (err) {
  console.error('xxx error:', err)
  res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
}
```

### 목표 구조

**`AppError` 클래스** — 비즈니스 에러를 HTTP 상태 코드와 묶어 표현
```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly message: string
  ) { super(message) }
}
```

**`asyncHandler` 래퍼** — async 라우트 핸들러의 에러를 next()로 전달
```typescript
// src/middleware/asyncHandler.ts
export const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)
```

**전역 에러 미들웨어** — index.ts 맨 끝에 단 한 번 등록
```typescript
// src/middleware/errorHandler.ts
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.error, message: err.message })
  } else {
    console.error(err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
}
```

### 라우트 변경 패턴

```typescript
// 변경 전
recordsRoutes.get('/', async (req, res) => {
  try {
    const result = await pool.query(...)
    res.json(result.rows.map(rowToRecord))
  } catch (err) {
    console.error('GET /records error:', err)
    res.status(500).json({ error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' })
  }
})

// 변경 후
recordsRoutes.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(...)
  res.json(result.rows.map(rowToRecord))
}))
```

비즈니스 에러(404, 403 등)는 `throw new AppError(404, 'NOT_FOUND', '기록을 찾을 수 없습니다.')`로 처리.

---

---

> **참고:** B(테스트), C(인프라) 영역은 A 영역 구현 완료 후 별도 브레인스토밍을 통해 구체화한다.  
> 아래는 방향 메모 수준이며, 이 스펙의 구현 플랜 범위에는 포함되지 않는다.

---

## 개선 항목 B: 테스트 커버리지 확대

### 현재 상태

- 백엔드: `auth.test.ts`, `records.test.ts` 2개 파일 (settings 테스트 없음)
- 프론트엔드: 훅 유닛 테스트 위주 (API 통합 테스트 없음)

### 추가할 테스트

| 파일 | 내용 |
|------|------|
| `backend/src/__tests__/settings.test.ts` | GET/PUT /api/settings 정상 + 엣지 케이스 |
| `backend/src/__tests__/auth.edge.test.ts` | 리프레시 토큰 만료, 중복 이메일, 잘못된 초대코드 |
| `frontend/src/test/hooks/useSettings.test.ts` | 설정 로드 + 업데이트 훅 테스트 |
| `frontend/src/test/context/WorkoutContext.test.tsx` | WorkoutContext 통합 테스트 |

---

## 개선 항목 C: 배포/인프라 개선

### 주요 변경

| 항목 | 현재 | 목표 |
|------|------|------|
| Terraform 상태 | 로컬 파일 커밋 | S3 백엔드 + DynamoDB 락 |
| EC2 IP | vercel.json 하드코딩 | Terraform output → 환경변수 |
| 롤백 전략 | 없음 | Docker 이미지 태깅 + 이전 버전 재배포 스크립트 |

---

## 구현 순서

```
A1. AppContext 분리 (SettingsContext + WorkoutContext)
A2. API 클라이언트 통합 (auth.ts → apiFetch)
A3. 공유 타입 분리 (shared/types.ts + path alias)
A4. 백엔드 에러 핸들러 (asyncHandler + errorHandler)
B1. 백엔드 테스트 추가 (settings, auth edge case)
B2. 프론트엔드 테스트 추가 (useSettings, WorkoutContext)
C1. Terraform S3 백엔드 설정
C2. EC2 IP 동적 참조
C3. 배포 롤백 전략
```

---

## 영향 범위 요약

| 영역 | 파일 수 변경 | 기능 변경 여부 |
|------|------------|--------------|
| 프론트엔드 Context | +2 신규, -1 삭제, 5개 수정 | 없음 (리팩터링) |
| 프론트엔드 API | 1개 수정 | 없음 (동작 동일) |
| 공유 타입 | +1 신규, 2개 수정 | 없음 |
| 백엔드 에러 핸들러 | +3 신규, 3개 수정 | 없음 (응답 형식 동일) |

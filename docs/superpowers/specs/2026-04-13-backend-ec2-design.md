# my-gym 백엔드 연동 & EC2 배포 설계 스펙

작성일: 2026-04-13

---

## 1. 개요

현재 완전 로컬(IndexedDB) 기반인 my-gym PWA에 Node.js Express 백엔드를 추가하고, AWS EC2에 Docker Compose로 배포한다. JWT 이메일/비밀번호 인증을 도입하여 사용자별 데이터를 PostgreSQL에 저장한다.

### 변경 전

```
브라우저 → React 앱 → IndexedDB (로컬)
```

### 변경 후

```
브라우저 → React 앱 → Express API → PostgreSQL
                  ↑ JWT 인증
```

---

## 2. 레포지토리 구조 (모노레포)

```
my-gym/
├── frontend/              ← 기존 React/Vite PWA (현재 src/ 위치에서 이동)
│   ├── src/
│   │   ├── api/           ← 신규: API 호출 모듈
│   │   │   ├── auth.ts
│   │   │   ├── records.ts
│   │   │   └── settings.ts
│   │   ├── context/
│   │   │   ├── AppContext.tsx  ← 기존 유지
│   │   │   └── AuthContext.tsx ← 신규: 로그인 상태 관리
│   │   └── ...            ← 나머지 기존 파일 그대로
├── backend/               ← 신규 Node.js Express 서버
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── records.ts
│   │   │   └── settings.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts  ← JWT 검증
│   │   ├── db/
│   │   │   ├── client.ts          ← pg Pool 설정
│   │   │   └── migrations/        ← SQL 마이그레이션 파일
│   │   └── index.ts               ← Express 앱 진입점
│   ├── Dockerfile
│   └── package.json
├── terraform/             ← 신규 인프라 코드
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── docker-compose.yml     ← app + db 컨테이너 정의
```

---

## 3. 인증 설계 (JWT)

### 토큰 전략

| 토큰 | 유효기간 | 저장 위치 |
|------|---------|----------|
| 액세스 토큰 | 15분 | 메모리(state) — XSS 방지 |
| 리프레시 토큰 | 7일 | httpOnly 쿠키 — JS 접근 불가 |

### 인증 흐름

1. 로그인 → 서버가 액세스 토큰 응답 본문 반환 + 리프레시 토큰 httpOnly 쿠키 설정
2. API 호출 시 `Authorization: Bearer <accessToken>` 헤더 첨부
3. 액세스 토큰 만료 시 `/api/auth/refresh` 호출 (쿠키 자동 첨부)
4. 새 액세스 토큰 발급 후 재요청

### 비밀번호

- bcrypt (cost factor 12)로 해시 후 저장
- 평문 비밀번호는 절대 저장하지 않음

---

## 4. API 엔드포인트

### 인증 (`/api/auth`) — 인증 불필요

| 메서드 | 경로 | 요청 본문 | 응답 |
|--------|------|----------|------|
| POST | `/api/auth/register` | `{ email, password }` | `{ userId, email }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ accessToken }` + 쿠키 |
| POST | `/api/auth/refresh` | (쿠키 자동) | `{ accessToken }` |
| POST | `/api/auth/logout` | — | `{ ok: true }` + 쿠키 삭제 |

### 운동 기록 (`/api/records`) — JWT 필요

| 메서드 | 경로 | 요청 | 응답 |
|--------|------|------|------|
| GET | `/api/records` | `?filter=week\|month` | `WorkoutRecord[]` |
| POST | `/api/records` | `{ recordedDate, source, label? }` | `WorkoutRecord` |
| DELETE | `/api/records/:id` | — | `{ ok: true }` |
| DELETE | `/api/records` | — | `{ ok: true }` |

### 설정 (`/api/settings`) — JWT 필요

| 메서드 | 경로 | 요청 | 응답 |
|--------|------|------|------|
| GET | `/api/settings` | — | `UserSettings` |
| PUT | `/api/settings` | `{ weeklyGoal }` | `UserSettings` |

### 에러 응답 형식

```json
{ "error": "UNAUTHORIZED", "message": "토큰이 유효하지 않습니다." }
```

HTTP 상태코드: 400 (유효성), 401 (인증), 403 (권한), 404 (없음), 500 (서버 오류)

---

## 5. PostgreSQL 스키마

```sql
-- 사용자 테이블
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,  -- bcrypt 해시
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 리프레시 토큰 (무효화 지원)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 운동 기록
CREATE TABLE workout_records (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  recorded_at    TIMESTAMPTZ NOT NULL,
  recorded_date  DATE NOT NULL,               -- 통계 기준 날짜 (KST)
  created_at     TIMESTAMPTZ NOT NULL,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('today_button', 'manual')),
  label          VARCHAR(100),
  UNIQUE (user_id, recorded_date)             -- 날짜별 1건 정책
);

-- 사용자 설정 (싱글톤 per 사용자)
CREATE TABLE user_settings (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weekly_goal  INTEGER NOT NULL DEFAULT 3 CHECK (weekly_goal BETWEEN 1 AND 7),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. 백엔드 기술 스택

| 항목 | 선택 |
|------|------|
| 런타임 | Node.js 20 LTS |
| 프레임워크 | Express 4 |
| DB 클라이언트 | `pg` (node-postgres) |
| 인증 | `jsonwebtoken`, `bcrypt` |
| 유효성 검사 | `zod` |
| 환경변수 | `dotenv` |
| TypeScript | ts-node / tsc |

---

## 7. Docker Compose 구성

```yaml
# docker-compose.yml (루트)
version: '3.9'
services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://gym_user:gym_pass@db:5432/gym_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: gym_user
      POSTGRES_PASSWORD: gym_pass
      POSTGRES_DB: gym_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gym_user -d gym_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 8. Terraform EC2 인프라

### 리소스 목록

| 리소스 | 설정 |
|--------|------|
| `aws_security_group` | 22(SSH), 80(HTTP), 443(HTTPS), 3000(API) 인바운드 |
| `aws_instance` | Ubuntu 24.04 LTS, t3.micro, 20GB EBS |
| `aws_eip` | EC2에 연결 (재시작 후 IP 유지) |

### 리전

`ap-northeast-2` (서울)

### user_data 스크립트 (EC2 최초 실행)

```bash
#!/bin/bash
apt-get update
apt-get install -y docker.io docker-compose-v2 git
systemctl enable docker
systemctl start docker

git clone <REPO_URL> /app
cd /app

# .env 파일은 수동으로 EC2에 배치 필요 (비밀 정보 포함)
docker compose up -d
```

### 변수 (`variables.tf`)

| 변수 | 설명 |
|------|------|
| `aws_region` | AWS 리전 (기본: ap-northeast-2) |
| `key_pair_name` | EC2 SSH 키 페어 이름 |
| `repo_url` | Git 레포 URL |

### 출력 (`outputs.tf`)

- `ec2_public_ip` — EC2 퍼블릭 IP (Elastic IP)
- `ec2_instance_id` — 인스턴스 ID

---

## 9. 프론트엔드 변경 사항

### 제거

- `src/db/database.ts` (Dexie) 삭제
- `useWorkoutRecords`의 IndexedDB 직접 호출 → API 호출로 교체

### 추가

**`frontend/src/api/`** — API 클라이언트 모듈

- `auth.ts` — register, login, refresh, logout
- `records.ts` — getRecords, addRecord, deleteRecord, deleteAllRecords
- `settings.ts` — getSettings, updateSettings
- 모든 요청에 액세스 토큰 자동 첨부
- 401 응답 시 자동 토큰 갱신 후 재시도 (인터셉터)

**`frontend/src/context/AuthContext.tsx`**

```typescript
type AuthContextValue = {
  isLoggedIn: boolean
  user: { id: string; email: string } | null
  accessToken: string | null       // 메모리 저장
  login: (email, password) => Promise<void>
  register: (email, password) => Promise<void>
  logout: () => Promise<void>
}
```

### 기존 코드 재사용 (변경 없음)

- `calcStats()` — 그대로 유지 (클라이언트에서 계산)
- 모든 UI 컴포넌트 (`HomePage`, `RecordsPage`, `SettingsPage` 등)
- `utils/date.ts`

### 로그인 화면

- 앱 최초 진입 시 로그인 상태 확인
- 미로그인 → 로그인/회원가입 화면 표시
- 로그인 완료 → 기존 홈 화면으로 전환

---

## 10. 환경변수 (.env)

```bash
# backend/.env (EC2에 수동 배치)
DATABASE_URL=postgres://gym_user:gym_pass@db:5432/gym_db
JWT_SECRET=<32자 이상 랜덤 문자열>
JWT_REFRESH_SECRET=<32자 이상 랜덤 문자열>
NODE_ENV=production
PORT=3000

# frontend/.env
VITE_API_BASE_URL=http://<EC2_ELASTIC_IP>:3000
```

---

## 11. 미결 사항

- EC2 HTTPS 적용 여부: MVP에서는 HTTP(3000)만 사용. 이후 Nginx + Let's Encrypt로 확장 가능
- 도메인 연결: MVP에서는 Elastic IP 직접 사용. 이후 Route 53 도메인 연결 가능
- 기존 로컬 데이터 마이그레이션: 기존 IndexedDB 데이터는 이전하지 않음 (신규 사용자 기준으로 시작)
- `.env` 비밀 관리: MVP에서는 수동 배치. 이후 AWS Secrets Manager 또는 SSM Parameter Store 활용 가능

---

## 12. 구현 순서 (권장)

1. **모노레포 구조 설정** — 기존 파일을 `frontend/`로 이동, `backend/`, `terraform/` 디렉토리 생성
2. **백엔드 기본 구조** — Express 앱, DB 연결, 마이그레이션 SQL
3. **인증 API** — register, login, refresh, logout
4. **운동 기록 & 설정 API** — CRUD 엔드포인트
5. **Terraform** — EC2, Security Group, EIP 리소스 작성 및 `terraform apply`
6. **Docker Compose** — EC2에서 앱+DB 실행 검증
7. **프론트엔드 API 클라이언트** — `frontend/src/api/` 모듈 작성
8. **AuthContext & 로그인 화면** — 인증 흐름 연결
9. **useWorkoutRecords 교체** — IndexedDB → API 호출
10. **통합 테스트** — 전체 흐름 검증

# My Gym — 헬스장 운동 기록 앱

개인 헬스장 운동 세션을 기록하고 통계를 확인하는 PWA 웹앱.

---

## 프로젝트 구조

```
my-gym/                         ← 모노레포 루트
├── frontend/                   ← React 19 + Vite PWA
├── backend/                    ← Node.js Express + PostgreSQL API
├── shared/                     ← 프론트엔드·백엔드 공유 타입 (types.ts)
├── terraform/                  ← AWS EC2 인프라 (Terraform)
├── docker-compose.yml          ← 로컬/EC2 전체 앱 실행
└── .github/workflows/
    └── deploy-backend.yml      ← main push 시 EC2 자동 재배포
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, TypeScript, Vite, Vitest |
| 백엔드 | Node.js, Express, TypeScript, Jest |
| 데이터베이스 | PostgreSQL 16 (로컬·EC2 모두 Docker) |
| 로컬 스토리지 | IndexedDB (Dexie 4) — 오프라인 모드 |
| 인증 | JWT (Access 15분 + Refresh 7일, httpOnly 쿠키) |
| 인프라 | AWS EC2 (Terraform), Docker Compose |
| 프론트 배포 | Vercel |
| 백엔드 배포 | AWS EC2 (GitHub Actions → SSH 배포) |

---

## 아키텍처

```
사용자 브라우저
    │
    ▼
Vercel (프론트엔드)
https://gymlog-wheat.vercel.app
    │
    │  /api/* 요청은 vercel.json rewrites로 프록시
    ▼
AWS EC2 (백엔드 API)
http://15.164.29.85:3000
    │
    ▼
PostgreSQL 16 (Docker Compose 내 db 서비스)
```

### 프론트엔드 레이어 구조

```
frontend/src/
├── api/          → apiFetch 기반 API 클라이언트 (auth, records, settings)
├── components/   → UI 렌더링 (auth/, home/, records/, settings/, shared/)
├── context/      → AuthContext, SettingsContext, WorkoutContext
├── db/           → Dexie IndexedDB 스키마 정의 (오프라인 로컬 저장)
├── types/        → 프론트엔드 전용 타입
└── utils/        → date.ts (KST 기준 날짜 계산 헬퍼)
```

### 백엔드 레이어 구조

```
backend/src/
├── routes/       → auth.ts, records.ts, settings.ts
├── middleware/   → asyncHandler.ts, errorHandler.ts
├── errors/       → AppError.ts (커스텀 에러 클래스)
├── db/           → client.ts (pg pool), migrations/
└── index.ts      → Express 앱 진입점
```

### 주요 기능

- **운동 기록**: 오늘 버튼 한 번으로 세션 기록, 날짜별 여러 세션 허용
- **통계**: 주간·월간 운동 횟수 집계, 주간 목표 달성률
- **설정**: 주간 목표 설정 (1~7일)
- **인증**: 이메일/비밀번호 로그인, 초대 코드 기반 회원가입 제한
- **접근 제한**: IP 화이트리스트 (`ALLOWED_IPS` 환경변수, 선택 적용)

---

## 환경변수

### 백엔드 (`/app/.env` on EC2 또는 로컬 `.env`)

| 변수 | 설명 |
|------|------|
| `JWT_SECRET` | Access Token 서명 키 (32자 이상) |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 (32자 이상) |
| `FRONTEND_ORIGIN` | CORS 허용 오리진 (예: `http://15.164.29.85`) |
| `INVITE_CODE` | 회원가입 초대 코드 (설정하면 코드 없이 가입 불가) |
| `ALLOWED_IPS` | 쉼표 구분 허용 IP 목록 (설정 시 IP 제한 적용) |

### 프론트엔드 (Vercel 환경변수)

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | 백엔드 API 기본 URL (예: `http://15.164.29.85:3000`) |

---

## 개발 명령어

### 프론트엔드

```bash
cd frontend
npm run dev          # Vite 개발 서버 (localhost:5173)
npm run build        # TypeScript 컴파일 + Vite 번들링
npm run test         # Vitest watch 모드
npm run coverage     # 테스트 커버리지 생성
```

단일 테스트 실행:

```bash
npx vitest run src/test/hooks/useWorkoutRecords.test.ts
npx vitest run --reporter=verbose
```

### 백엔드

```bash
cd backend
npm run dev          # ts-node 개발 서버 (localhost:3000)
npm run build        # TypeScript 컴파일
npm run test         # Jest 통합 테스트 (PostgreSQL 필요)
npm run migrate      # DB 마이그레이션 실행
```

### Docker (전체 앱)

```bash
# 루트 디렉토리에서 실행
docker compose up --build -d   # 앱 + DB 실행
docker compose down            # 종료
docker compose logs app        # 백엔드 로그 확인
```

---

## 배포 방법

### 프론트엔드 — Vercel

Vercel 프로젝트 `gymlog`에 자동 연결됨. `main` 브랜치 push 시 Vercel이 자동으로 감지해 재빌드·재배포.

```bash
# 수동 배포가 필요할 경우
cd frontend
vercel --prod
```

**Production URL:** `https://gymlog-wheat.vercel.app`

Vercel은 `frontend/vercel.json`의 rewrites 설정으로 `/api/*` 요청을 EC2 백엔드로 프록시한다.

### 백엔드 — EC2 (GitHub Actions)

`main` 브랜치에 `backend/**` 또는 `docker-compose.yml` 변경이 포함된 push가 발생하면 `.github/workflows/deploy-backend.yml`이 자동 실행된다.

**배포 흐름:**

```
git push origin main
    ↓
GitHub Actions (deploy-backend.yml)
    ↓
EC2 SSH 접속 → git pull → docker compose up --build -d
    ↓
헬스체크: curl http://localhost:3000/health
```

**필요한 GitHub Secrets:**

| Secret | 설명 |
|--------|------|
| `EC2_HOST` | EC2 Elastic IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | `~/.ssh/my-gym-key.pem` 전체 내용 |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_REFRESH_SECRET` | Refresh 토큰 서명 키 |

### EC2 최초 설정 (1회)

```bash
# Terraform으로 EC2 생성
cd terraform
terraform init
terraform apply -var="key_pair_name=my-gym-key"

# EC2에 앱 초기화
ssh -i ~/.ssh/my-gym-key.pem ubuntu@<EC2_IP>
git clone https://github.com/CUCU7103/my-gym /app
cd /app
cat > .env << 'EOF'
JWT_SECRET=<값>
JWT_REFRESH_SECRET=<값>
FRONTEND_ORIGIN=http://<EC2_IP>
INVITE_CODE=<값>
EOF
docker compose up --build -d
```

---

## Docker 빌드 구조

`backend/Dockerfile`은 빌드 컨텍스트를 모노레포 루트(`context: .`)로 사용한다.  
이는 `shared/` 타입 디렉토리를 Docker 이미지 빌드에 포함하기 위함이다.

```
docker-compose.yml
  build:
    context: .                      ← 루트를 컨텍스트로
    dockerfile: backend/Dockerfile  ← Dockerfile 경로 명시

backend/Dockerfile
  COPY shared ./src/shared          ← shared 타입을 src/shared에 복사
  RUN npx tsc --project tsconfig.docker.json
  COPY --from=builder /dist ./dist  ← dist/index.js 정상 경로
```

`tsconfig.docker.json`: Docker 전용 설정으로 `rootDir=./src`, `@shared/* → src/shared/*`를 사용한다.  
`tsconfig.json`: 로컬 개발 전용으로 `rootDir=..`, `@shared/* → ../shared/*`를 사용한다.

---

## 테스트 전략

| 영역 | 방식 |
|------|------|
| 프론트엔드 훅 | Vitest + `renderHook` + Dexie 인메모리 모킹 |
| 날짜 의존 로직 | `vi.useFakeTimers()` + `vi.setSystemTime()` |
| 백엔드 라우트 | Jest + supertest (PostgreSQL 실제 연결) |

테스트 파일은 `frontend/src/test/`에 소스 구조를 그대로 미러링한다.

---

## CSS 컨벤션

다크 테마 전용. `frontend/src/styles/global.css`에 CSS 변수 정의:

```css
--bg: #0f0f0f        /* 배경 */
--surface: #1a1a1a   /* 카드/모달 */
--blue: #3B82F6      /* 주요 액션 */
--text: #f1f1f1      /* 기본 텍스트 */
```

인라인 스타일보다 CSS 변수를 우선 사용한다.

---

## 주요 제약사항

- 같은 날 여러 세션 기록 가능 (날짜 중복 허용)
- `userSettings`는 항상 싱글톤 레코드 (`id: 1` / `user_id`) 유지
- 모든 날짜는 **Asia/Seoul** 기준 `YYYY-MM-DD`로 저장
- Dexie 스키마 변경 시 반드시 버전 업(`.version(n)`) 처리
- Vercel → EC2 API 통신은 `frontend/vercel.json`의 rewrites 경유

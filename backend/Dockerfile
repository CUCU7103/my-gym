# backend/Dockerfile
# 빌드 컨텍스트: 모노레포 루트 (shared/ 디렉토리 접근을 위해)
# docker-compose.yml에서 context: . 로 실행해야 한다

# 빌드 스테이지: TypeScript 컴파일 (devDependencies 포함)
FROM node:20-alpine AS builder

WORKDIR /workspace/backend

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json backend/tsconfig.docker.json ./

# shared/ 타입을 backend/src/shared/에 복사 (tsconfig paths: @shared/* → src/shared/*)
COPY shared ./src/shared

# 백엔드 소스 복사
COPY backend/src ./src

RUN npx tsc --project tsconfig.docker.json

# 프로덕션 이미지: 컴파일된 JS만 포함, devDependencies 제외
FROM node:20-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /workspace/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]

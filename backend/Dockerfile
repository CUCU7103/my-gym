# backend/Dockerfile
# 빌드 컨텍스트: 모노레포 루트 (shared/ 디렉토리 접근을 위해)
# docker-compose.yml에서 context: . 로 실행해야 한다

# 빌드 스테이지: TypeScript 컴파일 (devDependencies 포함)
FROM node:20-alpine AS builder

WORKDIR /workspace

# shared 디렉토리 복사 (백엔드 tsconfig paths가 참조)
COPY shared ./shared

# 백엔드 의존성 설치
WORKDIR /workspace/backend
COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc

# 프로덕션 이미지: 컴파일된 JS만 포함, devDependencies 제외
FROM node:20-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /workspace/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]

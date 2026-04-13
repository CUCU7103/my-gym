# backend/Dockerfile
# 빌드 스테이지: TypeScript 컴파일 (devDependencies 포함)
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# 프로덕션 이미지: 컴파일된 JS만 포함, devDependencies 제외
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]

-- backend/src/db/migrations/001_init.sql

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 리프레시 토큰 (로그아웃 시 무효화)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 운동 기록 (하루 여러 세션 허용 — UNIQUE 제약 없음)
CREATE TABLE IF NOT EXISTS workout_records (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  recorded_at    TIMESTAMPTZ NOT NULL,
  recorded_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('today_button', 'manual')),
  label          VARCHAR(100)
);

-- 사용자 설정 (사용자당 1개 행)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weekly_goal  INTEGER NOT NULL DEFAULT 3 CHECK (weekly_goal BETWEEN 1 AND 7),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

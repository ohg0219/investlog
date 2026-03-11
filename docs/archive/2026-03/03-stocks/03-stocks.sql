-- ============================================================
-- 03-stocks: Supabase SQL Migration
-- Supabase 대시보드 SQL Editor에서 직접 실행
-- ============================================================

-- stocks 테이블
CREATE TABLE IF NOT EXISTS stocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT NOT NULL UNIQUE,           -- Yahoo Finance 티커, 중복 불가
  name        TEXT NOT NULL,
  market      TEXT NOT NULL,                  -- 거래소 식별자
  country     TEXT NOT NULL,                  -- ISO 3166-1 alpha-2
  currency    TEXT NOT NULL,                  -- ISO 4217
  sector      TEXT,                           -- NULL 허용
  memo        TEXT,                           -- NULL 허용
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- stocks 테이블 updated_at 트리거
CREATE TRIGGER stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security: Service Role Key만 허용 (anon 차단)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_stocks_created_at ON stocks (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks (ticker);

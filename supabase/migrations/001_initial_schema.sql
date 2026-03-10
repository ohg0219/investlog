-- stocks 테이블
CREATE TABLE stocks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  market      VARCHAR(20)  NOT NULL,
  country     VARCHAR(10)  NOT NULL,
  currency    VARCHAR(10)  NOT NULL,
  sector      VARCHAR(50),
  memo        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- transactions 테이블
CREATE TABLE transactions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id    UUID         NOT NULL REFERENCES stocks(id),
  type        VARCHAR(10)  NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  date        DATE         NOT NULL,
  quantity    NUMERIC,
  price       NUMERIC,
  amount      NUMERIC      NOT NULL,
  memo        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

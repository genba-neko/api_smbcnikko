-- Yuutai (Stock Benefit Information) Table
CREATE TABLE IF NOT EXISTS yuutai (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker_code          TEXT    NOT NULL,
  record_date          TEXT    NOT NULL,
  shares_condition     TEXT    NOT NULL,
  shares_condition_num INTEGER NOT NULL,
  benefit_yen          INTEGER,
  benefit_original     TEXT,
  benefit_type         TEXT,
  is_continuation      INTEGER NOT NULL DEFAULT 0 -- 0: false, 1: true
);

-- 銘柄コード + 株数での検索用
CREATE INDEX IF NOT EXISTS idx_yuutai_ticker_shares
  ON yuutai(ticker_code, shares_condition_num);

-- 権利確定月での検索用
CREATE INDEX IF NOT EXISTS idx_yuutai_record_date
  ON yuutai(record_date);
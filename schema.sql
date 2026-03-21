CREATE TABLE IF NOT EXISTS webauthn_sign_count (
  credential_id TEXT    PRIMARY KEY,
  sign_count    INTEGER NOT NULL DEFAULT 0,
  user_id       TEXT    NOT NULL,
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_id
  ON webauthn_sign_count(user_id);
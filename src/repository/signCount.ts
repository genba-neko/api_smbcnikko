export type SignCountRow = {
  credential_id: string;
  sign_count: number;
  created_at: number;
  updated_at: number;
};

export const getSignCount = async (db: D1Database, credentialId: string): Promise<SignCountRow | null> => {
  return await db
    .prepare('SELECT * FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .first<SignCountRow>();
};

export const upsertSignCount = async (
  db: D1Database,
  credentialId: string,
  signCount: number
) => {
  return await db
    .prepare(`
      INSERT INTO webauthn_sign_count (credential_id, sign_count, created_at, updated_at)
      VALUES (?, ?, unixepoch(), unixepoch())
      ON CONFLICT(credential_id) DO UPDATE SET
        sign_count = excluded.sign_count,
        updated_at = unixepoch()
    `)
    .bind(credentialId, signCount)
    .run();
};

export const deleteSignCount = async (db: D1Database, credentialId: string) => {
  return await db
    .prepare('DELETE FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .run();
};

export type SignCountRow = {
  credential_id: string;
  sign_count: number;
  user_id: string;
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
  signCount: number,
  userId: string = ''
) => {
  return await db
    .prepare(`
      INSERT INTO webauthn_sign_count (credential_id, sign_count, user_id, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(credential_id) DO UPDATE SET
        sign_count = excluded.sign_count,
        updated_at = unixepoch()
    `)
    .bind(credentialId, signCount, userId)
    .run();
};

export const deleteSignCount = async (db: D1Database, credentialId: string) => {
  return await db
    .prepare('DELETE FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .run();
};

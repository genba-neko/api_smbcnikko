import { getSignCount, upsertSignCount, deleteSignCount } from '../repository/signCount';

export const getSignCountByCredential = async (db: D1Database, credentialId: string) => {
  return await getSignCount(db, credentialId);
};

export const updateSignCount = async (
  db: D1Database,
  credentialId: string,
  newSignCount: number,
  userId: string = ''
) => {
  if (typeof newSignCount !== 'number' || newSignCount < 0) {
    return { error: 'invalid_sign_count', status: 400 };
  }

  const existing = await getSignCount(db, credentialId);

  if (existing && existing.sign_count >= newSignCount) {
    return { error: 'sign_count_not_greater', current: existing.sign_count, status: 409 };
  }

  await upsertSignCount(db, credentialId, newSignCount, userId);
  return { ok: true, sign_count: newSignCount };
};

export const removeSignCount = async (db: D1Database, credentialId: string) => {
  return await deleteSignCount(db, credentialId);
};

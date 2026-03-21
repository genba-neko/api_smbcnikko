import { Hono } from 'hono';
import { Env } from '../types/env';
import * as signCountService from '../services/signCount';

const signCount = new Hono<{ Bindings: Env }>();

// GET /sign-count/:credentialId
signCount.get('/:credentialId', async (c) => {
  const { credentialId } = c.req.param();
  const row = await signCountService.getSignCountByCredential(c.env.DB, credentialId);

  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json(row);
});

// PUT /sign-count/:credentialId
signCount.put('/:credentialId', async (c) => {
  const { credentialId } = c.req.param();
  const { sign_count, user_id } = await c.req.json<{
    sign_count: number;
    user_id: string;
  }>();

  const result = await signCountService.updateSignCount(
    c.env.DB,
    credentialId,
    sign_count,
    user_id
  );

  if ('error' in result) {
    return c.json(result, result.status as any);
  }

  return c.json(result);
});

// DELETE /sign-count/:credentialId
signCount.delete('/:credentialId', async (c) => {
  const { credentialId } = c.req.param();
  await signCountService.removeSignCount(c.env.DB, credentialId);
  return c.json({ ok: true });
});

export default signCount;

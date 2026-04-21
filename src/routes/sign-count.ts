import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import * as signCountService from '../services/signCount';
import type { Env } from '../types/env';

const signCount = new Hono<{ Bindings: Env }>();

// GET /sign-count/:credentialId
signCount.get('/:credentialId', async (c) => {
	const { credentialId } = c.req.param();
	const row = await signCountService.getSignCountByCredential(
		c.env.DB,
		credentialId,
	);

	if (!row) return c.json({ error: 'not_found' }, 404);
	return c.json(row);
});

// PUT /sign-count/:credentialId
signCount.put('/:credentialId', async (c) => {
	const { credentialId } = c.req.param();
	const { sign_count } = await c.req.json<{
		sign_count: number;
	}>();

	const result = await signCountService.updateSignCount(
		c.env.DB,
		credentialId,
		sign_count,
	);

	if ('error' in result) {
		return c.json(result, result.status as ContentfulStatusCode);
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

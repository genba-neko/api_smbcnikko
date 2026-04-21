import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../../types/env';

const webauthnSignCount = new Hono<{ Bindings: Env }>();

function getStub(env: Env, credentialId: string) {
	const id = env.WEBAUTHN_SIGN_COUNT.idFromName(credentialId);
	return env.WEBAUTHN_SIGN_COUNT.get(id);
}

webauthnSignCount.get('/:credentialId', async (c) => {
	const stub = getStub(c.env, c.req.param('credentialId'));
	const res = await stub.fetch(`https://do/${c.req.param('credentialId')}`);
	const data = await res.json();
	return c.json(data, res.status as ContentfulStatusCode);
});

webauthnSignCount.post('/:credentialId', async (c) => {
	const body = await c.req.json();
	const stub = getStub(c.env, c.req.param('credentialId'));
	const res = await stub.fetch(`https://do/${c.req.param('credentialId')}`, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	});
	const data = await res.json();
	return c.json(data, res.status as ContentfulStatusCode);
});

webauthnSignCount.delete('/:credentialId', async (c) => {
	const stub = getStub(c.env, c.req.param('credentialId'));
	const res = await stub.fetch(`https://do/${c.req.param('credentialId')}`, {
		method: 'DELETE',
	});
	const data = await res.json();
	return c.json(data, res.status as ContentfulStatusCode);
});

export default webauthnSignCount;

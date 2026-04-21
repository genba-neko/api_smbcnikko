import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../../types/env';

export type SignCountRow = {
	credential_id: string;
	sign_count: number;
	created_at: number;
	updated_at: number;
};

export class WebauthnSignCount extends DurableObject<Env> {
	private db: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.db = ctx.storage.sql;
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS webauthn_sign_count (
        credential_id TEXT    PRIMARY KEY,
        sign_count    INTEGER NOT NULL DEFAULT 0,
        created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const credentialId = url.pathname.slice(1);

		if (request.method === 'GET') {
			const row =
				this.db
					.exec<SignCountRow>(
						'SELECT * FROM webauthn_sign_count WHERE credential_id = ?',
						credentialId,
					)
					.toArray()[0] ?? null;
			if (!row) return Response.json({ error: 'not_found' }, { status: 404 });
			return Response.json(row);
		}

		if (request.method === 'POST') {
			const { local_sign_count } = await request.json<{
				local_sign_count: number;
			}>();

			if (typeof local_sign_count !== 'number' || local_sign_count < 0) {
				return Response.json(
					{ error: 'invalid_local_sign_count' },
					{ status: 400 },
				);
			}

			this.db.exec(
				`INSERT INTO webauthn_sign_count (credential_id, sign_count, created_at, updated_at)
         VALUES (?, ?, unixepoch(), unixepoch())
         ON CONFLICT(credential_id) DO UPDATE SET
           sign_count = MAX(sign_count, excluded.sign_count) + 1,
           updated_at = unixepoch()`,
				credentialId,
				local_sign_count + 1,
			);

			const row = this.db
				.exec<SignCountRow>(
					'SELECT * FROM webauthn_sign_count WHERE credential_id = ?',
					credentialId,
				)
				.toArray()[0];

			return Response.json({ ok: true, sign_count: row.sign_count });
		}

		if (request.method === 'DELETE') {
			this.db.exec(
				'DELETE FROM webauthn_sign_count WHERE credential_id = ?',
				credentialId,
			);
			return Response.json({ ok: true });
		}

		return Response.json({ error: 'method_not_allowed' }, { status: 405 });
	}
}

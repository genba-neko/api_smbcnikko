import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

type Env = { DB: D1Database; API_SECRET: string }

const app = new Hono<{ Bindings: Env }>()

// 全エンドポイントに Bearer Token 認証を適用
app.use('/*', async (c, next) => {
  const auth = bearerAuth({ token: c.env.API_SECRET })
  return auth(c, next)
})

// GET /sign-count/:credentialId → 現在値取得
app.get('/sign-count/:credentialId', async (c) => {
  const { credentialId } = c.req.param()
  const row = await c.env.DB
    .prepare('SELECT sign_count, updated_at FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .first()

  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(row)
})

// PUT /sign-count/:credentialId → upsert
// ★ sign_count が既存値以下なら 409（Replay Attack 防止）
app.put('/sign-count/:credentialId', async (c) => {
  const { credentialId } = c.req.param()
  const { sign_count, user_id } = await c.req.json<{
    sign_count: number
    user_id: string
  }>()

  if (typeof sign_count !== 'number' || sign_count < 0) {
    return c.json({ error: 'invalid_sign_count' }, 400)
  }

  const existing = await c.env.DB
    .prepare('SELECT sign_count FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .first<{ sign_count: number }>()

  if (existing && existing.sign_count >= sign_count) {
    return c.json({ error: 'sign_count_not_greater', current: existing.sign_count }, 409)
  }

  await c.env.DB
    .prepare(`
      INSERT INTO webauthn_sign_count (credential_id, sign_count, user_id, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(credential_id) DO UPDATE SET
        sign_count = excluded.sign_count,
        updated_at = unixepoch()
    `)
    .bind(credentialId, sign_count, user_id ?? '')
    .run()

  return c.json({ ok: true, sign_count })
})

// DELETE /sign-count/:credentialId → Credential 削除時
app.delete('/sign-count/:credentialId', async (c) => {
  const { credentialId } = c.req.param()
  await c.env.DB
    .prepare('DELETE FROM webauthn_sign_count WHERE credential_id = ?')
    .bind(credentialId)
    .run()
  return c.json({ ok: true })
})

export default app
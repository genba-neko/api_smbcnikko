import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types/env';
import route from './route';

export { WebauthnSignCount } from './durable';

// standalone Worker エントリポイント
const app = new Hono<{ Bindings: Env }>();
app.use('/*', authMiddleware);
app.route('/webauthn-sign-count', route);

export default app;

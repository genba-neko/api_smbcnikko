import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { WebauthnSignCount } from './features/webauthn-sign-count';
import webauthnSignCount from './features/webauthn-sign-count/route';
import signCount from './routes/sign-count';
import yuutai from './routes/yuutai';
import type { Env } from './types/env';

export { WebauthnSignCount };

const app = new Hono<{ Bindings: Env }>();

app.use('/*', authMiddleware);

app.route('/sign-count', signCount);
app.route('/yuutai', yuutai);
app.route('/webauthn-sign-count', webauthnSignCount);

export default app;

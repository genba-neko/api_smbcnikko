import { Hono } from 'hono';
import { Env } from './types/env';
import { authMiddleware } from './middleware/auth';
import signCount from './routes/sign-count';
import yuutai from './routes/yuutai';

const app = new Hono<{ Bindings: Env }>();

// 全エンドポイントに Bearer Token 認証を適用
app.use('/*', authMiddleware);

// 各ルートの登録
app.route('/sign-count', signCount);
app.route('/yuutai', yuutai);

export default app;

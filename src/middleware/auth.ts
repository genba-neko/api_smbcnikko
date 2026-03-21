import { bearerAuth } from 'hono/bearer-auth';
import { createMiddleware } from 'hono/factory';
import { Env } from '../types/env';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const auth = bearerAuth({ token: c.env.API_SECRET });
  return auth(c, next);
});

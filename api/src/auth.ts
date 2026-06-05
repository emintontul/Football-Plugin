import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';

type JwtPayload = {
  userId?: string;
  sub?: string;
  name?: string;
  [k: string]: unknown;
};

export const requireAuth: MiddlewareHandler<{ Variables: { userId: string; userName: string | null } }> = async (c, next) => {
  const header = c.req.header('authorization') ?? c.req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }
  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json({ error: 'Server misconfigured: JWT_SECRET not set' }, 500);
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload | string;
    if (typeof decoded === 'string') {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    const userId = decoded.userId ?? decoded.sub;
    if (!userId || typeof userId !== 'string') {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    c.set('userId', userId);
    c.set('userName', typeof decoded.name === 'string' ? decoded.name : null);
    await next();
    return;
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

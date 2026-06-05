import { Hono } from 'hono';
import { refreshLiveFixtures, settleMatch, syncAllFixtures } from '../lib/cron.js';

const app = new Hono();

app.use('*', async (c, next) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return c.json({ error: 'Admin sync disabled' }, 503);
  }
  const token = c.req.header('x-admin-token');
  if (!token || token !== adminSecret) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
  return;
});

app.post('/fixtures', async (c) => {
  const result = await syncAllFixtures();
  return c.json({ ok: true, ...result });
});

app.post('/live', async (c) => {
  const result = await refreshLiveFixtures();
  return c.json({ ok: true, ...result });
});

app.post('/settle/:matchId', async (c) => {
  const matchId = c.req.param('matchId');
  const result = await settleMatch(matchId);
  return c.json({ ok: true, matchId, ...result });
});

export default app;

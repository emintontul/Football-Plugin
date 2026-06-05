import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import fixturesRoute from './routes/fixtures.js';
import predictionsRoute from './routes/predictions.js';
import leaderboardRoute from './routes/leaderboard.js';
import syncRoute from './routes/sync.js';
import { startCron } from './lib/cron.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
    maxAge: 600,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/fixtures', fixturesRoute);
app.route('/predictions', predictionsRoute);
app.route('/leaderboard', leaderboardRoute);
app.route('/sync', syncRoute);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = Number(process.env.PORT ?? 3000);

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`API listening on :${info.port}`);
    startCron().catch((err) => console.error('[cron] startup failed:', err));
  },
);

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, BandwidthQuery, BandwidthResult } from './types';
import { accessAuthMiddleware } from './auth';
import { queryBandwidth, aggregateByTime } from './graphql';
import { calculateP95 } from './p95';
import { renderDashboard } from './ui';

type AppEnv = { Bindings: Env; Variables: { userEmail: string } };

const app = new Hono<AppEnv>();

app.use('*', cors({ origin: '*' }));
app.use('*', accessAuthMiddleware);

// ─── Health ───
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── User Info ───
app.get('/api/me', (c) => c.json({ email: c.get('userEmail') }));

// ─── Settings ───
app.get('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const row = await c.env.DB.prepare(
    'SELECT account_tag, api_token FROM user_settings WHERE user_email = ?'
  ).bind(email).first();

  return c.json({
    account_tag: row?.account_tag || '',
    api_token: row?.api_token ? '••••••••' : '',
    has_token: !!(row?.api_token),
  });
});

app.post('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_tag?: string; api_token?: string }>();

  const existing = await c.env.DB.prepare(
    'SELECT id, api_token FROM user_settings WHERE user_email = ?'
  ).bind(email).first();

  const accountTag = body.account_tag ?? '';
  // If token is masked or empty, keep existing
  const apiToken = (body.api_token && !body.api_token.startsWith('••'))
    ? body.api_token
    : (existing?.api_token as string || '');

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE user_settings SET account_tag = ?, api_token = ?, updated_at = datetime(\'now\') WHERE user_email = ?'
    ).bind(accountTag, apiToken, email).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO user_settings (user_email, account_tag, api_token) VALUES (?, ?, ?)'
    ).bind(email, accountTag, apiToken).run();
  }

  return c.json({ ok: true });
});

// ─── Test Token ───
app.post('/api/test-token', async (c) => {
  const body = await c.req.json<{ account_tag?: string; api_token?: string }>();
  const email = c.get('userEmail');

  // Use provided values or fall back to saved settings
  let accountTag = body.account_tag || '';
  let apiToken = body.api_token || '';

  if (!accountTag || !apiToken || apiToken.startsWith('••')) {
    const settings = await c.env.DB.prepare(
      'SELECT account_tag, api_token FROM user_settings WHERE user_email = ?'
    ).bind(email).first();
    if (!accountTag) accountTag = (settings?.account_tag as string) || '';
    if (!apiToken || apiToken.startsWith('••')) apiToken = (settings?.api_token as string) || '';
  }

  if (!accountTag) return c.json({ ok: false, error: 'Account ID is required.' }, 400);
  if (!apiToken) return c.json({ ok: false, error: 'API token is required.' }, 400);

  // Query last 24h to discover all unique tunnel names
  const query = `query TestToken($accountTag: string!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        magicTransitTunnelTrafficAdaptiveGroups(
          limit: 10000
          filter: { datetime_geq: "${new Date(Date.now() - 86_400_000).toISOString()}", datetime_lt: "${new Date().toISOString()}" }
        ) {
          dimensions { tunnelName }
        }
      }
    }
  }`;

  try {
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { accountTag } }),
    });

    if (resp.status === 401 || resp.status === 403) {
      return c.json({ ok: false, error: 'Authentication failed — check that the API token is valid.' });
    }

    const data = await resp.json() as any;

    if (data.errors?.length) {
      const errMsg = data.errors.map((e: any) => e.message).join('; ');
      if (errMsg.includes('account') || errMsg.includes('permission') || errMsg.includes('authorization')) {
        return c.json({ ok: false, error: `Permission denied — ensure the token has "Account Analytics: Read" and access to account ${accountTag}.` });
      }
      return c.json({ ok: false, error: `GraphQL error: ${errMsg}` });
    }

    const accounts = data?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      return c.json({ ok: false, error: `No data for account ${accountTag} — check the Account ID and that the token has access to this account.` });
    }

    const rows = accounts[0]?.magicTransitTunnelTrafficAdaptiveGroups || [];
    const tunnelNames = [...new Set(rows.map((t: any) => t.dimensions?.tunnelName).filter(Boolean))].sort() as string[];
    return c.json({
      ok: true,
      message: `Token is valid. Found ${tunnelNames.length} tunnel(s) in the last 24 hours.`,
      tunnelNames,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: `Network error: ${err.message}` }, 502);
  }
});

// ─── Query Bandwidth ───
app.post('/api/query', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{
    start: string;
    end: string;
    direction?: 'ingress' | 'egress' | 'both';
    sourceCidr?: string;
    destCidr?: string;
    tunnelNames?: string[];
    accountTag?: string;
  }>();

  // Load user settings
  const settings = await c.env.DB.prepare(
    'SELECT account_tag, api_token FROM user_settings WHERE user_email = ?'
  ).bind(email).first();

  const accountTag = body.accountTag || (settings?.account_tag as string) || '';
  const apiToken = (settings?.api_token as string) || '';

  if (!accountTag) {
    return c.json({ error: 'Account tag is required. Configure it in Settings.' }, 400);
  }
  if (!apiToken) {
    return c.json({ error: 'API token is required. Configure it in Settings.' }, 400);
  }

  const direction = body.direction || 'both';

  const queryParams: BandwidthQuery = {
    accountTag,
    apiToken,
    start: body.start,
    end: body.end,
    direction,
    sourceCidr: body.sourceCidr,
    destCidr: body.destCidr,
  };

  const raw = await queryBandwidth(queryParams);

  if (raw.error) {
    return c.json({ error: raw.error }, 502);
  }

  // Per the CNI P95 guide:
  //   1. Filter to selected tunnels
  //   2. Sum bitRate across selected tunnels per 5-min interval
  //   3. Compute P95 on the aggregated (summed) values
  let ingressFiltered = raw.ingress;
  let egressFiltered = raw.egress;
  if (body.tunnelNames && body.tunnelNames.length > 0) {
    const tunnelSet = new Set(body.tunnelNames);
    ingressFiltered = raw.ingress.filter(p => p.tunnel && tunnelSet.has(p.tunnel));
    egressFiltered = raw.egress.filter(p => p.tunnel && tunnelSet.has(p.tunnel));
  }

  // Aggregate: sum across tunnels per time interval
  const ingressAgg = aggregateByTime(ingressFiltered);
  const egressAgg = aggregateByTime(egressFiltered);

  // Calculate P95 on the aggregated sums
  const ingressP95 = calculateP95(ingressAgg);
  const egressP95 = calculateP95(egressAgg);

  const result: BandwidthResult = {
    ingress: {
      series: ingressAgg,
      p95: ingressP95.p95,
      percentiles: ingressP95.percentiles,
      peakBps: ingressP95.peak,
      avgBps: ingressP95.avg,
    },
    egress: {
      series: egressAgg,
      p95: egressP95.p95,
      percentiles: egressP95.percentiles,
      peakBps: egressP95.peak,
      avgBps: egressP95.avg,
    },
    tunnels: raw.tunnels,
    interval: raw.interval,
    chunks: raw.chunks,
    queryParams: {
      start: body.start,
      end: body.end,
      direction,
      filters: {
        ...(body.sourceCidr ? { sourceCidr: body.sourceCidr } : {}),
        ...(body.destCidr ? { destCidr: body.destCidr } : {}),
        ...(body.tunnelNames ? { tunnelNames: body.tunnelNames.join(', ') } : {}),
      },
    },
  };

  // Save to history
  try {
    await c.env.DB.prepare(
      'INSERT INTO query_history (user_email, account_tag, direction, time_start, time_end, filters, p95_ingress_bps, p95_egress_bps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      email, accountTag, direction, body.start, body.end,
      JSON.stringify(result.queryParams.filters),
      ingressP95.p95, egressP95.p95,
    ).run();
  } catch (e) {
    console.error('Failed to save query history:', e);
  }

  return c.json(result);
});

// ─── Query History ───
app.get('/api/history', async (c) => {
  const email = c.get('userEmail');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM query_history WHERE user_email = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(email).all();
  return c.json({ history: rows.results });
});

// ─── Dashboard ───
app.get('/', (c) => {
  const userEmail = c.get('userEmail');
  return c.html(renderDashboard(userEmail));
});

app.get('*', (c) => c.redirect('/'));

export default {
  fetch: app.fetch,
};

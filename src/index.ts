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
  const rows = await c.env.DB.prepare(
    'SELECT id, account_tag, account_label, api_token, is_default FROM user_settings WHERE user_email = ? ORDER BY is_default DESC, account_label ASC'
  ).bind(email).all();

  const accounts = (rows.results || []).map((r: any) => ({
    id: r.id,
    account_tag: r.account_tag,
    account_label: r.account_label || r.account_tag,
    has_token: !!r.api_token,
    is_default: !!r.is_default,
  }));

  return c.json({ accounts });
});

app.post('/api/settings', async (c) => {
  const email = c.get('userEmail');
  const body = await c.req.json<{ account_tag?: string; account_label?: string; api_token?: string }>();

  const accountTag = (body.account_tag ?? '').trim();
  const accountLabel = (body.account_label ?? '').trim() || accountTag;
  if (!accountTag) return c.json({ ok: false, error: 'Account tag is required.' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT id, api_token FROM user_settings WHERE user_email = ? AND account_tag = ?'
  ).bind(email, accountTag).first();

  // If token is masked or empty, keep existing
  const apiToken = (body.api_token && !body.api_token.startsWith('••'))
    ? body.api_token
    : (existing?.api_token as string || '');

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE user_settings SET account_label = ?, api_token = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(accountLabel, apiToken, existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO user_settings (user_email, account_tag, account_label, api_token) VALUES (?, ?, ?, ?)'
    ).bind(email, accountTag, accountLabel, apiToken).run();
  }

  return c.json({ ok: true });
});

app.delete('/api/settings/:id', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare(
    'DELETE FROM user_settings WHERE id = ? AND user_email = ?'
  ).bind(id, email).run();
  return c.json({ ok: true });
});

app.put('/api/settings/:id/default', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  // Clear all defaults for this user, then set the chosen one
  await c.env.DB.prepare(
    'UPDATE user_settings SET is_default = 0 WHERE user_email = ?'
  ).bind(email).run();
  await c.env.DB.prepare(
    'UPDATE user_settings SET is_default = 1 WHERE id = ? AND user_email = ?'
  ).bind(id, email).run();
  return c.json({ ok: true });
});

app.get('/api/settings/:id/token', async (c) => {
  const email = c.get('userEmail');
  const id = parseInt(c.req.param('id'));
  const row = await c.env.DB.prepare(
    'SELECT account_tag, api_token FROM user_settings WHERE id = ? AND user_email = ?'
  ).bind(id, email).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ account_tag: row.account_tag, api_token: row.api_token });
});

// ─── Test Token ───
app.post('/api/test-token', async (c) => {
  const body = await c.req.json<{ account_tag?: string; api_token?: string }>();
  const email = c.get('userEmail');

  // Use provided values or fall back to saved settings
  let accountTag = body.account_tag || '';
  let apiToken = body.api_token || '';

  if (!apiToken || apiToken.startsWith('••')) {
    // Look up the saved token for the specific account
    if (accountTag) {
      const settings = await c.env.DB.prepare(
        'SELECT api_token FROM user_settings WHERE user_email = ? AND account_tag = ?'
      ).bind(email, accountTag).first();
      apiToken = (settings?.api_token as string) || '';
    } else {
      // No account tag — fall back to first saved account
      const settings = await c.env.DB.prepare(
        'SELECT account_tag, api_token FROM user_settings WHERE user_email = ? AND account_tag != \'\' LIMIT 1'
      ).bind(email).first();
      accountTag = (settings?.account_tag as string) || '';
      apiToken = (settings?.api_token as string) || '';
    }
  }

  if (!accountTag) return c.json({ ok: false, error: 'Account tag is required.' }, 400);
  if (!apiToken) return c.json({ ok: false, error: 'API token is required.' }, 400);

  // Test by querying the GraphQL API directly — this validates the token has
  // the right permissions and is scoped to the correct account in one step.
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
      return c.json({ ok: false, error: 'Authentication failed — check that the API token is valid and has "Account Analytics: Read" permission scoped to this account.' });
    }

    const data = await resp.json() as any;

    if (data.errors?.length) {
      const errMsg = data.errors.map((e: any) => e.message).join('; ');
      if (errMsg.includes('account') || errMsg.includes('permission') || errMsg.includes('authorization')) {
        return c.json({ ok: false, error: `Permission denied — ensure the token has "Account → Account Analytics → Read" and is scoped to account ${accountTag}.` });
      }
      return c.json({ ok: false, error: `GraphQL error: ${errMsg}` });
    }

    const accounts = data?.data?.viewer?.accounts;
    if (!accounts || accounts.length === 0) {
      return c.json({ ok: false, error: `No data for account ${accountTag} — check the Account Tag and that the token is scoped to this account.` });
    }

    const rows = accounts[0]?.magicTransitTunnelTrafficAdaptiveGroups || [];
    const tunnelNames = [...new Set(rows.map((t: any) => t.dimensions?.tunnelName).filter(Boolean))].sort() as string[];

    return c.json({
      ok: true,
      message: `✓ Token valid · Account Analytics accessible · ${tunnelNames.length} tunnel(s) found`,
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

  // Load the matching account's token
  const accountTag = body.accountTag || '';
  let apiToken = '';
  if (accountTag) {
    const settings = await c.env.DB.prepare(
      'SELECT api_token FROM user_settings WHERE user_email = ? AND account_tag = ?'
    ).bind(email, accountTag).first();
    apiToken = (settings?.api_token as string) || '';
  }

  if (!accountTag) {
    return c.json({ error: 'Account tag is required. Configure it in Settings.' }, 400);
  }
  if (!apiToken) {
    return c.json({ error: 'API token is required. Configure it in Settings.' }, 400);
  }

  const direction = body.direction || 'both';

  // 1. Always run the tunnel query for the real P95 (billing metric)
  const tunnelParams: BandwidthQuery = {
    accountTag,
    apiToken,
    start: body.start,
    end: body.end,
    direction,
  };

  const raw = await queryBandwidth(tunnelParams);

  if (raw.error) {
    return c.json({ error: raw.error }, 502);
  }

  // Filter to selected tunnels, then aggregate per interval
  let ingressFiltered = raw.ingress;
  let egressFiltered = raw.egress;
  if (body.tunnelNames && body.tunnelNames.length > 0) {
    const tunnelSet = new Set(body.tunnelNames);
    ingressFiltered = raw.ingress.filter(p => p.tunnel && tunnelSet.has(p.tunnel));
    egressFiltered = raw.egress.filter(p => p.tunnel && tunnelSet.has(p.tunnel));
  }

  const ingressAgg = aggregateByTime(ingressFiltered);
  const egressAgg = aggregateByTime(egressFiltered);
  const ingressP95 = calculateP95(ingressAgg);
  const egressP95 = calculateP95(egressAgg);

  // Group per-tunnel series
  function groupByTunnel(points: typeof ingressFiltered): Record<string, typeof ingressFiltered> {
    const map: Record<string, typeof ingressFiltered> = {};
    for (const p of points) {
      const t = p.tunnel || 'unknown';
      if (!map[t]) map[t] = [];
      map[t].push(p);
    }
    return map;
  }
  const ingressByTunnel = groupByTunnel(ingressFiltered);
  const egressByTunnel = groupByTunnel(egressFiltered);

  const result: BandwidthResult = {
    ingress: {
      series: ingressAgg,
      tunnelSeries: ingressByTunnel,
      p95: ingressP95.p95,
      percentiles: ingressP95.percentiles,
      peakBps: ingressP95.peak,
      avgBps: ingressP95.avg,
    },
    egress: {
      series: egressAgg,
      tunnelSeries: egressByTunnel,
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

  // 2. If CIDR filters are set, run a supplementary Network Analytics query
  if (body.sourceCidr || body.destCidr) {
    const cidrParams: BandwidthQuery = {
      accountTag,
      apiToken,
      start: body.start,
      end: body.end,
      direction,
      sourceCidr: body.sourceCidr,
      destCidr: body.destCidr,
    };

    const cidrRaw = await queryBandwidth(cidrParams);

    const filterDesc = [body.sourceCidr ? 'src: ' + body.sourceCidr : '', body.destCidr ? 'dst: ' + body.destCidr : ''].filter(Boolean).join(', ');

    if (cidrRaw.error) {
      result.cidrError = `CIDR subset query failed: ${cidrRaw.error}`;
    } else {
      const cidrIngressAgg = aggregateByTime(cidrRaw.ingress);
      const cidrEgressAgg = aggregateByTime(cidrRaw.egress);
      const cidrIngressP95 = calculateP95(cidrIngressAgg);
      const cidrEgressP95 = calculateP95(cidrEgressAgg);

      result.cidr = {
        ingress: {
          series: cidrIngressAgg,
          p95: cidrIngressP95.p95,
          percentiles: cidrIngressP95.percentiles,
          peakBps: cidrIngressP95.peak,
          avgBps: cidrIngressP95.avg,
        },
        egress: {
          series: cidrEgressAgg,
          p95: cidrEgressP95.p95,
          percentiles: cidrEgressP95.percentiles,
          peakBps: cidrEgressP95.peak,
          avgBps: cidrEgressP95.avg,
        },
        filter: filterDesc,
      };
    }
  }

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

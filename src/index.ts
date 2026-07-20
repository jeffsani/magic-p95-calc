import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, BandwidthQuery, BandwidthResult, RegionStats, TimeSeriesPoint } from './types';
import { REGION_CODES, REGION_LABELS } from './types';
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

// ─── Region Tags (per-account, shared) ───

// Fetch region tag map for an account
app.get('/api/region-tags', async (c) => {
  const accountTag = (c.req.query('account_tag') || '').trim();
  if (!accountTag) return c.json({ error: 'account_tag is required' }, 400);
  const rows = await c.env.DB.prepare(
    'SELECT tunnel_name, region_code FROM tunnel_region_tags WHERE account_tag = ?'
  ).bind(accountTag).all();
  const tags: Record<string, string> = {};
  for (const r of (rows.results || []) as any[]) tags[r.tunnel_name] = r.region_code;
  return c.json({ tags });
});

// On-demand reconciliation: prune tags for tunnels that no longer exist, return survivors
app.post('/api/region-tags/sync', async (c) => {
  const body = await c.req.json<{ account_tag?: string; tunnelNames?: string[] }>();
  const accountTag = (body.account_tag || '').trim();
  if (!accountTag) return c.json({ error: 'account_tag is required' }, 400);
  const tunnelNames = Array.isArray(body.tunnelNames) ? body.tunnelNames : [];

  const rows = await c.env.DB.prepare(
    'SELECT tunnel_name, region_code FROM tunnel_region_tags WHERE account_tag = ?'
  ).bind(accountTag).all();

  const current = new Set(tunnelNames);
  const stale: string[] = [];
  const tags: Record<string, string> = {};
  for (const r of (rows.results || []) as any[]) {
    if (current.has(r.tunnel_name)) {
      tags[r.tunnel_name] = r.region_code;
    } else {
      stale.push(r.tunnel_name);
    }
  }

  // Delete tags for removed tunnels/interconnects
  for (const name of stale) {
    await c.env.DB.prepare(
      'DELETE FROM tunnel_region_tags WHERE account_tag = ? AND tunnel_name = ?'
    ).bind(accountTag, name).run();
  }

  return c.json({ tags, pruned: stale });
});

// Upsert (or clear) a single tunnel's region tag
app.put('/api/region-tags', async (c) => {
  const body = await c.req.json<{ account_tag?: string; tunnel_name?: string; region_code?: string }>();
  const accountTag = (body.account_tag || '').trim();
  const tunnelName = (body.tunnel_name || '').trim();
  const regionCode = (body.region_code || '').trim();
  if (!accountTag || !tunnelName) return c.json({ error: 'account_tag and tunnel_name are required' }, 400);

  if (!regionCode) {
    // Empty region clears the tag
    await c.env.DB.prepare(
      'DELETE FROM tunnel_region_tags WHERE account_tag = ? AND tunnel_name = ?'
    ).bind(accountTag, tunnelName).run();
    return c.json({ ok: true, cleared: true });
  }

  if (!REGION_CODES.has(regionCode)) {
    return c.json({ error: `Unknown region code: ${regionCode}` }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO tunnel_region_tags (account_tag, tunnel_name, region_code, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(account_tag, tunnel_name)
     DO UPDATE SET region_code = excluded.region_code, updated_at = datetime('now')`
  ).bind(accountTag, tunnelName, regionCode).run();
  return c.json({ ok: true });
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

  const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' };
  const checks: { label: string; pass: boolean; detail: string }[] = [];
  let tunnelNames: string[] = [];
  let allPassed = true;

  // Check 1: Token Valid — account tokens can't be verified via /user/tokens/verify,
  // so we note that and validate via the API calls below.
  checks.push({ label: 'Token Valid', pass: true, detail: 'Skipped (account token) — will validate via API calls below' });

  // Check 2: Account Analytics — query tunnel data via GraphQL
  try {
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
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query, variables: { accountTag } }),
    });
    if (resp.status === 401 || resp.status === 403) {
      checks.push({ label: 'Account Analytics', pass: false, detail: 'Authentication failed — token invalid or missing "Account Analytics: Read"' });
      allPassed = false;
    } else {
      const data = await resp.json() as any;
      if (data.errors?.length) {
        checks.push({ label: 'Account Analytics', pass: false, detail: data.errors.map((e: any) => e.message).join('; ') });
        allPassed = false;
      } else {
        const accounts = data?.data?.viewer?.accounts;
        if (!accounts || accounts.length === 0) {
          checks.push({ label: 'Account Analytics', pass: false, detail: `No data — check Account Tag and token scope` });
          allPassed = false;
        } else {
          const rows = accounts[0]?.magicTransitTunnelTrafficAdaptiveGroups || [];
          tunnelNames = [...new Set(rows.map((t: any) => t.dimensions?.tunnelName).filter(Boolean))].sort() as string[];
          checks.push({ label: 'Account Analytics', pass: true, detail: `${tunnelNames.length} tunnel(s) found` });
        }
      }
    }
  } catch (err: any) {
    checks.push({ label: 'Account Analytics', pass: false, detail: `Network error: ${err.message}` });
    allPassed = false;
  }

  // Check 3: Account Rulesets
  try {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountTag}/rulesets`, { headers });
    const data = await resp.json() as any;
    if (data.success) {
      const count = data.result?.length || 0;
      checks.push({ label: 'Account Rulesets', pass: true, detail: `${count} ruleset(s) found` });
    } else {
      const msg = data.errors?.map((e: any) => e.message).join('; ') || 'Access denied';
      checks.push({ label: 'Account Rulesets', pass: false, detail: msg });
      allPassed = false;
    }
  } catch (err: any) {
    checks.push({ label: 'Account Rulesets', pass: false, detail: `Network error: ${err.message}` });
    allPassed = false;
  }

  // Check 4: Magic Firewall
  try {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountTag}/rulesets?kind=root&phase=magic_transit`, { headers });
    const data = await resp.json() as any;
    if (data.success && data.result?.length > 0) {
      const ruleCount = data.result[0]?.rules?.length || 0;
      checks.push({ label: 'Magic Firewall', pass: true, detail: `Ruleset found with ${ruleCount} rule(s)` });
    } else if (data.success) {
      checks.push({ label: 'Magic Firewall', pass: true, detail: 'No Magic Firewall ruleset configured' });
    } else {
      const msg = data.errors?.map((e: any) => e.message).join('; ') || 'Access denied';
      checks.push({ label: 'Magic Firewall', pass: false, detail: msg });
      allPassed = false;
    }
  } catch (err: any) {
    checks.push({ label: 'Magic Firewall', pass: false, detail: `Network error: ${err.message}` });
    allPassed = false;
  }

  return c.json({
    ok: allPassed,
    checks,
    summary: allPassed
      ? 'All checks passed — token has the required permissions.'
      : 'Some checks failed — review the results above.',
    tunnelNames,
  });
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
    sourceCidrFilter?: { include: string[]; exclude: string[] };
    destCidrFilter?: { include: string[]; exclude: string[] };
    tunnelNames?: string[];
    regions?: string[];
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

  // Load per-account region tag map (tunnel -> region code)
  const tagRows = await c.env.DB.prepare(
    'SELECT tunnel_name, region_code FROM tunnel_region_tags WHERE account_tag = ?'
  ).bind(accountTag).all();
  const regionTags: Record<string, string> = {};
  for (const r of (tagRows.results || []) as any[]) regionTags[r.tunnel_name] = r.region_code;

  // Build the effective tunnel set from selected tunnels ∩ selected regions
  const regionScope = (body.regions && body.regions.length > 0) ? new Set(body.regions) : null;
  const explicitTunnels = (body.tunnelNames && body.tunnelNames.length > 0) ? new Set(body.tunnelNames) : null;

  function tunnelAllowed(tunnel?: string): boolean {
    if (!tunnel) return false;
    if (explicitTunnels && !explicitTunnels.has(tunnel)) return false;
    if (regionScope) {
      const region = regionTags[tunnel];
      if (!region || !regionScope.has(region)) return false;
    }
    return true;
  }

  // Filter to selected tunnels/regions, then aggregate per interval
  let ingressFiltered = raw.ingress;
  let egressFiltered = raw.egress;
  if (explicitTunnels || regionScope) {
    ingressFiltered = raw.ingress.filter(p => tunnelAllowed(p.tunnel));
    egressFiltered = raw.egress.filter(p => tunnelAllowed(p.tunnel));
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

  // Build per-region breakdown by grouping tunnels by their region tag.
  // Tunnels without a tag fall into an "Untagged" bucket (shown last).
  const UNTAGGED = '__UNTAGGED__';
  function buildDirectionStats(series: TimeSeriesPoint[]) {
    const agg = aggregateByTime(series);
    const p95 = calculateP95(agg);
    return { series: agg, p95: p95.p95, percentiles: p95.percentiles, peakBps: p95.peak, avgBps: p95.avg };
  }
  const regionBuckets = new Map<string, { tunnels: Set<string>; ingress: TimeSeriesPoint[]; egress: TimeSeriesPoint[] }>();
  function bucketFor(code: string) {
    let b = regionBuckets.get(code);
    if (!b) { b = { tunnels: new Set(), ingress: [], egress: [] }; regionBuckets.set(code, b); }
    return b;
  }
  for (const [tunnel, pts] of Object.entries(ingressByTunnel)) {
    const code = regionTags[tunnel] || UNTAGGED;
    const b = bucketFor(code);
    b.tunnels.add(tunnel);
    b.ingress.push(...pts);
  }
  for (const [tunnel, pts] of Object.entries(egressByTunnel)) {
    const code = regionTags[tunnel] || UNTAGGED;
    const b = bucketFor(code);
    b.tunnels.add(tunnel);
    b.egress.push(...pts);
  }
  const perRegion: RegionStats[] = Array.from(regionBuckets.entries())
    .map(([code, b]) => ({
      region: code === UNTAGGED ? 'UNTAGGED' : code,
      regionLabel: code === UNTAGGED ? 'Untagged' : (REGION_LABELS[code] || code),
      tunnels: Array.from(b.tunnels).sort(),
      ingress: buildDirectionStats(b.ingress),
      egress: buildDirectionStats(b.egress),
    }))
    .sort((a, b) => {
      // Untagged always last, otherwise by label
      if (a.region === 'UNTAGGED') return 1;
      if (b.region === 'UNTAGGED') return -1;
      return a.regionLabel.localeCompare(b.regionLabel);
    });

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
    perRegion,
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
        ...(body.regions && body.regions.length ? { regions: body.regions.join(', ') } : {}),
      },
    },
  };

  // 2. If CIDR filters are set, run a supplementary Network Analytics query
  const hasStructuredCidr = !!(
    (body.sourceCidrFilter?.include?.length || body.sourceCidrFilter?.exclude?.length) ||
    (body.destCidrFilter?.include?.length || body.destCidrFilter?.exclude?.length)
  );
  if (body.sourceCidr || body.destCidr || hasStructuredCidr) {
    const cidrParams: BandwidthQuery = {
      accountTag,
      apiToken,
      start: body.start,
      end: body.end,
      direction,
      sourceCidr: body.sourceCidr,
      destCidr: body.destCidr,
      sourceCidrFilter: body.sourceCidrFilter,
      destCidrFilter: body.destCidrFilter,
    };

    const cidrRaw = await queryBandwidth(cidrParams);

    // Build filter description
    const filterParts: string[] = [];
    if (body.sourceCidrFilter) {
      if (body.sourceCidrFilter.include.length) filterParts.push('src+: ' + body.sourceCidrFilter.include.join(', '));
      if (body.sourceCidrFilter.exclude.length) filterParts.push('src−: ' + body.sourceCidrFilter.exclude.join(', '));
    } else if (body.sourceCidr) {
      filterParts.push('src: ' + body.sourceCidr);
    }
    if (body.destCidrFilter) {
      if (body.destCidrFilter.include.length) filterParts.push('dst+: ' + body.destCidrFilter.include.join(', '));
      if (body.destCidrFilter.exclude.length) filterParts.push('dst−: ' + body.destCidrFilter.exclude.join(', '));
    } else if (body.destCidr) {
      filterParts.push('dst: ' + body.destCidr);
    }
    const filterDesc = filterParts.join(', ');

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

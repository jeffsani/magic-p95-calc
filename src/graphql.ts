import type { BandwidthQuery, TimeSeriesPoint } from './types';

const CF_GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';

/**
 * Weekly chunk size in milliseconds.
 * The API returns max 10,000 rows per query. A week has 2,016 five-minute
 * intervals — with multiple tunnels this can grow, so 7 days is a safe chunk.
 * Per the CNI P95 guide: "Query one week at a time to stay within limits."
 */
const WEEK_MS = 7 * 24 * 3_600_000;

/**
 * Split a time range into weekly (or shorter) chunks for pagination.
 * Always uses datetimeFiveMinutes / bitRateFiveMinutes for maximum P95 accuracy.
 */
export function buildChunks(startMs: number, endMs: number): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const chunkEnd = Math.min(cursor + WEEK_MS, endMs);
    chunks.push({
      start: new Date(cursor).toISOString(),
      end: new Date(chunkEnd).toISOString(),
    });
    cursor = chunkEnd;
  }
  return chunks;
}

/**
 * Build and execute GraphQL queries for Magic Transit bandwidth data.
 *
 * Strategy (from the CNI P95 guide):
 *   1. Always query at 5-minute granularity for accurate P95
 *   2. Chunk the time range into weekly windows (≤10,000 rows per query)
 *   3. Query ingress and egress separately per chunk
 *   4. Merge all chunks client-side before P95 calculation
 *
 * Uses magicTransitNetworkAnalyticsAdaptiveGroups when CIDR filters are set,
 * otherwise magicTransitTunnelTrafficAdaptiveGroups for tunnel bandwidth.
 */
export async function queryBandwidth(params: BandwidthQuery): Promise<{
  ingress: TimeSeriesPoint[];
  egress: TimeSeriesPoint[];
  tunnels: string[];
  interval: string;
  chunks: number;
  error?: string;
}> {
  const startMs = new Date(params.start).getTime();
  const endMs = new Date(params.end).getTime();
  const direction = params.direction || 'both';
  const useNetworkAnalytics = !!(params.sourceCidr || params.destCidr);

  const chunks = buildChunks(startMs, endMs);
  const allIngress: TimeSeriesPoint[] = [];
  const allEgress: TimeSeriesPoint[] = [];
  const tunnelSet = new Set<string>();

  for (const chunk of chunks) {
    // Build direction-specific queries for this chunk
    const directions: Array<'ingress' | 'egress'> =
      direction === 'both' ? ['ingress', 'egress'] :
      [direction as 'ingress' | 'egress'];

    for (const dir of directions) {
      const result = await executeChunkQuery({
        accountTag: params.accountTag,
        apiToken: params.apiToken,
        start: chunk.start,
        end: chunk.end,
        direction: dir,
        sourceCidr: params.sourceCidr,
        destCidr: params.destCidr,
        useNetworkAnalytics,
      });

      if (result.error) {
        return {
          ingress: allIngress, egress: allEgress,
          tunnels: Array.from(tunnelSet).sort(),
          interval: '5min', chunks: chunks.length,
          error: `Chunk ${chunk.start} → ${chunk.end} [${dir}]: ${result.error}`,
        };
      }

      if (dir === 'ingress') {
        allIngress.push(...result.points);
      } else {
        allEgress.push(...result.points);
      }
      result.tunnels.forEach(t => tunnelSet.add(t));
    }
  }

  return {
    ingress: allIngress,
    egress: allEgress,
    tunnels: Array.from(tunnelSet).sort(),
    interval: '5min',
    chunks: chunks.length,
  };
}

/**
 * Execute a single GraphQL query for one chunk + one direction.
 */
async function executeChunkQuery(params: {
  accountTag: string;
  apiToken: string;
  start: string;
  end: string;
  direction: 'ingress' | 'egress';
  sourceCidr?: string;
  destCidr?: string;
  useNetworkAnalytics: boolean;
}): Promise<{ points: TimeSeriesPoint[]; tunnels: string[]; error?: string }> {
  const query = params.useNetworkAnalytics
    ? buildNetworkAnalyticsChunkQuery(params.accountTag, params.direction, params.start, params.end, params.sourceCidr, params.destCidr)
    : buildTunnelTrafficChunkQuery(params.accountTag, params.direction, params.start, params.end);

  const resp = await fetch(CF_GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { points: [], tunnels: [], error: `HTTP ${resp.status}: ${text.substring(0, 500)}` };
  }

  const data = await resp.json() as any;
  if (data.errors?.length) {
    return { points: [], tunnels: [], error: `GraphQL: ${JSON.stringify(data.errors)}` };
  }

  const accounts = data?.data?.viewer?.accounts?.[0];
  if (!accounts) {
    return { points: [], tunnels: [], error: 'No account data — check account tag and token.' };
  }

  const groups = accounts.traffic || [];
  const tunnels: string[] = [];

  const points: TimeSeriesPoint[] = groups.map((g: any) => {
    const tunnel = g.dimensions?.tunnelName || '';
    if (tunnel && !tunnels.includes(tunnel)) tunnels.push(tunnel);
    return {
      time: g.dimensions.datetimeFiveMinutes,
      bitRate: g.avg?.bitRateFiveMinutes || 0,
      bits: g.sum?.bits || 0,
      packets: g.sum?.packets || 0,
      tunnel: tunnel || undefined,
    };
  });

  return { points, tunnels };
}

/**
 * Build a single-direction tunnel traffic query for one chunk.
 * Per the CNI P95 guide: always use datetimeFiveMinutes / bitRateFiveMinutes
 * with limit 10000 and weekly chunks.
 */
function buildTunnelTrafficChunkQuery(accountTag: string, direction: 'ingress' | 'egress', start: string, end: string): string {
  return `{
    viewer {
      accounts(filter: { accountTag: "${accountTag}" }) {
        traffic: magicTransitTunnelTrafficAdaptiveGroups(
          limit: 10000
          filter: {
            datetime_geq: "${start}"
            datetime_lt: "${end}"
            direction: "${direction}"
          }
          orderBy: [datetimeFiveMinutes_ASC]
        ) {
          avg { bitRateFiveMinutes }
          sum { bits packets }
          dimensions { datetimeFiveMinutes tunnelName }
        }
      }
    }
  }`;
}

/**
 * Build a single-direction network analytics query with CIDR filters.
 */
function buildNetworkAnalyticsChunkQuery(
  accountTag: string,
  direction: 'ingress' | 'egress',
  start: string,
  end: string,
  sourceCidr?: string,
  destCidr?: string,
): string {
  const extraFilters: string[] = [];
  if (sourceCidr) extraFilters.push(`sourceIp: "${sourceCidr}"`);
  if (destCidr) extraFilters.push(`destinationIp: "${destCidr}"`);
  const extraStr = extraFilters.length ? ', ' + extraFilters.join(', ') : '';

  return `{
    viewer {
      accounts(filter: { accountTag: "${accountTag}" }) {
        traffic: magicTransitNetworkAnalyticsAdaptiveGroups(
          limit: 10000
          filter: {
            datetime_geq: "${start}"
            datetime_lt: "${end}"
            direction: "${direction}"${extraStr}
          }
          orderBy: [datetimeFiveMinutes_ASC]
        ) {
          avg { bitRateFiveMinutes }
          sum { bits packets }
          dimensions { datetimeFiveMinutes }
        }
      }
    }
  }`;
}

/**
 * Aggregate time-series by time bucket, summing across tunnels.
 * Returns one point per time interval with total bitRate across all tunnels.
 */
export function aggregateByTime(series: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const map = new Map<string, { bitRate: number; bits: number; packets: number; count: number }>();

  for (const p of series) {
    const existing = map.get(p.time);
    if (existing) {
      existing.bitRate += p.bitRate;
      existing.bits += p.bits;
      existing.packets += p.packets;
      existing.count++;
    } else {
      map.set(p.time, { bitRate: p.bitRate, bits: p.bits, packets: p.packets, count: 1 });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, v]) => ({
      time,
      bitRate: v.bitRate,
      bits: v.bits,
      packets: v.packets,
    }));
}

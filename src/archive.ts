import type { Env, TimeSeriesPoint, ArchiveData, ArchiveSettings, ArchiveStatus, ArchiveInfo } from './types';
import { queryBandwidth } from './graphql';

const WEEK_MS = 7 * 24 * 3_600_000;
const RETENTION_WEEKS = 14; // Use 14 weeks as safe live-data boundary (API keeps 16)

/**
 * Build the R2 key for a weekly archive object.
 */
function r2Key(accountTag: string, weekStart: string, weekEnd: string): string {
  const s = weekStart.slice(0, 10);
  const e = weekEnd.slice(0, 10);
  return `archives/${accountTag}/${s.slice(0, 4)}/${s}--${e}.json`;
}

/**
 * Get Monday-aligned week boundaries for a given timestamp.
 */
function weekBoundaries(ms: number): { start: number; end: number } {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  const start = monday.getTime();
  return { start, end: start + WEEK_MS };
}

/**
 * Generate the list of complete weeks between two timestamps.
 * Only includes weeks that have fully elapsed (end <= cutoff).
 */
function completeWeeks(fromMs: number, toMs: number): Array<{ start: string; end: string }> {
  const weeks: Array<{ start: string; end: string }> = [];
  const first = weekBoundaries(fromMs);
  let cursor = first.start;

  while (cursor + WEEK_MS <= toMs) {
    const end = cursor + WEEK_MS;
    weeks.push({
      start: new Date(cursor).toISOString(),
      end: new Date(end).toISOString(),
    });
    cursor = end;
  }
  return weeks;
}

/**
 * Archive a single week of data for an account.
 * Fetches from GraphQL, writes JSON to R2, upserts the D1 index.
 */
export async function archiveWeek(
  env: Env,
  accountTag: string,
  apiToken: string,
  weekStart: string,
  weekEnd: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await queryBandwidth({
    accountTag,
    apiToken,
    start: weekStart,
    end: weekEnd,
    direction: 'both',
  });

  if (result.error) {
    return { ok: false, error: result.error };
  }

  const data: ArchiveData = {
    account_tag: accountTag,
    period: { start: weekStart, end: weekEnd },
    tunnels: result.tunnels,
    ingress: result.ingress,
    egress: result.egress,
  };

  const json = JSON.stringify(data);
  const key = r2Key(accountTag, weekStart, weekEnd);

  await env.ARCHIVE.put(key, json, {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      accountTag,
      weekStart,
      weekEnd,
      tunnelCount: String(result.tunnels.length),
    },
  });

  const totalPoints = result.ingress.length + result.egress.length;

  await env.DB.prepare(
    `INSERT INTO archive_index (account_tag, week_start, week_end, r2_key, direction, tunnel_count, data_points, size_bytes)
     VALUES (?, ?, ?, ?, 'both', ?, ?, ?)
     ON CONFLICT(account_tag, week_start, direction)
     DO UPDATE SET week_end = excluded.week_end, r2_key = excluded.r2_key,
       tunnel_count = excluded.tunnel_count, data_points = excluded.data_points,
       size_bytes = excluded.size_bytes, created_at = datetime('now')`
  ).bind(accountTag, weekStart, weekEnd, key, result.tunnels.length, totalPoints, json.length).run();

  return { ok: true };
}

/**
 * Retrieve archived data for an account covering the given time range.
 * Fetches matching weeks from the D1 index, reads R2 objects, and merges.
 */
export async function getArchivedData(
  env: Env,
  accountTag: string,
  start: string,
  end: string,
): Promise<{ ingress: TimeSeriesPoint[]; egress: TimeSeriesPoint[]; tunnels: string[]; chunks: number }> {
  const rows = await env.DB.prepare(
    `SELECT r2_key, week_start, week_end FROM archive_index
     WHERE account_tag = ? AND week_end > ? AND week_start < ?
     ORDER BY week_start ASC`
  ).bind(accountTag, start, end).all();

  const allIngress: TimeSeriesPoint[] = [];
  const allEgress: TimeSeriesPoint[] = [];
  const tunnelSet = new Set<string>();
  let chunks = 0;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  for (const row of (rows.results || []) as any[]) {
    const obj = await env.ARCHIVE.get(row.r2_key);
    if (!obj) continue;

    const data: ArchiveData = await obj.json();
    chunks++;

    // Filter points to the requested range
    for (const p of data.ingress) {
      const t = new Date(p.time).getTime();
      if (t >= startMs && t < endMs) {
        allIngress.push(p);
        if (p.tunnel) tunnelSet.add(p.tunnel);
      }
    }
    for (const p of data.egress) {
      const t = new Date(p.time).getTime();
      if (t >= startMs && t < endMs) {
        allEgress.push(p);
        if (p.tunnel) tunnelSet.add(p.tunnel);
      }
    }
  }

  return {
    ingress: allIngress,
    egress: allEgress,
    tunnels: Array.from(tunnelSet).sort(),
    chunks,
  };
}

/**
 * Delete archives for an account, optionally only those older than a cutoff date.
 */
export async function deleteArchives(
  env: Env,
  accountTag: string,
  olderThan?: string,
): Promise<{ deleted: number }> {
  let rows;
  if (olderThan) {
    rows = await env.DB.prepare(
      'SELECT id, r2_key FROM archive_index WHERE account_tag = ? AND week_end <= ?'
    ).bind(accountTag, olderThan).all();
  } else {
    rows = await env.DB.prepare(
      'SELECT id, r2_key FROM archive_index WHERE account_tag = ?'
    ).bind(accountTag).all();
  }

  const entries = (rows.results || []) as any[];
  for (const entry of entries) {
    await env.ARCHIVE.delete(entry.r2_key);
    await env.DB.prepare('DELETE FROM archive_index WHERE id = ?').bind(entry.id).run();
  }

  return { deleted: entries.length };
}

/**
 * Purge expired archives based on each user's retention_months setting.
 * Uses the shortest retention period across all users who have archiving enabled.
 */
export async function purgeExpired(env: Env): Promise<{ purged: number }> {
  // Get the minimum retention_months across all enabled users
  const row = await env.DB.prepare(
    'SELECT MIN(retention_months) as min_months FROM archive_settings WHERE archiving_enabled = 1'
  ).first() as any;

  if (!row || !row.min_months || row.min_months <= 0) {
    return { purged: 0 };
  }

  const cutoffMs = Date.now() - (row.min_months * 30 * 24 * 3_600_000);
  const cutoff = new Date(cutoffMs).toISOString();

  const expired = await env.DB.prepare(
    'SELECT id, r2_key FROM archive_index WHERE week_end <= ?'
  ).bind(cutoff).all();

  const entries = (expired.results || []) as any[];
  for (const entry of entries) {
    await env.ARCHIVE.delete(entry.r2_key);
    await env.DB.prepare('DELETE FROM archive_index WHERE id = ?').bind(entry.id).run();
  }

  return { purged: entries.length };
}

/**
 * Get archive settings for a user.
 */
export async function getArchiveSettings(env: Env, email: string): Promise<ArchiveSettings> {
  const row = await env.DB.prepare(
    'SELECT archiving_enabled, retention_months FROM archive_settings WHERE user_email = ?'
  ).bind(email).first() as any;

  return {
    archiving_enabled: row ? !!row.archiving_enabled : false,
    retention_months: row?.retention_months ?? 12,
  };
}

/**
 * Update archive settings for a user.
 */
export async function updateArchiveSettings(
  env: Env,
  email: string,
  settings: Partial<ArchiveSettings>,
): Promise<void> {
  const existing = await env.DB.prepare(
    'SELECT id FROM archive_settings WHERE user_email = ?'
  ).bind(email).first();

  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    if (settings.archiving_enabled !== undefined) {
      updates.push('archiving_enabled = ?');
      values.push(settings.archiving_enabled ? 1 : 0);
    }
    if (settings.retention_months !== undefined) {
      updates.push('retention_months = ?');
      values.push(settings.retention_months);
    }
    updates.push("updated_at = datetime('now')");
    values.push(existing.id);

    await env.DB.prepare(
      `UPDATE archive_settings SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO archive_settings (user_email, archiving_enabled, retention_months) VALUES (?, ?, ?)'
    ).bind(
      email,
      settings.archiving_enabled ? 1 : 0,
      settings.retention_months ?? 12,
    ).run();
  }
}

/**
 * Get archive status for all accounts visible to a user.
 */
export async function getArchiveStatus(env: Env, email: string): Promise<ArchiveStatus[]> {
  const accounts = await env.DB.prepare(
    'SELECT account_tag, account_label, archive_opt_out FROM user_settings WHERE user_email = ?'
  ).bind(email).all();

  const statuses: ArchiveStatus[] = [];

  for (const acct of (accounts.results || []) as any[]) {
    const stats = await env.DB.prepare(
      `SELECT COUNT(*) as total_weeks,
              MIN(week_start) as oldest_week,
              MAX(week_end) as newest_week,
              SUM(size_bytes) as total_size
       FROM archive_index WHERE account_tag = ?`
    ).bind(acct.account_tag).first() as any;

    statuses.push({
      accountTag: acct.account_tag,
      accountLabel: acct.account_label || acct.account_tag,
      archiveOptOut: !!acct.archive_opt_out,
      totalWeeks: stats?.total_weeks || 0,
      oldestWeek: stats?.oldest_week || null,
      newestWeek: stats?.newest_week || null,
      totalSizeBytes: stats?.total_size || 0,
    });
  }

  return statuses;
}

/**
 * Run the weekly archiving cron job.
 * For each account with archiving enabled (and not opted out):
 *   1. Find the last archived week
 *   2. Archive any missing weeks up to (now - 1 week)
 *   3. Purge expired data
 */
export async function runArchiveCron(env: Env): Promise<{ archived: number; errors: string[] }> {
  // Find all distinct accounts that should be archived
  const accountRows = await env.DB.prepare(
    `SELECT DISTINCT us.account_tag, us.api_token
     FROM user_settings us
     INNER JOIN archive_settings ars ON us.user_email = ars.user_email
     WHERE ars.archiving_enabled = 1
       AND us.archive_opt_out = 0
       AND us.api_token != ''
       AND us.account_tag != ''`
  ).all();

  const errors: string[] = [];
  let archived = 0;

  const nowMs = Date.now();
  const maxBackfillMs = nowMs - (15 * WEEK_MS); // 15 weeks back (safe within 16-week retention)
  const archiveUpToMs = nowMs - WEEK_MS; // Don't archive the current incomplete week

  for (const acct of (accountRows.results || []) as any[]) {
    try {
      // Find the last archived week for this account
      const lastArchive = await env.DB.prepare(
        'SELECT MAX(week_end) as last_end FROM archive_index WHERE account_tag = ?'
      ).bind(acct.account_tag).first() as any;

      let startFromMs: number;
      if (lastArchive?.last_end) {
        startFromMs = new Date(lastArchive.last_end).getTime();
      } else {
        // First time: backfill from 15 weeks ago
        startFromMs = maxBackfillMs;
      }

      // Align to week boundary
      const aligned = weekBoundaries(startFromMs);
      let cursor = aligned.start;
      if (cursor < startFromMs) cursor += WEEK_MS; // Move to next week if we're past the start

      const weeks = completeWeeks(cursor, archiveUpToMs);

      for (const week of weeks) {
        // Check if already archived
        const exists = await env.DB.prepare(
          'SELECT id FROM archive_index WHERE account_tag = ? AND week_start = ?'
        ).bind(acct.account_tag, week.start).first();

        if (exists) continue;

        const result = await archiveWeek(env, acct.account_tag, acct.api_token, week.start, week.end);
        if (result.ok) {
          archived++;
        } else {
          errors.push(`${acct.account_tag} ${week.start}: ${result.error}`);
        }
      }
    } catch (err: any) {
      errors.push(`${acct.account_tag}: ${err.message}`);
    }
  }

  // Purge expired archives
  await purgeExpired(env);

  return { archived, errors };
}

/**
 * Determine the time range split for a query that may span archived and live data.
 * Returns the archive range (if any) and the live range.
 */
export function splitQueryRange(
  startMs: number,
  endMs: number,
): { archiveStart: number | null; archiveEnd: number | null; liveStart: number; liveEnd: number } {
  const retentionBoundaryMs = Date.now() - (RETENTION_WEEKS * WEEK_MS);

  if (startMs >= retentionBoundaryMs) {
    // Entirely within live data range
    return { archiveStart: null, archiveEnd: null, liveStart: startMs, liveEnd: endMs };
  }

  if (endMs <= retentionBoundaryMs) {
    // Entirely in archived range — still try live as fallback
    return { archiveStart: startMs, archiveEnd: endMs, liveStart: startMs, liveEnd: endMs };
  }

  // Spans both: archive covers older portion, live covers recent + 2-week overlap
  const overlapMs = 2 * WEEK_MS;
  const liveStart = Math.max(startMs, retentionBoundaryMs - overlapMs);

  return {
    archiveStart: startMs,
    archiveEnd: retentionBoundaryMs + overlapMs, // Extend archive into overlap zone
    liveStart,
    liveEnd: endMs,
  };
}

/**
 * Deduplicate time-series points by (time, tunnel) key.
 * When duplicates exist (from the overlap zone), keeps the point with higher bitRate
 * (live data is more accurate for recent periods).
 */
export function deduplicatePoints(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const map = new Map<string, TimeSeriesPoint>();
  for (const p of points) {
    const key = `${p.time}|${p.tunnel || ''}`;
    const existing = map.get(key);
    if (!existing || p.bitRate > existing.bitRate) {
      map.set(key, p);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
}

import type { TimeSeriesPoint, PercentilePoint } from './types';

/**
 * Calculate the Nth percentile from a list of values.
 * Uses the nearest-rank method: sort ascending, pick index = ceil(N/100 * count) - 1.
 */
export function percentile(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil((n / 100) * sorted.length) - 1);
  return sorted[idx];
}

/**
 * Calculate P95 and full percentile distribution from time-series data.
 * Returns the P95 value plus percentile values at 5% intervals for the bar chart.
 */
export function calculateP95(series: TimeSeriesPoint[]): {
  p95: number;
  percentiles: PercentilePoint[];
  peak: number;
  avg: number;
} {
  const values = series.map(p => p.bitRate).filter(v => v > 0);

  if (values.length === 0) {
    return { p95: 0, percentiles: [], peak: 0, avg: 0 };
  }

  const p95 = percentile(values, 95);
  const peak = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Generate percentile distribution at 5% intervals for the bar chart
  const percentiles: PercentilePoint[] = [];
  for (let pct = 5; pct <= 100; pct += 5) {
    percentiles.push({
      percentile: pct,
      value: percentile(values, pct),
    });
  }

  return { p95, percentiles, peak, avg };
}

/**
 * Format bits per second into a human-readable string.
 */
export function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return (bps / 1_000_000_000).toFixed(2) + ' Gbps';
  if (bps >= 1_000_000) return (bps / 1_000_000).toFixed(2) + ' Mbps';
  if (bps >= 1_000) return (bps / 1_000).toFixed(2) + ' Kbps';
  return bps.toFixed(0) + ' bps';
}

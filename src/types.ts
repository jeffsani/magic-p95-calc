export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

export interface UserSettings {
  account_tag: string;
  api_token: string;
}

export interface BandwidthQuery {
  accountTag: string;
  apiToken: string;
  start: string;
  end: string;
  direction?: 'ingress' | 'egress' | 'both';
  sourceCidr?: string;
  destCidr?: string;
}

export interface TimeSeriesPoint {
  time: string;
  bitRate: number;
  bits: number;
  packets: number;
  tunnel?: string;
}

export interface PercentilePoint {
  percentile: number;
  value: number;
}

export interface BandwidthResult {
  ingress: {
    series: TimeSeriesPoint[];
    p95: number;
    percentiles: PercentilePoint[];
    peakBps: number;
    avgBps: number;
  };
  egress: {
    series: TimeSeriesPoint[];
    p95: number;
    percentiles: PercentilePoint[];
    peakBps: number;
    avgBps: number;
  };
  tunnels: string[];
  interval: string;
  chunks: number;
  queryParams: {
    start: string;
    end: string;
    direction: string;
    filters: Record<string, string>;
  };
}

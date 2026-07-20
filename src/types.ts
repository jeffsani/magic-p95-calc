export interface Env {
  DB: D1Database;
  ARCHIVE: R2Bucket;
  ENVIRONMENT: string;
  CF_ACCESS_TEAM_DOMAIN: string;
}

export interface Region {
  code: string;
  label: string;
}

/** Region metadata tags available for tunnels/interconnects. */
export const REGIONS: Region[] = [
  { code: 'GLOB', label: 'Global (Geo Container)' },
  { code: 'NAMR', label: 'North America' },
  { code: 'EURP', label: 'Europe' },
  { code: 'ASIA', label: 'Asia' },
  { code: 'ANZL', label: 'AUS/NZ' },
  { code: 'CHNA', label: 'China' },
  { code: 'INDA', label: 'India' },
  { code: 'KREA', label: 'Korea' },
  { code: 'LAMR', label: 'South America' },
  { code: 'MEAF', label: 'Middle East & Africa' },
  { code: 'TAWN', label: 'Taiwan' },
];

export const REGION_CODES = new Set(REGIONS.map(r => r.code));
export const REGION_LABELS: Record<string, string> = Object.fromEntries(REGIONS.map(r => [r.code, r.label]));

export interface UserSettings {
  account_tag: string;
  api_token: string;
}

export interface CidrFilter {
  include: string[];
  exclude: string[];
}

export interface BandwidthQuery {
  accountTag: string;
  apiToken: string;
  start: string;
  end: string;
  direction?: 'ingress' | 'egress' | 'both';
  sourceCidr?: string;
  destCidr?: string;
  sourceCidrFilter?: CidrFilter;
  destCidrFilter?: CidrFilter;
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

export interface DirectionStats {
  series: TimeSeriesPoint[];
  tunnelSeries?: Record<string, TimeSeriesPoint[]>;
  p95: number;
  percentiles: PercentilePoint[];
  peakBps: number;
  avgBps: number;
}

export interface RegionStats {
  region: string;
  regionLabel: string;
  tunnels: string[];
  ingress: DirectionStats;
  egress: DirectionStats;
}

export interface ArchiveSettings {
  archiving_enabled: boolean;
  retention_months: number;
}

export interface ArchiveStatus {
  accountTag: string;
  accountLabel: string;
  archiveOptOut: boolean;
  totalWeeks: number;
  oldestWeek: string | null;
  newestWeek: string | null;
  totalSizeBytes: number;
}

export interface ArchiveInfo {
  archivedFrom: string | null;
  archivedTo: string | null;
  liveFrom: string;
  liveTo: string;
  archiveChunks: number;
}

export interface ArchiveData {
  account_tag: string;
  period: { start: string; end: string };
  tunnels: string[];
  ingress: TimeSeriesPoint[];
  egress: TimeSeriesPoint[];
}

export interface BandwidthResult {
  ingress: DirectionStats;
  egress: DirectionStats;
  cidr?: {
    ingress: DirectionStats;
    egress: DirectionStats;
    filter: string;
  };
  cidrError?: string;
  perRegion?: RegionStats[];
  tunnels: string[];
  interval: string;
  chunks: number;
  archiveInfo?: ArchiveInfo;
  queryParams: {
    start: string;
    end: string;
    direction: string;
    filters: Record<string, string>;
  };
}

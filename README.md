# Magic Transit P95 Bandwidth Calculator

A Cloudflare Workers dashboard that queries Magic Transit network analytics via GraphQL, visualizes ingress/egress bandwidth time-series, and calculates 95th percentile billing metrics.

## Features

- **4-panel Grafana-style dashboard**: Ingress/egress bit rate time-series + percentile distribution charts
- **95th percentile calculation**: Accurate P95 from adaptively-sampled data with optimized query intervals
- **Rich filtering**: Direction (ingress/egress/both), source/destination CIDR, tunnel name, custom time ranges
- **Adaptive query optimization**: Automatically selects finest interval (5min/15min/1h) based on time range to maximize data points within GraphQL API limits
- **Dark/light theme** with Cloudflare branding

## Tech Stack

- **Cloudflare Worker** (TypeScript + Hono)
- **D1** for per-user settings and query history
- **Cloudflare Access** for authentication
- **Chart.js** + **Tailwind CSS** for the dashboard UI

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create D1 database
```bash
npx wrangler d1 create p95-calc-db
```
Copy the database ID into `wrangler.toml`.

### 3. Initialize schema
```bash
npm run db:init          # local
npm run db:init:remote   # production
```

### 4. Configure secrets
No secrets are needed in wrangler — users provide their own Cloudflare API token via the Settings panel in the UI.

### 5. Deploy
```bash
npm run deploy
```

## Local Development
```bash
npm run dev
```

## API Token Requirements

Users need a Cloudflare API token with **Account Analytics: Read** permission. Create one at https://dash.cloudflare.com/profile/api-tokens.

## GraphQL Datasets Used

- `magicTransitTunnelTrafficAdaptiveGroups` — tunnel-level bandwidth (bit rates, bits, packets)
- `magicTransitNetworkAnalyticsAdaptiveGroups` — packet-level analytics with source/destination IP filtering

## Author

Jeff Sani — sani@cloudflare.com

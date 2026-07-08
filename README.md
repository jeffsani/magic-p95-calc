# Magic Transit P95 Bandwidth Calculator

A self-service Cloudflare Workers dashboard for Magic Transit customers to visualize ingress/egress bandwidth across all CNI tunnels and interconnects, and calculate the **95th percentile (P95)** bandwidth — the standard billing metric for Magic Transit.

The Cloudflare dashboard does not natively display a P95 bandwidth figure. This tool automates the process described in the [Cloudflare P95 bandwidth guide](https://developers.cloudflare.com/magic-transit/analytics/query-bandwidth/): querying 5-minute interval traffic data, aggregating across tunnels, and computing P95.

## What It Does

1. **Queries the Cloudflare GraphQL Analytics API** at 5-minute granularity for maximum P95 accuracy
2. **Automatically chunks month-long queries** into weekly windows to stay within the 10,000 row API limit
3. **Sums bandwidth across all CNI tunnels** per 5-minute interval, then computes the 95th percentile
4. **Renders an interactive dashboard** with time-series charts, percentile distributions, and summary cards

## Features

- **P95 calculation**: Accurate 95th percentile using the nearest-rank method across 5-minute intervals
- **4-panel chart dashboard**: Ingress/egress time-series + percentile distribution bar charts
- **Tunnel/interconnect filter**: Query all tunnels or filter to a specific CNI connection
- **Direction filter**: Ingress, egress, or both
- **CIDR filtering**: Filter by source or destination IP prefix
- **Time range presets**: 1h, 6h, 24h, 2d, 7d, 14d, 30d, or custom date range
- **Multi-user**: Each user stores their own account tag and API token (persisted in D1)
- **Token validation**: Test Connection button verifies API permissions and discovers available tunnels
- **Dark/light theme** with Cloudflare branding
- **Weekly chunking**: Automatically splits large queries into weekly API calls, merges results client-side

## How P95 Works

P95 means **95% of your 5-minute intervals had bandwidth at or below this value** — only 5% of intervals exceeded it. This is the standard billing metric for Magic Transit.

The tool:
1. Fetches `bitRateFiveMinutes` (avg bit rate per 5-min bucket) for each tunnel
2. Sums across all tunnels per interval to get aggregate bandwidth
3. Sorts all values and takes the value at the 95th percentile index

## Setup From Scratch

### Prerequisites

- A **Cloudflare account** with Magic Transit or Magic WAN (Enterprise plan)
- **Node.js** 18+ and **npm**
- **Wrangler CLI** (`npm install -g wrangler`) — authenticated with `wrangler login`
- A **custom domain** (optional) managed by Cloudflare, for deploying behind Access

### Step 1: Clone and install

```bash
git clone <this-repo>
cd p95-calculator
npm install
```

### Step 2: Create a D1 database

```bash
npx wrangler d1 create p95-calc-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "p95-calc-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### Step 3: Initialize the database schema

```bash
# For production:
npx wrangler d1 execute p95-calc-db --remote --file=./schema.sql

# For local dev:
npx wrangler d1 execute p95-calc-db --local --file=./schema.sql
```

### Step 4: Configure your domain (optional)

If you want the tool on a custom domain (e.g., `p95.example.com`), add a route in `wrangler.toml`:

```toml
routes = [
  { pattern = "p95.example.com/*", zone_name = "example.com" }
]
```

Make sure the domain has a DNS record (e.g., a proxied AAAA record to `100::`) pointing to Cloudflare.

### Step 5: Set up Cloudflare Access (recommended)

To protect the dashboard behind authentication:

1. Go to **Cloudflare Zero Trust** → **Access** → **Applications**
2. Create a new **Self-hosted** application
3. Set the **Application domain** to your custom domain (e.g., `p95.example.com`)
4. Add an **Identity Provider** (e.g., Google, GitHub, Okta, OneLogin)
5. Create an **Access Policy** to control who can access the tool (e.g., allow emails ending in `@yourcompany.com`)

The worker reads the `CF_ACCESS_TEAM_DOMAIN` variable from `wrangler.toml` to identify your Zero Trust team:

```toml
[vars]
ENVIRONMENT = "production"
CF_ACCESS_TEAM_DOMAIN = "your-team-name"   # from <your-team-name>.cloudflareaccess.com
```

### Step 6: Deploy

```bash
npm run deploy
```

### Step 7: Create an API token

Each user creates their own token at https://dash.cloudflare.com/profile/api-tokens:

1. Click **Create Token**
2. Use the **Custom Token** template
3. Add permission: **Account** → **Account Analytics** → **Read**
4. Scope it to the account(s) you want to query
5. Copy the token

Then in the dashboard, click the ⚙️ gear icon and enter:
- **Account Tag**: The hex string for your account (visible in the dashboard URL, e.g., `7a0c39354edd897a1a98f6c7e50c6873`)
- **API Token**: The token you just created
- Click **Test Connection** to verify permissions and discover tunnels
- Click **Save Settings**

## Local Development

Create a `.dev.vars` file to bypass Access auth locally:

```
ENVIRONMENT=development
```

Then run:

```bash
npx wrangler d1 execute p95-calc-db --local --file=./schema.sql   # first time only
npm run dev
```

The dashboard will be available at `http://localhost:8787` without authentication.

## Tech Stack

- **Cloudflare Worker** — TypeScript + [Hono](https://hono.dev) framework
- **D1** — SQLite database for per-user settings and query history
- **Cloudflare Access** — Zero Trust authentication (JWT-based)
- **Chart.js** — Time-series and bar charts
- **Tailwind CSS** — Styling via CDN

## GraphQL Datasets

| Dataset | Used For |
|---------|----------|
| `magicTransitTunnelTrafficAdaptiveGroups` | Tunnel-level bandwidth (bit rates per 5-min interval, bits, packets). Primary dataset for P95 calculation. |
| `magicTransitNetworkAnalyticsAdaptiveGroups` | Packet-level analytics with source/destination IP CIDR filtering. Used when CIDR filters are applied. |

**API limits**: 10,000 rows per query, 300 queries per 5 minutes. The tool automatically chunks time ranges into weekly windows and queries each direction separately to stay within limits.

**Data retention**: Network Analytics data is retained for **16 weeks**.

## Project Structure

```
src/
├── index.ts      # Hono app — API routes, middleware, dashboard serving
├── auth.ts       # Cloudflare Access JWT authentication middleware
├── graphql.ts    # GraphQL query builder with weekly chunking
├── p95.ts        # 95th percentile calculation (nearest-rank method)
├── types.ts      # TypeScript interfaces
└── ui.ts         # Single-page dashboard HTML (Tailwind + Chart.js)
schema.sql        # D1 database schema
wrangler.toml     # Worker configuration
```

## Author

Jeff Sani — sani@cloudflare.com

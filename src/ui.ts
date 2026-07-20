function infoTip(text: string): string {
  return `<span class="info-tip" tabindex="0" role="button" aria-label="More info"><span class="info-ico">i</span><span class="info-bubble">${text}</span></span>`;
}

export function renderDashboard(userEmail: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic P95 Analytics</title>
  <link rel="icon" href="https://www.cloudflare.com/favicon.ico" type="image/x-icon">
  <script>
    var _origWarn = console.warn;
    console.warn = function() {
      if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].indexOf('cdn.tailwindcss.com') >= 0) return;
      return _origWarn.apply(console, arguments);
    };
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: {
            cf: { orange: '#F6821F', dark: '#0D1117', navy: '#1B2432', gray: '#8B949E', surface: '#161B22', border: '#30363D' },
          }
        }
      }
    }
  </script>
  <style>
    :root, [data-theme="dark"] {
      --page-bg: #0D1117; --surface: #161B22; --border: #30363D; --muted: #8B949E;
      --text-primary: #E5E7EB; --text-strong: #FFFFFF; --input-bg: #0D1117;
      --header-bg: rgba(22,27,34,0.85); --scrollbar: #30363D;
    }
    [data-theme="light"] {
      --page-bg: #F9FAFB; --surface: #FFFFFF; --border: #E5E7EB; --muted: #6B7280;
      --text-primary: #374151; --text-strong: #111827; --input-bg: #F3F4F6;
      --header-bg: rgba(255,255,255,0.85); --scrollbar: #D1D5DB;
    }
    body { background: var(--page-bg); color: var(--text-primary); transition: background 0.2s, color 0.2s; }
    * { scrollbar-width: thin; scrollbar-color: var(--scrollbar) transparent; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 3px; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .spinner { border: 2px solid var(--border); border-top-color: #F6821F; border-radius: 50%; width: 18px; height: 18px; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    [data-theme="light"] .text-white { color: var(--text-strong) !important; }
    [data-theme="light"] .bg-cf-dark { background-color: var(--input-bg) !important; }
    [data-theme="light"] .bg-cf-surface { background-color: var(--surface) !important; }
    [data-theme="light"] .border-cf-border { border-color: var(--border) !important; }
    [data-theme="light"] .text-cf-gray { color: var(--muted) !important; }
    [data-theme="light"] select, [data-theme="light"] input { background-color: var(--input-bg); color: var(--text-primary); border-color: var(--border); }
    [data-theme="light"] header { background: var(--header-bg) !important; }
    .theme-toggle { display: flex; align-items: center; padding: 2px; border-radius: 999px; background: var(--input-bg); border: 1px solid var(--border); cursor: pointer; }
    .theme-toggle-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; }
    .theme-toggle-icon.active { background: #F6821F; color: #FFF; }
    .theme-toggle-icon:not(.active) { color: var(--muted); }
    .p95-highlight { background: linear-gradient(135deg, rgba(246,130,31,0.12), rgba(246,130,31,0.04)); border: 1px solid rgba(246,130,31,0.3); border-radius: 12px; }
    .stat-card { text-align: center; padding: 1rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #F6821F; }
    .stat-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
    .filter-chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.15s; border: 1px solid var(--border); background: var(--input-bg); color: var(--text-primary); }
    .filter-chip.active { border-color: #F6821F; background: rgba(246,130,31,0.12); color: #F6821F; }
    .filter-chip:hover { border-color: rgba(246,130,31,0.5); }
    .info-tip { position: relative; display: inline-flex; vertical-align: middle; margin-left: 4px; outline: none; }
    .info-ico { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--border); color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-style: normal; line-height: 1; cursor: help; transition: all 0.15s; }
    .info-tip:hover .info-ico, .info-tip:focus .info-ico { color: #F6821F; border-color: #F6821F; }
    .info-bubble { display: none; position: absolute; z-index: 60; top: calc(100% + 6px); left: 0; width: 240px; padding: 8px 10px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 4px 16px rgba(0,0,0,0.35); font-size: 11px; font-weight: 400; line-height: 1.45; color: var(--text-primary); text-transform: none; letter-spacing: normal; white-space: normal; }
    .info-tip:hover .info-bubble, .info-tip:focus .info-bubble, .info-tip:focus-within .info-bubble { display: block; }
    @media print {
      header, .no-print { display: none !important; }
      body { background: #fff; color: #000; }
      .panel { border: 1px solid #ccc; break-inside: avoid; }
    }
  </style>
</head>
<body class="font-sans min-h-screen">
  <!-- Header -->
  <header class="sticky top-0 z-40 backdrop-blur-md border-b border-cf-border" style="background:var(--header-bg)">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="w-7 h-7 flex-shrink-0" viewBox="0 0 64 64" fill="none"><path d="M44.048 43.904H19.2l-1.28-4.352L41.216 36l3.84 3.072-.512 3.84-.496.992z" fill="#F6821F"/><path d="M45.056 43.392l-.512-1.984c-.256-.768-.128-1.536.384-2.048.384-.512.96-.768 1.664-.768h.64l1.024.128c2.304.256 4.864.384 7.552.384h.512c.256 0 .384-.128.512-.256.128-.256.128-.512 0-.768-.896-2.944-3.712-5.056-6.912-5.184l-2.048-.128-.768-1.536c-2.432-5.184-7.68-8.512-13.504-8.512-6.656 0-12.416 4.48-14.08 10.88l-.512 2.048-2.048.256c-3.84.512-6.784 3.84-6.784 7.808 0 .384 0 .768.128 1.152 0 .256.256.384.512.384h34.112c.256 0 .512-.256.64-.512l.128-.384c.128-.384.128-.64.128-.896-.128-.768-.384-1.536-.768-1.984z" fill="#FBAD41"/></svg>
        <div>
          <h1 class="text-base font-semibold leading-tight" style="color:var(--text-strong)">Magic P95 Analytics</h1>
          <p class="text-[11px] text-cf-gray leading-tight mt-0.5">Query network analytics, visualize ingress/egress bandwidth, and calculate 95th percentile</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button onclick="toggleAbout()" class="text-xs text-cf-gray hover:text-cf-orange flex items-center gap-1 no-print" title="About">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <button onclick="toggleSettings()" class="text-xs text-cf-gray hover:text-cf-orange flex items-center gap-1 no-print" title="Settings">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <span id="user-email" class="text-xs text-cf-gray hidden sm:inline">${userEmail}</span>
        <div class="theme-toggle no-print" onclick="toggleTheme()">
          <span id="theme-sun" class="theme-toggle-icon"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg></span>
          <span id="theme-moon" class="theme-toggle-icon active"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg></span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6 space-y-4">

    <!-- Settings Panel (collapsible) -->
    <div id="settings-panel" class="panel fade-in p-5 space-y-4 no-print hidden">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Accounts</h2>
        <div class="flex items-center gap-2">
          <button onclick="showAddAccount()" class="px-3 py-1 text-xs font-semibold rounded-lg border border-cf-border text-cf-gray hover:border-cf-orange hover:text-cf-orange">+ Add Account</button>
          <button onclick="toggleSettings()" class="text-cf-gray hover:text-cf-orange" title="Close settings">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Saved accounts list -->
      <div id="accounts-list" class="space-y-2"></div>

      <!-- Add/Edit account form (hidden by default) -->
      <div id="account-form" class="hidden border border-cf-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold" style="color:var(--text-strong)" id="account-form-title">Add Account</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Label <span class="text-[10px]">(optional)</span>${infoTip('A friendly name for this account. Shown in the account selector to help you tell accounts apart. Optional.')}</label>
            <input type="text" id="cfg-account-label" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. Production">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">Account Tag${infoTip('Your Cloudflare Account ID (32-character hex string). Find it on the account home page or in the dashboard URL.')}</label>
            <input type="text" id="cfg-account-tag" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. 7a0c39354edd897a1a98f6c7e50c6873">
          </div>
          <div>
            <label class="block text-xs font-medium text-cf-gray mb-1">API Token <span class="text-[10px]">(Account Analytics: Read)</span>${infoTip('A Cloudflare API token scoped with \'Account Analytics: Read\' permission. Used to query network analytics for this account. Stored securely and never displayed after saving.')}</label>
            <input type="password" id="cfg-api-token" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-2 text-sm text-white" placeholder="Bearer token">
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <button onclick="saveAccount()" class="px-4 py-1.5 bg-cf-orange text-black text-xs font-semibold rounded-lg hover:opacity-90">Save Account</button>
          <button onclick="testToken()" class="px-4 py-1.5 border border-cf-border text-cf-gray text-xs font-semibold rounded-lg hover:border-cf-orange hover:text-cf-orange">Test Token</button>
          <button onclick="hideAccountForm()" class="px-4 py-1.5 text-xs text-cf-gray hover:text-white">Cancel</button>
          <span id="settings-status" class="text-xs text-cf-gray self-center"></span>
        </div>
        <div id="token-check-results" class="hidden mt-3 rounded-lg border border-cf-border p-4 text-sm" style="background:var(--surface)"></div>
      </div>

      <!-- Active account selector (shown in filter area) -->
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-cf-gray">Active Account:${infoTip('The account whose analytics are queried. Add accounts above, then choose which one is active here.')}</label>
        <select id="active-account-select" onchange="onAccountSelected()" class="bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="">No accounts configured</option>
        </select>
      </div>
    </div>

    <!-- Active Account Bar -->
    <div id="active-account-bar" class="hidden">
      <div onclick="toggleSettings()" title="Open account settings" class="panel fade-in px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-cf-orange transition-colors">
        <svg class="w-4 h-4 text-cf-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <div>
          <span class="text-xs font-medium text-cf-gray">Active Account: </span>
          <span class="text-xs font-semibold" style="color:var(--text-strong)" id="active-account-name"></span>
          <span class="text-[10px] text-cf-gray font-mono ml-2" id="active-account-tag-display"></span>
        </div>
      </div>
    </div>

    <!-- Filters Panel (collapsible) -->
    <div class="panel fade-in p-5 no-print">
      <div class="flex items-center justify-between cursor-pointer" onclick="toggleFilters()">
        <div class="flex items-center gap-2">
          <svg id="filters-chevron" class="w-4 h-4 text-cf-gray transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Query Filters</h2>
        </div>
        <button onclick="event.stopPropagation(); runQuery()" id="query-btn" class="px-5 py-2 bg-cf-orange text-black text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          Run Query
        </button>
      </div>
      <div id="filters-body" class="space-y-4 mt-4">

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Direction -->
        <div>
          <label class="block text-xs font-medium text-cf-gray mb-1">Direction${infoTip('Which traffic direction to analyze. Ingress is traffic entering your network; egress is traffic leaving it. Both shows each separately.')}</label>
          <div class="flex gap-1">
            <span class="filter-chip active" data-dir="both" onclick="setDirection(this)">Both</span>
            <span class="filter-chip" data-dir="ingress" onclick="setDirection(this)">Ingress</span>
            <span class="filter-chip" data-dir="egress" onclick="setDirection(this)">Egress</span>
          </div>
        </div>

        <!-- Source / Destination CIDR -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <label class="text-xs font-medium text-cf-gray">Source CIDR(s)${infoTip('Limit results to traffic originating from these source IP ranges (CIDR notation). Add one or more; leave empty to include all sources.')}</label>
            <button type="button" onclick="addCidrRow('source')" class="text-[10px] text-cf-orange hover:underline">+ Add</button>
          </div>
          <div id="source-cidr-list" class="space-y-1.5 mb-2"></div>

          <div class="flex items-center gap-2 mb-1">
            <label class="text-xs font-medium text-cf-gray">Destination CIDR(s)${infoTip('Limit results to traffic destined for these IP ranges (CIDR notation). Add one or more; leave empty to include all destinations.')}</label>
            <button type="button" onclick="addCidrRow('dest')" class="text-[10px] text-cf-orange hover:underline">+ Add</button>
          </div>
          <div id="dest-cidr-list" class="space-y-1.5"></div>
        </div>

        <!-- Tunnel / Interconnect Multi-Select -->
        <div id="tunnel-filter-wrap">
          <label class="block text-xs font-medium text-cf-gray mb-1">Tunnels / Interconnects <span class="text-[10px] text-cf-gray">(set an optional region tag per tunnel for a regional traffic breakdown)</span>${infoTip('Select which tunnels or interconnects to include in the P95 calculation. Open the dropdown to assign an optional region tag to each tunnel; tagging enables the per-region traffic breakdown below.')}</label>
          <div class="relative">
            <button type="button" id="tunnel-select-btn" onclick="toggleTunnelDropdown()" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white text-left flex justify-between items-center">
              <span id="tunnel-select-label">All Tunnels</span>
              <svg class="w-3 h-3 text-cf-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="tunnel-dropdown" class="hidden absolute z-50 mt-1 bg-cf-dark border border-cf-border rounded-lg shadow-lg max-h-60 overflow-y-auto" style="min-width:100%;width:max-content;max-width:420px">
              <div class="flex items-center justify-between gap-3 px-3 py-2 border-b border-cf-border sticky top-0 bg-cf-dark">
                <label class="flex items-center gap-2 cursor-pointer text-sm text-white">
                  <input type="checkbox" id="tunnel-select-all" checked onchange="toggleAllTunnels(this.checked)" class="accent-orange-500">
                  <span class="font-medium">Select All</span>
                </label>
                <select id="bulk-region-select" onchange="setRegionForSelected(this)" onclick="event.stopPropagation()" class="bg-cf-dark border border-cf-border rounded px-1 py-0.5 text-[11px] text-white"></select>
              </div>
              <div id="tunnel-options"></div>
            </div>
          </div>

          <!-- Region Multi-Select (only shown when tags exist) -->
          <div id="region-filter-wrap" class="hidden mt-2">
            <label class="block text-xs font-medium text-cf-gray mb-1">Regions${infoTip('Filter results to tunnels tagged with the selected regions. Only appears once you have assigned region tags to tunnels.')}</label>
            <div class="relative">
              <button type="button" id="region-select-btn" onclick="toggleRegionDropdown()" class="w-full bg-cf-dark border border-cf-border rounded-lg px-3 py-1.5 text-sm text-white text-left flex justify-between items-center">
                <span id="region-select-label">All Regions</span>
                <svg class="w-3 h-3 text-cf-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div id="region-dropdown" class="hidden absolute z-50 mt-1 w-full bg-cf-dark border border-cf-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div id="region-options"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Time Range Presets -->
        <div class="lg:col-span-2">
          <label class="block text-xs font-medium text-cf-gray mb-1">Time Range${infoTip('The time window to analyze. Presets are relative to now; choose Custom to pick exact start and end times (up to 16 weeks back).')}</label>
          <div class="flex flex-wrap gap-1">
            <span class="filter-chip" data-range="1h" onclick="setTimeRange(this)">1h</span>
            <span class="filter-chip" data-range="6h" onclick="setTimeRange(this)">6h</span>
            <span class="filter-chip active" data-range="24h" onclick="setTimeRange(this)">24h</span>
            <span class="filter-chip" data-range="48h" onclick="setTimeRange(this)">2d</span>
            <span class="filter-chip" data-range="7d" onclick="setTimeRange(this)">7d</span>
            <span class="filter-chip" data-range="14d" onclick="setTimeRange(this)">14d</span>
            <span class="filter-chip" data-range="30d" onclick="setTimeRange(this)">30d</span>
            <span class="filter-chip" data-range="custom" onclick="setTimeRange(this)">Custom</span>
          </div>
        </div>

        <!-- Custom Date Pickers -->
        <div id="custom-dates" class="lg:col-span-2 hidden">
          <label class="block text-xs font-medium text-cf-gray mb-1">Custom Range <span class="text-[10px] text-cf-gray">(max 16 weeks back)</span>${infoTip('Pick exact start and end date/times. Analytics data is retained for up to 16 weeks in the past.')}</label>
          <div class="flex gap-2">
            <input type="datetime-local" id="custom-start" class="flex-1 bg-cf-dark border border-cf-border rounded-lg px-2 py-1.5 text-xs text-white">
            <span class="text-cf-gray self-center text-xs">to</span>
            <input type="datetime-local" id="custom-end" class="flex-1 bg-cf-dark border border-cf-border rounded-lg px-2 py-1.5 text-xs text-white">
          </div>
        </div>

      </div>

      <!-- Status -->
      <div id="query-status" class="text-xs text-cf-gray hidden"></div>
      </div>
    </div>

    <!-- P95 Summary Cards -->
    <div id="p95-summary" class="hidden">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p95-highlight stat-card fade-in dir-ingress">
          <div class="stat-value" id="p95-ingress">—</div>
          <div class="stat-label">P95 Ingress</div>
        </div>
        <div class="p95-highlight stat-card fade-in dir-egress">
          <div class="stat-value" id="p95-egress">—</div>
          <div class="stat-label">P95 Egress</div>
        </div>
        <div class="panel stat-card fade-in dir-ingress">
          <div class="stat-value" id="peak-ingress" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Peak Ingress</div>
        </div>
        <div class="panel stat-card fade-in dir-egress">
          <div class="stat-value" id="peak-egress" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Peak Egress</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div class="panel stat-card fade-in dir-ingress">
          <div class="stat-value" id="avg-ingress" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Avg Ingress</div>
        </div>
        <div class="panel stat-card fade-in dir-egress">
          <div class="stat-value" id="avg-egress" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Avg Egress</div>
        </div>
        <div class="panel stat-card fade-in">
          <div class="stat-value" id="data-points" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Data Points</div>
        </div>
        <div class="panel stat-card fade-in">
          <div class="stat-value" id="query-interval" style="color:var(--text-strong);font-size:1.1rem">—</div>
          <div class="stat-label">Interval</div>
        </div>
      </div>

      <!-- CIDR Subset Row (shown only when CIDR filters are active) -->
      <div id="cidr-summary" class="hidden mt-3">
        <div class="text-[10px] text-cf-gray mb-2">CIDR Subset: <span id="cidr-filter-label" class="text-white font-mono"></span></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="panel stat-card fade-in dir-ingress" style="border-left:3px solid #f59e0b">
            <div class="stat-value" id="cidr-p95-ingress" style="color:#f59e0b;font-size:1.1rem">—</div>
            <div class="stat-label">CIDR P95 Ingress</div>
            <div class="text-[10px] text-cf-gray" id="cidr-pct-ingress"></div>
            <div class="mt-1.5 w-full rounded-full overflow-hidden" style="height:6px;background:var(--card-bg);border:1px solid var(--border-color)"><div id="cidr-bar-ingress" class="h-full rounded-full" style="width:0%;background:#f59e0b;transition:width 0.5s ease"></div></div>
          </div>
          <div class="panel stat-card fade-in dir-egress" style="border-left:3px solid #f59e0b">
            <div class="stat-value" id="cidr-p95-egress" style="color:#f59e0b;font-size:1.1rem">—</div>
            <div class="stat-label">CIDR P95 Egress</div>
            <div class="text-[10px] text-cf-gray" id="cidr-pct-egress"></div>
            <div class="mt-1.5 w-full rounded-full overflow-hidden" style="height:6px;background:var(--card-bg);border:1px solid var(--border-color)"><div id="cidr-bar-egress" class="h-full rounded-full" style="width:0%;background:#f59e0b;transition:width 0.5s ease"></div></div>
          </div>
          <div class="panel stat-card fade-in dir-ingress">
            <div class="stat-value" id="cidr-peak-ingress" style="color:var(--text-strong);font-size:1rem">—</div>
            <div class="stat-label">CIDR Peak Ingress</div>
          </div>
          <div class="panel stat-card fade-in dir-egress">
            <div class="stat-value" id="cidr-peak-egress" style="color:var(--text-strong);font-size:1rem">—</div>
            <div class="stat-label">CIDR Peak Egress</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts: 4-panel layout (collapsible) -->
    <div id="charts-section" class="hidden">
      <div class="panel p-4 fade-in">
        <div class="flex items-center gap-2 cursor-pointer mb-3" onclick="toggleCharts()">
          <svg id="charts-chevron" class="w-4 h-4 text-cf-gray transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Charts</h2>
        </div>
        <div id="charts-body" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Ingress Time Series -->
          <div class="panel p-4 fade-in dir-ingress">
            <h3 class="text-xs font-semibold mb-3" style="color:var(--text-strong)">Ingress Bit Rate <span class="text-cf-gray font-normal" id="ingress-interval-label">(avg over 5min window)</span></h3>
            <div style="height:280px"><canvas id="chart-ingress-ts"></canvas></div>
          </div>
          <!-- Ingress Percentile -->
          <div class="panel p-4 fade-in dir-ingress">
            <h3 class="text-xs font-semibold mb-3" style="color:var(--text-strong)">Ingress Bit Rate by Percentile <span class="text-cf-gray font-normal" id="ingress-pct-label">(avg over 5min window)</span></h3>
            <div style="height:280px"><canvas id="chart-ingress-pct"></canvas></div>
          </div>
          <!-- Egress Time Series -->
          <div class="panel p-4 fade-in dir-egress">
            <h3 class="text-xs font-semibold mb-3" style="color:var(--text-strong)">Egress Bit Rate <span class="text-cf-gray font-normal" id="egress-interval-label">(avg over 5min window)</span></h3>
            <div style="height:280px"><canvas id="chart-egress-ts"></canvas></div>
          </div>
          <!-- Egress Percentile -->
          <div class="panel p-4 fade-in dir-egress">
            <h3 class="text-xs font-semibold mb-3" style="color:var(--text-strong)">Egress Bit Rate by Percentile <span class="text-cf-gray font-normal" id="egress-pct-label">(avg over 5min window)</span></h3>
            <div style="height:280px"><canvas id="chart-egress-pct"></canvas></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Per-Region P95 Breakdown (collapsible) -->
    <div id="region-section" class="hidden">
      <div class="panel p-4 fade-in">
        <div class="flex items-center gap-2 cursor-pointer mb-3" onclick="toggleRegionSection()">
          <svg id="region-chevron" class="w-4 h-4 text-cf-gray transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <svg class="w-4 h-4 text-cf-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <h2 class="text-sm font-semibold" style="color:var(--text-strong)">Per-Region P95 Breakdown</h2>
        </div>
        <div id="region-body">
          <div id="region-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"></div>
          <div id="region-chart-wrap" class="mt-4 hidden">
            <h4 class="text-xs font-semibold mb-2" style="color:var(--text-strong)">Regional Bit Rate (aggregate per region)</h4>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div id="region-ts-ingress-wrap" class="panel p-4">
                <h5 class="text-[11px] font-semibold mb-2 text-cf-gray">Ingress</h5>
                <div style="height:260px"><canvas id="chart-region-ingress"></canvas></div>
              </div>
              <div id="region-ts-egress-wrap" class="panel p-4">
                <h5 class="text-[11px] font-semibold mb-2 text-cf-gray">Egress</h5>
                <div style="height:260px"><canvas id="chart-region-egress"></canvas></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Table (collapsible) -->
    <div id="data-table-section" class="hidden">
      <div class="panel p-4 fade-in">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 cursor-pointer" onclick="toggleDataTable()">
            <svg id="data-table-chevron" class="w-4 h-4 text-cf-gray transition-transform" style="transform:rotate(-90deg)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            <h3 class="text-xs font-semibold" style="color:var(--text-strong)">Raw Data</h3>
          </div>
          <button onclick="exportCsv()" class="text-[11px] text-cf-gray hover:text-cf-orange">Export CSV</button>
        </div>
        <div id="data-table-body" class="hidden overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-cf-gray border-b border-cf-border">
                <th class="pb-2 pr-4">Time</th>
                <th class="pb-2 pr-4">Direction</th>
                <th class="pb-2 pr-4">Tunnel</th>
                <th class="pb-2 pr-4">Region</th>
                <th class="pb-2 pr-4">Bit Rate</th>
                <th class="pb-2 pr-4">Bits</th>
                <th class="pb-2">Packets</th>
              </tr>
            </thead>
            <tbody id="data-table-rows"></tbody>
          </table>
        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="text-center text-xs text-cf-gray py-6 mt-8 border-t border-cf-border">
    <svg class="mx-auto mb-1 w-24 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#FFF" d="m115.679 69.288l-15.591-8.94l-2.689-1.163l-63.781.436v32.381h82.061z"/><path fill="#F38020" d="M87.295 89.022c.763-2.617.472-5.015-.8-6.796c-1.163-1.635-3.125-2.58-5.488-2.689l-44.737-.581c-.291 0-.545-.145-.691-.363s-.182-.509-.109-.8c.145-.436.581-.763 1.054-.8l45.137-.581c5.342-.254 11.157-4.579 13.192-9.885l2.58-6.723c.109-.291.145-.581.073-.872c-2.906-13.158-14.644-22.97-28.672-22.97c-12.938 0-23.913 8.359-27.838 19.952a13.35 13.35 0 0 0-9.267-2.58c-6.215.618-11.193 5.597-11.811 11.811c-.145 1.599-.036 3.162.327 4.615C10.104 70.051 2 78.337 2 88.549c0 .909.073 1.817.182 2.726a.895.895 0 0 0 .872.763h82.57c.472 0 .909-.327 1.054-.8z"/><path fill="#FAAE40" d="M101.542 60.275c-.4 0-.836 0-1.236.036c-.291 0-.545.218-.654.509l-1.744 6.069c-.763 2.617-.472 5.015.8 6.796c1.163 1.635 3.125 2.58 5.488 2.689l9.522.581c.291 0 .545.145.691.363s.182.545.109.8c-.145.436-.581.763-1.054.8l-9.924.582c-5.379.254-11.157 4.579-13.192 9.885l-.727 1.853c-.145.363.109.727.509.727h34.089c.4 0 .763-.254.872-.654c.581-2.108.909-4.325.909-6.614c0-13.447-10.975-24.422-24.458-24.422"/></svg>
    Cloudflare Internal Tool
  </footer>

  <!-- About Modal -->
  <div id="about-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center no-print" onclick="if(event.target===this)toggleAbout()">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
    <div class="relative rounded-xl shadow-2xl border border-cf-border max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" style="background:var(--surface)">
      <div class="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-cf-border" style="background:var(--surface)">
        <h2 class="text-sm font-semibold" style="color:var(--text-strong)">About Magic P95 Analytics</h2>
        <button onclick="toggleAbout()" class="text-cf-gray hover:text-cf-orange">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="px-6 py-5 space-y-5 text-sm" style="color:var(--text-strong)">
        <section>
          <h3 class="text-xs font-semibold text-cf-orange uppercase tracking-wider mb-2">How P95 is Calculated</h3>
          <p class="text-cf-gray leading-relaxed mb-2">P95 means <strong style="color:var(--text-strong)">95% of your 5-minute intervals had bandwidth at or below this value</strong> — only 5% of intervals exceeded it. This is the standard billing metric for Magic Transit.</p>
          <ol class="text-cf-gray leading-relaxed space-y-1 list-decimal list-inside">
            <li>Fetches <code class="text-xs px-1 py-0.5 rounded" style="background:var(--page-bg)">bitRateFiveMinutes</code> (avg bit rate per 5-min bucket) for each tunnel via <code class="text-xs px-1 py-0.5 rounded" style="background:var(--page-bg)">magicTransitTunnelTrafficAdaptiveGroups</code></li>
            <li>Filters to selected tunnels (if any)</li>
            <li>Sums bit rates across all selected tunnels per 5-minute interval to get aggregate bandwidth</li>
            <li>Removes zero-traffic intervals (these don't count toward billing)</li>
            <li>Sorts all values ascending and picks the value at index <code class="text-xs px-1 py-0.5 rounded" style="background:var(--page-bg)">ceil(0.95 &times; N) - 1</code> (nearest-rank method)</li>
          </ol>
        </section>
        <section>
          <h3 class="text-xs font-semibold text-cf-orange uppercase tracking-wider mb-2">CIDR Subset Analysis</h3>
          <p class="text-cf-gray leading-relaxed">When source or destination CIDR filters are applied, the <strong style="color:var(--text-strong)">total P95</strong> is always calculated from the tunnel dataset (the billing metric). A supplementary query runs against <code class="text-xs px-1 py-0.5 rounded" style="background:var(--page-bg)">magicTransitNetworkAnalyticsAdaptiveGroups</code> with the IP filters. The CIDR P95 is displayed alongside the total with progress bars showing the percentage of total. Multiple CIDRs can be entered one per line.</p>
        </section>
        <section>
          <h3 class="text-xs font-semibold text-cf-orange uppercase tracking-wider mb-2">Accuracy &amp; Data Considerations</h3>
          <dl class="text-cf-gray leading-relaxed space-y-3">
            <div>
              <dt class="font-medium" style="color:var(--text-strong)">Adaptive Bit Rate (ABR) Sampling</dt>
              <dd>The dataset uses Cloudflare's <a href="https://developers.cloudflare.com/analytics/sampling/" target="_blank" class="text-cf-orange hover:underline">ABR sampling</a>, which stores data at multiple resolutions (100%, 10%, 1%) and dynamically selects the best resolution per query. Aggregated metrics like averages and percentiles are extrapolated to represent the full dataset, so sampling does not distort the P95 result.</dd>
            </div>
            <div>
              <dt class="font-medium" style="color:var(--text-strong)">5-Minute Averaging</dt>
              <dd><code class="text-xs px-1 py-0.5 rounded" style="background:var(--page-bg)">bitRateFiveMinutes</code> is the <strong>average</strong> bit rate over each 5-minute window, not an instantaneous or peak measurement. Sub-minute traffic spikes within a bucket are smoothed by this averaging. This is the same granularity used by Cloudflare for Magic Transit billing.</dd>
            </div>
            <div>
              <dt class="font-medium" style="color:var(--text-strong)">Weekly Chunking Reduces Sampling</dt>
              <dd>By splitting queries into 7-day windows (&le;10,000 rows each), the tool keeps per-query row counts low, which encourages ABR to return higher-resolution (less sampled) data.</dd>
            </div>
            <div>
              <dt class="font-medium" style="color:var(--text-strong)">Billing Methodology Alignment</dt>
              <dd>This tool follows the <a href="https://developers.cloudflare.com/magic-transit/analytics/query-bandwidth/" target="_blank" class="text-cf-orange hover:underline">official Cloudflare P95 bandwidth guide</a>, using the same dataset, granularity, and calculation method.</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>

<script>
// ============================================================
// STATE
// ============================================================
var selectedDirection = 'both';
var selectedRange = '24h';
var charts = { ingressTs: null, ingressPct: null, egressTs: null, egressPct: null };
var lastResult = null;

// ============================================================
// THEME
// ============================================================
function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); updateChartTheme(); }
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('p95-theme', next);
}
(function() { var saved = localStorage.getItem('p95-theme'); if (saved) applyTheme(saved); })();

function getChartTextColor() { return document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : '#9CA3AF'; }
function getChartGridColor() { return document.documentElement.getAttribute('data-theme') === 'light' ? '#E5E7EB' : '#1F2937'; }
function updateChartTheme() {
  Object.values(charts).forEach(function(ch) {
    if (!ch) return;
    ch.options.plugins.legend.labels.color = getChartTextColor();
    if (ch.options.scales.x) ch.options.scales.x.ticks.color = getChartTextColor();
    if (ch.options.scales.y) {
      ch.options.scales.y.ticks.color = getChartTextColor();
      ch.options.scales.y.grid.color = getChartGridColor();
    }
    ch.update('none');
  });
}

// ============================================================
// SETTINGS
// ============================================================
var savedAccounts = [];
var activeAccountTag = '';

function toggleAbout() {
  document.getElementById('about-modal').classList.toggle('hidden');
}

function toggleSettings() {
  var panel = document.getElementById('settings-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) loadSettings();
}

async function loadSettings() {
  try {
    var resp = await fetch('/api/settings');
    var data = await resp.json();
    savedAccounts = data.accounts || [];
    renderAccountsList();
    populateAccountDropdown();
    updateAccountBadge();
    // Auto-discover tunnels for the active account on load
    if (activeAccountTag) {
      fetch('/api/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_tag: activeAccountTag }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.tunnelNames && d.tunnelNames.length > 0) populateTunnelFilter(d.tunnelNames);
      }).catch(function(){});
    }
  } catch(e) {}
}

function renderAccountsList() {
  var container = document.getElementById('accounts-list');
  if (savedAccounts.length === 0) {
    container.innerHTML = '<p class="text-xs text-cf-gray">No accounts configured. Click "+ Add Account" to get started.</p>';
    return;
  }
  container.innerHTML = savedAccounts.map(function(a) {
    var tokenBadge = a.has_token
      ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-900 text-green-300">Token saved</span>'
      : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-300">No token</span>';
    var defaultBadge = a.is_default
      ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-900 text-orange-300">Default</span>'
      : '';
    var defaultBtn = a.is_default
      ? ''
      : '<button onclick="setDefaultAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-cf-orange">Set Default</button>';
    return '<div class="flex items-center justify-between bg-cf-dark rounded-lg px-3 py-2 border border-cf-border' + (a.is_default ? ' border-orange-700' : '') + '">' +
      '<div class="flex items-center gap-3">' +
        '<span class="text-sm text-white font-medium">' + (a.account_label || a.account_tag) + '</span>' +
        '<span class="text-[10px] text-cf-gray font-mono">' + a.account_tag + '</span>' +
        tokenBadge + defaultBadge +
      '</div>' +
      '<div class="flex gap-2">' +
        defaultBtn +
        '<button onclick="editAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-cf-orange">Edit</button>' +
        '<button onclick="deleteAccount(' + a.id + ')" class="text-[10px] text-cf-gray hover:text-red-400">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function populateAccountDropdown() {
  var sel = document.getElementById('active-account-select');
  var current = activeAccountTag || sel.value;
  if (savedAccounts.length === 0) {
    sel.innerHTML = '<option value="">No accounts configured</option>';
    return;
  }
  sel.innerHTML = savedAccounts.map(function(a) {
    return '<option value="' + a.account_tag + '">' + (a.account_label || a.account_tag) + (a.is_default ? ' (default)' : '') + '</option>';
  }).join('');
  // Restore current selection, or use default account, or first
  if (current && savedAccounts.some(function(a) { return a.account_tag === current; })) {
    sel.value = current;
  } else {
    var defaultAcct = savedAccounts.find(function(a) { return a.is_default; });
    if (defaultAcct) sel.value = defaultAcct.account_tag;
  }
  activeAccountTag = sel.value;
}

function updateAccountBadge() {
  var bar = document.getElementById('active-account-bar');
  var nameEl = document.getElementById('active-account-name');
  var tagEl = document.getElementById('active-account-tag-display');
  if (!activeAccountTag || savedAccounts.length === 0) {
    bar.classList.add('hidden');
    return;
  }
  var acct = savedAccounts.find(function(a) { return a.account_tag === activeAccountTag; });
  nameEl.textContent = acct ? (acct.account_label || acct.account_tag) : activeAccountTag;
  tagEl.textContent = activeAccountTag;
  bar.classList.remove('hidden');
}

function toggleFilters() {
  var body = document.getElementById('filters-body');
  var chevron = document.getElementById('filters-chevron');
  body.classList.toggle('hidden');
  chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
}

function onAccountSelected() {
  var sel = document.getElementById('active-account-select');
  activeAccountTag = sel.value;
  updateAccountBadge();
  // Auto-discover tunnels for the selected account
  if (activeAccountTag) {
    fetch('/api/test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_tag: activeAccountTag }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.tunnelNames && d.tunnelNames.length > 0) populateTunnelFilter(d.tunnelNames);
    }).catch(function(){});
  }
}

function showAddAccount() {
  document.getElementById('account-form').classList.remove('hidden');
  document.getElementById('account-form-title').textContent = 'Add Account';
  document.getElementById('cfg-account-label').value = '';
  document.getElementById('cfg-account-tag').value = '';
  document.getElementById('cfg-account-tag').removeAttribute('disabled');
  document.getElementById('cfg-api-token').value = '';
}

function hideAccountForm() {
  document.getElementById('account-form').classList.add('hidden');
  document.getElementById('settings-status').textContent = '';
}

async function editAccount(id) {
  var acct = savedAccounts.find(function(a) { return a.id === id; });
  if (!acct) return;
  document.getElementById('account-form').classList.remove('hidden');
  document.getElementById('account-form-title').textContent = 'Edit Account';
  document.getElementById('cfg-account-label').value = acct.account_label || '';
  document.getElementById('cfg-account-tag').value = acct.account_tag;
  document.getElementById('cfg-account-tag').setAttribute('disabled', 'true');
  document.getElementById('cfg-api-token').value = acct.has_token ? '••••••••' : '';
}

async function deleteAccount(id) {
  if (!confirm('Remove this account?')) return;
  await fetch('/api/settings/' + id, { method: 'DELETE' });
  loadSettings();
}

async function setDefaultAccount(id) {
  await fetch('/api/settings/' + id + '/default', { method: 'PUT' });
  loadSettings();
}

async function saveAccount() {
  var status = document.getElementById('settings-status');
  status.textContent = 'Saving...';
  status.style.color = '';
  try {
    var resp = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_tag: document.getElementById('cfg-account-tag').value,
        account_label: document.getElementById('cfg-account-label').value,
        api_token: document.getElementById('cfg-api-token').value,
      }),
    });
    var data = await resp.json();
    if (data.ok) {
      status.style.color = '#10B981';
      status.textContent = 'Saved!';
      setTimeout(function() { hideAccountForm(); loadSettings(); }, 800);
    } else {
      status.style.color = '#EF4444';
      status.textContent = data.error || 'Error saving';
    }
  } catch(e) { status.style.color = '#EF4444'; status.textContent = 'Error: ' + e.message; }
}

async function testToken() {
  var status = document.getElementById('settings-status');
  var resultsDiv = document.getElementById('token-check-results');
  status.textContent = 'Testing...';
  status.style.color = 'var(--text-muted)';
  resultsDiv.classList.add('hidden');
  resultsDiv.innerHTML = '';
  try {
    var resp = await fetch('/api/test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_tag: document.getElementById('cfg-account-tag').value,
        api_token: document.getElementById('cfg-api-token').value,
      }),
    });
    var data = await resp.json();
    status.textContent = '';
    if (data.checks) {
      var html = '<div class="font-semibold mb-2" style="color:var(--text-strong)">Permission Check Results</div>';
      data.checks.forEach(function(chk) {
        var icon = chk.pass ? '<span style="color:#10B981">✓</span>' : '<span style="color:#EF4444">✗</span>';
        var detailColor = chk.pass ? 'color:#6B7280' : 'color:#EF4444';
        html += '<div class="py-1">' + icon + ' <strong style="color:var(--text-strong)">' + chk.label + '</strong> <span style="' + detailColor + '">' + chk.detail + '</span></div>';
      });
      var summaryColor = data.ok ? '#10B981' : '#EF4444';
      html += '<div class="mt-2 font-medium" style="color:' + summaryColor + '">' + data.summary + '</div>';
      resultsDiv.innerHTML = html;
      resultsDiv.classList.remove('hidden');
      if (data.tunnelNames && data.tunnelNames.length > 0) {
        populateTunnelFilter(data.tunnelNames);
      }
    } else if (data.error) {
      status.style.color = '#EF4444';
      status.textContent = data.error;
      setTimeout(function() { status.textContent = ''; status.style.color = ''; }, 8000);
    }
  } catch(e) {
    status.style.color = '#EF4444';
    status.textContent = 'Error: ' + e.message;
  }
}

// Load settings, user info, and tunnel list on page load
(function(){
  loadSettings();
  fetch('/api/me').then(function(r) { return r.json(); }).then(function(d) {
    if (d.email) document.getElementById('user-email').textContent = d.email;
  }).catch(function(){});
})();

// ============================================================
// FILTERS
// ============================================================
function setDirection(el) {
  document.querySelectorAll('[data-dir]').forEach(function(c) { c.classList.remove('active'); });
  el.classList.add('active');
  selectedDirection = el.getAttribute('data-dir');
  applyDirectionVisibility(selectedDirection);
}
function applyDirectionVisibility(dir) {
  var showIngress = dir !== 'egress';
  var showEgress = dir !== 'ingress';
  document.querySelectorAll('.dir-ingress').forEach(function(el) { el.style.display = showIngress ? '' : 'none'; });
  document.querySelectorAll('.dir-egress').forEach(function(el) { el.style.display = showEgress ? '' : 'none'; });
}
var MAX_RETENTION_MS = 16 * 7 * 86400000; // 16 weeks in ms

function setTimeRange(el) {
  document.querySelectorAll('[data-range]').forEach(function(c) { c.classList.remove('active'); });
  el.classList.add('active');
  selectedRange = el.getAttribute('data-range');
  var customPanel = document.getElementById('custom-dates');
  customPanel.classList.toggle('hidden', selectedRange !== 'custom');
  if (selectedRange === 'custom') {
    // Set min to 16 weeks ago
    var minStr = new Date(Date.now() - MAX_RETENTION_MS).toISOString().slice(0, 16);
    document.getElementById('custom-start').setAttribute('min', minStr);
    document.getElementById('custom-end').setAttribute('min', minStr);
  }
}

function getTimeRange() {
  var now = new Date();
  var minDate = new Date(now.getTime() - MAX_RETENTION_MS);
  if (selectedRange === 'custom') {
    var s = document.getElementById('custom-start').value;
    var e = document.getElementById('custom-end').value;
    if (!s || !e) return null;
    var startDate = new Date(s);
    if (startDate < minDate) startDate = minDate;
    return { start: startDate.toISOString(), end: new Date(e).toISOString() };
  }
  var ms = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '48h': 172800000, '7d': 604800000, '14d': 1209600000, '30d': 2592000000 };
  var offset = ms[selectedRange] || 86400000;
  return { start: new Date(now.getTime() - offset).toISOString(), end: now.toISOString() };
}

// Region metadata tag options (kept in sync with src/types.ts REGIONS)
var REGIONS = [
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
var REGION_LABELS = {};
REGIONS.forEach(function(r) { REGION_LABELS[r.code] = r.label; });

var allTunnelNames = [];
var regionTags = {}; // tunnel_name -> region_code (for the active account)

function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

function regionSelectHtml(tunnel) {
  var current = regionTags[tunnel] || '';
  var opts = '<option value="">— Region —</option>';
  REGIONS.forEach(function(r) {
    opts += '<option value="' + r.code + '"' + (r.code === current ? ' selected' : '') + '>' + r.label + '</option>';
  });
  return '<select class="tunnel-region-select bg-cf-dark border border-cf-border rounded px-1 py-0.5 text-[11px] text-white" ' +
    'data-tunnel="' + escAttr(tunnel) + '" onchange="onRegionTagChange(this)" onclick="event.stopPropagation()">' + opts + '</select>';
}

function renderBulkRegionSelect() {
  var sel = document.getElementById('bulk-region-select');
  if (!sel) return;
  var opts = '<option value="__none__">Set region for selected…</option>';
  REGIONS.forEach(function(r) { opts += '<option value="' + r.code + '">' + r.label + '</option>'; });
  opts += '<option value="__clear__">— Clear region —</option>';
  sel.innerHTML = opts;
  sel.value = '__none__';
}

function populateTunnelFilter(tunnelNames) {
  allTunnelNames = tunnelNames;
  renderBulkRegionSelect();
  renderTunnelOptions();
  document.getElementById('tunnel-select-all').checked = true;
  updateTunnelLabel();
  // On-demand: reconcile region tags for the currently enumerated tunnels
  syncRegionTags(tunnelNames);
}

function renderTunnelOptions() {
  var container = document.getElementById('tunnel-options');
  container.innerHTML = allTunnelNames.map(function(t) {
    return '<div class="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-cf-border text-sm text-white">' +
      '<label class="flex items-center gap-2 cursor-pointer min-w-0 flex-1">' +
        '<input type="checkbox" checked class="tunnel-cb accent-orange-500" value="' + escAttr(t) + '" onchange="updateTunnelLabel()">' +
        '<span class="truncate">' + t + '</span>' +
      '</label>' +
      regionSelectHtml(t) +
    '</div>';
  }).join('');
}

// On-demand sync fired whenever tunnels are enumerated: prunes tags for
// removed tunnels/interconnects and hydrates selects with surviving tags.
function syncRegionTags(tunnelNames) {
  var acct = activeAccountTag || (document.getElementById('active-account-select') || {}).value;
  if (!acct) return;
  fetch('/api/region-tags/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_tag: acct, tunnelNames: tunnelNames }),
  }).then(function(r) { return r.json(); }).then(function(d) {
    regionTags = d.tags || {};
    renderTunnelOptions();
    updateTunnelLabel();
    populateRegionFilter();
  }).catch(function(){});
}

function onRegionTagChange(sel) {
  var tunnel = sel.getAttribute('data-tunnel');
  var code = sel.value;
  var acct = activeAccountTag || (document.getElementById('active-account-select') || {}).value;
  if (!acct) return;
  if (code) { regionTags[tunnel] = code; } else { delete regionTags[tunnel]; }
  populateRegionFilter();
  fetch('/api/region-tags', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_tag: acct, tunnel_name: tunnel, region_code: code }),
  }).catch(function(){});
}

// Bulk-assign the chosen region to every currently-selected (checked) tunnel.
// Updates each row's individual select in place so checkbox selection is preserved.
function setRegionForSelected(sel) {
  var val = sel.value;
  sel.value = '__none__'; // reset control back to placeholder
  if (val === '__none__') return;
  var code = (val === '__clear__') ? '' : val;
  var acct = activeAccountTag || (document.getElementById('active-account-select') || {}).value;
  if (!acct) return;
  var selected = getSelectedTunnels();
  if (selected.length === 0) return;
  var selectedSet = {};
  selected.forEach(function(t) { selectedSet[t] = true; });
  document.querySelectorAll('.tunnel-region-select').forEach(function(rs) {
    var tunnel = rs.getAttribute('data-tunnel');
    if (!selectedSet[tunnel]) return;
    rs.value = code;
    if (code) { regionTags[tunnel] = code; } else { delete regionTags[tunnel]; }
    fetch('/api/region-tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_tag: acct, tunnel_name: tunnel, region_code: code }),
    }).catch(function(){});
  });
  populateRegionFilter();
}

// Region multi-select filter — only shows regions that have >=1 tagged tunnel
function populateRegionFilter() {
  var present = {};
  Object.keys(regionTags).forEach(function(t) { present[regionTags[t]] = true; });
  var codes = REGIONS.filter(function(r) { return present[r.code]; });
  var wrap = document.getElementById('region-filter-wrap');
  var container = document.getElementById('region-options');
  if (!wrap || !container) return;
  if (codes.length === 0) { wrap.classList.add('hidden'); container.innerHTML = ''; return; }
  wrap.classList.remove('hidden');
  container.innerHTML = codes.map(function(r) {
    return '<label class="flex items-center gap-2 px-3 py-1.5 hover:bg-cf-border cursor-pointer text-sm text-white">' +
      '<input type="checkbox" class="region-cb accent-orange-500" value="' + r.code + '" onchange="updateRegionLabel()">' + r.label + '</label>';
  }).join('');
  updateRegionLabel();
}
function toggleRegionDropdown() {
  document.getElementById('region-dropdown').classList.toggle('hidden');
}
function getSelectedRegions() {
  var cbs = document.querySelectorAll('.region-cb');
  var selected = [];
  cbs.forEach(function(cb) { if (cb.checked) selected.push(cb.value); });
  return selected;
}
function updateRegionLabel() {
  var selected = getSelectedRegions();
  var label = document.getElementById('region-select-label');
  if (!label) return;
  if (selected.length === 0) { label.textContent = 'All Regions'; }
  else { label.textContent = selected.length + ' region' + (selected.length > 1 ? 's' : '') + ' selected'; }
}
function toggleTunnelDropdown() {
  document.getElementById('tunnel-dropdown').classList.toggle('hidden');
}
function toggleAllTunnels(checked) {
  document.querySelectorAll('.tunnel-cb').forEach(function(cb) { cb.checked = checked; });
  updateTunnelLabel();
}
function getSelectedTunnels() {
  var cbs = document.querySelectorAll('.tunnel-cb');
  if (cbs.length === 0) return [];
  var selected = [];
  cbs.forEach(function(cb) { if (cb.checked) selected.push(cb.value); });
  return selected;
}
function updateTunnelLabel() {
  var selected = getSelectedTunnels();
  var label = document.getElementById('tunnel-select-label');
  var allCb = document.getElementById('tunnel-select-all');
  if (selected.length === 0) { label.textContent = 'None selected'; allCb.checked = false; }
  else if (selected.length === allTunnelNames.length) { label.textContent = 'All Tunnels (' + selected.length + ')'; allCb.checked = true; }
  else { label.textContent = selected.length + ' of ' + allTunnelNames.length + ' selected'; allCb.checked = false; }
}
// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('tunnel-filter-wrap');
  var tunnelDd = document.getElementById('tunnel-dropdown');
  var regionWrap = document.getElementById('region-filter-wrap');
  var regionDd = document.getElementById('region-dropdown');
  // Region dropdown lives inside tunnel-filter-wrap, so check it first
  if (regionWrap && regionDd && !regionWrap.contains(e.target)) regionDd.classList.add('hidden');
  if (wrap && tunnelDd && !wrap.contains(e.target)) tunnelDd.classList.add('hidden');
});

// ============================================================
// QUERY
// ============================================================
async function runQuery() {
  var btn = document.getElementById('query-btn');
  var statusEl = document.getElementById('query-status');
  var range = getTimeRange();
  if (!range) { statusEl.textContent = 'Please select a valid time range.'; statusEl.classList.remove('hidden'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Querying...';
  statusEl.classList.remove('hidden');

  // Estimate query scope for progress message
  var WEEK_MS = 7 * 24 * 3600000;
  var rangeMs = new Date(range.end).getTime() - new Date(range.start).getTime();
  var numChunks = Math.ceil(rangeMs / WEEK_MS);
  var numDirs = selectedDirection === 'both' ? 2 : 1;
  var totalQueries = numChunks * numDirs;
  var srcFilter = getCidrFilter('source');
  var dstFilter = getCidrFilter('dest');
  var hasCidr = !!(srcFilter || dstFilter);
  if (hasCidr) totalQueries *= 2; // CIDR subset runs a second set of queries
  statusEl.textContent = 'Querying ' + numChunks + ' weekly chunk' + (numChunks > 1 ? 's' : '') + ' × ' + numDirs + ' direction' + (numDirs > 1 ? 's' : '') + (hasCidr ? ' + CIDR subset' : '') + ' (' + totalQueries + ' parallel API calls)...';

  try {
    var selectedTunnels = getSelectedTunnels();
    var acctTag = activeAccountTag || document.getElementById('active-account-select').value;
    if (!acctTag) { statusEl.textContent = 'Please select an account in Settings.'; statusEl.classList.remove('hidden'); btn.disabled = false; btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Run Query'; return; }
    var selectedRegions = getSelectedRegions();
    var body = {
      start: range.start,
      end: range.end,
      direction: selectedDirection,
      sourceCidrFilter: srcFilter || undefined,
      destCidrFilter: dstFilter || undefined,
      tunnelNames: selectedTunnels.length > 0 && selectedTunnels.length < allTunnelNames.length ? selectedTunnels : undefined,
      regions: selectedRegions.length > 0 ? selectedRegions : undefined,
      accountTag: acctTag,
    };

    var resp = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var data = await resp.json();

    if (data.error) {
      statusEl.textContent = 'Error: ' + data.error;
      statusEl.style.color = '#ef4444';
      return;
    }

    lastResult = data;
    statusEl.classList.add('hidden');
    statusEl.style.color = '';
    renderResults(data);
  } catch(e) {
    statusEl.textContent = 'Request failed: ' + e.message;
    statusEl.style.color = '#ef4444';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Run Query';
  }
}

// ============================================================
// HELPERS
// ============================================================
function parseCidrList(val) {
  if (!val) return '';
  var items = val.split(/[\\x0a,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  return items.join(',');
}

function addCidrRow(type, value, mode) {
  var list = document.getElementById(type + '-cidr-list');
  var row = document.createElement('div');
  row.className = 'flex items-center gap-1.5';
  var isInclude = mode !== 'exclude';
  row.innerHTML =
    '<button type="button" onclick="toggleCidrMode(this)" class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded border ' +
    (isInclude ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400') +
    '" data-mode="' + (isInclude ? 'include' : 'exclude') + '">' +
    (isInclude ? 'Include' : 'Exclude') +
    '</button>' +
    '<input type="text" class="cidr-input flex-1 bg-cf-dark border border-cf-border rounded-lg px-2 py-1 text-xs text-white" placeholder="e.g. 10.0.0.0/8" value="' + (value || '') + '">' +
    '<button type="button" onclick="removeCidrRow(this)" class="flex-shrink-0 text-cf-gray hover:text-red-400">' +
    '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
    '</button>';
  list.appendChild(row);
  if (!value) row.querySelector('input').focus();
}

function toggleCidrMode(btn) {
  var isInclude = btn.getAttribute('data-mode') === 'include';
  if (isInclude) {
    btn.setAttribute('data-mode', 'exclude');
    btn.textContent = 'Exclude';
    btn.className = 'flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded border border-red-500 text-red-400';
  } else {
    btn.setAttribute('data-mode', 'include');
    btn.textContent = 'Include';
    btn.className = 'flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded border border-emerald-500 text-emerald-400';
  }
}

function removeCidrRow(btn) {
  btn.closest('.flex').remove();
}

function getCidrFilter(type) {
  var list = document.getElementById(type + '-cidr-list');
  var rows = list.querySelectorAll('.flex');
  var include = [];
  var exclude = [];
  rows.forEach(function(row) {
    var input = row.querySelector('.cidr-input');
    var modeBtn = row.querySelector('[data-mode]');
    var val = input.value.trim();
    if (!val) return;
    if (modeBtn.getAttribute('data-mode') === 'exclude') {
      exclude.push(val);
    } else {
      include.push(val);
    }
  });
  if (include.length === 0 && exclude.length === 0) return null;
  return { include: include, exclude: exclude };
}

// ============================================================
// RENDER
// ============================================================
function formatBps(bps) {
  if (bps >= 1e9) return (bps / 1e9).toFixed(2) + ' Gb/s';
  if (bps >= 1e6) return (bps / 1e6).toFixed(2) + ' Mb/s';
  if (bps >= 1e3) return (bps / 1e3).toFixed(2) + ' Kb/s';
  return bps.toFixed(0) + ' b/s';
}
function formatTime(iso) {
  var d = new Date(iso);
  return (d.getMonth()+1).toString().padStart(2,'0') + '/' + d.getDate().toString().padStart(2,'0') + ' ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

function renderResults(data) {
  lastQueryData = data;
  // P95 summary
  document.getElementById('p95-summary').classList.remove('hidden');
  document.getElementById('p95-ingress').textContent = formatBps(data.ingress.p95);
  document.getElementById('p95-egress').textContent = formatBps(data.egress.p95);
  document.getElementById('peak-ingress').textContent = formatBps(data.ingress.peakBps);
  document.getElementById('peak-egress').textContent = formatBps(data.egress.peakBps);
  document.getElementById('avg-ingress').textContent = formatBps(data.ingress.avgBps);
  document.getElementById('avg-egress').textContent = formatBps(data.egress.avgBps);
  document.getElementById('data-points').textContent = data.ingress.series.length + ' / ' + data.egress.series.length;
  document.getElementById('query-interval').textContent = data.interval + (data.chunks > 1 ? ' (' + data.chunks + ' chunks)' : '');

  // CIDR subset
  if (data.cidr) {
    document.getElementById('cidr-summary').classList.remove('hidden');
    document.getElementById('cidr-filter-label').textContent = data.cidr.filter;
    document.getElementById('cidr-filter-label').style.color = '';
    document.getElementById('cidr-p95-ingress').textContent = formatBps(data.cidr.ingress.p95);
    document.getElementById('cidr-p95-egress').textContent = formatBps(data.cidr.egress.p95);
    document.getElementById('cidr-peak-ingress').textContent = formatBps(data.cidr.ingress.peakBps);
    document.getElementById('cidr-peak-egress').textContent = formatBps(data.cidr.egress.peakBps);
    var pctIn = data.ingress.p95 > 0 ? ((data.cidr.ingress.p95 / data.ingress.p95) * 100).toFixed(1) : '0.0';
    var pctEg = data.egress.p95 > 0 ? ((data.cidr.egress.p95 / data.egress.p95) * 100).toFixed(1) : '0.0';
    document.getElementById('cidr-pct-ingress').textContent = pctIn + '% of total P95';
    document.getElementById('cidr-pct-egress').textContent = pctEg + '% of total P95';
    document.getElementById('cidr-bar-ingress').style.width = Math.min(parseFloat(pctIn), 100) + '%';
    document.getElementById('cidr-bar-egress').style.width = Math.min(parseFloat(pctEg), 100) + '%';
  } else if (data.cidrError) {
    document.getElementById('cidr-summary').classList.remove('hidden');
    document.getElementById('cidr-filter-label').textContent = data.cidrError;
    document.getElementById('cidr-filter-label').style.color = '#ef4444';
    document.getElementById('cidr-p95-ingress').textContent = '—';
    document.getElementById('cidr-p95-egress').textContent = '—';
    document.getElementById('cidr-peak-ingress').textContent = '—';
    document.getElementById('cidr-peak-egress').textContent = '—';
    document.getElementById('cidr-pct-ingress').textContent = '';
    document.getElementById('cidr-pct-egress').textContent = '';
    document.getElementById('cidr-bar-ingress').style.width = '0%';
    document.getElementById('cidr-bar-egress').style.width = '0%';
  } else {
    document.getElementById('cidr-summary').classList.add('hidden');
    document.getElementById('cidr-filter-label').style.color = '';
  }

  // Update interval labels
  var intervalLabel = '(avg over ' + data.interval + ' window)';
  document.getElementById('ingress-interval-label').textContent = intervalLabel;
  document.getElementById('ingress-pct-label').textContent = intervalLabel;
  document.getElementById('egress-interval-label').textContent = intervalLabel;
  document.getElementById('egress-pct-label').textContent = intervalLabel;

  // Tunnel filter
  if (data.tunnels && data.tunnels.length > 0) {
    populateTunnelFilter(data.tunnels);
  }

  // Show/hide panels based on direction
  applyDirectionVisibility(selectedDirection);

  // Charts
  document.getElementById('charts-section').classList.remove('hidden');
  var cidrInSeries = data.cidr ? data.cidr.ingress.series : null;
  var cidrEgSeries = data.cidr ? data.cidr.egress.series : null;
  if (selectedDirection !== 'egress') {
    renderTimeSeriesChart('chart-ingress-ts', 'ingressTs', data.ingress.series, '#22c55e', 'Ingress bit rate', data.ingress.tunnelSeries, cidrInSeries);
    renderPercentileChart('chart-ingress-pct', 'ingressPct', data.ingress.percentiles, data.ingress.p95, '#22c55e');
  }
  if (selectedDirection !== 'ingress') {
    renderTimeSeriesChart('chart-egress-ts', 'egressTs', data.egress.series, '#3b82f6', 'Egress bit rate', data.egress.tunnelSeries, cidrEgSeries);
    renderPercentileChart('chart-egress-pct', 'egressPct', data.egress.percentiles, data.egress.p95, '#3b82f6');
  }

  // Per-region breakdown
  renderRegionSection(data);

  // Data table
  document.getElementById('data-table-section').classList.remove('hidden');
  renderDataTable(data);
}

var regionLineColors = [
  '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308',
  '#06b6d4', '#f43f5e', '#8b5cf6', '#10b981', '#d946ef',
  '#0ea5e9', '#84cc16',
];

function renderRegionSection(data) {
  var section = document.getElementById('region-section');
  var cards = document.getElementById('region-cards');
  var regions = data.perRegion || [];
  // Hide the section entirely if nothing is tagged (the sole "Untagged" bucket
  // would just duplicate the aggregate charts).
  var hasTagged = regions.some(function(r) { return r.region !== 'UNTAGGED'; });
  if (!regions.length || !hasTagged) { section.classList.add('hidden'); cards.innerHTML = ''; return; }

  var showIngress = selectedDirection !== 'egress';
  var showEgress = selectedDirection !== 'ingress';

  cards.innerHTML = regions.map(function(r) {
    var parts = '';
    if (showIngress) {
      parts += '<div class="flex items-center justify-between text-xs"><span class="text-cf-gray">P95 Ingress</span>' +
        '<span style="color:#22c55e;font-weight:600">' + formatBps(r.ingress.p95) + '</span></div>';
    }
    if (showEgress) {
      parts += '<div class="flex items-center justify-between text-xs"><span class="text-cf-gray">P95 Egress</span>' +
        '<span style="color:#3b82f6;font-weight:600">' + formatBps(r.egress.p95) + '</span></div>';
    }
    if (showIngress) {
      parts += '<div class="flex items-center justify-between text-[11px] text-cf-gray"><span>Peak / Avg In</span>' +
        '<span>' + formatBps(r.ingress.peakBps) + ' / ' + formatBps(r.ingress.avgBps) + '</span></div>';
    }
    if (showEgress) {
      parts += '<div class="flex items-center justify-between text-[11px] text-cf-gray"><span>Peak / Avg Eg</span>' +
        '<span>' + formatBps(r.egress.peakBps) + ' / ' + formatBps(r.egress.avgBps) + '</span></div>';
    }
    return '<div class="panel p-3 fade-in" style="border-left:3px solid #F6821F">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<span class="text-xs font-semibold" style="color:var(--text-strong)">' + r.regionLabel + '</span>' +
        '<span class="text-[10px] text-cf-gray">' + r.tunnels.length + ' tunnel' + (r.tunnels.length !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="space-y-1">' + parts + '</div>' +
    '</div>';
  }).join('');

  section.classList.remove('hidden');

  // Regional time-series charts (one line per region)
  var chartWrap = document.getElementById('region-chart-wrap');
  chartWrap.classList.remove('hidden');
  document.getElementById('region-ts-ingress-wrap').style.display = showIngress ? '' : 'none';
  document.getElementById('region-ts-egress-wrap').style.display = showEgress ? '' : 'none';
  if (showIngress) renderRegionChart('chart-region-ingress', 'regionIngress', regions, 'ingress');
  if (showEgress) renderRegionChart('chart-region-egress', 'regionEgress', regions, 'egress');
}

function renderRegionChart(canvasId, chartKey, regions, dir) {
  var ctx = document.getElementById(canvasId).getContext('2d');
  if (charts[chartKey]) charts[chartKey].destroy();

  // Build a unified time axis across all regions
  var timeSet = {};
  regions.forEach(function(r) {
    r[dir].series.forEach(function(p) { timeSet[p.time] = true; });
  });
  var times = Object.keys(timeSet).sort();
  var timeIndex = {};
  times.forEach(function(t, i) { timeIndex[t] = i; });
  var labels = times.map(function(t) { return formatTime(t); });

  var datasets = regions.map(function(r, idx) {
    var color = regionLineColors[idx % regionLineColors.length];
    var arr = new Array(times.length).fill(null);
    r[dir].series.forEach(function(p) {
      var i = timeIndex[p.time];
      if (i !== undefined) arr[i] = (arr[i] || 0) + p.bitRate;
    });
    return {
      label: r.regionLabel,
      data: arr,
      borderColor: color,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 1.5,
    };
  });

  charts[chartKey] = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: getChartTextColor(), font: { size: 9 }, usePointStyle: true, pointStyle: 'line', boxWidth: 16, padding: 8 } },
        tooltip: { callbacks: { label: function(ctx) { if (ctx.parsed.y == null) return null; return ctx.dataset.label + ': ' + formatBps(ctx.parsed.y); } } }
      },
      scales: {
        x: { ticks: { color: getChartTextColor(), font: { size: 9 }, maxRotation: 45, maxTicksLimit: 20 }, grid: { display: false } },
        y: { ticks: { color: getChartTextColor(), font: { size: 10 }, callback: function(v) { return formatBps(v); } }, grid: { color: getChartGridColor() } }
      }
    }
  });
}

var tunnelColors = [
  '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308',
  '#06b6d4', '#f43f5e', '#8b5cf6', '#10b981', '#d946ef',
  '#0ea5e9', '#84cc16', '#f59e0b', '#6366f1', '#e11d48',
];

function renderTimeSeriesChart(canvasId, chartKey, series, color, label, tunnelSeries, cidrSeries) {
  var ctx = document.getElementById(canvasId).getContext('2d');
  if (charts[chartKey]) charts[chartKey].destroy();

  var labels = series.map(function(p) { return formatTime(p.time); });
  var timeIndex = {};
  labels.forEach(function(l, i) { timeIndex[series[i].time] = i; });

  var datasets = [{
    label: label + ' (aggregate)',
    data: series.map(function(p) { return p.bitRate; }),
    borderColor: color,
    backgroundColor: color + '18',
    fill: true,
    tension: 0.2,
    pointRadius: 0,
    borderWidth: 2.5,
    order: 0,
  }];

  // Add per-tunnel lines
  if (tunnelSeries) {
    var tunnelNames = Object.keys(tunnelSeries).sort();
    tunnelNames.forEach(function(name, idx) {
      var tColor = tunnelColors[idx % tunnelColors.length];
      var data = new Array(labels.length).fill(null);
      tunnelSeries[name].forEach(function(p) {
        var i = timeIndex[p.time];
        if (i !== undefined) data[i] = (data[i] || 0) + p.bitRate;
      });
      datasets.push({
        label: name,
        data: data,
        borderColor: tColor,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 1,
        order: 1,
        borderDash: [4, 2],
      });
    });
  }

  // Add CIDR subset overlay
  if (cidrSeries && cidrSeries.length > 0) {
    var cidrData = new Array(labels.length).fill(null);
    cidrSeries.forEach(function(p) {
      var i = timeIndex[p.time];
      if (i !== undefined) cidrData[i] = (cidrData[i] || 0) + p.bitRate;
    });
    datasets.splice(1, 0, {
      label: 'CIDR subset',
      data: cidrData,
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b33',
      fill: true,
      tension: 0.2,
      pointRadius: 0,
      borderWidth: 1.5,
      order: 0,
      borderDash: [],
    });
  }

  charts[chartKey] = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: getChartTextColor(), font: { size: 9 }, usePointStyle: true, pointStyle: 'line', boxWidth: 16, padding: 8 }
        },
        tooltip: {
          callbacks: {
            title: function(items) { return items[0].label; },
            label: function(ctx) {
              if (ctx.parsed.y == null) return null;
              return ctx.dataset.label + ': ' + formatBps(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: getChartTextColor(), font: { size: 9 }, maxRotation: 45, maxTicksLimit: 20 }, grid: { display: false } },
        y: {
          ticks: { color: getChartTextColor(), font: { size: 10 }, callback: function(v) { return formatBps(v); } },
          grid: { color: getChartGridColor() }
        }
      }
    }
  });
}

function renderPercentileChart(canvasId, chartKey, percentiles, p95Value, color) {
  var ctx = document.getElementById(canvasId).getContext('2d');
  if (charts[chartKey]) charts[chartKey].destroy();

  var labels = percentiles.map(function(p) { return p.percentile + '%'; });
  var values = percentiles.map(function(p) { return p.value; });
  var bgColors = percentiles.map(function(p) { return p.percentile === 95 ? '#F6821F' : color + 'AA'; });

  charts[chartKey] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'bit rate',
        data: values,
        backgroundColor: bgColors,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx) { return formatBps(ctx.parsed.y); } } }
      },
      scales: {
        x: { ticks: { color: getChartTextColor(), font: { size: 9 } }, grid: { display: false } },
        y: {
          ticks: { color: getChartTextColor(), font: { size: 10 }, callback: function(v) { return formatBps(v); } },
          grid: { color: getChartGridColor() }
        }
      }
    }
  });
}

// Build a tunnel -> region label map from the query's perRegion breakdown.
// Untagged tunnels (and anything missing) default to "Global".
function buildTunnelRegionMap(data) {
  var map = {};
  (data.perRegion || []).forEach(function(r) {
    var label = (r.region === 'UNTAGGED') ? 'Global' : r.regionLabel;
    (r.tunnels || []).forEach(function(t) { map[t] = label; });
  });
  return map;
}

// Flatten per-tunnel time-series into rows: one per tunnel/interval/direction.
function buildRawRows(data) {
  var regionMap = buildTunnelRegionMap(data);
  var rows = [];
  function pushDir(dir, tunnelSeries) {
    var series = tunnelSeries || {};
    Object.keys(series).forEach(function(tunnel) {
      series[tunnel].forEach(function(p) {
        rows.push({
          time: p.time,
          dir: dir,
          tunnel: tunnel,
          region: regionMap[tunnel] || 'Global',
          bitRate: p.bitRate,
          bits: p.bits,
          packets: p.packets,
        });
      });
    });
  }
  pushDir('ingress', data.ingress.tunnelSeries);
  pushDir('egress', data.egress.tunnelSeries);
  rows.sort(function(a, b) {
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    if (a.tunnel !== b.tunnel) return a.tunnel.localeCompare(b.tunnel);
    return a.dir.localeCompare(b.dir);
  });
  return rows;
}

function renderDataTable(data) {
  var rows = buildRawRows(data);

  var tbody = document.getElementById('data-table-rows');
  tbody.innerHTML = rows.slice(0, 500).map(function(r) {
    var dirColor = r.dir === 'ingress' ? '#22c55e' : '#3b82f6';
    return '<tr class="border-b border-cf-border">' +
      '<td class="py-1.5 pr-4" style="color:var(--text-primary)">' + formatTime(r.time) + '</td>' +
      '<td class="py-1.5 pr-4"><span style="color:' + dirColor + '">' + r.dir + '</span></td>' +
      '<td class="py-1.5 pr-4" style="color:var(--text-primary)">' + r.tunnel + '</td>' +
      '<td class="py-1.5 pr-4 text-cf-gray">' + r.region + '</td>' +
      '<td class="py-1.5 pr-4">' + formatBps(r.bitRate) + '</td>' +
      '<td class="py-1.5 pr-4">' + r.bits.toLocaleString() + '</td>' +
      '<td class="py-1.5">' + r.packets.toLocaleString() + '</td>' +
      '</tr>';
  }).join('');

  if (rows.length > 500) {
    tbody.innerHTML += '<tr><td colspan="7" class="py-2 text-cf-gray text-center">Showing 500 of ' + rows.length + ' rows</td></tr>';
  }
}

function toggleCharts() {
  var body = document.getElementById('charts-body');
  var chevron = document.getElementById('charts-chevron');
  body.classList.toggle('hidden');
  chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
}

function toggleRegionSection() {
  var body = document.getElementById('region-body');
  var chevron = document.getElementById('region-chevron');
  body.classList.toggle('hidden');
  chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
}

function toggleDataTable() {
  var body = document.getElementById('data-table-body');
  var chevron = document.getElementById('data-table-chevron');
  body.classList.toggle('hidden');
  chevron.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : '';
}

var lastQueryData = null;

function exportCsv() {
  if (!lastQueryData) return;
  function csvCell(v) {
    var s = String(v);
    return /[",\\x0a]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  var rows = [['Time', 'Direction', 'Tunnel', 'Region', 'Bit Rate (bps)', 'Bits', 'Packets']];
  buildRawRows(lastQueryData).forEach(function(r) {
    rows.push([r.time, r.dir, csvCell(r.tunnel), csvCell(r.region), r.bitRate, r.bits, r.packets]);
  });

  // Add summary rows
  rows.push([]);
  rows.push(['P95 Ingress (bps)', lastQueryData.ingress.p95]);
  rows.push(['P95 Egress (bps)', lastQueryData.egress.p95]);
  rows.push(['Peak Ingress (bps)', lastQueryData.ingress.peakBps]);
  rows.push(['Peak Egress (bps)', lastQueryData.egress.peakBps]);
  rows.push(['Avg Ingress (bps)', lastQueryData.ingress.avgBps]);
  rows.push(['Avg Egress (bps)', lastQueryData.egress.avgBps]);
  if (lastQueryData.cidr) {
    rows.push([]);
    rows.push(['CIDR Filter', lastQueryData.cidr.filter]);
    rows.push(['CIDR P95 Ingress (bps)', lastQueryData.cidr.ingress.p95]);
    rows.push(['CIDR P95 Egress (bps)', lastQueryData.cidr.egress.p95]);
    var pctIn = lastQueryData.ingress.p95 > 0 ? ((lastQueryData.cidr.ingress.p95 / lastQueryData.ingress.p95) * 100).toFixed(1) : '0.0';
    var pctEg = lastQueryData.egress.p95 > 0 ? ((lastQueryData.cidr.egress.p95 / lastQueryData.egress.p95) * 100).toFixed(1) : '0.0';
    rows.push(['CIDR % of Total P95 Ingress', pctIn + '%']);
    rows.push(['CIDR % of Total P95 Egress', pctEg + '%']);
    rows.push(['CIDR Peak Ingress (bps)', lastQueryData.cidr.ingress.peakBps]);
    rows.push(['CIDR Peak Egress (bps)', lastQueryData.cidr.egress.peakBps]);
  }

  if (lastQueryData.perRegion && lastQueryData.perRegion.length) {
    rows.push([]);
    rows.push(['Region', 'Tunnels', 'P95 Ingress (bps)', 'P95 Egress (bps)', 'Peak Ingress (bps)', 'Peak Egress (bps)', 'Avg Ingress (bps)', 'Avg Egress (bps)']);
    lastQueryData.perRegion.forEach(function(r) {
      rows.push([
        r.regionLabel,
        '"' + r.tunnels.join('; ') + '"',
        r.ingress.p95, r.egress.p95,
        r.ingress.peakBps, r.egress.peakBps,
        r.ingress.avgBps, r.egress.avgBps,
      ]);
    });
  }

  var csv = rows.map(function(r) { return r.join(','); }).join('\\x0a');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'p95-bandwidth-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>
</body>
</html>`;
}

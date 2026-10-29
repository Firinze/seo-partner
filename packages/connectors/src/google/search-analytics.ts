export interface GscPerformanceRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSummary90Days {
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
}

export async function fetchSearchAnalytics90Days(
  siteUrl: string,
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<GscSummary90Days> {
  const now = new Date();
  const past90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startDate = formatDate(past90);
  const endDate = formatDate(now);

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const body = {
    startDate,
    endDate,
    dimensions: ['query', 'page'],
    rowLimit: 500,
  };

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Erreur API Search Console (${response.status}) : ${response.statusText}`);
  }

  const data = (await response.json()) as { rows?: GscPerformanceRow[] };
  const rows = data.rows ?? [];

  let totalClicks = 0;
  let totalImpressions = 0;
  let weightedPositionSum = 0;

  const queryMap = new Map<string, { clicks: number; impressions: number; position: number }>();
  const pageMap = new Map<string, { clicks: number; impressions: number; position: number }>();

  for (const row of rows) {
    totalClicks += row.clicks;
    totalImpressions += row.impressions;
    weightedPositionSum += row.position * row.impressions;

    const query = row.keys[0] ?? '';
    const page = row.keys[1] ?? '';

    if (query) {
      const q = queryMap.get(query) ?? { clicks: 0, impressions: 0, position: 0 };
      q.clicks += row.clicks;
      q.impressions += row.impressions;
      q.position = row.position;
      queryMap.set(query, q);
    }

    if (page) {
      const p = pageMap.get(page) ?? { clicks: 0, impressions: 0, position: 0 };
      p.clicks += row.clicks;
      p.impressions += row.impressions;
      p.position = row.position;
      pageMap.set(page, p);
    }
  }

  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averagePosition = totalImpressions > 0 ? weightedPositionSum / totalImpressions : 0;

  const topQueries = Array.from(queryMap.entries())
    .map(([query, val]) => ({ query, ...val }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const topPages = Array.from(pageMap.entries())
    .map(([page, val]) => ({ page, ...val }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    startDate,
    endDate,
    totalClicks,
    totalImpressions,
    averageCtr: Math.round(averageCtr * 100) / 100,
    averagePosition: Math.round(averagePosition * 10) / 10,
    topQueries,
    topPages,
  };
}


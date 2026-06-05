import { jsonResponse, legacyHandler } from "./_lib/http.mjs";
import { readState } from "./_lib/storage.mjs";

export default async function articles(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const state = await readState();
  const articles = filterArticles(state.articles, query);
  const clusters = attachClusters(articles, state.clusters);
  return jsonResponse({ ok: true, articles, clusters, total: articles.length });
}

export const config = { path: "/api/articles" };
export const handler = legacyHandler(articles);

function filterArticles(articles, query) {
  const tab = query.tab || "精选情报";
  const keyword = (query.q || "").trim();
  const limit = Math.min(Number(query.limit || 120), 300);
  return articles
    .filter((item) => {
      if (tab === "精选情报" && !item.featured) return false;
      if (tab === "经营借鉴" && item.category !== "经营借鉴") return false;
      if (tab === "政策监管" && item.category !== "政策监管") return false;
      if (tab === "风险预警" && item.category !== "风险预警") return false;
      if (keyword) {
        const text = `${item.title} ${item.summary} ${item.reason} ${item.sourceName} ${item.region} ${item.tags?.join(" ")}`;
        if (!text.includes(keyword)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.featured - a.featured) || b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
}

function attachClusters(articles, clusters) {
  const ids = new Set(articles.map((item) => item.id));
  return clusters.filter((cluster) => ids.has(cluster.masterId) || cluster.relatedIds?.some((id) => ids.has(id)));
}

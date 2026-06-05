import { normalizeText, isRelevantPassengerNews } from "./rules.mjs";
import { env } from "./env.mjs";

const MAX_LINKS_PER_SOURCE = Number(env("MAX_LINKS_PER_SOURCE", "6"));
const REQUEST_TIMEOUT_MS = Number(env("REQUEST_TIMEOUT_MS", "8000"));

export async function fetchSourceCandidates(source) {
  const html = await fetchText(source.listUrl || source.url);
  const links = extractLinks(html, source).slice(0, MAX_LINKS_PER_SOURCE);
  const candidates = [];
  for (const link of links) {
    const candidate = {
      title: link.title,
      url: link.url,
      sourceName: source.name,
      region: source.region,
      content: link.title,
      publishedAt: link.publishedAt || new Date().toISOString(),
    };
    if (!isRelevantPassengerNews(candidate)) continue;
    try {
      const articleHtml = await fetchText(link.url);
      candidate.content = extractArticleText(articleHtml) || link.title;
      candidate.publishedAt = extractPublishedAt(articleHtml) || candidate.publishedAt;
    } catch {
      candidate.content = link.title;
    }
    if (isRelevantPassengerNews(candidate)) candidates.push(candidate);
  }
  return candidates;
}

export async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PassengerIntelligenceBot/2.0 (+https://netlify.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`抓取失败 ${response.status}: ${url}`);
  const buffer = await response.arrayBuffer();
  const charset = charsetFromHeaders(response.headers.get("content-type")) || charsetFromHtml(buffer) || "utf-8";
  return new TextDecoder(charset, { fatal: false }).decode(buffer);
}

function charsetFromHeaders(contentType = "") {
  const match = contentType.match(/charset=([^;]+)/i);
  return normalizeCharset(match?.[1]);
}

function charsetFromHtml(buffer) {
  const start = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 1600));
  const match = start.match(/charset=["']?([a-z0-9_-]+)/i);
  return normalizeCharset(match?.[1]);
}

function normalizeCharset(value = "") {
  const lowered = String(value).trim().toLowerCase();
  if (!lowered) return "";
  if (["gbk", "gb2312", "gb18030"].includes(lowered)) return "gb18030";
  return lowered;
}

export function extractLinks(html, source) {
  const base = source.listUrl || source.url;
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const href = match[1];
    const title = normalizeText(match[2]).replace(/\s+/g, "");
    if (!title || title.length < 6 || title.length > 80) continue;
    const url = absolutizeUrl(href, base);
    if (!url || !/^https?:\/\//.test(url)) continue;
    if (links.some((item) => item.url === url || item.title === title)) continue;
    links.push({ title, url });
  }
  return links;
}

function absolutizeUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

export function extractArticleText(html) {
  const mainMatch =
    html.match(/<article[\s\S]*?<\/article>/i) ||
    html.match(/<div[^>]+class=["'][^"']*(?:TRS_Editor|article|content|main|detail)[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  const raw = mainMatch ? mainMatch[0] : html;
  return normalizeText(raw).slice(0, 2400);
}

export function extractPublishedAt(html) {
  const text = normalizeText(html);
  const match = text.match(/(20\d{2}[-年/]\d{1,2}[-月/]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
  if (!match) return "";
  return match[1].replace("年", "-").replace("月", "-").replace("日", "").replaceAll("/", "-");
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClusters,
  enrichCandidate,
  isRelevantPassengerNews,
  mergeArticles,
} from "../netlify/functions/_lib/rules.mjs";

const t1Source = {
  id: "mot-news",
  name: "交通运输部",
  tier: "T1",
  type: "官方",
  region: "全国",
};

const t2Source = {
  id: "media",
  name: "行业媒体",
  tier: "T2",
  type: "行业媒体",
  region: "全国",
};

test("国外民航新闻不会进入客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "美国机场航班延误影响旅客出行",
    content: "美国机场航班延误，属于国外民航信息。",
    region: "国外",
  }), false);
});

test("纯铁路信息不会进入道路客运情报", () => {
  assert.equal(isRelevantPassengerNews({
    title: "铁路部门调整高铁列车运行图",
    content: "本次调整涉及多趟高铁和铁路列车。",
    region: "全国",
  }), false);
});

test("道路客运政策能进入政策监管", () => {
  const article = enrichCandidate({
    title: "交通运输部发布道路客运安全监管通知",
    content: "通知要求各地加强道路客运、旅游包车和客运班线安全监管。",
    url: "https://example.com/policy",
  }, t1Source);
  assert.equal(article.category, "政策监管");
  assert.equal(article.featured, true);
  assert.ok(article.score >= 70);
});

test("同行经营案例能进入经营借鉴", () => {
  const article = enrichCandidate({
    title: "客运集团推进客运站转型和交旅融合经营",
    content: "企业利用客运站资源发展旅游集散、定制客运和便民服务。",
    url: "https://example.com/business",
  }, t2Source);
  assert.equal(article.category, "经营借鉴");
  assert.ok(article.reason.includes("经营"));
});

test("相似标题能聚类为同一事件", () => {
  const a = enrichCandidate({
    title: "某市客运班线恢复运营并优化发车班次",
    content: "某市道路客运班线恢复运营。",
    url: "https://example.com/a",
  }, t1Source);
  const b = enrichCandidate({
    title: "某市多条客运班线恢复运营",
    content: "当地多条道路客运班线恢复。",
    url: "https://example.com/b",
  }, t2Source);
  const merged = mergeArticles([a], [b], 20);
  const clusters = buildClusters(merged);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 2);
});


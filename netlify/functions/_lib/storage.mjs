import fs from "node:fs/promises";
import path from "node:path";
import { isNetlify, isServerlessRuntime } from "./env.mjs";

const root = globalThis.process?.cwd?.() || "F:/制作自动捕捉网站";
const localDir = path.join(root, ".netlify-local");
const localStatePath = path.join(localDir, "passenger-state.json");
const samplePath = path.join(root, "data", "sample-state.json");
const storeName = "passenger-intelligence";
const stateKey = "state.json";

async function sampleState() {
  const raw = await fs.readFile(samplePath, "utf8");
  return JSON.parse(raw);
}

async function getBlobStore() {
  if (!isNetlify()) return null;
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(storeName);
  } catch {
    return null;
  }
}

function canWriteLocalCache() {
  return !isNetlify() && !isServerlessRuntime();
}

async function readLocalState() {
  try {
    const raw = await fs.readFile(localStatePath, "utf8");
    return JSON.parse(raw);
  } catch {
    const initial = await sampleState();
    if (canWriteLocalCache()) await writeLocalState(initial);
    return initial;
  }
}

async function writeLocalState(state) {
  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(localStatePath, JSON.stringify(state, null, 2), "utf8");
}

export async function readState() {
  const store = await getBlobStore();
  if (store) {
    const state = await store.get(stateKey, { type: "json" });
    if (state) return state;
    const initial = await sampleState();
    await store.setJSON(stateKey, initial);
    return initial;
  }
  if (!canWriteLocalCache()) return await sampleState();
  return readLocalState();
}

export async function writeState(state) {
  const normalized = normalizeState(state);
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(stateKey, normalized);
    return normalized;
  }
  if (!canWriteLocalCache()) return normalized;
  await writeLocalState(normalized);
  return normalized;
}

export function normalizeState(state = {}) {
  return {
    articles: Array.isArray(state.articles) ? state.articles : [],
    clusters: Array.isArray(state.clusters) ? state.clusters : [],
    briefing: state.briefing || null,
    logs: Array.isArray(state.logs) ? state.logs : [],
    cursor: Number.isInteger(state.cursor) ? state.cursor : 0,
  };
}

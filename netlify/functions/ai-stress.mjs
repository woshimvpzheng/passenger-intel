import { analyzeWithAI } from "./_lib/ai.mjs";
import { jsonResponse, legacyHandler } from "./_lib/http.mjs";

export default async function aiStress() {
  const startedAt = Date.now();
  const source = {
    id: "stress-source",
    name: "测试信源",
    tier: "T1",
    type: "官方",
    region: "全国",
  };
  const candidate = {
    title: "道路客运定制服务和旅游包车安全监管试点方案发布",
    content: "交通运输主管部门发布道路客运定制服务、农村客运、旅游包车安全监管和客运站综合服务试点方案，要求企业关注线路运营、车辆安全、驾驶员管理和经营转型。",
    url: "https://example.com/stress",
    region: "全国",
  };
  const calls = [];
  for (let i = 0; i < 4; i += 1) {
    const callStartedAt = Date.now();
    try {
      const result = await analyzeWithAI({ ...candidate, title: `${candidate.title}${i + 1}` }, source);
      calls.push({
        ok: Boolean(result?.summary),
        ms: Date.now() - callStartedAt,
        category: result?.category || "",
      });
    } catch (error) {
      calls.push({
        ok: false,
        ms: Date.now() - callStartedAt,
        error: error.message,
      });
    }
  }
  return jsonResponse({
    ok: calls.every((call) => call.ok),
    totalMs: Date.now() - startedAt,
    calls,
  });
}

export const handler = legacyHandler(aiStress);

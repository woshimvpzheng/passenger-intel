export function env(name, fallback = "") {
  const netlifyEnv = globalThis.Netlify?.env;
  if (netlifyEnv?.get) return netlifyEnv.get(name) || fallback;
  return globalThis.process?.env?.[name] || fallback;
}

export function isNetlify() {
  return Boolean(globalThis.Netlify || globalThis.process?.env?.NETLIFY);
}

export function isProductionDeploy() {
  return globalThis.Netlify?.context?.deploy?.context === "production" || globalThis.process?.env?.CONTEXT === "production";
}

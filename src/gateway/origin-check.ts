import { isLoopbackHost, normalizeHostHeader } from "./net.js";

type OriginCheckResult =
  | {
      ok: true;
      matchedBy: "allowlist" | "host-header-fallback" | "local-loopback";
    }
  | { ok: false; reason: string };

/**
 * 正規化 origin：移除預設 port（https → :443，http → :80），
 * 讓 allowlist 單一項目可同時匹配「有無帶預設 port」的請求（例如 GitHub Codespaces / 反向代理常送 :443）。
 */
function normalizeOriginForAllowlist(origin: string): string {
  const lower = origin.trim().toLowerCase();
  if (lower.endsWith(":443") && (lower.startsWith("https://") || lower.startsWith("wss://"))) {
    return lower.slice(0, -4);
  }
  if (lower.endsWith(":80") && (lower.startsWith("http://") || lower.startsWith("ws://"))) {
    return lower.slice(0, -3);
  }
  return lower;
}

function parseOrigin(
  originRaw?: string,
): { origin: string; host: string; hostname: string } | null {
  const trimmed = (originRaw ?? "").trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }
  try {
    const url = new URL(trimmed);
    return {
      origin: url.origin.toLowerCase(),
      host: url.host.toLowerCase(),
      hostname: url.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function checkBrowserOrigin(params: {
  requestHost?: string;
  origin?: string;
  allowedOrigins?: string[];
  allowHostHeaderOriginFallback?: boolean;
  isLocalClient?: boolean;
}): OriginCheckResult {
  const parsedOrigin = parseOrigin(params.origin);
  if (!parsedOrigin) {
    return { ok: false, reason: "origin missing or invalid" };
  }

  const allowlist = new Set(
    (params.allowedOrigins ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((v) => (v === "*" ? v : normalizeOriginForAllowlist(v))),
  );
  const requestOriginNormalized = normalizeOriginForAllowlist(parsedOrigin.origin);
  if (allowlist.has("*") || allowlist.has(parsedOrigin.origin) || allowlist.has(requestOriginNormalized)) {
    return { ok: true, matchedBy: "allowlist" };
  }

  const requestHost = normalizeHostHeader(params.requestHost);
  if (
    params.allowHostHeaderOriginFallback === true &&
    requestHost &&
    parsedOrigin.host === requestHost
  ) {
    return { ok: true, matchedBy: "host-header-fallback" };
  }

  // Dev fallback only for genuinely local socket clients, not Host-header claims.
  if (params.isLocalClient && isLoopbackHost(parsedOrigin.hostname)) {
    return { ok: true, matchedBy: "local-loopback" };
  }

  return { ok: false, reason: "origin not allowed" };
}

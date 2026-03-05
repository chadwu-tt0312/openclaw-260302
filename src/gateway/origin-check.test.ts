import { describe, expect, it } from "vitest";
import { checkBrowserOrigin } from "./origin-check.js";

describe("checkBrowserOrigin", () => {
  it("accepts same-origin host matches only with legacy host-header fallback", () => {
    const result = checkBrowserOrigin({
      requestHost: "127.0.0.1:18789",
      origin: "http://127.0.0.1:18789",
      allowHostHeaderOriginFallback: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matchedBy).toBe("host-header-fallback");
    }
  });

  it("rejects same-origin host matches when legacy host-header fallback is disabled", () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.example.com:18789",
      origin: "https://gateway.example.com:18789",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts loopback host mismatches for dev", () => {
    const result = checkBrowserOrigin({
      requestHost: "127.0.0.1:18789",
      origin: "http://localhost:5173",
      isLocalClient: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects loopback origin mismatches when request is not local", () => {
    const result = checkBrowserOrigin({
      requestHost: "127.0.0.1:18789",
      origin: "http://localhost:5173",
      isLocalClient: false,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts allowlisted origins", () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.example.com:18789",
      origin: "https://control.example.com",
      allowedOrigins: ["https://control.example.com"],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts wildcard allowedOrigins", () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.example.com:18789",
      origin: "https://any-origin.example.com",
      allowedOrigins: ["*"],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing origin", () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.example.com:18789",
      origin: "",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects mismatched origins", () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.example.com:18789",
      origin: "https://attacker.example.com",
    });
    expect(result.ok).toBe(false);
  });

  it('accepts any origin when allowedOrigins includes "*" (regression: #30990)', () => {
    const result = checkBrowserOrigin({
      requestHost: "100.86.79.37:18789",
      origin: "https://100.86.79.37:18789",
      allowedOrigins: ["*"],
    });
    expect(result.ok).toBe(true);
  });

  it('accepts any origin when allowedOrigins includes "*" alongside specific entries', () => {
    const result = checkBrowserOrigin({
      requestHost: "gateway.tailnet.ts.net:18789",
      origin: "https://gateway.tailnet.ts.net:18789",
      allowedOrigins: ["https://control.example.com", "*"],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts wildcard entries with surrounding whitespace", () => {
    const result = checkBrowserOrigin({
      requestHost: "100.86.79.37:18789",
      origin: "https://100.86.79.37:18789",
      allowedOrigins: [" * "],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts request origin with explicit :443 when allowlist has no port (e.g. GitHub Codespaces)", () => {
    const result = checkBrowserOrigin({
      requestHost: "ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev",
      origin: "https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev:443",
      allowedOrigins: ["https://ominous-adventure-jvxwqqj6g4ghq464-18789.app.github.dev"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.matchedBy).toBe("allowlist");
  });

  it("accepts request origin without port when allowlist has :443", () => {
    const result = checkBrowserOrigin({
      requestHost: "control.example.com",
      origin: "https://control.example.com",
      allowedOrigins: ["https://control.example.com:443"],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts http request origin with :80 when allowlist has no port", () => {
    const result = checkBrowserOrigin({
      requestHost: "localhost:18789",
      origin: "http://localhost:80",
      allowedOrigins: ["http://localhost"],
    });
    expect(result.ok).toBe(true);
  });
});

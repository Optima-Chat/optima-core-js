import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateTraceId,
  generateRequestId,
  parseTraceId,
  getTraceContext,
  getTraceId,
  getRequestId,
  runWithTraceContext,
  parseTraceContextFromHeaders,
  getTraceHeaders,
  withTracing,
} from "../src/tracing";

describe("generateTraceId", () => {
  it("should generate valid trace id format", () => {
    const traceId = generateTraceId("auth");

    const parts = traceId.split("-");
    expect(parts.length).toBe(3);
    expect(parts[2]).toBe("auth");
    expect(parts[1].length).toBe(12);
  });

  it("should generate unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
    expect(ids.size).toBe(100);
  });

  it("should use default service short", () => {
    const traceId = generateTraceId();
    expect(traceId).toContain("-svc");
  });
});

describe("generateRequestId", () => {
  it("should generate valid request id format", () => {
    const requestId = generateRequestId("auth");

    expect(requestId).toMatch(/^auth_[a-f0-9]{12}$/);
  });

  it("should use default prefix", () => {
    const requestId = generateRequestId();
    expect(requestId).toMatch(/^req_/);
  });
});

describe("parseTraceId", () => {
  it("should parse valid trace id", () => {
    const traceId = generateTraceId("auth");
    const result = parseTraceId(traceId);

    expect(result.valid).toBe(true);
    expect(result.serviceShort).toBe("auth");
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.random?.length).toBe(12);
  });

  it("should handle invalid trace id", () => {
    const result = parseTraceId("invalid");

    expect(result.valid).toBe(false);
    expect(result.raw).toBe("invalid");
  });

  it("should handle service short with dash", () => {
    const result = parseTraceId("67890abc-f1e2d3c4b5a6-my-service");

    expect(result.valid).toBe(true);
    expect(result.serviceShort).toBe("my-service");
  });
});

describe("TraceContext", () => {
  it("should return empty context by default", () => {
    const ctx = getTraceContext();
    expect(ctx).toEqual({});
  });

  it("should run with trace context", async () => {
    let capturedTraceId: string | undefined;

    await runWithTraceContext(
      { traceId: "trace-123", requestId: "req-456" },
      () => {
        capturedTraceId = getTraceId();
      }
    );

    expect(capturedTraceId).toBe("trace-123");
  });

  it("should isolate async contexts", async () => {
    const results: string[] = [];

    await Promise.all([
      runWithTraceContext({ traceId: "trace-1" }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(getTraceId() || "");
      }),
      runWithTraceContext({ traceId: "trace-2" }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push(getTraceId() || "");
      }),
    ]);

    expect(results).toContain("trace-1");
    expect(results).toContain("trace-2");
  });

  it("should get request id", () => {
    runWithTraceContext({ requestId: "req-123" }, () => {
      expect(getRequestId()).toBe("req-123");
    });
  });
});

describe("parseTraceContextFromHeaders", () => {
  it("should parse headers", () => {
    const headers = new Headers({
      "X-Trace-ID": "trace-123",
      "X-Parent-Span-ID": "span-456",
    });

    const ctx = parseTraceContextFromHeaders(headers);

    expect(ctx.traceId).toBe("trace-123");
    expect(ctx.parentSpanId).toBe("span-456");
  });

  it("should handle missing headers", () => {
    const headers = new Headers();
    const ctx = parseTraceContextFromHeaders(headers);

    expect(ctx.traceId).toBeUndefined();
    expect(ctx.parentSpanId).toBeUndefined();
  });
});

describe("getTraceHeaders", () => {
  it("should return empty when no context", () => {
    const headers = getTraceHeaders();
    expect(headers).toEqual({});
  });

  it("should return headers from context", () => {
    runWithTraceContext({ traceId: "trace-123", requestId: "req-456" }, () => {
      const headers = getTraceHeaders();
      expect(headers["X-Trace-ID"]).toBe("trace-123");
      expect(headers["X-Parent-Span-ID"]).toBe("req-456");
    });
  });
});

describe("withTracing", () => {
  it("should wrap handler with tracing", async () => {
    const handler = withTracing(
      async () => Response.json({ ok: true }),
      { serviceName: "test-service", serviceShort: "test" }
    );

    const request = new Request("http://localhost/api");
    const response = await handler(request);

    expect(response.headers.get("X-Trace-ID")).toBeDefined();
    expect(response.headers.get("X-Request-ID")).toMatch(/^test_/);
    expect(response.headers.get("X-Response-Time")).toMatch(/ms$/);
    expect(response.headers.get("X-Served-By")).toContain("test-service");
  });

  it("should preserve upstream trace id", async () => {
    const handler = withTracing(
      async () => Response.json({ ok: true }),
      { serviceName: "test" }
    );

    const request = new Request("http://localhost/api", {
      headers: { "X-Trace-ID": "upstream-trace-123" },
    });
    const response = await handler(request);

    expect(response.headers.get("X-Trace-ID")).toBe("upstream-trace-123");
  });

  it("should generate trace id if not provided", async () => {
    const handler = withTracing(
      async () => Response.json({ ok: true }),
      { serviceName: "test", serviceShort: "tst" }
    );

    const request = new Request("http://localhost/api");
    const response = await handler(request);

    expect(response.headers.get("X-Trace-ID")).toContain("-tst");
  });
});

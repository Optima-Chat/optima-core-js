import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tracedFetch, createTracedClient } from "../src/http";
import { runWithTraceContext } from "../src/tracing";

describe("tracedFetch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call fetch with url", async () => {
    await tracedFetch("http://localhost/api");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/api",
      expect.any(Object)
    );
  });

  it("should inject trace headers when in context", async () => {
    await runWithTraceContext(
      { traceId: "trace-123", requestId: "req-456" },
      async () => {
        await tracedFetch("http://localhost/api");
      }
    );

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = options.headers;

    expect(headers.get("X-Trace-ID")).toBe("trace-123");
    expect(headers.get("X-Parent-Span-ID")).toBe("req-456");
  });

  it("should not inject headers when disabled", async () => {
    await runWithTraceContext({ traceId: "trace-123" }, async () => {
      await tracedFetch("http://localhost/api", { injectTracing: false });
    });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = options.headers;

    expect(headers.has("X-Trace-ID")).toBe(false);
  });

  it("should preserve user headers", async () => {
    await tracedFetch("http://localhost/api", {
      headers: { Authorization: "Bearer token" },
    });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = options.headers;

    expect(headers.get("Authorization")).toBe("Bearer token");
  });

  it("should not override user-provided trace headers", async () => {
    await runWithTraceContext({ traceId: "trace-123" }, async () => {
      await tracedFetch("http://localhost/api", {
        headers: { "X-Trace-ID": "custom-trace" },
      });
    });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = options.headers;

    expect(headers.get("X-Trace-ID")).toBe("custom-trace");
  });
});

describe("createTracedClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create client with base url", async () => {
    const client = createTracedClient("http://localhost:8000");

    await client.get("/api/users");

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:8000/api/users"),
      expect.any(Object)
    );
  });

  it("should send GET request", async () => {
    const client = createTracedClient("http://localhost");

    await client.get("/api");

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("GET");
  });

  it("should send POST request with JSON body", async () => {
    const client = createTracedClient("http://localhost");

    await client.post("/api", { name: "test" });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe('{"name":"test"}');
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("should send PUT request", async () => {
    const client = createTracedClient("http://localhost");

    await client.put("/api/1", { name: "updated" });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("PUT");
  });

  it("should send PATCH request", async () => {
    const client = createTracedClient("http://localhost");

    await client.patch("/api/1", { name: "patched" });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("PATCH");
  });

  it("should send DELETE request", async () => {
    const client = createTracedClient("http://localhost");

    await client.delete("/api/1");

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("DELETE");
  });

  it("should inject trace headers", async () => {
    const client = createTracedClient("http://localhost");

    await runWithTraceContext({ traceId: "trace-123" }, async () => {
      await client.get("/api");
    });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.get("X-Trace-ID")).toBe("trace-123");
  });
});

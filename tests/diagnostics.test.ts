import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runHealthChecks,
  createHealthHandler,
  getDebugInfo,
  getDebugConfig,
  createDebugInfoHandler,
  createDebugConfigHandler,
} from "../src/diagnostics";

describe("runHealthChecks", () => {
  it("should return healthy status with no checks", async () => {
    const result = await runHealthChecks("test-service");

    expect(result.status).toBe("healthy");
    expect(result.service).toBe("test-service");
    expect(result.checks).toEqual({});
  });

  it("should run sync checks", async () => {
    const result = await runHealthChecks("test-service", {
      database: () => ({ status: "healthy" }),
    });

    expect(result.status).toBe("healthy");
    expect(result.checks.database.status).toBe("healthy");
    expect(result.checks.database.latencyMs).toBeDefined();
  });

  it("should run async checks", async () => {
    const result = await runHealthChecks("test-service", {
      database: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { status: "healthy" };
      },
    });

    expect(result.status).toBe("healthy");
    expect(result.checks.database.latencyMs).toBeGreaterThanOrEqual(10);
  });

  it("should handle failing checks", async () => {
    const result = await runHealthChecks("test-service", {
      database: () => ({ status: "unhealthy", error: "Connection failed" }),
    });

    expect(result.status).toBe("unhealthy");
    expect(result.checks.database.status).toBe("unhealthy");
  });

  it("should handle check exceptions", async () => {
    const result = await runHealthChecks("test-service", {
      database: () => {
        throw new Error("Connection refused");
      },
    });

    expect(result.status).toBe("unhealthy");
    expect(result.checks.database.status).toBe("unhealthy");
    expect(result.checks.database.error).toBe("Connection refused");
  });

  it("should include version info", async () => {
    const result = await runHealthChecks("test-service");

    expect(result.version).toBeDefined();
    expect(result.gitCommit).toBeDefined();
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });
});

describe("createHealthHandler", () => {
  it("should return a handler function", () => {
    const handler = createHealthHandler({ serviceName: "test" });
    expect(typeof handler).toBe("function");
  });

  it("should return 200 for healthy service", async () => {
    const handler = createHealthHandler({
      serviceName: "test",
      checks: {
        db: () => ({ status: "healthy" }),
      },
    });

    const response = await handler();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("healthy");
  });

  it("should return 503 for unhealthy service", async () => {
    const handler = createHealthHandler({
      serviceName: "test",
      checks: {
        db: () => ({ status: "unhealthy" }),
      },
    });

    const response = await handler();

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.status).toBe("unhealthy");
  });
});

describe("getDebugInfo", () => {
  it("should return debug info", () => {
    const info = getDebugInfo();

    expect(info.build).toBeDefined();
    expect(info.build.gitCommit).toBeDefined();
    expect(info.runtime).toBeDefined();
    expect(info.runtime.nodeVersion).toBeDefined();
    expect(info.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe("getDebugConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return masked config", () => {
    process.env.DATABASE_URL = "postgresql://user:password@localhost/db";
    process.env.DATABASE_SECRET = "supersecret123";
    process.env.API_KEY = "key123";

    const config = getDebugConfig(["DATABASE", "API"]);

    expect(config.config.DATABASE_URL).toBe(
      "postgresql://user:***@localhost/db"
    );
    expect(config.config.DATABASE_SECRET).toMatch(/\*\* \(\d+ chars\)/);
    expect(config.config.API_KEY).toMatch(/\*\* \(\d+ chars\)/);
  });

  it("should detect infisical", () => {
    process.env.INFISICAL_CLIENT_ID = "client-123";

    const config = getDebugConfig();

    expect(config.infisicalEnabled).toBe(true);
    expect(config.configSource).toBe("infisical");
  });
});

describe("createDebugInfoHandler", () => {
  it("should return debug info without auth by default", async () => {
    const handler = createDebugInfoHandler();
    const request = new Request("http://localhost/debug/info");

    const response = await handler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.build).toBeDefined();
  });

  it("should require auth when configured", async () => {
    const handler = createDebugInfoHandler({ requireKey: true });
    const request = new Request("http://localhost/debug/info");

    const response = await handler(request);

    expect(response.status).toBe(401);
  });
});

describe("createDebugConfigHandler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should require X-Debug-Key header", async () => {
    const handler = createDebugConfigHandler();
    const request = new Request("http://localhost/debug/config");

    const response = await handler(request);

    expect(response.status).toBe(401);
  });

  it("should return config with valid key", async () => {
    process.env.DEBUG_KEY = "secret-key";
    process.env.DATABASE_URL = "postgresql://localhost/db";

    const handler = createDebugConfigHandler();
    const request = new Request("http://localhost/debug/config", {
      headers: { "X-Debug-Key": "secret-key" },
    });

    const response = await handler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.config).toBeDefined();
  });
});

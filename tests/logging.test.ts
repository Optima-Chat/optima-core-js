import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, configureLogger, getLogger } from "../src/logging";
import { runWithTraceContext } from "../src/tracing";

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create logger with service name", () => {
    const logger = createLogger({ serviceName: "test-service" });

    expect(logger).toHaveProperty("debug");
    expect(logger).toHaveProperty("info");
    expect(logger).toHaveProperty("warn");
    expect(logger).toHaveProperty("error");
  });

  it("should log info message", () => {
    const logger = createLogger({ serviceName: "test-service" });

    logger.info("Test message");

    expect(console.info).toHaveBeenCalled();
  });

  it("should log with extra data", () => {
    const logger = createLogger({ serviceName: "test-service" });

    logger.info("Test message", { userId: "123" });

    expect(console.info).toHaveBeenCalled();
  });

  it("should log error with exception", () => {
    const logger = createLogger({ serviceName: "test-service" });
    const error = new Error("Test error");

    logger.exception("Something failed", error);

    expect(console.error).toHaveBeenCalled();
  });

  it("should respect log level", () => {
    const logger = createLogger({ serviceName: "test", level: "warn" });

    logger.debug("Debug message");
    logger.info("Info message");
    logger.warn("Warn message");
    logger.error("Error message");

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("should include trace context in logs", () => {
    const logger = createLogger({ serviceName: "test-service" });
    let logOutput = "";

    vi.spyOn(console, "info").mockImplementation((msg) => {
      logOutput = msg;
    });

    runWithTraceContext({ traceId: "trace-123" }, () => {
      logger.info("Test message");
    });

    expect(logOutput).toContain("trace-123");
  });

  it("should format as JSON by default", () => {
    const logger = createLogger({ serviceName: "test", format: "json" });
    let logOutput = "";

    vi.spyOn(console, "info").mockImplementation((msg) => {
      logOutput = msg;
    });

    logger.info("Test message");

    const parsed = JSON.parse(logOutput);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Test message");
    expect(parsed.service).toBe("test");
  });

  it("should format as text when configured", () => {
    const logger = createLogger({ serviceName: "test", format: "text" });
    let logOutput = "";

    vi.spyOn(console, "info").mockImplementation((msg) => {
      logOutput = msg;
    });

    logger.info("Test message");

    expect(logOutput).toContain("[INFO]");
    expect(logOutput).toContain("test");
    expect(logOutput).toContain("Test message");
  });
});

describe("configureLogger and getLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return noop logger when not configured", () => {
    const logger = getLogger();

    // Should not throw
    logger.info("Test");
    logger.error("Error");
  });

  it("should use configured logger", () => {
    configureLogger({ serviceName: "configured-service" });

    const logger = getLogger();
    logger.info("Test message");

    expect(console.info).toHaveBeenCalled();
  });
});

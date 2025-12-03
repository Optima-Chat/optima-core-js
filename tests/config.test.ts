import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBuildInfo, getCachedBuildInfo } from "../src/config";

describe("getBuildInfo", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default values when env vars not set", () => {
    delete process.env.GIT_COMMIT;
    delete process.env.GIT_BRANCH;
    delete process.env.APP_VERSION;

    const info = getBuildInfo();

    expect(info.gitCommit).toBe("unknown");
    expect(info.shortCommit).toBe("unknown");
    expect(info.gitBranch).toBe("unknown");
    expect(info.version).toBe("0.0.0");
  });

  it("should read from environment variables", () => {
    process.env.GIT_COMMIT = "abc123def456";
    process.env.GIT_BRANCH = "main";
    process.env.APP_VERSION = "1.2.3";
    process.env.DEPLOYMENT_ID = "blue";

    const info = getBuildInfo();

    expect(info.gitCommit).toBe("abc123def456");
    expect(info.shortCommit).toBe("abc123d");
    expect(info.gitBranch).toBe("main");
    expect(info.version).toBe("1.2.3");
    expect(info.deploymentId).toBe("blue");
  });

  it("should generate shortCommit from gitCommit", () => {
    process.env.GIT_COMMIT = "abcdefghijklmnop";

    const info = getBuildInfo();

    expect(info.shortCommit).toBe("abcdefg");
  });
});

describe("getCachedBuildInfo", () => {
  it("should return build info", () => {
    const info = getCachedBuildInfo();

    expect(info).toHaveProperty("gitCommit");
    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("environment");
  });
});

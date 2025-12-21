/**
 * 调试端点模块
 */

import { getCachedBuildInfo } from "../config/build-info";

// 启动时间
const startTime = Date.now();

export interface DebugInfoResponse {
  build: {
    gitCommit: string;
    gitBranch: string;
    buildDate: string;
    version: string;
  };
  runtime: {
    nodeVersion: string;
    environment: string;
    debugMode: boolean;
    logLevel: string;
  };
  startupTime: string;
  uptimeSeconds: number;
}

export interface DebugConfigResponse {
  config: Record<string, string>;
  /** 构建时内联的环境变量（如 Next.js 的 NEXT_PUBLIC_*） */
  buildTimeConfig?: Record<string, string>;
  infisicalEnabled: boolean;
  configSource: string;
  environment: string;
}

/**
 * 获取调试信息
 */
export function getDebugInfo(): DebugInfoResponse {
  const buildInfo = getCachedBuildInfo();

  return {
    build: {
      gitCommit: buildInfo.gitCommit,
      gitBranch: buildInfo.gitBranch,
      buildDate: buildInfo.buildDate,
      version: buildInfo.version,
    },
    runtime: {
      nodeVersion: process.version,
      environment: buildInfo.environment,
      debugMode: process.env.DEBUG === "true",
      logLevel: process.env.LOG_LEVEL || "info",
    },
    startupTime: new Date(startTime).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}

/**
 * 敏感环境变量模式
 */
const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /private/i,
  /auth/i,
];

/**
 * 脱敏环境变量值
 */
function maskValue(key: string, value: string): string {
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

  if (isSensitive) {
    return `** (${value.length} chars)`;
  }

  // URL 中的密码脱敏
  if (value.includes("://") && value.includes("@")) {
    return value.replace(/:([^@/]+)@/, ":***@");
  }

  return value;
}

/**
 * 获取脱敏后的配置
 */
export function getDebugConfig(
  allowedPrefixes: string[] = ["DATABASE", "REDIS", "OAUTH", "CORS", "API"],
  buildTimeEnv?: Record<string, string | undefined>
): DebugConfigResponse {
  const config: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;

    // 只返回指定前缀的变量
    const matchesPrefix = allowedPrefixes.some((prefix) =>
      key.startsWith(prefix)
    );

    if (matchesPrefix) {
      config[key] = maskValue(key, value);
    }
  }

  // 处理构建时内联的环境变量
  let buildTimeConfig: Record<string, string> | undefined;
  if (buildTimeEnv) {
    buildTimeConfig = {};
    for (const [key, value] of Object.entries(buildTimeEnv)) {
      if (value) {
        buildTimeConfig[key] = maskValue(key, value);
      }
    }
  }

  return {
    config,
    buildTimeConfig,
    infisicalEnabled: !!process.env.INFISICAL_CLIENT_ID,
    configSource: process.env.INFISICAL_CLIENT_ID ? "infisical" : "env",
    environment: process.env.NODE_ENV || "development",
  };
}

/**
 * 验证 Debug Key
 */
export function validateDebugKey(request: Request): boolean {
  const debugKey = process.env.DEBUG_KEY;
  if (!debugKey) {
    return false;
  }

  const providedKey = request.headers.get("X-Debug-Key");
  return providedKey === debugKey;
}

/**
 * 创建 /debug/info 端点处理器
 *
 * @example
 * // app/api/debug/info/route.ts
 * import { createDebugInfoHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugInfoHandler();
 */
export function createDebugInfoHandler(options?: { requireKey?: boolean }): (
  request: Request
) => Promise<Response> {
  return async function GET(request: Request): Promise<Response> {
    if (options?.requireKey && !validateDebugKey(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json(getDebugInfo(), {
      headers: { "Cache-Control": "no-store" },
    });
  };
}

/**
 * 创建 /debug/config 端点处理器
 *
 * @example
 * // app/api/debug/config/route.ts (Node.js 服务)
 * import { createDebugConfigHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugConfigHandler();
 *
 * @example
 * // app/api/debug/config/route.ts (Next.js 服务，需要展示构建时内联的 NEXT_PUBLIC_* 变量)
 * import { createDebugConfigHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugConfigHandler({
 *   allowedPrefixes: ['DATABASE', 'MCP', 'NEXT_PUBLIC'],
 *   // 构建时内联的值（webpack 会在构建时替换 process.env.NEXT_PUBLIC_*）
 *   buildTimeEnv: {
 *     NEXT_PUBLIC_SHOP_DOMAIN: process.env.NEXT_PUBLIC_SHOP_DOMAIN,
 *     NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
 *   }
 * });
 */
export function createDebugConfigHandler(options?: {
  allowedPrefixes?: string[];
  /** 构建时内联的环境变量，用于 Next.js 等在构建时替换 process.env 的框架 */
  buildTimeEnv?: Record<string, string | undefined>;
}): (request: Request) => Promise<Response> {
  return async function GET(request: Request): Promise<Response> {
    if (!validateDebugKey(request)) {
      return Response.json(
        { error: "Unauthorized - X-Debug-Key required" },
        { status: 401 }
      );
    }

    return Response.json(
      getDebugConfig(options?.allowedPrefixes, options?.buildTimeEnv),
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  };
}

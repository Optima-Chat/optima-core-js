/**
 * 追踪 ID 生成模块
 */

/**
 * 生成随机 hex 字符串
 */
function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, length);
}

/**
 * 生成 trace_id
 *
 * 格式: {timestamp_hex}-{random_hex}-{service_short}
 * 示例: 67890abc-f1e2d3c4b5a6-auth
 *
 * @param serviceShort - 服务简称（默认 "svc"）
 */
export function generateTraceId(serviceShort: string = "svc"): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = randomHex(12);
  return `${timestamp}-${random}-${serviceShort}`;
}

/**
 * 生成 request_id
 *
 * 格式: {prefix}_{random_hex}
 * 示例: auth_f1e2d3c4b5a6
 *
 * @param prefix - 前缀（默认 "req"）
 */
export function generateRequestId(prefix: string = "req"): string {
  return `${prefix}_${randomHex(12)}`;
}

/**
 * 解析 trace_id
 */
export function parseTraceId(traceId: string): {
  valid: boolean;
  timestamp?: number;
  random?: string;
  serviceShort?: string;
  raw?: string;
} {
  const parts = traceId.split("-");

  if (parts.length < 3) {
    return { valid: false, raw: traceId };
  }

  const [timestampHex, random, ...serviceParts] = parts;
  const timestamp = parseInt(timestampHex, 16);

  if (isNaN(timestamp)) {
    return { valid: false, raw: traceId };
  }

  return {
    valid: true,
    timestamp,
    random,
    serviceShort: serviceParts.join("-"),
  };
}

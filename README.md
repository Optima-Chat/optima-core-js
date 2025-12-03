# @optima/core

Optima 生产可观测性共享库 - 专为 Next.js/Node.js 设计

## 功能

- **诊断端点**: `/health` 健康检查、`/debug/info`、`/debug/config`
- **结构化日志**: JSON/Text 格式、自动注入追踪信息
- **分布式追踪**: trace_id 生成与传递、AsyncLocalStorage 上下文
- **HTTP 客户端**: 自动传递追踪 header

## 安装

```bash
npm install @optima/core
# 或
pnpm add @optima/core
```

## 使用方法

### 健康检查端点

```typescript
// app/api/health/route.ts
import { createHealthHandler } from "@optima/core/diagnostics";

export const GET = createHealthHandler({
  serviceName: "agentic-chat",
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: "healthy" };
    },
    redis: async () => {
      // 检查 Redis
      return { status: "healthy" };
    },
  },
});
```

### 调试端点

```typescript
// app/api/debug/info/route.ts
import { createDebugInfoHandler } from "@optima/core/diagnostics";
export const GET = createDebugInfoHandler();

// app/api/debug/config/route.ts
import { createDebugConfigHandler } from "@optima/core/diagnostics";
export const GET = createDebugConfigHandler();
```

### API Route 追踪

```typescript
// app/api/users/route.ts
import { withTracing } from "@optima/core/tracing";

async function handler(request: Request) {
  // 处理请求
  return Response.json({ users: [] });
}

export const GET = withTracing(handler, {
  serviceName: "agentic-chat",
  serviceShort: "chat",
});
```

### 结构化日志

```typescript
import { createLogger } from "@optima/core/logging";

const logger = createLogger({
  serviceName: "agentic-chat",
  format: "json", // 或 "text"
  level: "info",
});

logger.info("User logged in", { userId: "123" });
logger.error("Failed to process", { error: "timeout" }, new Error("Timeout"));
```

### 带追踪的 HTTP 请求

```typescript
import { tracedFetch, createTracedClient } from "@optima/core/http";

// 单次请求
const response = await tracedFetch("http://user-auth/api/users");

// 创建客户端
const authApi = createTracedClient("http://user-auth:8000");
const user = await authApi.get("/users/123");
await authApi.post("/users", { name: "John" });
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GIT_COMMIT` | Git commit hash | `unknown` |
| `GIT_BRANCH` | Git 分支 | `unknown` |
| `APP_VERSION` | 应用版本 | `0.0.0` |
| `BUILD_DATE` | 构建日期 | 当前时间 |
| `DEPLOYMENT_ID` | 部署 ID (蓝绿) | - |
| `LOG_FORMAT` | 日志格式 | `json` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `DEBUG_KEY` | Debug 端点密钥 | - |

## Trace ID 格式

```
格式: {timestamp_hex}-{random_hex}-{service_short}
示例: 67890abc-f1e2d3c4b5a6-chat
```

## 响应 Header

| Header | 说明 |
|--------|------|
| `X-Trace-ID` | 追踪 ID |
| `X-Request-ID` | 请求 ID |
| `X-Response-Time` | 响应时间 |
| `X-Served-By` | 服务名-版本 |
| `X-Deployment-ID` | 部署 ID |

## License

MIT

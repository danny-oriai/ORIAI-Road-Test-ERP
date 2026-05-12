# Road Test ERP — Cloudflare Workers API

后端 API，把前端（Cloudflare Pages）和 Supabase（PostgreSQL）连起来。
前端永远 **不** 直接持有 Supabase service role key — 所有数据库流量经过这个 Worker。

```
Cloudflare Pages 前端
       ↓  fetch(VITE_API_BASE_URL + "/api/...")
Cloudflare Workers (本项目)
       ↓  service_role key (绕过 RLS，自己做权限检查)
Supabase PostgreSQL (schema = rtm)
```

---

## 1. 安装依赖

```bash
cd worker
npm install
```

需要 Node 18+。`package.json` 里只有三个运行时依赖：
- `hono` — Web 框架
- `@supabase/supabase-js` — Supabase client
- 加上 `wrangler` + `@cloudflare/workers-types` + `typescript` 作为 devDeps

---

## 2. 本地运行

### 2.1 准备 secrets

Wrangler 本地开发用 `.dev.vars` 文件（已加入 `.gitignore`）：

```bash
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入真实值
```

`.dev.vars` 里需要三个值（**不要** 提交到 Git）：

```bash
SUPABASE_URL=https://<你的项目-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_role_secret...
SUPABASE_ANON_KEY=eyJhbGciOi...anon_public_key...
```

从 Supabase Dashboard → Settings → API 拿这三个值。**永远不要** 把 service_role key 放到前端代码、wrangler.toml、或公开 repo 里。

### 2.2 启动 dev server

```bash
npm run dev
# → wrangler dev --port 8787
# → Ready on http://localhost:8787
```

每次保存源码 wrangler 会热重载。

### 2.3 验证

```bash
curl http://localhost:8787/api/health
```

预期：

```json
{
  "success": true,
  "data": {
    "ok": true,
    "service": "road-test-erp-api",
    "time": "2026-05-12T08:42:11.319Z",
    "supabase": true
  }
}
```

`supabase: true` 表示 Worker 能连上你的 Supabase 项目。
`supabase: false` 说明 secrets 没设对（最常见的原因是 URL 拼错或 service_role key 复制时少了字符）。

---

## 3. 几个 curl 测试命令

```bash
# 健康检查
curl http://localhost:8787/api/health

# 项目列表
curl http://localhost:8787/api/projects

# 项目详情（用 legacy_id 或 uuid 都可以）
curl http://localhost:8787/api/projects/PRJ-2025-014

# 项目 overview（含 vehicleCount / memberCount / openIssueCount / expenseTotalGbp）
curl http://localhost:8787/api/projects/PRJ-2025-014/overview

# 临牌冲突清单（PA-1 + PA-6 应该出现，两个都占 TP-001）
curl http://localhost:8787/api/plate-conflicts

# 司机视角：今天的任务（模拟 U006 David Walker, Driver）
curl -H "x-demo-user-id: U006" \
     -H "x-demo-role: Driver" \
     "http://localhost:8787/api/tasks?date=2026-05-07"

# 异常列表筛选
curl "http://localhost:8787/api/issues?status=Open&severity=Critical"

# 提交一条车辆点检（POST）
curl -X POST http://localhost:8787/api/vehicle-checks \
  -H "Content-Type: application/json" \
  -H "x-demo-user-id: U006" \
  -H "x-demo-role: Driver" \
  -d '{
    "vehicleId": "V-001",
    "checkType": "Pre-Drive",
    "status": "OK",
    "mileage": 38450,
    "fuelPct": 75,
    "hddFreeGb": 400,
    "checklistState": {"tyres":"ok","lights":"ok","hdd":"ok"}
  }'

# 状态切换：把任务标记为 In Progress（会自动填 actual_start_at）
curl -X PATCH http://localhost:8787/api/tasks/DT-2461/status \
  -H "Content-Type: application/json" \
  -H "x-demo-user-id: U006" \
  -H "x-demo-role: Driver" \
  -d '{"status":"In Progress"}'

# 审批一个 Submitted 状态的 expense（PMO 视角）
curl -X PATCH http://localhost:8787/api/expenses/EXP-7701/status \
  -H "Content-Type: application/json" \
  -H "x-demo-user-id: U001" \
  -H "x-demo-role: PMO" \
  -d '{"status":"Approved"}'
```

---

## 4. 部署到 Cloudflare Workers

### 4.1 设置生产 secrets

跟本地 dev 用的 `.dev.vars` 不同，生产 secrets 通过 wrangler CLI 直接写到 Cloudflare 的 secret store：

```bash
wrangler login

wrangler secret put SUPABASE_URL
# 命令行会提示输入值，输完按回车

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_ANON_KEY
```

非密变量（`SUPABASE_SCHEMA`, `FRONTEND_ORIGIN`, `ALLOW_LOCALHOST`）在 `wrangler.toml` 的 `[vars]` / `[env.production.vars]` 里设置。

**部署前** 改 `wrangler.toml` 里的 `FRONTEND_ORIGIN`，换成你真实的 Cloudflare Pages URL（例如 `https://road-test-erp.pages.dev` 或你的自定义域名）。

### 4.2 部署

```bash
# 默认环境
npm run deploy
# 或： wrangler deploy

# 生产环境（更严格的 CORS）
wrangler deploy --env production
```

部署成功后会返回类似：

```
Published road-test-erp-api (1.23 sec)
  https://road-test-erp-api.<your-subdomain>.workers.dev
```

### 4.3 验证生产部署

```bash
curl https://road-test-erp-api.<your-subdomain>.workers.dev/api/health
```

如果返回 `supabase: true`，部署成功。

### 4.4 查看实时日志

```bash
wrangler tail
```

会把 Workers 运行时的 console.log + 异常实时打到终端。线上排错必备。

---

## 5. CORS 配置

`src/lib/cors.ts` 动态从 env 构建 allow-list：

| 环境 | 允许的 Origin |
|---|---|
| dev (默认) | `FRONTEND_ORIGIN` + `http://localhost:5173` + `http://localhost:4173` |
| production | 只允许 `FRONTEND_ORIGIN` |

切换依靠 `ALLOW_LOCALHOST` 变量（`wrangler.toml` 的 `[env.production.vars]` 把它设为 `false`）。

`OPTIONS` preflight 自动处理（Hono 的 cors 中间件）。允许的 headers：`Content-Type`, `Authorization`, `x-demo-user-id`, `x-demo-role`。允许 `credentials: true` 以便后续 OAuth session cookie。

---

## 6. 和前端 Cloudflare Pages 对接

### 6.1 前端 env

前端 Vite 项目里加一个 `.env.local`：

```bash
VITE_API_BASE_URL=http://localhost:8787    # dev
# 部署时改成：
# VITE_API_BASE_URL=https://road-test-erp-api.<sub>.workers.dev
```

### 6.2 改 `src/lib/api.ts`（swap seam）

Step 1 设计 `api.ts` 时已经留好了 sync.X() 接口。逐个替换为 fetch 即可，例如：

```ts
// 原来：
export const sync = {
  projects: () => MOCK_PROJECTS,
  // ...
};

// 之后：
const BASE = import.meta.env.VITE_API_BASE_URL;
async function GET<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      // 演示阶段：从 localStorage / 用户切换器读出来
      "x-demo-user-id": currentUser.legacyId,
      "x-demo-role": currentUser.role,
    },
  });
  const body = await r.json();
  if (!body.success) throw new Error(body.error?.message);
  return body.data;
}

export const api = {
  projects: () => GET<Project[]>("/api/projects"),
  project:  (id: string) => GET<Project>(`/api/projects/${id}`),
  // ...
};
```

具体替换顺序见 `docs/integration-plan.md`。

### 6.3 部署到 Cloudflare Pages

前端构建时 Pages 会读 `VITE_API_BASE_URL`（在 Pages → Settings → Environment variables 里设置）。Pages 和 Workers 是两个独立部署，互不影响。

---

## 7. 项目结构

```
worker/
├── package.json
├── tsconfig.json
├── wrangler.toml             ← 只放非密变量
├── .dev.vars.example         ← 本地 secret 模板
├── .gitignore                ← 屏蔽 .dev.vars / .wrangler / node_modules
└── src/
    ├── index.ts              ← Hono app + 全局中间件 + 路由挂载
    ├── lib/
    │   ├── supabase.ts       ← service_role client + DB 错误脱敏
    │   ├── response.ts       ← envelope + snake↔camel 递归转换
    │   ├── auth.ts           ← demo auth (x-demo-* headers) + 权限 helpers
    │   ├── cors.ts           ← CORS 中间件（动态 env-driven）
    │   └── query.ts          ← 分页 + 查询参数 helpers
    ├── routes/
    │   ├── health.ts
    │   ├── projects.ts       ← list / detail / overview
    │   ├── vehicles.ts       ← list / detail / checks + POST vehicle-checks
    │   ├── plates.ts         ← plates + plate-allocations + plate-conflicts
    │   ├── routes.ts
    │   ├── pois.ts
    │   ├── tasks.ts          ← + PATCH status (自动 actual_start_at / actual_end_at)
    │   ├── attendance.ts     ← + POST + PATCH correction
    │   ├── issues.ts         ← + POST + PATCH + close
    │   ├── expenses.ts       ← + POST + PATCH status (approve / reject / pay)
    │   ├── files.ts          ← + POST (索引，不传文件本体)
    │   └── users.ts
    └── types/
        └── env.ts            ← Env + Variables 类型
```

---

## 8. 故障排查

| 症状 | 可能原因 |
|---|---|
| `supabase: false` in health | URL 或 service_role key 错；或 Supabase 项目 paused（免费层 7 天无活动会暂停） |
| `DATABASE_ERROR` on every endpoint | 同上；用 `wrangler tail` 看具体 PG 错误 |
| CORS error in browser console | `FRONTEND_ORIGIN` 没改成你的 Pages URL，或 `ALLOW_LOCALHOST=false` 但你在 localhost 测 |
| `NOT_FOUND` on routes that should exist | 检查路径，`/api/...` 开头；GET vs POST vs PATCH 方法对吗 |
| `403 FORBIDDEN` on PATCH | 当前 demo auth 角色不够 — 加 `-H "x-demo-role: PMO"` 重试 |

完整 API 参考见 `docs/api-design.md`。
前端 mock → API 替换步骤见 `docs/integration-plan.md`。

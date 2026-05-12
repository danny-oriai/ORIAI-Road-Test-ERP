# Road Test ERP — 前端 mock → API 集成路线图

Step 3 完成后，Workers API 已经能跑了。这一步是把前端的 mock data 逐步替换成真实 API 调用。
要做得稳，**别一次性替换所有页面** — 按下面的分批顺序来。

---

## 0. 设计原则

1. **swap seam 已经准备好** — Step 1 早就把 `src/lib/api.ts` 设计成所有数据读取的唯一入口。页面组件不直接 import `MOCK_*` 数组。
2. **mock data 不删除** — 保留 `src/mock/*.ts` 作为 offline fallback、CI/CD 单元测试、和 Storybook-like 演示场景。
3. **逐页迁移，逐次验证** — 每替换一个页面就跑一次 `npm run build` + 浏览器 smoke test，确认 OK 后再下一个。
4. **失败要 fallback 到 mock** — 网络/Worker 挂掉时不能让前端白屏。

---

## 1. 准备工作（一次性，10 分钟）

### 1.1 前端环境变量

在前端项目根目录新建 `.env.local`（已经被 Vite 的 .gitignore 排除）：

```bash
VITE_API_BASE_URL=http://localhost:8787
```

部署到 Pages 时，在 Cloudflare Dashboard → Pages → Settings → Environment variables 里加：

```
VITE_API_BASE_URL = https://road-test-erp-api.<your-sub>.workers.dev
```

### 1.2 全局 fetch wrapper

新建 `src/lib/apiClient.ts`：

```ts
// 当前 actor — 从用户切换器同步，Lark OAuth 后会改成从 cookie
function getCurrentActor(): { id: string; role: string } {
  // 演示阶段：直接从 App.tsx state 拿，或者塞到 localStorage
  return {
    id:   localStorage.getItem("demoUserId") ?? "U001",
    role: localStorage.getItem("demoRole")   ?? "PMO",
  };
}

const BASE = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const actor = getCurrentActor();
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-demo-user-id": actor.id,
      "x-demo-role":    actor.role,
      ...(init.headers ?? {}),
    },
  });
  const body = await r.json();
  if (!body.success) {
    throw new ApiError(body.error?.code, body.error?.message);
  }
  return body.data as T;
}

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export const apiClient = {
  get:   <T>(path: string)              => request<T>(path),
  post:  <T>(path: string, body: any)   => request<T>(path, { method: "POST",  body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any)   => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};
```

### 1.3 改造 `src/lib/api.ts`

不要直接覆盖现有的 sync.X() 函数 — 加一个**双轨**机制，环境变量控制走哪条路：

```ts
import { sync as mockSync } from "./api.mock";  // 把原来的 sync 改名移到 api.mock.ts
import { apiClient } from "./apiClient";

const USE_API = !!import.meta.env.VITE_API_BASE_URL;

export const api = {
  projects: async () => USE_API
    ? await apiClient.get<Project[]>("/api/projects")
    : mockSync.projects(),
  // ... 同理给所有其他 entity
};
```

页面要从 `sync.X()` (同步) 改成 `await api.X()` (异步)。这是真正的工作量所在。
要的话也可以保持同步接口，用 React Query / SWR 在外面套一层 — 但当前 19 个页面没用任何 fetcher 库，直接 useEffect + useState 就够了。

---

## 2. 分批集成顺序

按"读取依赖度低 → 高"和"业务关键性低 → 高"两个维度排：

### 第 1 批：只读、低风险（建议先做）

| 页面 | API endpoint | 备注 |
|---|---|---|
| `Users.tsx` | `GET /api/users` | 数据量最小（11 条），最容易验证 |
| `Settings.tsx` | — (无 fetch，本来就是 UI 占位) | 不动 |
| `Files.tsx` | `GET /api/files?category=&project_id=` | 只读，filter 简单 |
| `Routes.tsx` | `GET /api/routes` | 数据量小 |
| `POIs.tsx` | `GET /api/pois?project_id=` | 数据量小 |
| `Vehicles.tsx` | `GET /api/vehicles?status=&city=` | 数据量小 |
| `VehicleDetail.tsx` | `GET /api/vehicles/:id` + `GET /api/vehicles/:id/checks` | 父子两个调用 |

**这一批完成的判定标准**：
- 这 7 个页面在生产 URL 下完全用真实数据渲染
- 切换用户切换器后 fetch 用新的 `x-demo-*` headers
- 网络断开时仍能 fallback 到 mock 数据（见第 5 节）

预计工作量：2-3 个工作日（一个开发者）。

### 第 2 批：核心运营数据（中风险）

| 页面 | API endpoint |
|---|---|
| `Projects.tsx` | `GET /api/projects?status=&priority=` |
| `ProjectDetail.tsx` | `GET /api/projects/:id` + `GET /api/projects/:id/overview` |
| `Dashboard.tsx` | 多个聚合调用（先逐个 fetch；后期可加专门的 `/api/dashboard/summary`） |
| `Plates.tsx` | `GET /api/plates` |
| `PlateTimeline.tsx` | `GET /api/plate-allocations` + `GET /api/plate-conflicts` |
| `Tasks.tsx` | `GET /api/tasks?date=...` + `PATCH /api/tasks/:id/status` |
| `Issues.tsx` (只读部分) | `GET /api/issues?status=&severity=` |
| `Expenses.tsx` (只读部分) | `GET /api/expenses?status=&category=` |
| `Attendance.tsx` (只读部分) | `GET /api/attendance?date=` |
| `Staff.tsx` | `GET /api/users` + `GET /api/tasks?date=today`（合成 staff allocation 视图） |

**判定标准**：
- Dashboard 所有 KPI 卡的数字来自真实 API
- Tasks 页面的 Start/Complete 按钮真的修改后端任务状态
- PlateTimeline 上 TP-001 冲突横条来自 `/api/plate-conflicts` 而不是硬编码

预计工作量：3-4 个工作日。

### 第 3 批：写操作（最高风险）

| 操作 | API endpoint |
|---|---|
| Vehicle check form 提交 | `POST /api/vehicle-checks` |
| 打卡（包括 MobileDriverView 上的 Clock In/Out） | `POST /api/attendance` |
| 打卡手动校正 | `PATCH /api/attendance/:id/correction` |
| 报告新 issue（包括 MobileDriverView） | `POST /api/issues` |
| 分派 owner / 关闭 issue | `PATCH /api/issues/:id` + `PATCH /api/issues/:id/close` |
| 提交报销（包括 MobileDriverView） | `POST /api/expenses` |
| 审批 / 拒绝 / 付款 | `PATCH /api/expenses/:id/status` |
| 文件上传索引 | `POST /api/files` |
| 创建 / 修改临牌分配 | `POST/PATCH /api/plate-allocations` |
| 用户角色变更 | `PATCH /api/users/:id` |

**判定标准**：
- 每个 submit 按钮真的写入 Supabase 且能在 Table Editor 里看到新行
- 失败时弹 toast 显示错误信息（基于 `ApiError.code`）
- Optimistic update（前端立刻显示新状态，失败回滚）是 nice-to-have，不强求

预计工作量：3-5 个工作日。

---

## 3. 哪些页面后接 API（继续保留 mock）

| 页面 | 原因 |
|---|---|
| `VehicleCheckForm` 的实时表单状态 | 提交前都是本地 state，不用 API |
| `Settings` 各分区 | UI 占位本来就不接 API；secrets 在 Workers 那边 |
| `MobileDriverView` 的 demo modal | 可以**保持** mock 数据展示，按需切到 API。设备模拟器本身只用一个 driver 视角 |

---

## 4. Fallback 策略

`src/lib/api.ts` 改造后建议加 try-catch 层：

```ts
export const api = {
  projects: async (): Promise<Project[]> => {
    if (!USE_API) return mockSync.projects();
    try {
      return await apiClient.get<Project[]>("/api/projects");
    } catch (err) {
      console.warn("[api] /api/projects failed, falling back to mock:", err);
      return mockSync.projects();
    }
  },
  // ...
};
```

并在 Dashboard 顶部加一个全局指示器：当任意 API 调用 fallback 到 mock，显示 amber banner "Backend unreachable — showing cached data"。

写操作（POST / PATCH）**不要** fallback —— 要让用户看到失败 toast，不要默默吞掉。

---

## 5. 滚动验证清单

每完成一个页面的迁移，跑一遍：

```bash
# 前端
npm run build               # 0 TS errors
npm run dev                 # 本地起前端
# 另开一个终端
cd worker && npm run dev    # 本地起 Worker
# 浏览器打开 http://localhost:5173
# - 切换用户切换器到 Driver U006
# - 看 Network tab：fetch 是否带上 x-demo-* headers
# - 看页面：渲染的是真实数据吗？
# - 断网：是否回退到 mock？（看 console warning）
```

---

## 6. Step 4 Lark OAuth 的接入顺序

Step 4 启动前，确保 Step 3 全部完成（19 个页面都跑通真实 API）。然后：

### 6.1 数据库准备（最简单的一步）

`rtm.users.lark_open_id` 字段在 Step 2 已经预留。需要做的：

1. 在 Supabase 表里**手动**把核心团队成员的 `lark_open_id` 写进去（暂时空跑没问题，第一次 OAuth 登录会自动补上）
2. 按 `docs/rls-policy-notes.md` 第 4 节补上 `WITH CHECK` 子句（防止 self-promotion）

### 6.2 Worker 改动

按 `docs/api-design.md` 第 13 节流程做：
1. 新建 `worker/src/routes/auth.ts`，三条路由：`/api/auth/lark/start`、`/api/auth/lark/callback`、`/api/auth/me`
2. 新建 `worker/src/lib/larkAuth.ts`，封装 Lark API 调用 + session JWT 签发
3. 把 `worker/src/lib/auth.ts` 里的 `demoAuth` middleware **保留**（dev 模式照用），新增 `larkAuth` middleware，在 `src/index.ts` 里按环境变量切换
4. 三个新 secrets：`LARK_APP_ID`、`LARK_APP_SECRET`、`SESSION_JWT_SECRET`（后者用 `openssl rand -base64 32` 生成）

### 6.3 Lark Open Platform 配置

1. 注册 / 进入 Lark Open Platform，建一个 app
2. 把回调 URL 设为 `https://<你的 Worker domain>/api/auth/lark/callback`
3. 配置 scopes（建议：`contact:user.id:readonly`、`contact:user.base:readonly`、`contact:user.email:readonly`）
4. 拿到 App ID + App Secret，通过 `wrangler secret put` 写进 Worker

### 6.4 前端改动

1. 移除 `apiClient.ts` 里的 `x-demo-*` headers，改成 `credentials: "include"` 让 cookie 自动带上
2. 移除 Sidebar 里的用户切换器（保留一个 dev-only 切换器，靠 `import.meta.env.DEV` 控制）
3. 加一个 `<AuthGuard>` 组件：判断当前 session，如果未登录就重定向到 `/api/auth/lark/start`
4. 加一个 `/api/auth/me` 调用：拿到当前用户的 `legacyId` + `role`，存在 React Context 里

### 6.5 验证

1. 在 Lark 工作台里打开你的 app（H5 或桌面）
2. 第一次会跳 Lark 授权页 → 同意 → 跳回 Pages
3. 浏览器有了 session cookie，所有 `fetch` 都带它
4. Worker 解析 cookie → 知道是谁 → service_role 查询时按 user 过滤

### 6.6 Step 4 的预估时间

约 4-5 个工作日：
- Day 1：Lark Open Platform 配置 + Worker auth.ts 骨架
- Day 2：完成 OAuth callback + session JWT 签发
- Day 3：前端 AuthGuard + apiClient 改造
- Day 4：联调 + 把 `lark_open_id` 写回 `rtm.users` 表
- Day 5：把残留的 demo 切换器清掉 + 全链路冒烟测试

---

## 7. 进度跟踪表

把这份表复制到内部看板，每完成一项打勾：

### 准备
- [ ] 前端建 `.env.local` 写 `VITE_API_BASE_URL`
- [ ] 前端新建 `src/lib/apiClient.ts`
- [ ] 前端 `src/lib/api.ts` 改造为双轨（mock + api）
- [ ] Cloudflare Pages 加 env 变量
- [ ] Worker 部署到 production

### 批 1：只读、低风险
- [ ] Users.tsx
- [ ] Files.tsx
- [ ] Routes.tsx
- [ ] POIs.tsx
- [ ] Vehicles.tsx
- [ ] VehicleDetail.tsx

### 批 2：核心运营
- [ ] Projects.tsx
- [ ] ProjectDetail.tsx
- [ ] Dashboard.tsx
- [ ] Plates.tsx
- [ ] PlateTimeline.tsx
- [ ] Tasks.tsx
- [ ] Issues.tsx（只读）
- [ ] Expenses.tsx（只读）
- [ ] Attendance.tsx（只读）
- [ ] Staff.tsx

### 批 3：写操作
- [ ] Vehicle check 提交
- [ ] 打卡 POST
- [ ] 打卡手动校正
- [ ] 报告新 issue
- [ ] 关闭 issue
- [ ] 提交报销
- [ ] 审批 / 付款
- [ ] 文件索引创建
- [ ] 临牌分配 CRUD
- [ ] 用户角色修改

### Step 4 Lark OAuth
- [ ] Lark App 注册 + 回调配置
- [ ] Worker auth.ts + larkAuth.ts
- [ ] Worker 三个新 secrets
- [ ] 前端 AuthGuard + 移除 demo headers
- [ ] RLS 收紧（WITH CHECK 子句）
- [ ] 真实用户首次登录验证
- [ ] 移除 demo 用户切换器

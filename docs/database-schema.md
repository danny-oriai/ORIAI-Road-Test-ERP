# Road Test ERP — 数据库 Schema 设计说明

本文档对应 `supabase/migrations/001_initial_schema.sql` 和 `supabase/seed.sql`，是 Step 2 的产物。
所有内部测试在 PostgreSQL 16 上跑通（0 errors，RLS 在四种角色身份下都按预期工作）。

---

## 1. 顶层设计原则

1. **专用 schema `rtm`** — 不直接落在 `public` 上。
   - 不干扰 Supabase 自带的 `auth.*`、`storage.*` 表
   - 后续迁移、备份、权限管理都更干净
2. **uuid 主键、`updated_at` trigger、外键、index 全套** — 按 Supabase / Postgres 最佳实践
3. **TS union → PostgreSQL ENUM 一一对应** — 共 25 个 enum 类型，源自 `src/types/index.ts`，新增成员用 `ALTER TYPE ... ADD VALUE`
4. **`legacy_id text UNIQUE` 占位** — 保留前端 mock 数据里的字符串 ID（U001、PRJ-2025-014、V-001 ...），方便 dev 阶段交叉对照，Lark OAuth 上线后可以删
5. **photo / attachment 用 `jsonb` 数组** — 前端目前只存计数，DB 用 `[{path, lark_drive_id, size, taken_at}]` 形式存元数据
6. **Secret NEVER lives in DB** — Lark App Secret、Supabase service role key 都不进 `settings` 表，留在 Cloudflare Workers 的环境变量里

---

## 2. 17 个表的作用

> 实际是 16 个表 — PRD-3 列的 #2 `roles` 在我们这里收成了一个 enum 类型（六个固定值，不需要单独一行一行存）。这是合规的简化，后期要加每角色权限元数据再补一个 `roles` 表即可。

### 身份 & 项目

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `users` | 系统用户，桥接 Lark 身份 | `lark_open_id` (OAuth sub claim), `role` (enum), `licence_valid`, `account_status` |
| `projects` | 项目主表 | `manager_id`, `pmo_owner_id`, `status` (11 lifecycle states), `progress` 0–100 |
| `project_members` | 用户—项目多对多关系，带时间区间 | `role_in_project` (自由文本: "Primary driver", "Backup engineer" ...) |

### 车辆 & 临牌

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `vehicles` | 车辆主表 | `plate` (车牌), `vin`, `power` (EV/Hybrid/...), `mot_expiry`, `mileage`, `equipment text[]` |
| `vehicle_checks` | 每次点检记录 | `checklist_state jsonb` (12 项状态), `photos jsonb`, `hdd_free_gb`, `fuel_pct` |
| `plates` | 临牌/Trade plate 主表 | `number`, `type` (Trade/Temp), `valid_from`/`valid_to`, `responsible_user_id` |
| `plate_allocations` | 临牌分配记录 | `start_date`/`end_date`, `conflict` (trigger 自动维护) |

**`plate_allocations` 有一个 `BEFORE INSERT/UPDATE` 触发器 `detect_plate_conflicts()`**：当一条新分配的日期范围与同一临牌的其它分配重叠时，自动把双方的 `conflict` 设为 `true`。前端不用再做冲突检测，直接读这个布尔位。

### 路线 & 任务

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `routes` | 路线主表 | `risk_level`, `gpx_file`, `maps_link`, `duration interval` (PG 原生 interval 类型) |
| `pois` | POI 点 | `type` (Charging/Parking/Risk Point/...), `lat`/`lng` (numeric(9,6)) |
| `daily_tasks` | 每日测试任务 | `task_date`, `driver_id`/`engineer_id`, `planned_hours`/`actual_hours` |

### 运营记录

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `attendance_records` | 打卡记录 | `event_type` (Clock In/Out/Arrived/Break...), `manual_correction`, `correction_reason` |
| `issues` | 异常与风险 | `severity` (Low/Med/High/Critical), `type` (12 类), `resolved_at`, `attachments jsonb` |
| `expenses` | 报销 | `category` (11 类), `currency` (GBP/EUR/USD), `approver_id`, `paid_at` |
| `files` | 文件索引（实际文件在 Lark Drive） | `lark_drive_ref`, `storage_path`, `permission` (Private/Project/Public), `version` |

### 系统

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `audit_logs` | 关键操作日志（追加写） | `actor_id`, `entity_type`/`entity_id`, `action`, `before_data jsonb`, `after_data jsonb` |
| `settings` | 非密配置（密钥不存这里） | `category` + `key` 作复合唯一键，`value jsonb` |

---

## 3. 关键关系图（文字版）

```
users ─┬─< projects (manager_id, pmo_owner_id)
       ├─< project_members
       ├─< vehicles (current_driver_id)
       ├─< plates (responsible_user_id)
       ├─< daily_tasks (driver_id, engineer_id)
       ├─< attendance_records
       ├─< vehicle_checks (submitted_by)
       ├─< issues (reported_by, owner_id)
       ├─< expenses (applicant_id, approver_id)
       ├─< files (uploaded_by)
       └─< audit_logs (actor_id)

projects ─┬─< project_members
          ├─< vehicles (current_project_id)
          ├─< plates (current_project_id)
          ├─< plate_allocations
          ├─< routes
          ├─< pois
          ├─< daily_tasks
          ├─< attendance_records
          ├─< issues
          ├─< expenses
          └─< files

vehicles ─┬─< vehicle_checks
          ├─< plate_allocations
          ├─< daily_tasks
          ├─< attendance_records
          ├─< issues
          └─< expenses

plates ─< plate_allocations  (trigger 维护 conflict 字段)

routes ─< pois
       └─< daily_tasks

daily_tasks ─┬─< vehicle_checks   (Pre/Post-drive 关联到具体任务)
             ├─< attendance_records
             └─< issues
```

每个 `*_id` 都是真正的 `uuid REFERENCES`，不是字符串。Postgres 会保证引用完整性。

---

## 4. 索引策略

按常用查询路径建索引（已在 migration 里全部加好）：

- **筛选场景**：`status`、`severity`、`task_date`、`expense_date`、`uploaded_at` 等
- **外键回查**：`project_id`、`vehicle_id`、`user_id`、`driver_id`、`engineer_id`
- **过期警告**：`vehicles.mot_expiry`、`plates.valid_to`（驾驶员日报里要扫这两列）
- **时间序列倒序**：`vehicle_checks.performed_at DESC`、`issues.reported_at DESC`、`audit_logs.created_at DESC`
- **唯一性**：`users.email` (citext)、`vehicles.plate`、`vehicles.vin`、`plates.number`、`projects.code`

未来若慢查询出现，再考虑：
- `daily_tasks(task_date, project_id)` 复合索引（甘特图查询多用）
- `plate_allocations` GiST index on `daterange(start_date, end_date)`（冲突检测加速）

---

## 5. 如何在 Supabase 中执行

### 5.1 全新部署

1. 登 Supabase Dashboard → Settings → 创建一个新 project（推荐 eu-west-2 即 London 区域）
2. 拿到：
   - Project URL: `https://<ref>.supabase.co`
   - `anon` public key
   - `service_role` secret key（**永远不能进前端代码**）
3. 进 SQL Editor → New query
4. 复制 `supabase/migrations/001_initial_schema.sql` 全文 → Run
5. 复制 `supabase/seed.sql` 全文 → Run
6. 验证：在 Table Editor 里能看到 `rtm` schema 下的 16 张表，每张表数据条数与下面对照表一致

| 表 | 行数 |
|----|-----|
| users | 11 |
| projects | 5 |
| project_members | 11 |
| vehicles | 11 |
| plates | 7 |
| plate_allocations | 6 |
| routes | 6 |
| pois | 10 |
| daily_tasks | 5 |
| attendance_records | 5 |
| vehicle_checks | 5 |
| issues | 5 |
| expenses | 8 |
| files | 8 |
| settings | 11 |
| audit_logs | 0 |

冲突检测的验证：

```sql
SELECT legacy_id, conflict FROM rtm.plate_allocations ORDER BY legacy_id;
```

应当看到 `PA-1` 和 `PA-6` 都是 `t`（true），其余 4 条是 `f` — TP-001 双重占用被自动标记了。

### 5.2 重新部署（开发期清表）

```sql
DROP SCHEMA IF EXISTS rtm CASCADE;
```

然后从 5.1 第 4 步重新跑。

### 5.3 用 supabase CLI

```bash
supabase init
mkdir -p supabase/migrations
cp 001_initial_schema.sql supabase/migrations/
cp seed.sql supabase/

supabase db push        # apply migration to remote
supabase db reset       # apply migration + seed locally
```

---

## 6. Cloudflare Workers 如何接入

下一阶段（Step 3）的 Workers API 是前端和 Supabase 之间的中介，最简版本是用 Hono 或 itty-router 起个 RESTful service：

```ts
// workers/src/index.ts
import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  // 1. Verify Lark JWT from cookie / Authorization header
  const jwt = c.req.header('Authorization')?.replace('Bearer ', '')
  const claims = await verifyLarkJwt(jwt, c.env.LARK_JWT_PUBLIC_KEY)
  c.set('user', claims)
  await next()
})

app.get('/api/projects', async (c) => {
  const supa = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,      // bypasses RLS
    { db: { schema: 'rtm' } }
  )
  // Apply our own auth filter here, since RLS is bypassed:
  const userId = c.get('user').rtm_id
  const { data } = await supa.from('projects').select('*')
  return c.json(data)
})

export default app
```

Workers 部署后，前端 `src/lib/api.ts` 的 swap seam 替换为：

```ts
export async function projects() {
  const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/projects`, {
    credentials: 'include',
  })
  return r.json()
}
```

**两种鉴权选择**：

1. **Workers 全权 + Service Role**（推荐）：Workers 用 service_role 直连 Supabase（绕过 RLS），自己做权限检查。优点：最快、控制最细。缺点：Workers 代码要小心，别漏写 WHERE 条件。
2. **PostgREST + RLS**：Workers 把用户的 Lark JWT 透传给 Supabase，让数据库自己用 RLS 过滤。优点：权限完全由 SQL 描述，Workers 代码简单。缺点：调试复杂，性能略低。

如果 Workers 团队熟手就走方案 1；如果想 schema-only 就走方案 2。我们当前 RLS 已经写好可以两种都支持。

---

## 7. Lark OAuth 如何接入

OAuth 流程（Step 4）：

```
Lark 工作台点开 H5 app
   ↓
浏览器 → https://erp.pages.dev
   ↓ (无 session cookie)
前端 redirect → https://workers.dev/api/auth/lark/start
   ↓ Workers 生成 state，redirect → Lark 授权页
Lark 授权
   ↓ redirect_uri: https://workers.dev/api/auth/lark/callback?code=...&state=...
Workers callback:
  1. 验 state
  2. 用 code + App Secret 换 user_access_token + open_id (Lark API)
  3. UPSERT rtm.users(lark_open_id, name, email, ...) — 第一次登录就建账户
  4. 签自己一个 short-lived JWT，sub = open_id
  5. Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax
  6. redirect → https://erp.pages.dev
后续请求带 cookie → Workers 验 JWT → 走业务接口
```

**`rtm.users.lark_open_id`** 字段就是为这个准备的 — Workers 在第 3 步写入。一旦写入，`rtm.current_user_id()` 这个 SQL 函数就能从 JWT claims 解析出 `rtm.users.id`，整套 RLS 策略立刻生效。

新员工首次登录的特殊处理：

- 如果 `rtm.users` 里有一行 `email = <Lark 邮箱>` 但 `lark_open_id IS NULL` → 是 admin 预先建好的占位行，UPDATE 把 `open_id` 写进去
- 否则 → INSERT 一行新 user，`role` 默认 'Driver'，等 Admin 在 Users 页面里改成正确角色

`docs/rls-policy-notes.md` 里有更多 OAuth 落地后需要调整的 RLS 策略细节。

---

## 8. 后续需要人工调整的地方

| 区域 | 现状 | 上线前需要做的 |
|------|------|----------------|
| `legacy_id` 字段 | 每张表都有，方便 dev | OAuth 全部到位后可以 `ALTER TABLE ... DROP COLUMN legacy_id` |
| 种子用户的 `lark_open_id` | 全为 NULL | OAuth 上线后由首次登录自动填，或者 Admin 提前 UPSERT 真实 open_id |
| `audit_logs` | 表存在但 0 行 | Workers 在每次 mutate 前后 INSERT 一行（参考 #6 的代码示例） |
| `settings` 表的 OAuth 回调 URL | 占位 `workers.dev` | 改成真实的 Workers domain |
| RLS — `projects_modify_pm` | 允许 PM update **任何**字段 | 可能要细化：禁止 PM 改 `status` 或 `pmo_owner_id` |
| RLS — `expenses_update` | applicant 只能改 Draft | 要不要允许 applicant 撤回 Submitted？产品决定 |
| 索引 | 按常见查询路径已建 | 上线 1 个月后看 `pg_stat_user_indexes` 决定 |
| 备份 | `settings.backup.*` 占位 | Supabase 自带 daily PITR，但仍建议 Workers 跑 weekly export 到 Cloudflare R2 |

---

## 9. 验证 Checklist（部署到 Supabase 后跑）

```sql
-- 表数量
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'rtm';
-- 期望: 16

-- RLS 已开
SELECT count(*) FROM pg_tables
WHERE schemaname = 'rtm' AND rowsecurity = true;
-- 期望: 16

-- Policy 数量
SELECT count(*) FROM pg_policies WHERE schemaname = 'rtm';
-- 期望: 36

-- 触发器
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'rtm';
-- 期望: 至少 8 个 (updated_at × 7 + plate conflict × 1)

-- 冲突检测验证
SELECT count(*) FROM rtm.plate_allocations WHERE conflict = true;
-- 期望: 2 (PA-1 和 PA-6 同时占用 TP-001)
```

如果上面四条都对，schema 就是健康的。

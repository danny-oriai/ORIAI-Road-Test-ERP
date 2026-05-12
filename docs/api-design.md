# Road Test ERP — API 设计文档

对应 `worker/` 目录下的 Cloudflare Workers 实现。
当前阶段（Step 3）：service_role 直连 + demo auth；下一阶段（Step 4）会换成 Lark OAuth。

---

## 0. 总览

### 0.1 架构

```
浏览器（前端 Pages）
    ↓ fetch  (CORS allowed origin only)
Cloudflare Workers API
    ↓ service_role key  (bypasses RLS)
Supabase PostgreSQL
    └─ schema rtm
```

### 0.2 通用约定

- 所有 endpoint 以 `/api` 开头
- 请求 / 响应都是 `application/json`
- 数据库是 snake_case，API 是 camelCase — Worker 层自动转换
- ID 灵活：所有引用既接受 uuid 也接受 legacy_id（`U001`, `PRJ-2025-014`, `V-001`, `TP-001`, `R-001`, `POI-001`, `DT-2461`, `AT-9001`, `VC-3301`, `ISS-501`, `EXP-7701`, `PA-1`）

### 0.3 响应格式

**成功**：

```json
{ "success": true, "data": { ... } }
```

**列表**：

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "count": 10, "limit": 50, "offset": 0 }
}
```

**错误**：

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Project not found" }
}
```

HTTP 状态码：400 / 401 / 403 / 404 / 409 / 422 / 500。
所有 error message 都是脱敏的人话；PG 错误码 / 堆栈不会泄露给客户端。

### 0.4 错误代码清单

| code | HTTP | 含义 |
|---|---|---|
| `BAD_REQUEST` | 400 | JSON 解析失败 / 缺少必要 query 参数 |
| `UNAUTHORIZED` | 401 | （Step 4 OAuth 上线后用）没有 session |
| `FORBIDDEN` | 403 | 当前角色无权访问 |
| `NOT_FOUND` | 404 | 资源不存在 / 路由不存在 |
| `CONFLICT` | 409 | 业务冲突（如临牌占用） |
| `VALIDATION_FAILED` | 422 | 业务字段校验失败 |
| `DATABASE_ERROR` | 500 | Supabase / PG 错误（消息已脱敏） |
| `INTERNAL` | 500 | 未捕获异常 |

### 0.5 通用 query 参数

所有 list endpoint 都支持：

| 参数 | 默认 | 上限 | 说明 |
|---|---|---|---|
| `limit` | 50 | 200 | 单页条数 |
| `offset` | 0 | — | 跳过条数（按推荐排序） |

非法值（负数、非数字）静默回退到默认。

---

## 1. Health

### `GET /api/health`

存活检查。同时尝试 ping Supabase。

**响应**：

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

`supabase: false` 时仍返回 200（用于平台健康检查）。

---

## 2. Projects

### `GET /api/projects`

**Query**: `status` `priority` `region` `search` `limit` `offset`

`search` 在 `name` / `code` / `client` 上做 ILIKE 模糊匹配。

**响应 data 内每条**：

```json
{
  "id": "uuid...",
  "legacyId": "PRJ-2025-014",
  "code": "PRJ-2025-014",
  "name": "ADAS Highway Validation — M11 Corridor",
  "client": "Aurora Mobility Ltd",
  "type": "ADAS Testing",
  "region": "Cambridge → London",
  "startDate": "2026-04-22",
  "endDate": "2026-06-30",
  "status": "In Progress",
  "priority": "High",
  "vehiclesNeeded": 3,
  "staffNeeded": 5,
  "plateNeeded": true,
  "dataReq": "Full CAN + camera + radar logs",
  "progress": 64,
  "notes": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "manager":  { "id": "...", "legacyId": "U002", "name": "James Chen",   "role": "Project Manager", "city": "Cambridge" },
  "pmoOwner": { "id": "...", "legacyId": "U001", "name": "Sarah Mitchell", "role": "PMO",            "city": "London" }
}
```

### `GET /api/projects/:id`

`:id` 可以是 uuid 或 `PRJ-...` legacy_id。返回单条（同上 schema）。

### `GET /api/projects/:id/overview`

为 Dashboard 卡片设计。返回项目本身 + 聚合数：

```json
{
  "success": true,
  "data": {
    "project": { ...同上... },
    "aggregates": {
      "vehicleCount": 3,
      "memberCount": 5,
      "openIssueCount": 2,
      "expenseTotalGbp": 197.10
    }
  }
}
```

`expenseTotalGbp` 只汇总 `Approved` + `Paid` 状态的 GBP 报销，其他货币需要前端单独算。
`memberCount` 只算 `end_date IS NULL OR end_date >= today`（即当前活跃成员）。
`openIssueCount` 算 `Open` + `In Progress` 的。

---

## 3. Vehicles + Vehicle Checks

### `GET /api/vehicles`

**Query**: `status` `city` `project_id` `search` `limit` `offset`

`project_id` 可以是 legacy_id 或 uuid。
`search` 匹配 `plate` / `brand` / `model` / `vin`。

每条数据包含 `currentProject` 和 `currentDriver` 嵌套对象。

### `GET /api/vehicles/:id`

单条详情。

### `GET /api/vehicles/:id/checks`

该车辆的点检历史，按 `performed_at` 倒序。支持 `limit` / `offset`。

每条 check 数据：

```json
{
  "id": "...", "legacyId": "VC-3301",
  "checkType": "Pre-Drive",
  "status": "OK",
  "performedAt": "2026-05-07T07:30:00Z",
  "mileage": 38421, "fuelPct": 78, "hddFreeGb": 412, "issueFound": false,
  "checklistState": { "tyres":"ok", "hdd":"ok", ... },
  "photos": [ ... ],
  "notes": "...",
  "submitter": { "id":"...", "legacyId":"U006", "name":"David Walker", "role":"Driver" }
}
```

### `POST /api/vehicle-checks`

提交新点检。`submittedBy` 自动取当前 actor，**不可以** 通过 body 覆盖。

**Body**：

```json
{
  "vehicleId": "V-001",
  "checkType": "Pre-Drive",
  "status": "OK",
  "performedAt": "2026-05-07T07:30:00Z",
  "mileage": 38421,
  "fuelPct": 78,
  "hddFreeGb": 412,
  "issueFound": false,
  "checklistState": { "tyres": "ok", "lights": "ok", ... },
  "photos": [],
  "notes": "..."
}
```

`performedAt` 省略时使用 `now()`。

**响应**：返回插入后的完整 row。

---

## 4. Plates + Allocations + Conflicts

### `GET /api/plates`

**Query**: `status` `type` `search` + 通用分页。
返回带嵌套 `currentProject` / `currentVehicle` / `responsible` 的 plate 列表。

### `GET /api/plates/:id`

单条详情（`:id` 接受 `TP-001` 或 uuid）。

### `GET /api/plate-allocations`

所有分配记录，含 `plate` / `project` / `vehicle` / `responsible` 嵌套。

### `POST /api/plate-allocations`

**权限**：Admin / PMO / Project Manager

**Body**：

```json
{
  "plateId": "TP-001",
  "projectId": "PRJ-2025-014",
  "vehicleId": "V-001",
  "responsibleUserId": "U002",
  "startDate": "2026-04-22",
  "endDate": "2026-06-30",
  "notes": "..."
}
```

ID 都可以是 legacy 或 uuid。
插入时 PG trigger `detect_plate_conflicts()` 会自动检查重叠 — 如果有就把这条和所有重叠的兄弟行的 `conflict` 设为 `true`。

### `PATCH /api/plate-allocations/:id`

**权限**：Admin / PMO

**Body**（部分字段）：

```json
{
  "startDate": "...",
  "endDate": "...",
  "notes": "..."
}
```

更新后 trigger 会重新计算 `conflict`。

### `GET /api/plate-conflicts`

返回所有 `conflict = true` 的 allocation。这是 PlateTimeline 页面"冲突告警"区域的数据源。

Seed 数据里 `PA-1` 和 `PA-6` 永远会出现在这里（演示用的故意冲突）。

---

## 5. Routes + POIs

### `GET /api/routes`

**Query**: `project_id` `city` `type` `risk_level` `search`

### `GET /api/routes/:id`

`:id` 接受 `R-001` 或 uuid。

### `GET /api/pois`

**Query**: `project_id` `city` `type` `search`

POI 类型枚举见 PRD-3：`Charging / Parking / Risk Point / Service Area / Start Point / Data Handover / Camera Site / Test Site / Boundary / Junction`

### `GET /api/pois/:id`

`:id` 接受 `POI-001` 或 uuid。

---

## 6. Daily Tasks

### `GET /api/tasks`

**Query**: `date` `project_id` `driver_id` `engineer_id` `status` + 通用分页

`date` 格式 `YYYY-MM-DD`（按 `task_date` 精确匹配）。
驾驶员视图：`?driver_id=U006&date=2026-05-07`。

每条 task 含完整的嵌套：`project` / `vehicle` / `driver` / `engineer` / `route`。

### `GET /api/tasks/:id`

`:id` 接受 `DT-2461` 或 uuid。

### `PATCH /api/tasks/:id/status`

**权限**：Driver / Test Engineer / PM / PMO / Admin

**Body**:

```json
{ "status": "In Progress" }
```

合法值：`Planned` / `In Progress` / `Completed` / `Issue` / `Cancelled`

**自动副作用**：
- → `In Progress`：如果 `actualStartAt` 为空，自动填 `now()`
- → `Completed`：如果 `actualEndAt` 为空，自动填 `now()`；如果有 start + end 时间戳，自动计算 `actualHours`（封顶 24h，避免脏数据）

---

## 7. Attendance

### `GET /api/attendance`

**Query**: `date` `project_id` `user_id` `status` + 分页

`date` 会自动转成当天的 `[00:00:00Z, 23:59:59Z)` 范围（因为 `event_at` 是 timestamptz）。

### `POST /api/attendance`

提交打卡。`userId` 自动取当前 actor，**不可** 被 body 覆盖（防止冒充）。

**Body**：

```json
{
  "eventType": "Clock In",
  "eventAt": "2026-05-07T07:42:00Z",
  "location": "Cambridge HQ Car Park",
  "lat": 52.2053,
  "lng": 0.1218,
  "projectId": "PRJ-2025-014",
  "taskId": "DT-2461",
  "vehicleId": "V-001",
  "hasPhoto": true,
  "photoRef": "lark://drive/xxx"
}
```

合法 `eventType`：`Clock In` / `Clock Out` / `Arrived Test Area` / `Break Start` / `Break End`

`eventAt` 省略时使用 `now()`。

### `PATCH /api/attendance/:id/correction`

**权限**：Admin / PMO only

**Body**：

```json
{
  "eventAt": "2026-05-07T07:42:00Z",
  "location": "Cambridge HQ Car Park",
  "correctionReason": "App network issue",
  "notes": "..."
}
```

会自动：
- `status = 'Manual Correction'`
- `manualCorrection = true`
- `correctedAt = now()`
- `correctedBy = 当前 actor 的 uuid`

`correctionReason` 必填。

---

## 8. Issues

### `GET /api/issues`

**Query**: `status` `severity` `type` `project_id` `search` + 分页

`search` 匹配 `title` / `description`。

每条 issue 含 `project` / `vehicle` / `task` / `reporter` / `owner` 嵌套。

### `GET /api/issues/:id`

`:id` 接受 `ISS-501` 或 uuid。

### `POST /api/issues`

**Body**：

```json
{
  "title": "Plate TP-004 expires before project end",
  "description": "...",
  "type": "Plate",
  "severity": "High",
  "status": "Open",
  "projectId": "PRJ-2025-013",
  "vehicleId": "V-007",
  "taskId": "DT-2464",
  "ownerId": "U001",
  "attachments": [{ "name": "...", "ref": "lark://drive/..." }]
}
```

`reportedBy` 自动取当前 actor。`reportedAt` 自动 `now()`。
`ownerId` 不传时默认是 reporter 自己。

### `PATCH /api/issues/:id`

**Body**（任意子集）：

```json
{
  "severity": "Critical",
  "status": "In Progress",
  "ownerId": "U002",
  "description": "...",
  "resolution": "..."
}
```

### `PATCH /api/issues/:id/close`

**Body**：

```json
{ "resolution": "Renewal completed on 2026-05-14" }
```

会自动设置 `status = 'Closed'` + `resolvedAt = now()`。

---

## 9. Expenses

### `GET /api/expenses`

**Query**: `status` `category` `project_id` `user_id` + 分页

`user_id` 按 applicant 过滤（前端 Driver 视角看自己的报销）。

### `GET /api/expenses/:id`

### `POST /api/expenses`

**Body**：

```json
{
  "category": "Parking",
  "amount": 18.50,
  "currency": "GBP",
  "expenseDate": "2026-05-06",
  "description": "Stansted long-stay 6h",
  "projectId": "PRJ-2025-014",
  "vehicleId": "V-001",
  "receiptRef": "lark://drive/...",
  "status": "Submitted"
}
```

`applicantId` 自动取当前 actor。
`status` 不传时默认 `Submitted`。

### `PATCH /api/expenses/:id/status`

**Body**：

```json
{ "status": "Approved" }
```

合法值：`Draft` / `Submitted` / `Approved` / `Rejected` / `Paid`

**权限**：
- `Approved` / `Rejected` → Admin / PMO / Project Manager
- `Paid` → Admin / PMO / Finance

**自动副作用**：
- → Approved / Rejected：填 `approverId = 当前 actor` + `approvedAt = now()`
- → Paid：填 `paidAt = now()`

---

## 10. Files

### `GET /api/files`

**Query**: `project_id` `category` `search` + 分页
`search` 匹配 `name`。

### `POST /api/files`

为已经在 Lark Drive（或 Supabase Storage / S3）的文件建索引。
**不接收文件本体** — 这一步只是把元数据写进 DB。

**Body**：

```json
{
  "name": "Daily_Report_2026-05-06.pdf",
  "category": "Daily Report",
  "projectId": "PRJ-2025-014",
  "relatedId": "DT-2461",
  "version": "v1.0",
  "permission": "Project",
  "larkDriveRef": "lark://drive/file/abc126",
  "sizeBytes": 245678,
  "mimeType": "application/pdf"
}
```

必须提供 `larkDriveRef` / `storagePath` / `externalUrl` 三选一。
`uploadedBy` + `uploadedAt` 自动填。

合法 `permission`：`Private` / `Project` / `Public`

---

## 11. Users

### `GET /api/users`

**Query**: `role` `status` `search` + 分页
`search` 匹配 `name` / `email` / `phone`。

### `GET /api/users/:id`

`:id` 接受 `U001` 或 uuid。

### `PATCH /api/users/:id`

**权限分层**：
- `role` / `accountStatus` / 资质字段（`licenceValid` / `licenceExpiry` / `trainingComplete` / `insuranceEligible`）→ Admin / PMO only
- `city` / `phone` → 用户本人 或 Admin / PMO

**Body**（任意子集）：

```json
{
  "role": "Driver",
  "accountStatus": "Active",
  "city": "Manchester",
  "phone": "+44 7700 ...",
  "licenceValid": true,
  "licenceExpiry": "2027-08-15",
  "trainingComplete": true,
  "insuranceEligible": true
}
```

---

## 12. Demo 权限机制（当前阶段）

OAuth 之前用 header 模拟当前用户：

```
x-demo-user-id: U001
x-demo-role: PMO
```

如果 header 缺失，默认 `U001 / PMO`。

合法 role：`Admin` / `PMO` / `Project Manager` / `Test Engineer` / `Driver` / `Finance`

**权限检查在 Worker 层做**（service_role 绕过了 RLS）：
- `isAdminOrPmo(c)` — Admin / PMO 才能通过
- `hasRole(c, 'Admin', 'PMO', 'Finance', ...)` — VARIADIC 检查

每个 mutate endpoint 都明确写了 role 要求，详见上面各节。

**前端集成建议**：
- 用户切换器（Sidebar 里那个）改完当前用户后，把 `legacy_id` 和 `role` 存到 localStorage
- 全局 `fetch` wrapper 把它俩自动注入 request headers
- 切到 OAuth 后这个机制无缝迁移：headers 改成 `Authorization: Bearer <session jwt>`，Worker 层 demoAuth → larkAuth 中间件替换即可，业务路由代码不动

---

## 13. 后续接 Lark OAuth 的计划（Step 4）

### 13.1 Worker 改动

1. 新增 `src/lib/larkAuth.ts` — 验证 Lark JWT / session cookie
2. 新增 `src/routes/auth.ts`：
   - `GET /api/auth/lark/start` → 生成 state，重定向到 Lark 授权页
   - `GET /api/auth/lark/callback?code=...&state=...` → 换 access_token，UPSERT `rtm.users.lark_open_id`，签自己的 session JWT，Set-Cookie，重定向回前端
   - `GET /api/auth/me` → 当前 session 的用户信息
   - `POST /api/auth/logout` → 清 cookie
3. 替换 `src/index.ts` 里的 `demoAuth` 为新 middleware（contract 一样：往 `c.set('userLegacyId', ...)` + `c.set('userRole', ...)`）
4. 增加两个 secrets：`LARK_APP_ID`、`LARK_APP_SECRET`、`SESSION_JWT_SECRET`

### 13.2 数据库改动

`rtm.users.lark_open_id` 字段在 Step 2 已经预留好。Step 4 的 callback 处理器要做的事：

```sql
INSERT INTO rtm.users (lark_open_id, name, email, role, account_status)
VALUES ($1, $2, $3, 'Driver', 'Active')
ON CONFLICT (email) DO UPDATE
  SET lark_open_id = EXCLUDED.lark_open_id,
      last_login_at = now();
```

新员工首次登录默认 role = `Driver`，Admin 后续在 Users 页面里改。

### 13.3 前端改动

把 `headers["x-demo-user-id"]` / `x-demo-role` 全部移除。改成 `credentials: "include"`（cookie 自动带上）。
用户切换器只在 dev 环境保留（生产环境不出现）。

### 13.4 RLS 收紧

Step 4 落地的同时按 `docs/rls-policy-notes.md` 第 4 节修正：
- `users_self_update` 加 `WITH CHECK`，禁止改自己 role
- `projects_modify_pm` 限制为业务字段
- 启用 audit_logs 写入（Workers mutation middleware）

---

## 14. 路由清单速查

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | 存活检查 |
| GET | `/api/projects` | 项目列表（filter） |
| GET | `/api/projects/:id` | 项目详情 |
| GET | `/api/projects/:id/overview` | 项目+聚合数 |
| GET | `/api/vehicles` | 车辆列表 |
| GET | `/api/vehicles/:id` | 车辆详情 |
| GET | `/api/vehicles/:id/checks` | 车辆点检历史 |
| POST | `/api/vehicle-checks` | 提交点检 |
| GET | `/api/plates` | 临牌列表 |
| GET | `/api/plates/:id` | 临牌详情 |
| GET | `/api/plate-allocations` | 分配列表 |
| POST | `/api/plate-allocations` | 创建分配 |
| PATCH | `/api/plate-allocations/:id` | 修改分配 |
| GET | `/api/plate-conflicts` | 冲突清单 |
| GET | `/api/routes` | 路线列表 |
| GET | `/api/routes/:id` | 路线详情 |
| GET | `/api/pois` | POI 列表 |
| GET | `/api/pois/:id` | POI 详情 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/:id` | 任务详情 |
| PATCH | `/api/tasks/:id/status` | 切换任务状态 |
| GET | `/api/attendance` | 打卡列表 |
| POST | `/api/attendance` | 创建打卡 |
| PATCH | `/api/attendance/:id/correction` | 手动校正打卡 |
| GET | `/api/issues` | 异常列表 |
| GET | `/api/issues/:id` | 异常详情 |
| POST | `/api/issues` | 创建异常 |
| PATCH | `/api/issues/:id` | 修改异常 |
| PATCH | `/api/issues/:id/close` | 关闭异常 |
| GET | `/api/expenses` | 报销列表 |
| GET | `/api/expenses/:id` | 报销详情 |
| POST | `/api/expenses` | 提交报销 |
| PATCH | `/api/expenses/:id/status` | 审批/拒绝/付款 |
| GET | `/api/files` | 文件索引列表 |
| POST | `/api/files` | 创建文件索引 |
| GET | `/api/users` | 用户列表 |
| GET | `/api/users/:id` | 用户详情 |
| PATCH | `/api/users/:id` | 修改用户 |

共 **38 个 endpoint**。

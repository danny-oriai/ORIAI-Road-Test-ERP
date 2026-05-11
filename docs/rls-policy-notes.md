# Road Test ERP — RLS 权限策略说明

本文档对应 `001_initial_schema.sql` 里 `ROW LEVEL SECURITY` 一节。

---

## 1. 设计思路

我们用三个 SQL helper 函数撑起所有 RLS 策略：

| 函数 | 返回 | 作用 |
|------|------|------|
| `rtm.current_user_id()` | `uuid` | 把 JWT 里的 `sub`（Lark open_id）翻译成 `rtm.users.id` |
| `rtm.has_role(VARIADIC role[])` | `boolean` | 当前用户是否属于某几个角色之一 |
| `rtm.is_project_member(p uuid)` | `boolean` | 当前用户是否是该项目的 manager/PMO/或 project_members 成员 |

每个 RLS policy 都是这三个函数的组合，例如：

```sql
CREATE POLICY tasks_select ON rtm.daily_tasks
  FOR SELECT USING (
    rtm.has_role('Admin','PMO','Finance')
    OR rtm.is_project_member(project_id)
    OR driver_id   = rtm.current_user_id()
    OR engineer_id = rtm.current_user_id()
  );
```

**关键点：三个函数都是 `SECURITY DEFINER`**。这意味着它们以 schema owner 的身份运行，绕过 RLS 自己；否则 `current_user_id()` 查 `rtm.users` 时会再触发 `rtm.users` 上的 RLS，又调一次 `current_user_id()`，无限递归 → 栈溢出。这个坑容器内验证时已经踩过并修好了。

---

## 2. 当前六个角色的权限矩阵

下面是 draft 策略落地后的实际表现（已在本地 PG 16 验证）：

### 2.1 Admin

- 看到 / 编辑 **所有数据**，包括 audit_logs、settings、users
- `Admin` 是唯一可以写 `rtm.settings` 的角色
- 唯一可以 DROP 用户的角色

### 2.2 PMO (Project Management Office)

- 看到 / 编辑 **所有运营数据**：projects, vehicles, plates, allocations, routes, tasks, attendance, issues, expenses, files
- 读取 audit_logs
- 不能写 settings（除非他们同时也是 Admin）
- 实际上 PMO 是日常运营的 superuser

### 2.3 Project Manager

- 读全部项目，**编辑只能限定在自己作为 `manager_id` 的项目**
- 看到 / 修改自己项目下的：tasks, plate_allocations, routes, pois, issues
- 看到自己项目下的 expenses（但不能审批超过自己额度的）
- 看到所有 vehicles 和 plates（共享池资源），但只有 PMO/Admin 能改

### 2.4 Test Engineer

- 看到自己被分配 (`engineer_id`) 的 daily_tasks
- 看到自己作为 `project_members` 出现的项目的 routes / pois / issues
- 自己提交的 vehicle_checks
- 自己的 attendance, expenses, files
- 看不到不相关项目的数据

### 2.5 Driver

- 看到自己被分配 (`driver_id`) 的 daily_tasks
- 看到自己作为 `project_members` 出现的项目
- 自己提交的 vehicle_checks（INSERT 限制为 `submitted_by = current_user_id`）
- 自己的 attendance（INSERT 限制为 `user_id = current_user_id`）
- 自己提交的 expenses（只能编辑 status='Draft' 的）
- 自己上传的 files（permission='Project' 的看得到同项目其他人上传的）

### 2.6 Finance

- 看到所有 projects（只读 — 为了能把 expense 和项目关联起来）
- 看到所有 expenses（要审批所有报销）
- 看到 vehicles 基本信息（看不到 attendance, checks 这些非财务数据）
- 不能修改任何项目内容

### 2.7 外部客户

**当前 draft 不支持。** 客户不会出现在 `users` 表里，没有 `lark_open_id`。如果未来需要给客户提供只读 dashboard，建议方案：

- 新增 `client_users` 表，外键到 `projects(id)`
- 用单独的 magic-link 鉴权（不走 Lark）
- 加一个 `external_token` claim 进 JWT
- 复制一份 RLS policy 集合限定 `client_users` 视野

---

## 3. 矩阵速览

| 表 | Admin | PMO | PM | Engineer | Driver | Finance |
|---|---|---|---|---|---|---|
| users | R+W all | R all | R all | R all | R all | R all |
| projects | R+W all | R+W all | R all, W own | R own member | R own member | R all (read-only) |
| project_members | R+W all | R+W all | R+W own projects | R own | R own | R own |
| vehicles | R+W all | R+W all | R all | R all | R all | R all |
| vehicle_checks | R+W all | R+W all | R own projects | R own projects | R own + W self | – |
| plates | R+W all | R+W all | R all | R all | R all | – |
| plate_allocations | R+W all | R+W all | R all, W own | R all | R all | – |
| routes | R+W all | R+W all | R+W own | R own | R own | – |
| pois | R+W all | R+W all | R+W own | R own | R own | – |
| daily_tasks | R+W all | R+W all | R+W own | R+W own | R own | R own |
| attendance_records | R+W all | R+W all | R own projects | R self + W self | R self + W self | – |
| issues | R+W all | R+W all | R+W own | R reported/owned | R reported/owned | – |
| expenses | R+W all | R+W all | R own + Approve | R self | R+W own (Draft only) | R+W all |
| files | R+W all | R+W all | R own projects | R own projects | R own projects | – |
| audit_logs | R | R | – | – | – | – |
| settings | R+W | R | – | – | – | – |

**R = SELECT, W = INSERT/UPDATE/DELETE**

---

## 4. 当前 Draft 的限制

### 4.1 PM 能改自己项目的所有字段

`projects_modify_pm` 允许 PM `UPDATE` 自己作为 manager 的项目。这意味着 PM 在技术上可以改 `pmo_owner_id`、`status`、`progress`、甚至 `manager_id`（把项目转给别人）。

**产品决定后要做的细化**：
- 用列级权限（PG 16+ 支持 `GRANT UPDATE (col1, col2) ON ...`）限制可改字段
- 或者用 trigger 在 BEFORE UPDATE 拦截受保护字段的变更

### 4.2 没有"客户可见"标记

某些 issues 或 files 是要给外部客户看的（参见上面 2.7 节），目前 RLS 没有体现这一点。等客户访问真正落地，要在 `files`/`issues` 加 `client_visible boolean` 列。

### 4.3 没有"敏感数据"分层

Issue 描述里可能有商业敏感信息（"客户要求降价 20%"），目前所有 PM 都能看。如果 PMO 想隔离不同客户的 PM，需要：
- `issues.sensitivity_level` 字段
- RLS 检查 `sensitivity_level = 'pm-only' AND project.manager_id = current_user_id()`

### 4.4 自己改自己的 role

`users_self_update` policy 允许用户改自己。理论上一个 Driver 可以 `UPDATE users SET role='Admin' WHERE id = current_user_id()`。

**修复**（OAuth 上线时一起做）：
```sql
DROP POLICY users_self_update ON rtm.users;

CREATE POLICY users_self_update ON rtm.users
  FOR UPDATE
  USING (id = rtm.current_user_id())
  WITH CHECK (
    id = rtm.current_user_id()
    AND role = (SELECT role FROM rtm.users WHERE id = rtm.current_user_id())
    AND account_status = (SELECT account_status FROM rtm.users WHERE id = rtm.current_user_id())
  );
```

让自己只能改 name / phone / city 这些"非权限"字段。

### 4.5 没有"项目结束后只读"逻辑

当 `projects.status = 'Archived'` 时，理论上应该所有相关数据都只读。当前 draft 还没加。后续策略示例：

```sql
CREATE POLICY tasks_modify_active_only ON rtm.daily_tasks
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM rtm.projects p
            WHERE p.id = project_id
              AND p.status NOT IN ('Completed','Archived','Cancelled'))
    AND ...
  );
```

### 4.6 audit_logs 写权限

`audit_logs` 启用了 RLS 但没写 INSERT policy → 任何非 service_role 的角色都写不了。这是**故意的**：审计日志只能由 Workers 用 service_role 写，避免普通用户篡改自己的痕迹。如果上线后发现 PostgREST 直连场景需要写 audit_logs，再加：

```sql
CREATE POLICY audit_insert ON rtm.audit_logs
  FOR INSERT WITH CHECK (actor_id = rtm.current_user_id());
```

---

## 5. Lark OAuth 上线后的完善路线

**Step 4（Cloudflare Workers）落地时同步做**：

1. ✅ 启用 Workers 服务，用 `service_role` 直连 Supabase
2. ✅ 在 Workers 的 mutation handler 里写 audit_logs（before/after JSONB diff）
3. ⚠️ 加 `WITH CHECK` 子句到所有 INSERT/UPDATE policy，防止越权写（见 4.4）
4. ⚠️ 把所有"PM 可全字段编辑"的 policy 拆成"PM 可编辑业务字段"，特权字段只留 PMO/Admin

**Step 5（Lark OAuth）落地时同步做**：

5. ✅ Workers callback 把 Lark open_id UPSERT 到 `rtm.users.lark_open_id`
6. ✅ 第一次登录的用户默认 `role = 'Driver'`，Admin 进 Users 页面改
7. ⚠️ 把 `rtm.users.role` 的修改限制为 Admin only：
   ```sql
   CREATE POLICY users_role_update_admin ON rtm.users
     FOR UPDATE USING (rtm.has_role('Admin'))
     WITH CHECK (rtm.has_role('Admin'));
   ```
   并把现有 `users_update_admin` policy 一起调整。

**正式上线前**：

8. ⚠️ 跑一遍渗透测试 — 用每种角色尝试越权操作（改别人 expense status、读别人 issue 等），用 RLS 抓住
9. ⚠️ 给 Supabase 开 statement logging，看一周后没有意外慢查询
10. ⚠️ 把 `legacy_id` 列上的 UNIQUE 约束改成 partial（只对非 NULL 唯一），方便逐步清理

---

## 6. 验证 RLS 工作的 SQL

```sql
-- 模拟 Lark OAuth 之后用户已绑定
UPDATE rtm.users SET lark_open_id = 'ou_test_driver'   WHERE legacy_id = 'U006';
UPDATE rtm.users SET lark_open_id = 'ou_test_pmo'      WHERE legacy_id = 'U001';
UPDATE rtm.users SET lark_open_id = 'ou_test_pm'       WHERE legacy_id = 'U002';

-- 切到一个不带 service_role 的普通连接（在 Supabase Dashboard 用 anon key,
-- 或在 psql 里 SET ROLE authenticated)

-- 装作是 Driver
SET request.jwt.claims = '{"sub":"ou_test_driver"}';
SELECT legacy_id FROM rtm.projects;
-- 期望: 只有他作为 project_member 的项目

-- 装作是 PMO
SET request.jwt.claims = '{"sub":"ou_test_pmo"}';
SELECT count(*) FROM rtm.projects;
-- 期望: 全部 5 个

-- 装作没登录
SET request.jwt.claims = '';
SELECT count(*) FROM rtm.projects;
-- 期望: 0
```

本地 PostgreSQL 16 上四种身份都验证过，行为完全符合上面的矩阵。

---

## 7. 服务角色 (Service Role) 的特殊地位

在 Supabase 里 `service_role` 是个特殊 PG role，它有 `BYPASS RLS` 属性 — **所有 RLS policy 在它面前都无效**。

这是故意设计的：
- Workers 拿 `SUPABASE_SERVICE_ROLE_KEY` 连数据库时绕过所有 RLS
- Workers 代码里**自己**做权限检查（基于 Lark JWT 解析出的 user + role）
- 这种"应用层鉴权 + RLS 作为 defence-in-depth"的双重保护是 Supabase 官方推荐做法

**如果 Workers 代码漏写一个 WHERE 条件**，service_role 不会救你 — 漏数据就漏了。所以 Workers 这一层的代码 review 要严。

如果想完全依赖 RLS（不要 Workers 自己再做检查），就用 `authenticated` role + 透传用户 JWT，而不是 service_role。但 Workers 的灵活性会差一些。两种都可以走，看团队偏好。

import { useMemo, useState } from "react";
import {
  Shield, UserCheck, UserX, CheckCircle2, Link2, Unlink, AlertCircle,
} from "lucide-react";
import type { Role, User } from "../types";
import { sync } from "../lib/api";
import {
  FilterBar, Drawer, Field, Button, Avatar, inputCls,
} from "../components/primitives";

interface UserRow {
  user: User;
  larkBound: boolean;
  accountStatus: "Active" | "Suspended" | "Left";
  projectAccessCount: number;
  lastLogin: string;
  licenceValid: boolean;
  trainingComplete: boolean;
  insuranceEligible: boolean;
}

const ROLES: Role[] = ["Admin", "PMO", "Project Manager", "Test Engineer", "Driver", "Finance"];

const ROLE_STYLE: Record<Role, { bg: string; text: string }> = {
  "Admin":           { bg: "bg-slate-200",   text: "text-slate-800" },
  "PMO":             { bg: "bg-violet-100",  text: "text-violet-800" },
  "Project Manager": { bg: "bg-blue-100",    text: "text-blue-800" },
  "Test Engineer":   { bg: "bg-amber-100",   text: "text-amber-800" },
  "Driver":          { bg: "bg-sky-100",     text: "text-sky-800" },
  "Finance":         { bg: "bg-lime-100",    text: "text-lime-800" },
};

function buildRows(): UserRow[] {
  const users = sync.users();
  const projects = sync.projects();
  return users.map((u, i): UserRow => {
    // Project access: PMO + Admin see all; PM sees managed projects; others see their assigned tasks
    let count: number;
    if (u.role === "PMO" || u.role === "Admin") count = projects.length;
    else if (u.role === "Project Manager") count = projects.filter((p) => p.manager === u.id).length;
    else count = new Set(sync.dailyTasks().filter((t) => t.driver === u.id || t.engineer === u.id).map((t) => t.project)).size;

    return {
      user: u,
      larkBound: i !== 8,                          // Henry not yet bound — demo case
      accountStatus: i === 10 ? "Suspended" : "Active",
      projectAccessCount: count,
      lastLogin: i === 10 ? "2025-12-04 14:22" : `2026-05-${String(7 - (i % 4)).padStart(2, "0")} 0${(8 + i) % 9}:1${i % 6}`,
      licenceValid: i % 9 !== 0,
      trainingComplete: i % 4 !== 0,
      insuranceEligible: i % 5 !== 0,
    };
  });
}

export function UsersPage() {
  const rows = useMemo(buildRows, []);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ role: "", status: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);

  const filtered = rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.user.name.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false;
    }
    if (filters.role && r.user.role !== filters.role) return false;
    if (filters.status && r.accountStatus !== filters.status) return false;
    return true;
  });

  // Role stats
  const roleStats = ROLES.map((role) => ({
    role,
    count: rows.filter((r) => r.user.role === role).length,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Users & Roles</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {rows.length} users · {rows.filter((r) => r.larkBound).length} bound to Lark
          </p>
        </div>
      </div>

      {/* Role stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {roleStats.map(({ role, count }) => {
          const style = ROLE_STYLE[role];
          const active = filters.role === role;
          return (
            <button
              key={role}
              onClick={() => setFilter("role", active ? "" : role)}
              className={`text-left bg-white rounded-2xl border p-4 transition-all ${
                active ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                <Shield size={10} /> {role}
              </span>
              <div className="text-2xl font-semibold text-slate-900 mt-2">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              { key: "status", label: "All status", value: filters.status, options: ["Active", "Suspended", "Left"] },
            ]}
            onFilter={setFilter}
            addLabel="Invite user"
            onAdd={() => {/* future */}}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Lark</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Project access</th>
                <th className="px-3 py-3 font-medium">Eligibility</th>
                <th className="px-3 py-3 font-medium">Last login</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const style = ROLE_STYLE[r.user.role];
                const statusPill =
                  r.accountStatus === "Active"    ? "bg-emerald-50 text-emerald-700" :
                  r.accountStatus === "Suspended" ? "bg-amber-50 text-amber-700" :
                                                    "bg-slate-100 text-slate-600";
                return (
                  <tr key={r.user.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={r.user} size="sm" />
                        <div>
                          <div className="font-medium text-slate-900">{r.user.name}</div>
                          <div className="text-[11px] text-slate-500">{r.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${style.bg} ${style.text}`}>
                        {r.user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      {r.larkBound ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          <Link2 size={11} /> Bound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <Unlink size={11} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusPill}`}>
                        {r.accountStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-700">
                      <span className="font-mono">{r.projectAccessCount}</span>{" "}
                      <span className="text-slate-400">project{r.projectAccessCount !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <EligibilityDot ok={r.licenceValid} label="Lic" />
                        <EligibilityDot ok={r.trainingComplete} label="Tr" />
                        <EligibilityDot ok={r.insuranceEligible} label="Ins" />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-500">{r.lastLogin}</td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => setEditTarget(r)}>
                          Edit role
                        </Button>
                        {r.accountStatus === "Active" && (
                          <Button size="sm" variant="ghost">Deactivate</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit drawer */}
      <Drawer
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit ${editTarget.user.name}` : ""}
        footer={
          <div className="flex justify-between gap-2">
            <Button variant="danger">Deactivate user</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={() => setEditTarget(null)}>Save</Button>
            </div>
          </div>
        }
      >
        {editTarget && (
          <div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center gap-3">
              <Avatar user={editTarget.user} size="md" />
              <div>
                <div className="font-medium text-slate-900">{editTarget.user.name}</div>
                <div className="text-xs text-slate-500">{editTarget.user.email}</div>
              </div>
            </div>
            <Field label="Role" required>
              <select className={inputCls} defaultValue={editTarget.user.role}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Account status">
              <select className={inputCls} defaultValue={editTarget.accountStatus}>
                <option>Active</option>
                <option>Suspended</option>
                <option>Left</option>
              </select>
            </Field>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-700 mb-2">Lark binding</div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                {editTarget.larkBound
                  ? "This user is bound to a Lark account. Re-binding requires PMO approval."
                  : "User has not yet signed in via Lark. They will be auto-bound on first OAuth login."}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-700 mb-2">Eligibility</div>
              <div className="space-y-2 text-sm">
                <EligibilityRow ok={editTarget.licenceValid}      label="Driving licence valid" />
                <EligibilityRow ok={editTarget.trainingComplete}  label="Safety training complete" />
                <EligibilityRow ok={editTarget.insuranceEligible} label="Insurance eligible" />
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function EligibilityDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? "valid" : "invalid"}`}
      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {ok ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
      {label}
    </span>
  );
}

function EligibilityRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><UserCheck size={12} /> OK</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-red-700"><UserX size={12} /> Invalid</span>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Users, UserCheck, UserX, Briefcase, Shield, Award, CheckCircle2,
} from "lucide-react";
import type { Role, User } from "../types";
import { sync, TODAY } from "../lib/api";
import { projectById } from "../lib/lookups";
import {
  Avatar, FilterBar, Drawer, Field, Button, inputCls,
} from "../components/primitives";

interface StaffRow {
  user: User;
  availability: "Available" | "Assigned" | "Off Duty" | "On Leave";
  todayTaskId: string | null;
  todayProjectId: string | null;
  shift: string;          // e.g. "07:00 – 18:00"
  licence: { valid: boolean; expiresIn: number };
  insurance: boolean;
  trainingComplete: boolean;
}

/* Synthesise the row for each user from existing mock data so we don't
 * have to maintain a parallel "staff_assignment" table. */
function buildStaffRows(): StaffRow[] {
  const users = sync.users();
  const todayTasks = sync.dailyTasks().filter((t) => t.date === TODAY);

  return users.map((u, i): StaffRow => {
    const task = todayTasks.find((t) => t.driver === u.id || t.engineer === u.id);
    let availability: StaffRow["availability"];
    if (task) {
      availability = "Assigned";
    } else if (u.role === "PMO" || u.role === "Admin" || u.role === "Finance") {
      availability = "Available";
    } else if (i % 7 === 0) {
      availability = "On Leave";
    } else if (i % 11 === 0) {
      availability = "Off Duty";
    } else {
      availability = "Available";
    }
    return {
      user: u,
      availability,
      todayTaskId: task?.id ?? null,
      todayProjectId: task?.project ?? null,
      shift: task ? "07:00 – 18:00" : "—",
      licence: {
        valid: i % 9 !== 0,
        expiresIn: 30 + (i * 47) % 300,
      },
      insurance: i % 5 !== 0,
      trainingComplete: i % 4 !== 0,
    };
  });
}

const AVAILABILITY_STYLE: Record<StaffRow["availability"], { bg: string; text: string; dot: string }> = {
  "Available": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Assigned":  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  "Off Duty":  { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400" },
  "On Leave":  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
};

const ROLES: Role[] = ["Driver", "Test Engineer", "Project Manager", "PMO", "Admin", "Finance"];

export function StaffPage() {
  const rows = useMemo(buildStaffRows, []);
  const projects = sync.projects();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ role: "", availability: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [assignTarget, setAssignTarget] = useState<StaffRow | null>(null);

  const filtered = rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.user.name.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false;
    }
    if (filters.role && r.user.role !== filters.role) return false;
    if (filters.availability && r.availability !== filters.availability) return false;
    return true;
  });

  // Utilisation: % assigned today out of (Driver + Test Engineer)
  const fieldStaff = rows.filter((r) => r.user.role === "Driver" || r.user.role === "Test Engineer");
  const assignedFieldStaff = fieldStaff.filter((r) => r.availability === "Assigned").length;
  const utilisation = fieldStaff.length === 0 ? 0 : Math.round((assignedFieldStaff / fieldStaff.length) * 100);

  // Role counts
  const roleCounts = ROLES.map((role) => ({
    role,
    count: rows.filter((r) => r.user.role === role).length,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Staff Assignment</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {rows.length} staff · {assignedFieldStaff} of {fieldStaff.length} field staff on duty today
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBlock icon={Users} accent="blue" label="Total staff" value={rows.length} />
        <KpiBlock icon={UserCheck} accent="emerald" label="Available today" value={rows.filter((r) => r.availability === "Available").length} />
        <KpiBlock icon={Briefcase} accent="amber" label="Assigned to tasks" value={assignedFieldStaff} />
        <UtilCard percent={utilisation} />
      </div>

      {/* Role chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {roleCounts.map(({ role, count }) => {
          const active = filters.role === role;
          return (
            <button
              key={role}
              onClick={() => setFilter("role", active ? "" : role)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {role} <span className={active ? "text-blue-100 ml-1" : "text-slate-400 ml-1"}>{count}</span>
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
              { key: "availability", label: "All availability", value: filters.availability, options: ["Available", "Assigned", "Off Duty", "On Leave"] },
            ]}
            onFilter={setFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Staff</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">City</th>
                <th className="px-3 py-3 font-medium">Availability</th>
                <th className="px-3 py-3 font-medium">Today's project</th>
                <th className="px-3 py-3 font-medium">Shift</th>
                <th className="px-3 py-3 font-medium">Qualifications</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const avail = AVAILABILITY_STYLE[r.availability];
                const project = projectById(r.todayProjectId);
                const licenceWarning = r.licence.valid && r.licence.expiresIn <= 60;
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
                    <td className="px-3 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{r.user.role}</span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-600">{r.user.city}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${avail.bg} ${avail.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                        {r.availability}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      {project ? (
                        <div>
                          <div className="text-slate-700 truncate max-w-[200px]">{project.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.todayTaskId}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-600">{r.shift}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <QualBadge
                          ok={r.licence.valid}
                          warn={licenceWarning}
                          icon={Shield}
                          label="Lic."
                          hint={r.licence.valid ? `${r.licence.expiresIn}d` : "Expired"}
                        />
                        <QualBadge ok={r.insurance} icon={Award} label="Ins." />
                        <QualBadge ok={r.trainingComplete} icon={CheckCircle2} label="Tr." />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setAssignTarget(r)}>
                        Assign
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign drawer */}
      <Drawer
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        title={assignTarget ? `Assign ${assignTarget.user.name}` : ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button onClick={() => setAssignTarget(null)}>Confirm assignment</Button>
          </div>
        }
      >
        {assignTarget && (
          <div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center gap-3">
              <Avatar user={assignTarget.user} size="md" />
              <div>
                <div className="font-medium text-slate-900">{assignTarget.user.name}</div>
                <div className="text-xs text-slate-500">{assignTarget.user.role} · {assignTarget.user.city}</div>
              </div>
            </div>
            <Field label="Project" required>
              <select className={inputCls} defaultValue={assignTarget.todayProjectId ?? ""}>
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date"><input type="date" defaultValue={TODAY} className={inputCls} /></Field>
              <Field label="End date"><input type="date" className={inputCls} /></Field>
            </div>
            <Field label="Role on project">
              <select className={inputCls}>
                <option>Primary {assignTarget.user.role.toLowerCase()}</option>
                <option>Backup</option>
                <option>Convoy lead</option>
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={inputCls} rows={3} placeholder="Optional handover notes..." />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function KpiBlock({
  icon: Icon, accent, label, value,
}: {
  icon: typeof Users; accent: "blue" | "emerald" | "amber"; label: string; value: number;
}) {
  const styles = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
  }[accent];
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg ${styles.bg} ${styles.text} flex items-center justify-center`}>
          <Icon size={17} />
        </div>
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
      </div>
      <div className="text-xs text-slate-500 mt-2">{label}</div>
    </div>
  );
}

function UtilCard({ percent }: { percent: number }) {
  const color = percent >= 80 ? "bg-amber-500" : percent >= 50 ? "bg-blue-500" : "bg-emerald-500";
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
          <UserX size={17} />
        </div>
        <span className="text-2xl font-semibold text-slate-900">{percent}%</span>
      </div>
      <div className="text-xs text-slate-500 mt-2">Field staff utilisation</div>
      <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function QualBadge({
  ok, warn = false, icon: Icon, label, hint,
}: {
  ok: boolean; warn?: boolean; icon: typeof Shield; label: string; hint?: string;
}) {
  const style = !ok
    ? "bg-red-50 text-red-700"
    : warn
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";
  return (
    <span
      title={`${label} · ${ok ? "OK" : "Invalid"}${hint ? ` (${hint})` : ""}`}
      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${style}`}
    >
      <Icon size={9} /> {label}
    </span>
  );
}

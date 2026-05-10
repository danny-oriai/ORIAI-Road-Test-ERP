import { useState } from "react";
import {
  ChevronLeft, Edit3, MoreHorizontal, AlertTriangle, Activity, FileText,
  BadgeCheck, Route, MapPin,
} from "lucide-react";
import type { Vehicle } from "../types";
import { sync } from "../lib/api";
import { projectById, userById, vehicleById } from "../lib/lookups";
import {
  PROJECT_STATUS_STYLE, TASK_STATUS_STYLE,
  VEHICLE_STATUS_STYLE, PLATE_STATUS_STYLE,
} from "../lib/statusStyles";
import {
  StatusBadge, Avatar, Button,
} from "../components/primitives";
import {
  AttendanceTable, VehicleChecksTable, IssuesTable, ExpensesTable, FilesTable,
} from "../components/tables";
import { USERS } from "../mock/users";

interface Props {
  projectId: string;
  onBack: () => void;
}

type TabId =
  | "overview" | "tasks" | "members" | "vehicles" | "plates"
  | "routes" | "attendance" | "checks" | "issues" | "expenses" | "files";

interface TabDef {
  id: TabId;
  label: string;
  count?: number;
}

export function ProjectDetailPage({ projectId, onBack }: Props) {
  const project = projectById(projectId);
  const [tab, setTab] = useState<TabId>("overview");

  if (!project) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft size={14} /> Back
        </button>
        <p className="mt-4 text-sm text-slate-600">Project not found.</p>
      </div>
    );
  }

  const pm  = userById(project.manager);
  const pmo = userById(project.pmoOwner);

  const projectTasks    = sync.dailyTasks().filter((t) => t.project === projectId);
  const projectVehicles = sync.vehicles().filter((v) => v.project === projectId);
  const projectPlates   = sync.plates().filter((p) => p.project === projectId);
  const projectIssues   = sync.issues().filter((i) => i.project === projectId);
  const projectExpenses = sync.expenses().filter((e) => e.project === projectId);
  const projectFiles    = sync.files().filter((f) => f.project === projectId);
  const projectAttend   = sync.attendance().filter((a) => a.project === projectId);
  const projectRoutes   = sync.routes().filter((r) => r.project === projectId);
  const projectPois     = sync.pois().filter((p) => p.project === projectId);
  const projectChecks   = sync.vehicleChecks().filter((c) =>
    projectVehicles.some((v: Vehicle) => v.id === c.vehicle)
  );

  const tabs: TabDef[] = [
    { id: "overview",   label: "Overview" },
    { id: "tasks",      label: "Tasks",        count: projectTasks.length },
    { id: "members",    label: "Members" },
    { id: "vehicles",   label: "Vehicles",     count: projectVehicles.length },
    { id: "plates",     label: "Plates",       count: projectPlates.length },
    { id: "routes",     label: "Routes & POIs", count: projectRoutes.length + projectPois.length },
    { id: "attendance", label: "Attendance",   count: projectAttend.length },
    { id: "checks",     label: "Checks",       count: projectChecks.length },
    { id: "issues",     label: "Issues",       count: projectIssues.length },
    { id: "expenses",   label: "Expenses",     count: projectExpenses.length },
    { id: "files",      label: "Files",        count: projectFiles.length },
  ];

  // Members = PM + PMO + everyone who appears as a driver or engineer on a task,
  //           deduplicated by user id.
  const memberIds = new Set<string>();
  if (pm)  memberIds.add(pm.id);
  if (pmo) memberIds.add(pmo.id);
  projectTasks.forEach((t) => { memberIds.add(t.driver); memberIds.add(t.engineer); });
  const members = USERS.filter((u) => memberIds.has(u.id));

  const priorityPill =
    project.priority === "High"   ? "bg-red-50 text-red-700" :
    project.priority === "Medium" ? "bg-amber-50 text-amber-700" :
                                    "bg-slate-100 text-slate-600";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3"
        >
          <ChevronLeft size={14} /> Back to Projects
        </button>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-xs font-mono text-slate-400">{project.id}</span>
                <StatusBadge value={project.status} styleMap={PROJECT_STATUS_STYLE} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityPill}`}>
                  {project.priority} priority
                </span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                {project.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {project.client} · {project.region} · {project.type}
              </p>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Project Manager</div>
                  <div className="flex items-center gap-2">
                    <Avatar user={pm} size="sm" />
                    <span className="font-medium text-slate-900">{pm?.name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">PMO Owner</div>
                  <div className="flex items-center gap-2">
                    <Avatar user={pmo} size="sm" />
                    <span className="font-medium text-slate-900">{pmo?.name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Timeline</div>
                  <div className="font-medium text-slate-900">
                    {project.startDate} → {project.endDate}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Progress</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="font-medium text-slate-900 text-xs">
                      {project.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button variant="secondary" icon={Edit3} size="sm">Edit</Button>
              <Button variant="ghost" icon={MoreHorizontal} size="sm">More</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center gap-1 px-4 border-b border-slate-100 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  active
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}{" "}
                {t.count != null && (
                  <span className={`ml-1 text-xs ${active ? "text-blue-500" : "text-slate-400"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-5">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Project notes</h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                    {project.notes}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Data requirement</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border border-slate-100">
                    {project.dataReq}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Recent activity</h4>
                  <div className="space-y-2.5">
                    {[
                      { t: "Issue ISS-503 reported",                       who: userById("U008"), time: "2h ago",      icon: AlertTriangle, c: "text-red-500" },
                      { t: `Task ${projectTasks[0]?.id ?? ""} started`,    who: userById("U006"), time: "4h ago",      icon: Activity,      c: "text-blue-500" },
                      { t: "Daily report uploaded",                        who: userById("U004"), time: "Yesterday",   icon: FileText,      c: "text-emerald-500" },
                      { t: "Plate TP-001 allocated",                       who: userById("U001"), time: "2 days ago",  icon: BadgeCheck,    c: "text-violet-500" },
                    ].map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm py-1.5">
                          <Icon size={14} className={a.c} />
                          <span className="text-slate-700">{a.t}</span>
                          <span className="text-slate-400 text-xs">by {a.who?.name.split(" ")[0]}</span>
                          <span className="ml-auto text-slate-400 text-xs">{a.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-2">Resources</div>
                  <div className="space-y-2 text-sm">
                    <Row label="Vehicles required" value={project.vehiclesNeeded} />
                    <Row label="Staff required"    value={project.staffNeeded} />
                    <Row label="Plates required"   value={project.plateNeeded ? "Yes" : "No"} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-2">Quick stats</div>
                  <div className="space-y-2 text-sm">
                    <Row
                      label="Open issues"
                      value={
                        <span className="text-red-600">
                          {projectIssues.filter((i) => i.status === "Open" || i.status === "In Progress").length}
                        </span>
                      }
                    />
                    <Row
                      label="Pending expenses"
                      value={`£${projectExpenses
                        .filter((e) => e.status === "Submitted")
                        .reduce((a, e) => a + e.amount, 0)
                        .toFixed(2)}`}
                    />
                    <Row label="Files indexed" value={projectFiles.length} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "tasks" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 font-medium">Task</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Vehicle</th>
                  <th className="py-2 font-medium">Driver</th>
                  <th className="py-2 font-medium">Engineer</th>
                  <th className="py-2 font-medium">Hours</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3">
                      <div className="font-mono text-xs text-slate-400">{t.id}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{t.start} → {t.end}</div>
                    </td>
                    <td className="py-3 text-slate-600 text-xs">{t.date}</td>
                    <td className="py-3 text-slate-600 text-xs">{vehicleById(t.vehicle)?.plate}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={userById(t.driver)} size="xs" />
                        <span className="text-xs">{userById(t.driver)?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={userById(t.engineer)} size="xs" />
                        <span className="text-xs">{userById(t.engineer)?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 text-xs">{t.plannedHours}h</td>
                    <td className="py-3">
                      <StatusBadge value={t.status} styleMap={TASK_STATUS_STYLE} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "members" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((u) => (
                <div key={u.id} className="border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                  <Avatar user={u} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 text-sm truncate">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.role}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "vehicles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectVehicles.map((v) => (
                <div key={v.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-slate-400">{v.id}</div>
                    <StatusBadge value={v.status} styleMap={VEHICLE_STATUS_STYLE} />
                  </div>
                  <div className="font-semibold text-slate-900 mt-1">{v.brand} {v.model}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {v.plate} · {v.power} · {v.mileage.toLocaleString()} mi
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Driver: {userById(v.driver)?.name ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "plates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectPlates.map((p) => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-slate-400">{p.id}</div>
                    <StatusBadge value={p.status} styleMap={PLATE_STATUS_STYLE} />
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-1 text-lg">{p.number}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.type}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Valid: {p.validFrom} → {p.validTo}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "routes" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  Routes ({projectRoutes.length})
                </h4>
                <div className="space-y-2">
                  {projectRoutes.map((r) => (
                    <div key={r.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <Route size={16} className="text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">{r.name}</div>
                        <div className="text-xs text-slate-500">
                          {r.distance} mi · {r.duration} · {r.type}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{r.pois} POIs</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  POIs ({projectPois.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {projectPois.map((p) => (
                    <div key={p.id} className="border border-slate-200 rounded-lg p-3 flex items-start gap-2 text-sm">
                      <MapPin size={14} className="text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.type} · {p.city}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "attendance" && <AttendanceTable     rows={projectAttend} />}
          {tab === "checks"     && <VehicleChecksTable  rows={projectChecks} />}
          {tab === "issues"     && <IssuesTable         rows={projectIssues} />}
          {tab === "expenses"   && <ExpensesTable       rows={projectExpenses} />}
          {tab === "files"      && <FilesTable          rows={projectFiles} />}
        </div>
      </div>
    </div>
  );
}

/* small inline helper used inside Overview right-column cards */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

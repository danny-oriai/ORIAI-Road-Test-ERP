import { useMemo, useState } from "react";
import {
  Car, Route as RouteIcon, Clock, HardDrive, Play, CheckCircle2,
  AlertTriangle, ListChecks, ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import type { PageKey, TaskStatus } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById, vehicleById, routeById } from "../lib/lookups";
import { TASK_STATUS_STYLE } from "../lib/statusStyles";
import { StatusBadge, Avatar, FilterBar, Button } from "../components/primitives";

interface Props {
  onOpenProject: (projectId: string) => void;
  onNav: (page: PageKey) => void;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function TasksPage({ onOpenProject, onNav }: Props) {
  const tasks = sync.dailyTasks();
  const projects = sync.projects();

  const [date, setDate] = useState(TODAY);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", project: "", driver: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const driverOptions = useMemo(
    () => sync.users().filter((u) => u.role === "Driver").map((u) => u.name),
    []
  );
  const projectOptions = useMemo(() => projects.map((p) => p.id), [projects]);
  const statusOptions: TaskStatus[] = ["Planned", "In Progress", "Completed", "Issue", "Cancelled"];

  const filtered = tasks.filter((t) => {
    if (t.date !== date) return false;
    if (search) {
      const q = search.toLowerCase();
      const project = projectById(t.project);
      if (
        !t.id.toLowerCase().includes(q) &&
        !(project?.name.toLowerCase().includes(q) ?? false) &&
        !t.start.toLowerCase().includes(q) &&
        !t.end.toLowerCase().includes(q)
      )
        return false;
    }
    if (filters.status && t.status !== filters.status) return false;
    if (filters.project && t.project !== filters.project) return false;
    if (filters.driver) {
      const driver = userById(t.driver);
      if (driver?.name !== filters.driver) return false;
    }
    return true;
  });

  const totals = {
    planned: tasks.filter((t) => t.date === date && t.status === "Planned").length,
    inProgress: tasks.filter((t) => t.date === date && t.status === "In Progress").length,
    completed: tasks.filter((t) => t.date === date && t.status === "Completed").length,
    issue: tasks.filter((t) => t.date === date && t.status === "Issue").length,
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Daily Tasks</h2>
          <p className="text-sm text-slate-500 mt-0.5">{dateLabel(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => setDate(shiftDate(date, -1))}>
            Prev
          </Button>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-8 pr-2 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDate(TODAY)}>Today</Button>
          <Button variant="secondary" size="sm" icon={ChevronRight} onClick={() => setDate(shiftDate(date, 1))}>
            Next
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile icon={ListChecks}     label="Planned"    value={totals.planned}    accent="slate" />
        <KpiTile icon={Play}           label="In progress" value={totals.inProgress} accent="amber" />
        <KpiTile icon={CheckCircle2}   label="Completed"   value={totals.completed}  accent="emerald" />
        <KpiTile icon={AlertTriangle}  label="With issue"  value={totals.issue}      accent="red" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
        <FilterBar
          search={search}
          onSearch={setSearch}
          filters={[
            { key: "status",  label: "All statuses", value: filters.status,  options: statusOptions },
            { key: "project", label: "All projects", value: filters.project, options: projectOptions },
            { key: "driver",  label: "All drivers",  value: filters.driver,  options: driverOptions },
          ]}
          onFilter={setFilter}
          addLabel="New task"
          onAdd={() => {/* future */}}
        />
      </div>

      {/* Task cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
          <ListChecks size={32} className="mx-auto text-slate-300" />
          <p className="text-sm text-slate-500 mt-3">No tasks match the current filters for this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const project = projectById(t.project);
            const vehicle = vehicleById(t.vehicle);
            const route   = routeById(t.route);
            const driver  = userById(t.driver);
            const engineer = userById(t.engineer);
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-slate-400">{t.id}</span>
                      <StatusBadge value={t.status} styleMap={TASK_STATUS_STYLE} />
                    </div>
                    <button
                      onClick={() => onOpenProject(t.project)}
                      className="text-left text-sm font-semibold text-slate-900 hover:text-blue-600 leading-snug"
                    >
                      {project?.name ?? "—"}
                    </button>
                    <div className="text-xs text-slate-500 mt-1">{project?.client} · {project?.region}</div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1.5">
                    {t.status === "Planned" && (
                      <Button size="sm" icon={Play}>Start</Button>
                    )}
                    {t.status === "In Progress" && (
                      <Button size="sm" variant="success" icon={CheckCircle2}>Complete</Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={AlertTriangle}
                      onClick={() => onNav("issues")}
                    >
                      Report issue
                    </Button>
                  </div>
                </div>

                {/* Body */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Mini icon={Car} label={vehicle?.plate ?? "—"} sub={`${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}`.trim() || "Unassigned"} />
                  <Mini icon={RouteIcon} label={route?.name.slice(0, 22) ?? "—"} sub={`${route?.distance ?? "—"} mi · ${route?.type ?? "—"}`} />
                  <Mini icon={Clock} label={`${t.plannedHours}h planned`} sub={`${t.start} → ${t.end}`} />
                  <Mini icon={HardDrive} label={t.dataReq.slice(0, 22)} sub={t.notes ? t.notes.slice(0, 40) : "—"} />
                </div>

                {/* Staff row */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Avatar user={driver} size="xs" />
                      <div>
                        <div className="text-slate-700 font-medium">{driver?.name.split(" ")[0] ?? "—"}</div>
                        <div className="text-[10px] text-slate-400">Driver</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Avatar user={engineer} size="xs" />
                      <div>
                        <div className="text-slate-700 font-medium">{engineer?.name.split(" ")[0] ?? "—"}</div>
                        <div className="text-[10px] text-slate-400">Test Engineer</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, sub }: { icon: typeof Car; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <div className="text-slate-900 font-medium text-xs truncate">{label}</div>
        <div className="text-[11px] text-slate-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

function KpiTile({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Car; label: string; value: number;
  accent: "slate" | "amber" | "emerald" | "red";
}) {
  const styles = {
    slate:   { bg: "bg-slate-100",   text: "text-slate-600" },
    amber:   { bg: "bg-amber-50",    text: "text-amber-600" },
    emerald: { bg: "bg-emerald-50",  text: "text-emerald-600" },
    red:     { bg: "bg-red-50",      text: "text-red-600" },
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

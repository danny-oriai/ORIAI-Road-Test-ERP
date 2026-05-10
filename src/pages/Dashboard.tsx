import {
  FolderKanban, ListChecks, Car, BadgeCheck, AlertTriangle, Receipt,
  ChevronRight, Filter, Plus,
} from "lucide-react";
import type { User, PageKey } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById, vehicleById } from "../lib/lookups";
import {
  PROJECT_STATUS_STYLE, TASK_STATUS_STYLE, ISSUE_SEVERITY_STYLE,
} from "../lib/statusStyles";
import { StatCard, StatusBadge, Button, Avatar } from "../components/primitives";

interface Props {
  currentUser: User;
  onNav: (page: PageKey) => void;
  onOpenProject: (projectId: string) => void;
}

const daysBetween = (later: string, earlier: string) =>
  Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000);

export function DashboardPage({ currentUser, onNav, onOpenProject }: Props) {
  const isOps = (["PMO", "Project Manager", "Admin"] as const).some(
    (r) => r === currentUser.role
  );

  const tasks    = sync.dailyTasks();
  const projects = sync.projects();
  const issues   = sync.issues();
  const expenses = sync.expenses();
  const vehicles = sync.vehicles();
  const plates   = sync.plates();

  const todayTasks         = tasks.filter((t) => t.date === TODAY);
  const inProgressProjects = projects.filter((p) => p.status === "In Progress");
  const openIssues         = issues.filter((i) => i.status === "Open" || i.status === "In Progress");
  const pendingExpenses    = expenses.filter((e) => e.status === "Submitted");
  const availableVehicles  = vehicles.filter((v) => v.status === "Available");
  const expiringPlates     = plates.filter((p) => {
    const d = daysBetween(p.validTo, TODAY);
    return d >= 0 && d <= 14;
  });

  const dateLabel = new Date(TODAY).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-500">{dateLabel}</div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Good morning, {currentUser.name.split(" ")[0]}{" "}
            <span className="text-slate-400 font-normal">·</span>{" "}
            <span className="text-slate-500 font-normal text-lg">{currentUser.role} view</span>
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="secondary" icon={Filter} size="md">This week</Button>
          <Button icon={Plus} size="md">New project</Button>
        </div>
      </div>

      {/* KPI Grid — ops roles only */}
      {isOps && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={FolderKanban}
            label="Active projects"
            value={inProgressProjects.length}
            hint={`+${projects.filter((p) => p.status === "Approved" || p.status === "Scheduling").length} ramping up`}
            accent="blue"
            onClick={() => onNav("projects")}
          />
          <StatCard
            icon={ListChecks}
            label="Today's tasks"
            value={todayTasks.length}
            hint={`${todayTasks.filter((t) => t.status === "In Progress").length} in progress`}
            accent="violet"
            onClick={() => onNav("tasks")}
          />
          <StatCard
            icon={Car}
            label="Vehicles available"
            value={availableVehicles.length}
            hint={`${vehicles.filter((v) => v.status === "In Use").length} in field`}
            accent="emerald"
            onClick={() => onNav("vehicles")}
          />
          <StatCard
            icon={BadgeCheck}
            label="Plates expiring ≤14d"
            value={expiringPlates.length}
            hint="Renew before expiry"
            accent="amber"
            onClick={() => onNav("plates")}
          />
          <StatCard
            icon={AlertTriangle}
            label="Open issues"
            value={openIssues.length}
            hint={`${issues.filter((i) => i.severity === "Critical" || i.severity === "High").length} high/critical`}
            accent="red"
            onClick={() => onNav("issues")}
          />
          <StatCard
            icon={Receipt}
            label="Pending expenses"
            value={pendingExpenses.length}
            hint={`£${pendingExpenses.reduce((a, e) => a + e.amount, 0).toFixed(2)}`}
            accent="sky"
            onClick={() => onNav("expenses")}
          />
        </div>
      )}

      {/* Two-column main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Today's tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Today's tasks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayTasks.length} tasks scheduled across{" "}
                {new Set(todayTasks.map((t) => t.project)).size} projects
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNav("tasks")}>
              View all <ChevronRight size={14} />
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {todayTasks.map((t) => {
              const project = projectById(t.project);
              const driver = userById(t.driver);
              const engineer = userById(t.engineer);
              const vehicle = vehicleById(t.vehicle);
              return (
                <div
                  key={t.id}
                  className="px-5 py-3.5 hover:bg-slate-50/60 cursor-pointer flex items-center gap-4"
                  onClick={() => onOpenProject(t.project)}
                >
                  <div className="text-xs font-mono text-slate-400 w-16 shrink-0">{t.id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {project?.name ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Car size={11} /> {vehicle?.plate ?? "—"}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{t.start} → {t.end}</span>
                      <span className="text-slate-300">·</span>
                      <span>{t.plannedHours}h planned</span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center -space-x-1.5">
                    <Avatar user={driver} size="xs" />
                    <Avatar user={engineer} size="xs" />
                  </div>
                  <StatusBadge value={t.status} styleMap={TASK_STATUS_STYLE} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Alerts column */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Needs attention
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onNav("issues")}>All</Button>
            </div>
            <div className="divide-y divide-slate-100">
              {openIssues.slice(0, 4).map((i) => (
                <div key={i.id} className="px-5 py-3 hover:bg-slate-50/60 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <StatusBadge value={i.severity} styleMap={ISSUE_SEVERITY_STYLE} />
                    <span className="text-[11px] text-slate-400 font-mono">{i.id}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 mt-1.5 leading-snug">
                    {i.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {projectById(i.project)?.name.slice(0, 30) ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {expiringPlates.length > 0 && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200/70 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck size={16} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-900">Plates expiring soon</h3>
              </div>
              {expiringPlates.map((p) => {
                const days = daysBetween(p.validTo, TODAY);
                return (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1.5">
                    <div>
                      <span className="font-mono font-semibold text-amber-900">{p.number}</span>
                      <span className="text-amber-700 ml-2">{p.type}</span>
                    </div>
                    <span className="text-amber-700 font-medium">{days}d left</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active projects grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Active projects</h3>
          <Button variant="ghost" size="sm" onClick={() => onNav("projects")}>
            All projects <ChevronRight size={14} />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-slate-100">
          {inProgressProjects.map((p) => {
            const pm = userById(p.manager);
            return (
              <div
                key={p.id}
                className="bg-white p-5 hover:bg-slate-50/50 cursor-pointer"
                onClick={() => onOpenProject(p.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="text-[11px] font-mono text-slate-400">{p.id}</div>
                  <StatusBadge value={p.status} styleMap={PROJECT_STATUS_STYLE} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 mt-2 leading-snug">{p.name}</h4>
                <div className="text-xs text-slate-500 mt-1">{p.client} · {p.region}</div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-medium text-slate-700">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Avatar user={pm} size="xs" />
                    <span>{pm?.name.split(" ")[0]}</span>
                  </div>
                  <span>{p.startDate.slice(5)} → {p.endDate.slice(5)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

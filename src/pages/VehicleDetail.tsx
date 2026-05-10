import {
  ChevronLeft, Car, FileCheck2, AlertTriangle, Briefcase, FileText,
  Zap, Fuel, Battery, Camera, CheckCircle2, AlertCircle, XCircle,
} from "lucide-react";
import type { PageKey } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById, vehicleById } from "../lib/lookups";
import { VEHICLE_STATUS_STYLE, PROJECT_STATUS_STYLE } from "../lib/statusStyles";
import { StatusBadge, Avatar, Button } from "../components/primitives";

interface Props {
  vehicleId: string;
  onBack: () => void;
  onNav: (page: PageKey) => void;
  onOpenProject: (projectId: string) => void;
}

const daysBetween = (later: string, earlier: string) =>
  Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000);

export function VehicleDetailPage({ vehicleId, onBack, onNav, onOpenProject }: Props) {
  const v = vehicleById(vehicleId);

  if (!v) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft size={14} /> Back
        </button>
        <p className="mt-4 text-sm text-slate-600">Vehicle not found.</p>
      </div>
    );
  }

  const project = projectById(v.project);
  const driver = userById(v.driver);

  // Recent checks for this vehicle
  const recentChecks = sync.vehicleChecks()
    .filter((c) => c.vehicle === vehicleId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // History projects = distinct projects from tasks referencing this vehicle
  const historyProjectIds = Array.from(
    new Set(sync.dailyTasks().filter((t) => t.vehicle === vehicleId).map((t) => t.project))
  );
  const historyProjects = historyProjectIds
    .map((id) => projectById(id))
    .filter((p): p is NonNullable<ReturnType<typeof projectById>> => Boolean(p));

  const motDaysLeft = daysBetween(v.motExpiry, TODAY);
  const motCritical = motDaysLeft <= 14;
  const motWarning = motDaysLeft <= 30;

  const PowerIcon =
    v.power === "EV" ? Zap :
    v.power === "Hybrid" ? Battery :
    Fuel;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Back link */}
      <button
        onClick={onBack}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Back to Vehicles
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Car size={26} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono text-slate-400">{v.id}</span>
                <StatusBadge value={v.status} styleMap={VEHICLE_STATUS_STYLE} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                {v.brand} {v.model} <span className="text-slate-400 font-normal">· {v.year}</span>
              </h2>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-slate-700 px-2 py-0.5 bg-slate-100 rounded">{v.plate}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><PowerIcon size={12} /> {v.power}</span>
                <span>·</span>
                <span>{v.ownership}</span>
                <span>·</span>
                <span>{v.city}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={FileCheck2} onClick={() => onNav("vehicle-check")}>
              Create vehicle check
            </Button>
            <Button variant="secondary" icon={AlertTriangle} onClick={() => onNav("issues")}>
              Report issue
            </Button>
            <Button variant="secondary" icon={Briefcase} onClick={() => onNav("projects")}>
              Assign to project
            </Button>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2/3: basics + recent checks + history */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basics */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Spec label="VIN"             value={<span className="font-mono">{v.vin}</span>} />
              <Spec label="Brand / model"   value={`${v.brand} ${v.model}`} />
              <Spec label="Year"            value={v.year} />
              <Spec label="Power type"      value={v.power} />
              <Spec label="Ownership"       value={v.ownership} />
              <Spec label="Current city"    value={v.city} />
              <Spec label="Mileage"         value={<span className="font-mono">{v.mileage.toLocaleString()} mi</span>} />
              <Spec
                label="MOT expiry"
                value={
                  <span className={motCritical ? "text-red-600 font-medium" : motWarning ? "text-amber-600 font-medium" : "text-slate-900"}>
                    {v.motExpiry}{" "}
                    <span className="text-xs text-slate-500">({motDaysLeft >= 0 ? `${motDaysLeft}d left` : `${-motDaysLeft}d overdue`})</span>
                  </span>
                }
              />
              <Spec
                label="Insurance"
                value={
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      v.insurance === "Covered"  ? "bg-emerald-50 text-emerald-700" :
                      v.insurance === "Pending"  ? "bg-amber-50 text-amber-700" :
                                                   "bg-red-50 text-red-700"
                    }`}
                  >
                    {v.insurance}
                  </span>
                }
              />
              <Spec
                label="Road tax"
                value={
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                    Valid
                  </span>
                }
              />
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2">Equipment installed</div>
              <div className="flex flex-wrap gap-1.5">
                {v.equipment.length === 0 && (
                  <span className="text-xs text-slate-400">None recorded</span>
                )}
                {v.equipment.map((e) => (
                  <span key={e} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent checks */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent vehicle checks</h3>
              <Button variant="ghost" size="sm" onClick={() => onNav("vehicle-check")}>New check</Button>
            </div>
            {recentChecks.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No checks recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentChecks.map((c) => {
                  const u = userById(c.driver);
                  const StatusIcon =
                    c.status === "OK"      ? CheckCircle2 :
                    c.status === "Warning" ? AlertCircle :
                                             XCircle;
                  const statusColor =
                    c.status === "OK"      ? "text-emerald-600" :
                    c.status === "Warning" ? "text-amber-600" :
                                             "text-red-600";
                  return (
                    <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className={`shrink-0 ${statusColor}`}>
                        <StatusIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {c.type} <span className="font-mono text-xs text-slate-400 ml-2">{c.id}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{c.date}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono">{c.mileage.toLocaleString()} mi</span>
                          <span className="text-slate-300">·</span>
                          <span>Fuel {c.fuel}%</span>
                          <span className="text-slate-300">·</span>
                          <span className={c.hddFree < 100 ? "text-red-600 font-medium" : ""}>HDD {c.hddFree}GB free</span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1"><Camera size={11} /> {c.photos}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Avatar user={u} size="xs" />
                        {u?.name.split(" ")[0] ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History projects */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Project history</h3>
              <span className="text-xs text-slate-400">{historyProjects.length} projects</span>
            </div>
            {historyProjects.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No project history yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyProjects.map((p) => (
                  <div
                    key={p.id}
                    className="px-5 py-3.5 hover:bg-slate-50/60 cursor-pointer flex items-center gap-3"
                    onClick={() => onOpenProject(p.id)}
                  >
                    <span className="text-[11px] font-mono text-slate-400 w-24 shrink-0">{p.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.client} · {p.startDate} → {p.endDate}
                      </div>
                    </div>
                    <StatusBadge value={p.status} styleMap={PROJECT_STATUS_STYLE} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: current assignment + files placeholder */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Current assignment</h3>
            {project ? (
              <div>
                <div className="text-[11px] font-mono text-slate-400">{project.id}</div>
                <button
                  onClick={() => onOpenProject(project.id)}
                  className="text-left mt-1 text-sm font-medium text-slate-900 hover:text-blue-600"
                >
                  {project.name}
                </button>
                <div className="text-xs text-slate-500 mt-1">{project.client}</div>
                <div className="mt-3"><StatusBadge value={project.status} styleMap={PROJECT_STATUS_STYLE} /></div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Not currently assigned to a project.</p>
            )}

            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2">Driver</div>
              {driver ? (
                <div className="flex items-center gap-2">
                  <Avatar user={driver} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{driver.name}</div>
                    <div className="text-xs text-slate-500">{driver.role}</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No driver assigned.</p>
              )}
            </div>
          </div>

          {/* Files / photos placeholder */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Files & photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400"
                >
                  <Camera size={20} />
                  <span className="text-[11px] mt-1">Photo {i + 1}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNav("files")}
              className="mt-3 w-full text-xs text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 py-2 hover:bg-blue-50 rounded-lg"
            >
              <FileText size={12} /> View all vehicle documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

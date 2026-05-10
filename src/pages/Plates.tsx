import { useMemo, useState } from "react";
import {
  BadgeCheck, ChevronRight, AlertTriangle, Calendar,
} from "lucide-react";
import type { PageKey, PlateStatus } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById, vehicleById } from "../lib/lookups";
import { PLATE_STATUS_STYLE } from "../lib/statusStyles";
import {
  StatusBadge, Avatar, FilterBar, Button,
} from "../components/primitives";

interface Props {
  onNav: (page: PageKey) => void;
}

const daysBetween = (later: string, earlier: string) =>
  Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000);

export function PlatesPage({ onNav }: Props) {
  const plates = sync.plates();
  const allocations = sync.plateAllocations();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const statusOptions: PlateStatus[] = ["Available", "Reserved", "In Use", "Expired"];

  // Plates with conflict markers in allocations
  const conflictPlateIds = useMemo(
    () => new Set(allocations.filter((a) => a.conflict).map((a) => a.plate)),
    [allocations]
  );

  const filtered = plates.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.number.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    }
    if (filters.status && p.status !== filters.status) return false;
    if (filters.type && p.type !== filters.type) return false;
    return true;
  });

  const expiringCount = plates.filter((p) => {
    const d = daysBetween(p.validTo, TODAY);
    return d >= 0 && d <= 30 && p.status !== "Expired";
  }).length;
  const conflictCount = conflictPlateIds.size;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Trade Plates</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {plates.length} plates · {expiringCount} expiring in 30d · {conflictCount} with conflicts
          </p>
        </div>
        <Button variant="secondary" icon={Calendar} onClick={() => onNav("plate-timeline")}>
          Open timeline
        </Button>
      </div>

      {/* Warning banner — conflicts */}
      {conflictCount > 0 && (
        <button
          onClick={() => onNav("plate-timeline")}
          className="w-full text-left bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-red-100/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-900">
              {conflictCount} plate{conflictCount > 1 ? "s have" : " has"} allocation conflicts
            </div>
            <div className="text-xs text-red-700 mt-0.5">
              Two projects are trying to use the same plate in overlapping date ranges — open timeline to resolve.
            </div>
          </div>
          <ChevronRight size={16} className="text-red-400" />
        </button>
      )}

      {/* Status filter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusOptions.map((s) => {
          const count = plates.filter((p) => p.status === s).length;
          const active = filters.status === s;
          const style = PLATE_STATUS_STYLE[s];
          return (
            <button
              key={s}
              onClick={() => setFilter("status", active ? "" : s)}
              className={`text-left bg-white rounded-2xl border p-4 transition-all ${
                active
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className="text-2xl font-semibold text-slate-900">{count}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1.5">{s}</div>
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
              { key: "type", label: "All types", value: filters.type, options: ["Trade Plate", "Temporary Plate"] },
            ]}
            onFilter={setFilter}
            addLabel="Add plate"
            onAdd={() => {/* future drawer */}}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Plate</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Valid</th>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Vehicle</th>
                <th className="px-3 py-3 font-medium">Responsible</th>
                <th className="px-3 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const responsible = userById(p.responsible);
                const project = projectById(p.project);
                const vehicle = vehicleById(p.vehicle);
                const daysLeft = daysBetween(p.validTo, TODAY);
                const isExpired = p.status === "Expired" || daysLeft < 0;
                const isExpiring = !isExpired && daysLeft <= 30;
                const hasConflict = conflictPlateIds.has(p.id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                          <BadgeCheck size={16} className="text-amber-600" />
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-slate-900">{p.number}</div>
                          <div className="text-[11px] font-mono text-slate-400">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-600">{p.type}</td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={p.status} styleMap={PLATE_STATUS_STYLE} />
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <div className="font-mono text-slate-600">{p.validFrom} → {p.validTo}</div>
                      {isExpired ? (
                        <div className="text-red-600 font-medium mt-0.5">Expired {-daysLeft}d ago</div>
                      ) : isExpiring ? (
                        <div className="text-amber-600 font-medium mt-0.5">{daysLeft}d left</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      {project ? (
                        <span className="text-slate-700 truncate max-w-[160px] inline-block">
                          {project.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      {vehicle ? (
                        <span className="font-mono text-slate-700">{vehicle.plate}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {responsible ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar user={responsible} size="xs" />
                          <span className="text-xs">{responsible.name.split(" ")[0]}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                            <AlertTriangle size={10} /> Conflict
                          </span>
                        )}
                        {isExpiring && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                            Expiring
                          </span>
                        )}
                        {!hasConflict && !isExpiring && !isExpired && (
                          <span className="text-[11px] text-slate-400">—</span>
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

      {/* Notes box */}
      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600">
        <p>
          <span className="font-medium text-slate-700">Trade Plate vs Temporary Plate:</span>{" "}
          Trade plates are issued annually and reusable across vehicles. Temporary plates are vehicle-specific
          and time-bounded. Plates marked <span className="font-medium text-red-700">Expired</span> must not
          be reused until renewed.
        </p>
      </div>
    </div>
  );
}

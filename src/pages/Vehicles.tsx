import { useMemo, useState } from "react";
import { Car, ChevronRight, AlertTriangle, Zap, Fuel, Battery } from "lucide-react";
import type { VehicleStatus, Vehicle } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById } from "../lib/lookups";
import { VEHICLE_STATUS_STYLE } from "../lib/statusStyles";
import { StatusBadge, Avatar, FilterBar } from "../components/primitives";

interface Props {
  onOpen: (vehicleId: string) => void;
}

const daysBetween = (later: string, earlier: string) =>
  Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000);

/** Best-effort: find the most recent VehicleCheck for this vehicle. */
function lastCheckFor(vehicleId: string): { date: string; status: "OK" | "Warning" | "Critical" } | null {
  const checks = sync.vehicleChecks().filter((c) => c.vehicle === vehicleId);
  if (checks.length === 0) return null;
  // Mock dates are sortable lexicographically (YYYY-MM-DD HH:mm)
  const latest = checks.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return { date: latest.date, status: latest.status };
}

function powerIcon(power: Vehicle["power"]) {
  if (power === "EV") return <Zap size={11} className="text-emerald-600" />;
  if (power === "Hybrid") return <Battery size={11} className="text-blue-600" />;
  return <Fuel size={11} className="text-slate-500" />;
}

export function VehiclesPage({ onOpen }: Props) {
  const vehicles = sync.vehicles();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", power: "", city: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const statusGroups: VehicleStatus[] = ["Available", "Reserved", "In Use", "Maintenance", "Accident"];

  const cityOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.city))).sort(),
    [vehicles]
  );

  const filtered = vehicles.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !v.plate.toLowerCase().includes(q) &&
        !v.id.toLowerCase().includes(q) &&
        !`${v.brand} ${v.model}`.toLowerCase().includes(q)
      )
        return false;
    }
    if (filters.status && v.status !== filters.status) return false;
    if (filters.power && v.power !== filters.power) return false;
    if (filters.city && v.city !== filters.city) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Vehicles</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {vehicles.length} vehicles
        </p>
      </div>

      {/* Status filter cards — tap to filter */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusGroups.map((s) => {
          const count = vehicles.filter((v) => v.status === s).length;
          const active = filters.status === s;
          const style = VEHICLE_STATUS_STYLE[s];
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
              { key: "power", label: "All power types", value: filters.power, options: ["EV", "Hybrid", "Petrol", "Diesel"] },
              { key: "city",  label: "All cities",      value: filters.city,  options: cityOptions },
            ]}
            onFilter={setFilter}
            addLabel="Add vehicle"
            onAdd={() => {/* drawer hook-in point for future */}}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">City</th>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Driver</th>
                <th className="px-3 py-3 font-medium">Mileage</th>
                <th className="px-3 py-3 font-medium">MOT</th>
                <th className="px-3 py-3 font-medium">Insurance</th>
                <th className="px-3 py-3 font-medium">Last check</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const driver = userById(v.driver);
                const project = projectById(v.project);
                const motDaysLeft = daysBetween(v.motExpiry, TODAY);
                const motWarning = motDaysLeft <= 30;
                const motCritical = motDaysLeft <= 14;
                const lastCheck = lastCheckFor(v.id);
                const checkBadgeColor =
                  lastCheck?.status === "Critical" ? "text-red-600" :
                  lastCheck?.status === "Warning"  ? "text-amber-600" :
                                                    "text-emerald-600";
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => onOpen(v.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Car size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{v.brand} {v.model}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono">{v.plate}</span>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-1">{powerIcon(v.power)} {v.power}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-[11px] text-slate-400">{v.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={v.status} styleMap={VEHICLE_STATUS_STYLE} />
                    </td>
                    <td className="px-3 py-3.5 text-slate-600 text-xs">{v.city}</td>
                    <td className="px-3 py-3.5 text-xs">
                      {project ? (
                        <span className="text-slate-700 truncate max-w-[160px] inline-block">
                          {project.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {driver ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar user={driver} size="xs" />
                          <span className="text-xs">{driver.name.split(" ")[0]}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-700">
                      {v.mileage.toLocaleString()} mi
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <div className={`flex items-center gap-1 ${
                        motCritical ? "text-red-600 font-medium" : motWarning ? "text-amber-600" : "text-slate-600"
                      }`}>
                        {motWarning && <AlertTriangle size={11} />}
                        <span className="font-mono">{v.motExpiry}</span>
                      </div>
                      {motWarning && (
                        <div className="text-[11px] mt-0.5">
                          {motDaysLeft >= 0 ? `${motDaysLeft}d left` : `${-motDaysLeft}d overdue`}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          v.insurance === "Covered"  ? "bg-emerald-50 text-emerald-700" :
                          v.insurance === "Pending"  ? "bg-amber-50 text-amber-700" :
                                                       "bg-red-50 text-red-700"
                        }`}
                      >
                        {v.insurance}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      {lastCheck ? (
                        <div>
                          <div className={`font-medium ${checkBadgeColor}`}>{lastCheck.status}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{lastCheck.date.slice(5, 10)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ChevronRight size={16} className="text-slate-300 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

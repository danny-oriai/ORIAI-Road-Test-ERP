import { useMemo, useState } from "react";
import {
  Route as RouteIcon, MapPin, FileDown, ExternalLink, AlertTriangle,
  Clock, Gauge, Briefcase,
} from "lucide-react";
import type { Route, RiskLevel } from "../types";
import { sync } from "../lib/api";
import { projectById } from "../lib/lookups";
import { FilterBar } from "../components/primitives";

const RISK_STYLE: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  Low:    { bg: "bg-emerald-50", text: "text-emerald-700", label: "Low risk" },
  Medium: { bg: "bg-amber-50",   text: "text-amber-700",   label: "Medium risk" },
  High:   { bg: "bg-red-50",     text: "text-red-700",     label: "High risk" },
};

const STATUS_STYLE: Record<Route["status"], { bg: string; text: string }> = {
  Active:   { bg: "bg-emerald-50", text: "text-emerald-700" },
  Draft:    { bg: "bg-slate-100",  text: "text-slate-600" },
  Archived: { bg: "bg-slate-100",  text: "text-slate-500" },
};

const TYPE_STYLE: Record<Route["type"], string> = {
  Urban:   "bg-blue-50 text-blue-700",
  Highway: "bg-violet-50 text-violet-700",
  Rural:   "bg-emerald-50 text-emerald-700",
  Mixed:   "bg-slate-100 text-slate-700",
};

export function RoutesPage() {
  const routes = sync.routes();
  const pois = sync.pois();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", risk: "", status: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const cityOptions = useMemo(() => Array.from(new Set(routes.map((r) => r.city))), [routes]);

  const filtered = routes.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q) && !r.city.toLowerCase().includes(q)) return false;
    }
    if (filters.type   && r.type      !== filters.type)   return false;
    if (filters.risk   && r.riskLevel !== filters.risk)   return false;
    if (filters.status && r.status    !== filters.status) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Routes</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {routes.length} routes · {cityOptions.length} cities · {pois.length} POIs across routes
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
        <FilterBar
          search={search}
          onSearch={setSearch}
          filters={[
            { key: "type",   label: "All types",  value: filters.type,   options: ["Urban", "Highway", "Rural", "Mixed"] },
            { key: "risk",   label: "All risk",   value: filters.risk,   options: ["Low", "Medium", "High"] },
            { key: "status", label: "All status", value: filters.status, options: ["Active", "Draft", "Archived"] },
          ]}
          onFilter={setFilter}
          addLabel="New route"
          onAdd={() => {/* future */}}
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const project = projectById(r.project);
          const linkedPois = pois.filter((p) => p.route === r.id);
          const risk = RISK_STYLE[r.riskLevel];
          const status = STATUS_STYLE[r.status];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <RouteIcon size={20} />
                </div>
                <div className="flex flex-wrap items-center gap-1 justify-end">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[r.type]}`}>{r.type}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${risk.bg} ${risk.text} ${r.riskLevel === "High" ? "inline-flex items-center gap-1" : ""}`}>
                    {r.riskLevel === "High" && <AlertTriangle size={10} />}
                    {risk.label}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>{r.status}</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400">{r.id}</div>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">{r.name}</h3>
              <div className="text-xs text-slate-500 mt-1">{r.city}</div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1"><Gauge size={11} /> Distance</div>
                  <div className="text-slate-900 font-medium mt-0.5">{r.distance} mi</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock size={11} /> Duration</div>
                  <div className="text-slate-900 font-medium mt-0.5">{r.duration}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin size={11} /> POIs</div>
                  <div className="text-slate-900 font-medium mt-0.5">{linkedPois.length}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                  <Briefcase size={11} />
                  <span className="truncate">{project?.name ?? "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.gpxFile && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      <FileDown size={10} /> GPX
                    </span>
                  )}
                  {r.mapsLink && (
                    <a
                      href={r.mapsLink}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <ExternalLink size={10} /> Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

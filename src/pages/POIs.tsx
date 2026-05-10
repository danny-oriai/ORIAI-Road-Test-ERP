import { useMemo, useState } from "react";
import {
  MapPin, Zap, Car, AlertTriangle, Coffee, Flag, Database,
  Camera as CameraIcon, Compass, Crosshair, ImageIcon,
} from "lucide-react";
import type { PoiType } from "../types";
import type { LucideIcon } from "lucide-react";
import { sync } from "../lib/api";
import { routeById, projectById } from "../lib/lookups";
import { FilterBar } from "../components/primitives";

const POI_TYPE_META: Record<PoiType, { icon: LucideIcon; bg: string; text: string }> = {
  "Charging":      { icon: Zap,        bg: "bg-emerald-50", text: "text-emerald-600" },
  "Parking":       { icon: Car,        bg: "bg-blue-50",    text: "text-blue-600" },
  "Risk Point":    { icon: AlertTriangle, bg: "bg-red-50",  text: "text-red-600" },
  "Service Area":  { icon: Coffee,     bg: "bg-amber-50",   text: "text-amber-600" },
  "Start Point":   { icon: Flag,       bg: "bg-violet-50",  text: "text-violet-600" },
  "Data Handover": { icon: Database,   bg: "bg-sky-50",     text: "text-sky-600" },
  "Camera Site":   { icon: CameraIcon, bg: "bg-slate-100",  text: "text-slate-600" },
  "Test Site":     { icon: Crosshair,  bg: "bg-violet-50",  text: "text-violet-600" },
  "Boundary":      { icon: Compass,    bg: "bg-slate-100",  text: "text-slate-600" },
  "Junction":      { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-600" },
};

export function PoisPage() {
  const pois = sync.pois();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", city: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const cityOptions = useMemo(() => Array.from(new Set(pois.map((p) => p.city))).sort(), [pois]);
  const typeOptions = useMemo(() => Array.from(new Set(pois.map((p) => p.type))).sort(), [pois]);

  const filtered = pois.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.id.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !p.address.toLowerCase().includes(q)
      )
        return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.city && p.city !== filters.city) return false;
    return true;
  });

  // Group counts by type for top stat strip
  const typeCounts: { type: PoiType; count: number }[] = typeOptions.map((t) => ({
    type: t,
    count: pois.filter((p) => p.type === t).length,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Points of Interest</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {pois.length} POIs · {cityOptions.length} cities
        </p>
      </div>

      {/* Type stat strip — click to filter */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {typeCounts.map(({ type, count }) => {
          const meta = POI_TYPE_META[type];
          const Icon = meta.icon;
          const active = filters.type === type;
          return (
            <button
              key={type}
              onClick={() => setFilter("type", active ? "" : type)}
              className={`bg-white rounded-xl border p-3 text-left transition-all ${
                active ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.text} flex items-center justify-center`}>
                  <Icon size={15} />
                </div>
                <span className="text-lg font-semibold text-slate-900">{count}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5 truncate">{type}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
        <FilterBar
          search={search}
          onSearch={setSearch}
          filters={[
            { key: "city", label: "All cities", value: filters.city, options: cityOptions },
          ]}
          onFilter={setFilter}
          addLabel="Add POI"
          onAdd={() => {/* future */}}
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const route = routeById(p.route);
          const project = projectById(p.project);
          const meta = POI_TYPE_META[p.type];
          const Icon = meta.icon;
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center shrink-0`}>
                  <Icon size={18} />
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.text}`}>
                  {p.type}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400">{p.id}</div>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">{p.name}</h3>

              <div className="text-xs text-slate-500 mt-1.5 flex items-start gap-1.5">
                <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{p.address}</span>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Compass size={10} /> {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
              </div>

              {p.notes && (
                <div className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 leading-relaxed">
                  {p.notes}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{route?.name ?? "—"}</span>
                  <span className="text-slate-300">·</span>
                  <span className="truncate text-slate-400">{project?.client ?? "—"}</span>
                </div>
                <div className={`flex items-center gap-1 shrink-0 ${p.hasPhoto ? "text-emerald-600" : "text-slate-400"}`}>
                  <ImageIcon size={11} />
                  <span>{p.hasPhoto ? "Photo" : "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

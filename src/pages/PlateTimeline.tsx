import { useMemo, useState } from "react";
import {
  AlertTriangle, Calendar, ChevronLeft, ChevronRight,
  BadgeCheck, Maximize2,
} from "lucide-react";
import type { PlateAllocation } from "../types";
import { sync, TODAY } from "../lib/api";
import { plateById, projectById, vehicleById, userById } from "../lib/lookups";
import { Button, Drawer } from "../components/primitives";

type ViewMode = "month" | "week";

// Window start: pinned for reproducible demo. Starts one week before TODAY.
const WINDOW_DAYS_MONTH = 45;
const WINDOW_DAYS_WEEK = 14;

function startOfWindow(today: string, days: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - 7);
  return d;
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date) {
  return d.getDate();
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/* color per plate to keep bars visually distinguishable */
const PLATE_BAR_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  "TP-001": { bg: "bg-blue-100",    border: "border-blue-300",    text: "text-blue-900" },
  "TP-002": { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-900" },
  "TP-003": { bg: "bg-violet-100",  border: "border-violet-300",  text: "text-violet-900" },
  "TP-004": { bg: "bg-amber-100",   border: "border-amber-300",   text: "text-amber-900" },
  "TP-005": { bg: "bg-sky-100",     border: "border-sky-300",     text: "text-sky-900" },
  "TP-006": { bg: "bg-slate-100",   border: "border-slate-300",   text: "text-slate-700" },
  "TP-007": { bg: "bg-rose-100",    border: "border-rose-300",    text: "text-rose-900" },
};

const CONFLICT_STYLE = { bg: "bg-red-500", border: "border-red-600", text: "text-white" };

interface BarSegment {
  alloc: PlateAllocation;
  startCol: number;       // 1-based grid column
  span: number;
}

function clampAllocation(
  alloc: PlateAllocation,
  windowStart: Date,
  totalDays: number
): BarSegment | null {
  const winStartDay = windowStart.getTime();
  const winEndDay = winStartDay + (totalDays - 1) * 86_400_000;
  const aStart = new Date(alloc.from).getTime();
  const aEnd = new Date(alloc.to).getTime();
  if (aEnd < winStartDay || aStart > winEndDay) return null;
  const clippedStart = Math.max(aStart, winStartDay);
  const clippedEnd = Math.min(aEnd, winEndDay);
  const startCol = Math.round((clippedStart - winStartDay) / 86_400_000) + 1;
  const span = Math.round((clippedEnd - clippedStart) / 86_400_000) + 1;
  return { alloc, startCol, span };
}

export function PlateTimelinePage() {
  const plates = sync.plates();
  const allocations = sync.plateAllocations();

  const [view, setView] = useState<ViewMode>("month");
  const totalDays = view === "month" ? WINDOW_DAYS_MONTH : WINDOW_DAYS_WEEK;
  const [offset, setOffset] = useState(0);                  // day offset for prev/next
  const [selected, setSelected] = useState<PlateAllocation | null>(null);

  const windowStart = useMemo(() => {
    const d = startOfWindow(TODAY, totalDays);
    d.setDate(d.getDate() + offset);
    return d;
  }, [totalDays, offset]);

  const days = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [windowStart, totalDays]);

  const todayCol = useMemo(() => {
    const t = new Date(TODAY).getTime();
    const idx = Math.round((t - windowStart.getTime()) / 86_400_000);
    return idx >= 0 && idx < totalDays ? idx + 1 : null;
  }, [windowStart, totalDays]);

  // group allocations by plate
  const byPlate = useMemo(() => {
    const map = new Map<string, PlateAllocation[]>();
    allocations.forEach((a) => {
      const arr = map.get(a.plate) ?? [];
      arr.push(a);
      map.set(a.plate, arr);
    });
    return map;
  }, [allocations]);

  // month labels along the top
  const monthBuckets = useMemo(() => {
    const buckets: { label: string; startCol: number; span: number }[] = [];
    let curMonth = "";
    let bucketStart = 1;
    days.forEach((d, i) => {
      const m = monthLabel(d);
      if (m !== curMonth) {
        if (curMonth) buckets.push({ label: curMonth, startCol: bucketStart, span: i + 1 - bucketStart });
        curMonth = m;
        bucketStart = i + 1;
      }
    });
    buckets.push({ label: curMonth, startCol: bucketStart, span: days.length + 1 - bucketStart });
    return buckets;
  }, [days]);

  const conflictCount = allocations.filter((a) => a.conflict).length;

  // Grid column sizing
  const colMinPx = view === "month" ? 28 : 56;
  const gridTemplateColumns = `repeat(${totalDays}, minmax(${colMinPx}px, 1fr))`;
  const leftColWidth = "w-44 md:w-56";

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Plate Allocation Timeline</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {plates.length} plates · {allocations.length} allocations · viewing {totalDays} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
            {(["week", "month"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setView(m); setOffset(0); }}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  view === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => setOffset((o) => o - totalDays)}>
            Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOffset(0)}>Today</Button>
          <Button variant="secondary" size="sm" icon={ChevronRight} onClick={() => setOffset((o) => o + totalDays)}>
            Next
          </Button>
        </div>
      </div>

      {/* Conflict banner */}
      {conflictCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-900">
              {conflictCount} allocation conflict{conflictCount > 1 ? "s" : ""} detected
            </div>
            <div className="text-xs text-red-700 mt-0.5">
              A plate is double-booked across two projects. Click the red bar to view details.
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalDays * colMinPx + 240}px` }}>
            {/* Month header row */}
            <div className="flex border-b border-slate-100">
              <div className={`${leftColWidth} shrink-0 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50`}>
                Plate
              </div>
              <div className="flex-1 grid bg-slate-50/50" style={{ gridTemplateColumns }}>
                {monthBuckets.map((b, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-semibold text-slate-500 px-2 py-2 border-l border-slate-100 first:border-l-0"
                    style={{ gridColumn: `${b.startCol} / span ${b.span}` }}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day header row */}
            <div className="flex border-b border-slate-100">
              <div className={`${leftColWidth} shrink-0 px-4 py-1.5 text-[10px] text-slate-400 bg-slate-50/30`} />
              <div className="flex-1 grid bg-slate-50/30" style={{ gridTemplateColumns }}>
                {days.map((d, i) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = todayCol === i + 1;
                  return (
                    <div
                      key={i}
                      className={`text-center text-[10px] py-1.5 border-l border-slate-100 first:border-l-0 ${
                        isToday
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : isWeekend
                          ? "bg-slate-100 text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      {dayLabel(d)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plate rows */}
            {plates.map((p) => {
              const allocs = byPlate.get(p.id) ?? [];
              const segments = allocs
                .map((a) => clampAllocation(a, windowStart, totalDays))
                .filter((s): s is BarSegment => s !== null);

              return (
                <div key={p.id} className="flex border-b border-slate-100 last:border-b-0">
                  <div className={`${leftColWidth} shrink-0 px-4 py-3 flex items-center gap-2`}>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <BadgeCheck size={13} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-slate-900 truncate">{p.number}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>
                    </div>
                  </div>
                  <div
                    className="flex-1 grid relative py-2"
                    style={{ gridTemplateColumns }}
                  >
                    {/* Weekend shading + grid lines + today line */}
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = todayCol === i + 1;
                      return (
                        <div
                          key={i}
                          className={`border-l border-slate-50 first:border-l-0 ${
                            isWeekend ? "bg-slate-50/50" : ""
                          } ${isToday ? "bg-blue-50/40" : ""}`}
                          style={{ gridColumn: `${i + 1} / span 1` }}
                        />
                      );
                    })}

                    {/* Allocation bars (overlayed on top of grid cells via gridColumn) */}
                    {segments.map((seg) => {
                      const c = seg.alloc.conflict ? CONFLICT_STYLE : PLATE_BAR_PALETTE[seg.alloc.plate] ?? PLATE_BAR_PALETTE["TP-006"];
                      const prj = projectById(seg.alloc.project);
                      const veh = vehicleById(seg.alloc.vehicle);
                      return (
                        <button
                          key={seg.alloc.id}
                          onClick={() => setSelected(seg.alloc)}
                          className={`relative z-10 self-center h-7 rounded-md ${c.bg} ${c.border} ${c.text} border text-[11px] font-medium px-2 truncate text-left hover:ring-2 hover:ring-blue-200 transition-all flex items-center gap-1`}
                          style={{ gridColumn: `${seg.startCol} / span ${seg.span}` }}
                          title={`${prj?.name ?? seg.alloc.project} · ${veh?.plate ?? seg.alloc.vehicle}`}
                        >
                          {seg.alloc.conflict && <AlertTriangle size={11} className="shrink-0" />}
                          <span className="truncate">
                            {prj?.client ?? prj?.name ?? seg.alloc.project}
                            {veh && ` · ${veh.plate}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" /> Normal allocation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500 border border-red-600" /> Conflict
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" /> Weekend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-200" /> Today
        </span>
        <span className="text-slate-400 flex items-center gap-1.5">
          <Maximize2 size={11} /> Click a bar for details · drag to reschedule (coming soon)
        </span>
      </div>

      {/* Allocation detail drawer */}
      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Allocation ${selected.id}` : ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            {selected?.conflict && <Button variant="danger">Resolve conflict</Button>}
          </div>
        }
      >
        {selected && (
          <AllocationDetails alloc={selected} />
        )}
      </Drawer>
    </div>
  );
}

function AllocationDetails({ alloc }: { alloc: PlateAllocation }) {
  const plate = plateById(alloc.plate);
  const project = projectById(alloc.project);
  const vehicle = vehicleById(alloc.vehicle);
  const responsible = userById(plate?.responsible);

  return (
    <div className="space-y-4">
      {alloc.conflict && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800">
            <div className="font-semibold">Allocation conflict</div>
            <div className="mt-0.5">
              This plate is also reserved for another project in an overlapping date range.
              PMO must reassign one of the bookings before the field session.
            </div>
          </div>
        </div>
      )}

      <DetailRow label="Plate" value={
        <div className="flex items-center gap-2">
          <BadgeCheck size={14} className="text-amber-600" />
          <span className="font-mono font-semibold">{plate?.number ?? alloc.plate}</span>
          <span className="text-xs text-slate-500">({plate?.type})</span>
        </div>
      } />
      <DetailRow label="Project" value={project ? `${project.id} — ${project.name}` : alloc.project} />
      <DetailRow label="Client" value={project?.client ?? "—"} />
      <DetailRow label="Vehicle" value={vehicle ? `${vehicle.plate} · ${vehicle.brand} ${vehicle.model}` : alloc.vehicle} />
      <DetailRow label="From" value={<span className="font-mono">{alloc.from}</span>} />
      <DetailRow label="To" value={<span className="font-mono">{alloc.to}</span>} />
      <DetailRow label="Plate valid" value={plate ? <span className="font-mono">{plate.validFrom} → {plate.validTo}</span> : "—"} />
      <DetailRow label="Responsible" value={responsible?.name ?? "—"} />

      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2 mt-4">
        <Calendar size={14} className="shrink-0 mt-0.5 text-slate-400" />
        <p>
          Drag-and-drop rescheduling will be enabled once the backend lands.
          For now use the Edit action in PMO's Lark Base view.
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 text-right min-w-0">{value}</span>
    </div>
  );
}

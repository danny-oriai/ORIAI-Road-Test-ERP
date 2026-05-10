import { useMemo, useState } from "react";
import {
  Clock, AlertTriangle, UserX, Hourglass, Edit3,
} from "lucide-react";
import { sync, TODAY } from "../lib/api";
import { userById } from "../lib/lookups";
import {
  FilterBar, Drawer, Field, Button, inputCls, Avatar,
} from "../components/primitives";
import { AttendanceTable } from "../components/tables";

export function AttendancePage() {
  const allAttendance = sync.attendance();
  const projects = sync.projects();
  const users = sync.users();

  const [date, setDate] = useState<string>(TODAY);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ project: "", user: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [correctTarget, setCorrectTarget] = useState<typeof allAttendance[number] | null>(null);

  const filtered = allAttendance.filter((a) => {
    if (date && !a.time.startsWith(date)) return false;
    if (search) {
      const q = search.toLowerCase();
      const u = userById(a.user);
      if (!a.id.toLowerCase().includes(q) &&
          !a.location.toLowerCase().includes(q) &&
          !(u?.name.toLowerCase().includes(q) ?? false))
        return false;
    }
    if (filters.project && a.project !== filters.project) return false;
    if (filters.user && a.user !== filters.user) return false;
    return true;
  });

  // KPI calculations for the selected date
  const dayRecords = allAttendance.filter((a) => a.time.startsWith(date));
  const uniqueCheckedIn = new Set(
    dayRecords.filter((a) => a.type === "Clock In").map((a) => a.user)
  ).size;
  const lateCount = dayRecords.filter((a) => a.status === "Late").length;
  const todayTaskUsers = new Set(
    sync.dailyTasks()
      .filter((t) => t.date === date)
      .flatMap((t) => [t.driver, t.engineer])
  );
  const missingCheckIn = Math.max(0, todayTaskUsers.size - uniqueCheckedIn);

  // Mock "total hours" = clock-out minus clock-in per user (very approximate)
  const totalHours = useMemo(() => {
    let mins = 0;
    const byUser = new Map<string, { inT?: number; outT?: number }>();
    dayRecords.forEach((a) => {
      const t = new Date(a.time.replace(" ", "T")).getTime();
      const e = byUser.get(a.user) ?? {};
      if (a.type === "Clock In")  e.inT = t;
      if (a.type === "Clock Out") e.outT = t;
      byUser.set(a.user, e);
    });
    byUser.forEach(({ inT, outT }) => {
      if (inT && outT) mins += (outT - inT) / 60000;
    });
    // For demo, also estimate 8h for any user with only a Clock In
    byUser.forEach(({ inT, outT }) => {
      if (inT && !outT) mins += 8 * 60;
    });
    return Math.round(mins / 60);
  }, [dayRecords]);

  const projectOptions = projects.map((p) => p.id);
  const userOptions = users.map((u) => u.id);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Attendance & Check-in</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} records · {date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <Button variant="secondary" size="sm" onClick={() => setDate(TODAY)}>Today</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Clock}        accent="blue"    label="Checked in"  value={uniqueCheckedIn} hint="Unique users today" />
        <Kpi icon={AlertTriangle} accent="amber"   label="Late"        value={lateCount}       hint="With Late status" />
        <Kpi icon={UserX}        accent="red"     label="Missing"     value={missingCheckIn}  hint="Expected but no Clock In" />
        <Kpi icon={Hourglass}    accent="emerald" label="Total hours" value={`${totalHours}h`} hint="Mock estimate" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              { key: "project", label: "All projects", value: filters.project, options: projectOptions },
              { key: "user",    label: "All staff",    value: filters.user,    options: userOptions },
            ]}
            onFilter={setFilter}
          />
        </div>

        <div className="p-5">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No attendance records match the filters.</p>
          ) : (
            <div className="space-y-3">
              {/* Row of anomaly callouts */}
              {filtered.some((a) => a.status === "Late" || a.status === "Manual Correction") && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Anomalies detected:</span>{" "}
                    {filtered.filter((a) => a.status === "Late").length} late ·{" "}
                    {filtered.filter((a) => a.status === "Manual Correction").length} manual corrections.
                  </div>
                </div>
              )}

              {/* Use the shared table for consistency, but wrap in a div with quick-action column */}
              <AttendanceTable rows={filtered} />

              {/* Quick correction list under the table for anomalies */}
              {filtered.filter((a) => a.status !== "Normal").length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-700 mb-2">Quick corrections</div>
                  <div className="space-y-2">
                    {filtered
                      .filter((a) => a.status !== "Normal")
                      .map((a) => {
                        const u = userById(a.user);
                        return (
                          <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-xs">
                              <Avatar user={u} size="xs" />
                              <span className="text-slate-700">{u?.name.split(" ")[0]}</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-500">{a.time}</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-700 font-medium">{a.status}</span>
                            </div>
                            <Button size="sm" variant="ghost" icon={Edit3} onClick={() => setCorrectTarget(a)}>
                              Correct
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual correction drawer */}
      <Drawer
        open={correctTarget !== null}
        onClose={() => setCorrectTarget(null)}
        title={correctTarget ? `Correct ${correctTarget.id}` : ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCorrectTarget(null)}>Cancel</Button>
            <Button onClick={() => setCorrectTarget(null)}>Save correction</Button>
          </div>
        }
      >
        {correctTarget && (
          <div>
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-700">
              <div><span className="text-slate-500">Original time:</span> <span className="font-mono">{correctTarget.time}</span></div>
              <div><span className="text-slate-500">Type:</span> {correctTarget.type}</div>
              <div><span className="text-slate-500">Status:</span> <span className="text-amber-700 font-medium">{correctTarget.status}</span></div>
            </div>
            <Field label="Correct time" required>
              <input type="datetime-local" className={inputCls} defaultValue={correctTarget.time.replace(" ", "T")} />
            </Field>
            <Field label="Location">
              <input className={inputCls} defaultValue={correctTarget.location} />
            </Field>
            <Field label="Reason for correction" required>
              <select className={inputCls}>
                <option>Forgot to clock in</option>
                <option>App / network issue</option>
                <option>Vehicle changed</option>
                <option>Off-site arrival</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Notes (kept in audit log)">
              <textarea className={inputCls} rows={3} placeholder="Brief explanation, kept for audit." />
            </Field>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              All manual corrections are logged with PMO sign-off. The original record is retained.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Kpi({
  icon: Icon, accent, label, value, hint,
}: {
  icon: typeof Clock; accent: "blue" | "amber" | "red" | "emerald";
  label: string; value: number | string; hint?: string;
}) {
  const styles = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
    red:     { bg: "bg-red-50",     text: "text-red-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
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
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

import { useState } from "react";
import {
  AlertTriangle, AlertCircle, Clock, CheckCircle2, Plus,
} from "lucide-react";
import type {
  Issue, IssueSeverity, IssueStatus, IssueType,
} from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById } from "../lib/lookups";
import { ISSUE_SEVERITY_STYLE, ISSUE_STATUS_STYLE } from "../lib/statusStyles";
import {
  FilterBar, Drawer, Field, Button, Avatar, StatusBadge, inputCls,
} from "../components/primitives";
import { USERS } from "../mock/users";

interface Props {
  initialDrawer?: boolean;        // open report-issue drawer on mount (for Dashboard quick action)
}

const ISSUE_TYPES: IssueType[] = [
  "Vehicle", "Device", "Data", "Staff", "Route", "Plate",
  "Safety", "Weather", "Client Change", "Finance", "File", "Delivery",
];

function daysOpen(reported: string): number {
  const t = new Date(reported.replace(" ", "T")).getTime();
  const today = new Date(TODAY).getTime();
  return Math.max(0, Math.round((today - t) / 86_400_000));
}

export function IssuesPage({ initialDrawer = false }: Props) {
  const issues = sync.issues();
  const projects = sync.projects();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", severity: "", status: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [reportOpen, setReportOpen] = useState(initialDrawer);
  const [detail, setDetail] = useState<Issue | null>(null);

  const filtered = issues.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q)) return false;
    }
    if (filters.type && i.type !== filters.type) return false;
    if (filters.severity && i.severity !== filters.severity) return false;
    if (filters.status && i.status !== filters.status) return false;
    return true;
  });

  // KPIs
  const open = issues.filter((i) => i.status === "Open" || i.status === "In Progress").length;
  const critical = issues.filter((i) => i.severity === "Critical" && (i.status === "Open" || i.status === "In Progress")).length;
  // Overdue = open >7d for High/Critical, >14d for Medium, >30d for Low
  const overdue = issues.filter((i) => {
    if (i.status === "Resolved" || i.status === "Closed") return false;
    const d = daysOpen(i.reportedTime);
    if (i.severity === "Critical" || i.severity === "High") return d > 7;
    if (i.severity === "Medium") return d > 14;
    return d > 30;
  }).length;
  // Resolved this week
  const sevenDaysAgo = new Date(TODAY); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const resolvedThisWeek = issues.filter((i) => {
    if (i.status !== "Resolved" && i.status !== "Closed") return false;
    return new Date(i.reportedTime.replace(" ", "T")) >= sevenDaysAgo;
  }).length;

  const severityOptions: IssueSeverity[] = ["Low", "Medium", "High", "Critical"];
  const statusOptions: IssueStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

  // For the issue table — keep behaviour but make rows clickable to open detail
  // We'll use a custom inline table instead of importing IssuesTable so we can wire onClick.
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Issues & Risks</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {issues.length} issues
          </p>
        </div>
        <Button icon={Plus} onClick={() => setReportOpen(true)}>Report issue</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={AlertCircle}  accent="amber"   label="Open"               value={open}             />
        <Kpi icon={AlertTriangle} accent="red"    label="Critical open"      value={critical}         />
        <Kpi icon={Clock}        accent="red"     label="Overdue"            value={overdue}          />
        <Kpi icon={CheckCircle2} accent="emerald" label="Resolved this week" value={resolvedThisWeek} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              { key: "type",     label: "All types",     value: filters.type,     options: ISSUE_TYPES },
              { key: "severity", label: "All severity",  value: filters.severity, options: severityOptions },
              { key: "status",   label: "All statuses",  value: filters.status,   options: statusOptions },
            ]}
            onFilter={setFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Issue</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Severity</th>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Reporter</th>
                <th className="px-3 py-3 font-medium">Owner</th>
                <th className="px-3 py-3 font-medium">Reported</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => {
                const reporter = userById(i.reportedBy);
                const owner = userById(i.owner);
                const project = projectById(i.project);
                const ageDays = daysOpen(i.reportedTime);
                return (
                  <tr key={i.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setDetail(i)}>
                    <td className="px-5 py-3.5">
                      <div className="text-[11px] font-mono text-slate-400">{i.id}</div>
                      <div className="font-medium text-slate-900 text-sm leading-snug max-w-md">{i.title}</div>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{i.type}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={i.severity} styleMap={ISSUE_SEVERITY_STYLE} />
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-600 truncate max-w-[200px]">
                      {project?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={reporter} size="xs" />
                        <span className="text-xs">{reporter?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={owner} size="xs" />
                        <span className="text-xs">{owner?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <div className="font-mono text-slate-600">{i.reportedTime.slice(0, 10)}</div>
                      <div className="text-[10px] text-slate-400">{ageDays}d ago</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={i.status} styleMap={ISSUE_STATUS_STYLE} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report drawer */}
      <Drawer
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report a new issue"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={() => setReportOpen(false)}>Submit issue</Button>
          </div>
        }
      >
        <Field label="Title" required>
          <input className={inputCls} placeholder="One-line summary" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required>
            <select className={inputCls}>
              {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Severity" required>
            <select className={inputCls} defaultValue="Medium">
              {severityOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Project">
          <select className={inputCls}>
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
          </select>
        </Field>
        <Field label="Description" required>
          <textarea className={inputCls} rows={4} placeholder="What happened, when, and any immediate impact..." />
        </Field>
        <Field label="Attachments">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                + Photo
              </div>
            ))}
          </div>
        </Field>
      </Drawer>

      {/* Detail drawer */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.id ?? ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            <Button variant="success">Mark resolved</Button>
          </div>
        }
      >
        {detail && <IssueDetail issue={detail} />}
      </Drawer>
    </div>
  );
}

function IssueDetail({ issue }: { issue: Issue }) {
  const reporter = userById(issue.reportedBy);
  const owner = userById(issue.owner);
  const project = projectById(issue.project);
  const ageDays = daysOpen(issue.reportedTime);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge value={issue.severity} styleMap={ISSUE_SEVERITY_STYLE} />
        <StatusBadge value={issue.status} styleMap={ISSUE_STATUS_STYLE} />
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{issue.type}</span>
        <span className="text-xs text-slate-400">{ageDays}d open</span>
      </div>

      <h3 className="text-base font-semibold text-slate-900 leading-snug">{issue.title}</h3>

      <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 leading-relaxed">
        {issue.description}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">Project</div>
          <div className="text-slate-900 mt-0.5 truncate">{project?.name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Reported</div>
          <div className="text-slate-900 mt-0.5 font-mono text-xs">{issue.reportedTime}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Reporter</div>
          <div className="flex items-center gap-1.5 mt-1"><Avatar user={reporter} size="xs" /><span>{reporter?.name}</span></div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Attachments</div>
          <div className="text-slate-900 mt-0.5">{issue.attachments}</div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500 mb-2">Assign owner</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar user={owner} size="sm" />
          <select className={inputCls + " flex-1 min-w-[180px]"} defaultValue={issue.owner}>
            {USERS.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, accent, label, value,
}: {
  icon: typeof AlertCircle; accent: "amber" | "red" | "emerald";
  label: string; value: number;
}) {
  const styles = {
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
    </div>
  );
}

/* end */

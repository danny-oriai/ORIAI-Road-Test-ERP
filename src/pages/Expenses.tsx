import { useState } from "react";
import {
  Receipt, Hourglass, CheckCircle2, Wallet, Plus, Camera,
  ThumbsUp, ThumbsDown, Banknote,
} from "lucide-react";
import type {
  ExpenseCategory, ExpenseStatus, Expense,
} from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById } from "../lib/lookups";
import { EXPENSE_STATUS_STYLE } from "../lib/statusStyles";
import {
  FilterBar, Drawer, Field, Button, Avatar, StatusBadge, inputCls,
} from "../components/primitives";

const CATEGORIES: ExpenseCategory[] = [
  "Hotel", "Meal", "Public Transport", "Parking", "Charging", "Fuel",
  "Vehicle Cleaning", "Vehicle Repair", "HDD Postage", "Equipment Purchase", "Other",
];

const STATUS_OPTIONS: ExpenseStatus[] = ["Draft", "Submitted", "Approved", "Rejected", "Paid"];

const CURRENT_MONTH_PREFIX = TODAY.slice(0, 7); // "2026-05"

export function ExpensesPage() {
  const expenses = sync.expenses();
  const projects = sync.projects();
  const users = sync.users();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ project: "", user: "", category: "", status: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [submitOpen, setSubmitOpen] = useState(false);
  const [detail, setDetail] = useState<Expense | null>(null);

  const filtered = expenses.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.description.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
    }
    if (filters.project && e.project !== filters.project) return false;
    if (filters.user && e.applicant !== filters.user) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.status && e.status !== filters.status) return false;
    return true;
  });

  // KPI calculations — month-scoped
  const thisMonth = expenses.filter((e) => e.date.startsWith(CURRENT_MONTH_PREFIX));
  const monthTotal = thisMonth.reduce((a, e) => a + e.amount, 0);
  const pending = thisMonth.filter((e) => e.status === "Submitted");
  const approved = thisMonth.filter((e) => e.status === "Approved");
  const paid = thisMonth.filter((e) => e.status === "Paid");

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Expenses</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {expenses.length} expenses · current month £{monthTotal.toFixed(2)}
          </p>
        </div>
        <Button icon={Plus} onClick={() => setSubmitOpen(true)}>Submit expense</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Receipt}      accent="blue"    label="This month"  value={`£${monthTotal.toFixed(0)}`} hint={`${thisMonth.length} items`} />
        <Kpi icon={Hourglass}    accent="amber"   label="Pending"     value={pending.length}             hint={`£${pending.reduce((a, e) => a + e.amount, 0).toFixed(0)} to approve`} />
        <Kpi icon={CheckCircle2} accent="emerald" label="Approved"    value={approved.length}            hint={`£${approved.reduce((a, e) => a + e.amount, 0).toFixed(0)} this month`} />
        <Kpi icon={Wallet}       accent="violet"  label="Paid"        value={paid.length}                hint={`£${paid.reduce((a, e) => a + e.amount, 0).toFixed(0)} settled`} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              { key: "category", label: "All categories", value: filters.category, options: CATEGORIES },
              { key: "status",   label: "All statuses",   value: filters.status,   options: STATUS_OPTIONS },
              { key: "project",  label: "All projects",   value: filters.project,  options: projects.map((p) => p.id) },
              { key: "user",     label: "All staff",      value: filters.user,     options: users.map((u) => u.id) },
            ]}
            onFilter={setFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Expense</th>
                <th className="px-3 py-3 font-medium">Applicant</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium text-right">Amount</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const u = userById(e.applicant);
                const p = projectById(e.project);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setDetail(e)}>
                    <td className="px-5 py-3.5">
                      <div className="text-[11px] font-mono text-slate-400">{e.id}</div>
                      <div className="text-xs text-slate-700 mt-0.5">{e.description}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={u} size="xs" />
                        <span className="text-xs">{u?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{e.category}</span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-600 truncate max-w-[180px]">
                      {p?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-500">{e.date}</td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm font-semibold text-slate-900">
                      £{e.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={e.status} styleMap={EXPENSE_STATUS_STYLE} />
                    </td>
                    <td className="px-3 py-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        {e.status === "Submitted" && (
                          <>
                            <Button size="sm" variant="success" icon={ThumbsUp}>Approve</Button>
                            <Button size="sm" variant="danger" icon={ThumbsDown}>Reject</Button>
                          </>
                        )}
                        {e.status === "Approved" && (
                          <Button size="sm" icon={Banknote}>Mark paid</Button>
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

      {/* Submit drawer */}
      <Drawer
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit a new expense"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>Save as draft</Button>
            <Button onClick={() => setSubmitOpen(false)}>Submit for approval</Button>
          </div>
        }
      >
        <Field label="Category" required>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className="px-2 py-2 text-xs rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (£)" required>
            <input type="number" step="0.01" className={inputCls} placeholder="0.00" />
          </Field>
          <Field label="Date" required>
            <input type="date" defaultValue={TODAY} className={inputCls} />
          </Field>
        </div>
        <Field label="Project">
          <select className={inputCls}>
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
          </select>
        </Field>
        <Field label="Description" required>
          <input className={inputCls} placeholder="Brief description for approval" />
        </Field>
        <Field label="Receipt photo">
          <div className="flex gap-2">
            <div className="aspect-square w-20 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <Camera size={18} />
              <span className="text-[10px] mt-1">Capture</span>
            </div>
            <div className="flex-1 bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              UK accounting requires a receipt for any expense ≥ £25. PMO may reject expenses without proof.
            </div>
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
            {detail?.status === "Submitted" && (
              <>
                <Button variant="danger">Reject</Button>
                <Button variant="success">Approve</Button>
              </>
            )}
            {detail?.status === "Approved" && <Button>Mark paid</Button>}
          </div>
        }
      >
        {detail && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-3xl font-semibold text-slate-900 font-mono">£{detail.amount.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">{detail.description}</div>
            </div>
            <Row label="Category" value={detail.category} />
            <Row label="Status" value={<StatusBadge value={detail.status} styleMap={EXPENSE_STATUS_STYLE} />} />
            <Row label="Date" value={<span className="font-mono">{detail.date}</span>} />
            <Row label="Project" value={projectById(detail.project)?.name ?? "—"} />
            <Row label="Applicant" value={userById(detail.applicant)?.name ?? "—"} />
            <Row label="Approver" value={userById(detail.approver)?.name ?? "—"} />
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2">Receipt</div>
              <div className="aspect-[4/3] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Camera size={24} className="mx-auto" />
                  <div className="text-xs mt-1">Receipt uploaded</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function Kpi({
  icon: Icon, accent, label, value, hint,
}: {
  icon: typeof Receipt; accent: "blue" | "amber" | "emerald" | "violet";
  label: string; value: number | string; hint?: string;
}) {
  const styles = {
    blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
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

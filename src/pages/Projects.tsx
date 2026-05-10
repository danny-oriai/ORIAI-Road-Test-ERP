import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ProjectStatus } from "../types";
import { sync } from "../lib/api";
import { userById } from "../lib/lookups";
import { PROJECT_STATUS_STYLE } from "../lib/statusStyles";
import {
  StatusBadge, Avatar, FilterBar, Drawer, Field, Button, inputCls,
} from "../components/primitives";
import { USERS } from "../mock/users";

interface Props {
  onOpen: (projectId: string) => void;
}

interface FilterState {
  status: string;
  priority: string;
}

export function ProjectsPage({ onOpen }: Props) {
  const projects = sync.projects();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ status: "", priority: "" });
  const [drawer, setDrawer] = useState(false);

  const setFilter = (k: string, v: string) =>
    setFilters((s) => ({ ...s, [k]: v }));

  const statusOptions = useMemo<ProjectStatus[]>(
    () => Array.from(new Set(projects.map((p) => p.status))) as ProjectStatus[],
    [projects]
  );

  const filtered = projects.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    }
    if (filters.status && p.status !== filters.status) return false;
    if (filters.priority && p.priority !== filters.priority) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Projects</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {projects.length} projects
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              { key: "status",   label: "All statuses",   value: filters.status,   options: statusOptions },
              { key: "priority", label: "All priorities", value: filters.priority, options: ["High", "Medium", "Low"] },
            ]}
            onFilter={setFilter}
            onAdd={() => setDrawer(true)}
            addLabel="New project"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">PM</th>
                <th className="px-3 py-3 font-medium">Region</th>
                <th className="px-3 py-3 font-medium">Timeline</th>
                <th className="px-3 py-3 font-medium">Progress</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Priority</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const pm = userById(p.manager);
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => onOpen(p.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-[11px] font-mono text-slate-400">{p.id}</div>
                      <div className="font-medium text-slate-900 mt-0.5">{p.name}</div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{p.client}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar user={pm} size="xs" />
                        <span className="text-slate-700 text-xs">{pm?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600 text-xs">{p.region}</td>
                    <td className="px-3 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                      {p.startDate.slice(5)} → {p.endDate.slice(5)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-7">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge value={p.status} styleMap={PROJECT_STATUS_STYLE} />
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`text-xs font-medium ${
                          p.priority === "High"   ? "text-red-600" :
                          p.priority === "Medium" ? "text-amber-600" :
                                                    "text-slate-500"
                        }`}
                      >
                        {p.priority}
                      </span>
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

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Create new project"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button>
            <Button>Create project</Button>
          </div>
        }
      >
        <Field label="Project name" required>
          <input className={inputCls} placeholder="e.g. ADAS Highway Validation — M11" />
        </Field>
        <Field label="Client" required>
          <input className={inputCls} placeholder="Aurora Mobility Ltd" />
        </Field>
        <Field label="Project type">
          <select className={inputCls}>
            <option>ADAS Testing</option>
            <option>Data Collection</option>
            <option>Vehicle Verification</option>
            <option>Competitor Evaluation</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="date" className={inputCls} /></Field>
          <Field label="End date"><input type="date" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicles needed"><input type="number" className={inputCls} placeholder="2" /></Field>
          <Field label="Staff needed"><input type="number" className={inputCls} placeholder="3" /></Field>
        </div>
        <Field label="Region / city">
          <input className={inputCls} placeholder="Cambridge → London" />
        </Field>
        <Field label="Project manager">
          <select className={inputCls}>
            {USERS.filter((u) => u.role === "Project Manager").map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={inputCls} rows={3} />
        </Field>
      </Drawer>
    </div>
  );
}

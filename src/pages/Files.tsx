import { useMemo, useState } from "react";
import {
  FileText, Folder, Upload, Lock, Globe, ExternalLink,
} from "lucide-react";
import { sync } from "../lib/api";
import { userById } from "../lib/lookups";
import {
  FilterBar, Drawer, Field, Button, Avatar, inputCls,
} from "../components/primitives";

const CATEGORY_META: Record<string, { color: string }> = {
  "Project Contract": { color: "bg-blue-50 text-blue-700" },
  "Test Plan":        { color: "bg-violet-50 text-violet-700" },
  "Route File":       { color: "bg-emerald-50 text-emerald-700" },
  "Daily Report":     { color: "bg-sky-50 text-sky-700" },
  "Issue Report":     { color: "bg-red-50 text-red-700" },
  "Vehicle Doc":      { color: "bg-amber-50 text-amber-700" },
  "Plate Doc":        { color: "bg-amber-50 text-amber-700" },
  "Client Brief":     { color: "bg-blue-50 text-blue-700" },
};

function categoryColor(c: string): string {
  return CATEGORY_META[c]?.color ?? "bg-slate-100 text-slate-700";
}

/* Permission inferred from category as a demo signal — real perms come from
 * Supabase RLS + Lark Drive later. */
function permission(cat: string): "Private" | "Project" | "Public" {
  if (cat === "Project Contract" || cat === "Client Brief") return "Project";
  if (cat === "Daily Report") return "Project";
  if (cat === "Issue Report") return "Private";
  return "Project";
}

export function FilesPage() {
  const files = sync.files();
  const projects = sync.projects();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", project: "" });
  const setFilter = (k: string, v: string) => setFilters((s) => ({ ...s, [k]: v }));

  const [uploadOpen, setUploadOpen] = useState(false);

  const categoryOptions = useMemo(() => Array.from(new Set(files.map((f) => f.category))).sort(), [files]);

  const filtered = files.filter((f) => {
    if (search) {
      const q = search.toLowerCase();
      if (!f.name.toLowerCase().includes(q) && !f.id.toLowerCase().includes(q)) return false;
    }
    if (filters.category && f.category !== filters.category) return false;
    if (filters.project && f.project !== filters.project) return false;
    return true;
  });

  // Top category strip — click to filter
  const categoryCounts = categoryOptions.map((c) => ({
    category: c,
    count: files.filter((f) => f.category === c).length,
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Files</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {files.length} files indexed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://lark-drive.example.com/road-test-erp"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          >
            <Folder size={13} className="text-slate-500" />
            Open Lark Drive folder
            <ExternalLink size={11} className="text-slate-400" />
          </a>
          <Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload file</Button>
        </div>
      </div>

      {/* Category strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {categoryCounts.map(({ category, count }) => {
          const active = filters.category === category;
          return (
            <button
              key={category}
              onClick={() => setFilter("category", active ? "" : category)}
              className={`bg-white rounded-xl border p-3 text-left transition-all ${
                active ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded font-medium ${categoryColor(category)}`}>
                {category}
              </span>
              <div className="text-2xl font-semibold text-slate-900 mt-2">{count}</div>
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
              { key: "project", label: "All projects", value: filters.project, options: projects.map((p) => p.id) },
            ]}
            onFilter={setFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Related</th>
                <th className="px-3 py-3 font-medium">Uploaded by</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Version</th>
                <th className="px-3 py-3 font-medium">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => {
                const u = userById(f.uploadedBy);
                const perm = permission(f.category);
                const PermIcon = perm === "Private" ? Lock : perm === "Public" ? Globe : Folder;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/60 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{f.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{f.id} · {f.link}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${categoryColor(f.category)}`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-500">{f.project}</td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-500">{f.related}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Avatar user={u} size="xs" />
                        <span className="text-xs">{u?.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-mono text-slate-500">{f.uploadedTime}</td>
                    <td className="px-3 py-3.5 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {f.version}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          perm === "Private" ? "bg-red-50 text-red-700" :
                          perm === "Public"  ? "bg-emerald-50 text-emerald-700" :
                                               "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <PermIcon size={10} /> {perm}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload drawer */}
      <Drawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload file"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={() => setUploadOpen(false)}>Upload to Lark Drive</Button>
          </div>
        }
      >
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-4">
          Files are stored on the project's Lark Drive folder. RTM ERP keeps a searchable index — actual content lives in Lark.
        </div>
        <Field label="File" required>
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            <Upload size={24} className="mx-auto text-slate-400" />
            <div className="text-sm text-slate-700 mt-2">Drop file here or click to browse</div>
            <div className="text-[11px] text-slate-400 mt-1">PDF, DOCX, XLSX, KML, GPX, ZIP up to 50 MB</div>
          </div>
        </Field>
        <Field label="Category" required>
          <select className={inputCls}>
            {categoryOptions.map((c) => <option key={c}>{c}</option>)}
            <option>Delivery</option>
            <option>Finance</option>
            <option>Insurance</option>
          </select>
        </Field>
        <Field label="Project">
          <select className={inputCls}>
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Version">
            <input className={inputCls} defaultValue="v1.0" />
          </Field>
          <Field label="Access">
            <select className={inputCls} defaultValue="Project">
              <option>Private</option>
              <option>Project</option>
              <option>Public</option>
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputCls} rows={2} placeholder="Optional description for the index..." />
        </Field>
      </Drawer>
    </div>
  );
}

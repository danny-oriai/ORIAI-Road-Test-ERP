import { FileText } from "lucide-react";
import type { FileRecord } from "../../types";
import { userById } from "../../lib/lookups";
import { Avatar } from "../primitives";

interface Props {
  rows: FileRecord[];
}

export function FilesTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
          <th className="py-2 font-medium">File</th>
          <th className="py-2 font-medium">Category</th>
          <th className="py-2 font-medium">Project</th>
          <th className="py-2 font-medium">Related</th>
          <th className="py-2 font-medium">Uploaded by</th>
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium">Version</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((f) => {
          const u = userById(f.uploadedBy);
          return (
            <tr key={f.id} className="hover:bg-slate-50/60 cursor-pointer">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-900 text-sm">{f.name}</span>
                </div>
              </td>
              <td className="py-3 text-xs">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{f.category}</span>
              </td>
              <td className="py-3 text-xs font-mono text-slate-500">{f.project}</td>
              <td className="py-3 text-xs font-mono text-slate-500">{f.related}</td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={u} size="xs" />
                  <span className="text-xs">{u?.name.split(" ")[0]}</span>
                </div>
              </td>
              <td className="py-3 text-xs font-mono text-slate-500">{f.uploadedTime}</td>
              <td className="py-3 text-xs">{f.version}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

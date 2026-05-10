import type { Issue } from "../../types";
import { userById } from "../../lib/lookups";
import { Avatar, StatusBadge } from "../primitives";
import { ISSUE_SEVERITY_STYLE, ISSUE_STATUS_STYLE } from "../../lib/statusStyles";

interface Props {
  rows: Issue[];
}

export function IssuesTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
          <th className="py-2 font-medium">Issue</th>
          <th className="py-2 font-medium">Type</th>
          <th className="py-2 font-medium">Severity</th>
          <th className="py-2 font-medium">Reporter</th>
          <th className="py-2 font-medium">Owner</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((i) => {
          const reporter = userById(i.reportedBy);
          const owner = userById(i.owner);
          return (
            <tr key={i.id}>
              <td className="py-3">
                <div className="text-[11px] font-mono text-slate-400">{i.id}</div>
                <div className="font-medium text-slate-900 text-sm leading-snug max-w-md">{i.title}</div>
              </td>
              <td className="py-3 text-xs">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{i.type}</span>
              </td>
              <td className="py-3">
                <StatusBadge value={i.severity} styleMap={ISSUE_SEVERITY_STYLE} />
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={reporter} size="xs" />
                  <span className="text-xs">{reporter?.name.split(" ")[0]}</span>
                </div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={owner} size="xs" />
                  <span className="text-xs">{owner?.name.split(" ")[0]}</span>
                </div>
              </td>
              <td className="py-3">
                <StatusBadge value={i.status} styleMap={ISSUE_STATUS_STYLE} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

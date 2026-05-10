import type { AttendanceRecord } from "../../types";
import { userById, vehicleById } from "../../lib/lookups";
import { Avatar } from "../primitives";

interface Props {
  rows: AttendanceRecord[];
}

const STATUS_PILL: Record<AttendanceRecord["status"], string> = {
  "Normal":            "bg-emerald-50 text-emerald-700",
  "Late":              "bg-amber-50 text-amber-700",
  "Manual Correction": "bg-slate-100 text-slate-600",
};

export function AttendanceTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
          <th className="py-2 font-medium">Time</th>
          <th className="py-2 font-medium">Staff</th>
          <th className="py-2 font-medium">Type</th>
          <th className="py-2 font-medium">Location</th>
          <th className="py-2 font-medium">Vehicle</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((a) => {
          const u = userById(a.user);
          const v = vehicleById(a.vehicle);
          return (
            <tr key={a.id}>
              <td className="py-3 text-xs font-mono text-slate-600">{a.time}</td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={u} size="xs" />
                  <span className="text-xs">{u?.name}</span>
                </div>
              </td>
              <td className="py-3 text-xs">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{a.type}</span>
              </td>
              <td className="py-3 text-xs text-slate-600">{a.location}</td>
              <td className="py-3 text-xs font-mono">{v?.plate ?? "—"}</td>
              <td className="py-3 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${STATUS_PILL[a.status]}`}>
                  {a.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

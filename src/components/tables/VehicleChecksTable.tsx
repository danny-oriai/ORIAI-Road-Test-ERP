import { Camera, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { VehicleCheck } from "../../types";
import { userById, vehicleById } from "../../lib/lookups";
import { Avatar } from "../primitives";

interface Props {
  rows: VehicleCheck[];
}

export function VehicleChecksTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
          <th className="py-2 font-medium">Check</th>
          <th className="py-2 font-medium">Vehicle</th>
          <th className="py-2 font-medium">Driver</th>
          <th className="py-2 font-medium">Type</th>
          <th className="py-2 font-medium">Mileage</th>
          <th className="py-2 font-medium">Fuel</th>
          <th className="py-2 font-medium">HDD free</th>
          <th className="py-2 font-medium">Photos</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((c) => {
          const v = vehicleById(c.vehicle);
          const u = userById(c.driver);
          const fuelColor =
            c.fuel < 30 ? "bg-red-500" : c.fuel < 60 ? "bg-amber-500" : "bg-emerald-500";
          const statusPill =
            c.status === "OK"      ? "bg-emerald-50 text-emerald-700" :
            c.status === "Warning" ? "bg-amber-50 text-amber-700" :
                                     "bg-red-50 text-red-700";
          const StatusIcon =
            c.status === "OK"      ? CheckCircle2 :
            c.status === "Warning" ? AlertCircle :
                                     XCircle;
          return (
            <tr key={c.id}>
              <td className="py-3">
                <div className="font-mono text-xs text-slate-400">{c.id}</div>
                <div className="text-xs text-slate-600">{c.date}</div>
              </td>
              <td className="py-3 text-xs font-mono">{v?.plate ?? "—"}</td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={u} size="xs" />
                  <span className="text-xs">{u?.name.split(" ")[0] ?? "—"}</span>
                </div>
              </td>
              <td className="py-3 text-xs text-slate-600">{c.type}</td>
              <td className="py-3 text-xs font-mono">{c.mileage.toLocaleString()}</td>
              <td className="py-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${fuelColor}`} style={{ width: `${c.fuel}%` }} />
                  </div>
                  <span className="text-slate-600">{c.fuel}%</span>
                </div>
              </td>
              <td className="py-3 text-xs">
                <span className={`font-mono ${c.hddFree < 100 ? "text-red-600 font-medium" : "text-slate-600"}`}>
                  {c.hddFree}GB
                </span>
              </td>
              <td className="py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Camera size={11} className="text-slate-400" />
                  {c.photos}
                </span>
              </td>
              <td className="py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusPill}`}>
                  <StatusIcon size={11} />
                  {c.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

import type { Expense } from "../../types";
import { userById } from "../../lib/lookups";
import { Avatar, StatusBadge } from "../primitives";
import { EXPENSE_STATUS_STYLE } from "../../lib/statusStyles";

interface Props {
  rows: Expense[];
}

export function ExpensesTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
          <th className="py-2 font-medium">Expense</th>
          <th className="py-2 font-medium">Applicant</th>
          <th className="py-2 font-medium">Category</th>
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium text-right">Amount</th>
          <th className="py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((e) => {
          const u = userById(e.applicant);
          return (
            <tr key={e.id}>
              <td className="py-3">
                <div className="text-[11px] font-mono text-slate-400">{e.id}</div>
                <div className="text-xs text-slate-700 mt-0.5">{e.description}</div>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1.5">
                  <Avatar user={u} size="xs" />
                  <span className="text-xs">{u?.name.split(" ")[0]}</span>
                </div>
              </td>
              <td className="py-3 text-xs">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{e.category}</span>
              </td>
              <td className="py-3 text-xs font-mono text-slate-500">{e.date}</td>
              <td className="py-3 text-right font-mono text-sm font-semibold text-slate-900">
                £{e.amount.toFixed(2)}
              </td>
              <td className="py-3">
                <StatusBadge value={e.status} styleMap={EXPENSE_STATUS_STYLE} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

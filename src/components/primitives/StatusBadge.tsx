import type { BadgeStyle } from "../../types";

interface StatusBadgeProps<T extends string> {
  value: T;
  styleMap: Record<T, BadgeStyle>;
}

export function StatusBadge<T extends string>({ value, styleMap }: StatusBadgeProps<T>) {
  const s = styleMap[value] ?? { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {value}
    </span>
  );
}

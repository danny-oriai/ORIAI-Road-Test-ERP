import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Accent = "blue" | "emerald" | "amber" | "red" | "violet" | "sky";

const ACCENTS: Record<Accent, { bg: string; text: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
  red:     { bg: "bg-red-50",     text: "text-red-600" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
  sky:     { bg: "bg-sky-50",     text: "text-sky-600" },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;        // e.g. "+12%" or "-3%"
  accent?: Accent;
  onClick?: () => void;
}

export function StatCard({ icon: Icon, label, value, hint, trend, accent = "blue", onClick }: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-sm transition-all w-full"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${a.bg} ${a.text} flex items-center justify-center`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              trend.startsWith("+") ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend} <ArrowUpRight size={12} />
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
        {hint && <div className="text-xs text-slate-400 mt-2">{hint}</div>}
      </div>
    </button>
  );
}

import { Search, Plus } from "lucide-react";
import { Button } from "./Button";

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  options: string[];
}

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  filters?: FilterDef[];
  onFilter?: (key: string, value: string) => void;
  onAdd?: () => void;
  addLabel?: string;
}

export function FilterBar({
  search,
  onSearch,
  filters = [],
  onFilter,
  onAdd,
  addLabel = "New",
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => onFilter?.(f.key, e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ))}
      {onAdd && <Button onClick={onAdd} icon={Plus}>{addLabel}</Button>}
    </div>
  );
}

import { Route as RouteIcon } from "lucide-react";
import type { User, PageKey } from "../../types";
import { USERS } from "../../mock/users";
import { NAV_GROUPS } from "./navConfig";

interface SidebarProps {
  active: PageKey;
  onNav: (page: PageKey) => void;
  currentUser: User;
  onSwitchUser: (id: string) => void;
}

export function Sidebar({ active, onNav, currentUser, onSwitchUser }: SidebarProps) {
  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-sm shadow-blue-600/30">
            <RouteIcon size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">RoadTest</div>
            <div className="text-[10px] text-slate-400 tracking-wide uppercase">ERP · Lark H5</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Role switcher (demo only — will be removed when Lark OAuth lands in Step 7) */}
      <div className="border-t border-slate-100 p-3">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
          View as Role
        </div>
        <select
          value={currentUser.id}
          onChange={(e) => onSwitchUser(e.target.value)}
          className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
        >
          {USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.role}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

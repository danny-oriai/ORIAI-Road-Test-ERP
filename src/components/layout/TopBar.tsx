import { Bell, Smartphone } from "lucide-react";
import type { User } from "../../types";
import { Avatar } from "../primitives/Avatar";

interface TopBarProps {
  pageTitle: string;
  currentUser: User;
  onToggleMobile: () => void;
}

export function TopBar({ pageTitle, currentUser, onToggleMobile }: TopBarProps) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <div className="text-xs text-slate-400">RoadTest ERP</div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMobile}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
          >
            <Smartphone size={14} /> Driver mobile view
          </button>
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <div className="flex items-center gap-2.5 pr-1">
            <Avatar user={currentUser} size="md" />
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-xs text-slate-500">{currentUser.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

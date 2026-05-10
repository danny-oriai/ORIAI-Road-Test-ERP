import { useState } from "react";
import {
  X, Bell, MoreHorizontal, Phone, Clock,
  FileCheck2, AlertTriangle, Receipt, Home, MapPin, Camera,
  CheckCircle2, Send, Route as RouteIcon,
  Hourglass, Calendar, Wifi, Battery,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ExpenseCategory, IssueSeverity, IssueType } from "../types";
import { sync, TODAY } from "../lib/api";
import { userById, projectById, vehicleById, routeById } from "../lib/lookups";

type Screen = "home" | "check" | "issue" | "expense";

interface Props {
  onClose: () => void;
  driverUserId: string;            // which driver we're impersonating
}

export function MobileDriverView({ onClose, driverUserId }: Props) {
  const [screen, setScreen] = useState<Screen>("home");
  const driver = userById(driverUserId);

  // Today's task for this driver
  const todayTask = sync.dailyTasks().find((t) => t.driver === driverUserId && t.date === TODAY);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="text-xs opacity-70">Driver Mobile View — Lark H5</div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* iPhone frame */}
        <div className="bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
          <div className="bg-white rounded-[2.4rem] overflow-hidden relative" style={{ height: 760 }}>
            {/* iOS status bar */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-7 pt-2 pb-1 text-[11px] text-slate-900 font-semibold">
              <span>9:41</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-5 bg-slate-900 rounded-full" />
              <span className="flex items-center gap-1">
                <Wifi size={10} />
                <Battery size={14} />
              </span>
            </div>

            {/* Screen content */}
            <div className="h-full pt-8 pb-16 flex flex-col">
              {screen === "home"    && <HomeScreen driver={driver} taskId={todayTask?.id} />}
              {screen === "check"   && <CheckScreen vehicleId={todayTask?.vehicle ?? null} />}
              {screen === "issue"   && <IssueScreen projectId={todayTask?.project ?? null} />}
              {screen === "expense" && <ExpenseScreen projectId={todayTask?.project ?? null} />}
            </div>

            {/* Bottom tab bar */}
            <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-100">
              <div className="grid grid-cols-4 px-2 pt-2 pb-3">
                <TabButton icon={Home}           label="Home"    active={screen === "home"}    onClick={() => setScreen("home")} />
                <TabButton icon={FileCheck2}     label="Check"   active={screen === "check"}   onClick={() => setScreen("check")} />
                <TabButton icon={AlertTriangle}  label="Issue"   active={screen === "issue"}   onClick={() => setScreen("issue")} />
                <TabButton icon={Receipt}        label="Expense" active={screen === "expense"} onClick={() => setScreen("expense")} />
              </div>
              {/* Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-900 rounded-full opacity-70" />
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-white/60 mt-3">
          Embedded in Lark workplace as an H5 app. Driver only needs Lark to log in.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Bottom-tab button
 * ========================================================== */
function TabButton({
  icon: Icon, label, active, onClick,
}: {
  icon: LucideIcon; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors ${
        active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

/* ============================================================
 * Home screen
 * ========================================================== */
function HomeScreen({ driver, taskId }: { driver: ReturnType<typeof userById>; taskId: string | undefined }) {
  const [clockedIn, setClockedIn] = useState(false);
  const task = sync.dailyTasks().find((t) => t.id === taskId);
  const project = projectById(task?.project);
  const vehicle = vehicleById(task?.vehicle);
  const route = routeById(task?.route);
  const pm = userById(project?.manager);
  const plate = sync.plates().find((p) => p.vehicle === vehicle?.id);

  if (!driver || !task) {
    return (
      <div className="p-5 overflow-y-auto">
        <p className="text-sm text-slate-500 text-center mt-8">
          No tasks assigned for today. Enjoy the day off!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-5 py-3 space-y-4">
      {/* Greeting + notification */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Today, {new Date(TODAY).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            Hi, {driver.name.split(" ")[0]} 👋
          </h2>
        </div>
        <div className="relative">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </div>
      </div>

      {/* Today task hero card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-600/20">
        <div className="text-[11px] uppercase tracking-wider opacity-80">Today's task</div>
        <h3 className="font-semibold mt-1 leading-snug">{project?.name ?? "—"}</h3>
        <div className="text-xs opacity-80 mt-1">{project?.client}</div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-70">Vehicle</div>
            <div className="font-mono font-semibold mt-0.5">{vehicle?.plate ?? "—"}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-70">Plate</div>
            <div className="font-mono font-semibold mt-0.5">{plate?.number ?? "—"}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-70">Hours</div>
            <div className="font-semibold mt-0.5">{task.plannedHours}h</div>
          </div>
        </div>

        {/* Clock in/out button */}
        <button
          onClick={() => setClockedIn(!clockedIn)}
          className={`mt-4 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            clockedIn ? "bg-white text-red-600" : "bg-white text-blue-700"
          }`}
        >
          <Clock size={16} />
          {clockedIn ? "Clock out" : "Clock in"}
        </button>
      </div>

      {/* Route */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <RouteIcon size={14} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-900">Route</span>
        </div>
        <div className="text-sm text-slate-900">{route?.name ?? "—"}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {task.start} → {task.end} · {route?.distance ?? "—"} mi · {route?.duration ?? "—"}
        </div>
        <button className="mt-3 w-full py-2 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1">
          <MapPin size={12} /> Open in Maps
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <QuickTile icon={FileCheck2}    label="Vehicle check" hint="Pre-drive"   color="emerald" />
        <QuickTile icon={AlertTriangle} label="Report issue"  hint="HDD / route" color="amber" />
        <QuickTile icon={Receipt}       label="Expense"       hint="Parking £18" color="violet" />
        <QuickTile icon={Phone}         label="Call PM"       hint={pm?.name.split(" ")[0] ?? "PM"} color="blue" />
      </div>

      {/* Today timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-900">Today timeline</div>
          <Calendar size={13} className="text-slate-400" />
        </div>
        <Step icon={CheckCircle2} time="07:42" label="Clocked in"        color="emerald" />
        <Step icon={CheckCircle2} time="08:10" label="Pre-drive check"  color="emerald" />
        <Step icon={CheckCircle2} time="09:18" label="Arrived M11 J8"   color="emerald" />
        <Step icon={Hourglass}    time="—"     label="Test run"          color="amber" current />
        <Step icon={MoreHorizontal} time="—" label="Post-drive check"   color="slate" />
        <Step icon={MoreHorizontal} time="—" label="Clock out" color="slate" last />
      </div>
    </div>
  );
}

function QuickTile({
  icon: Icon, label, hint, color,
}: {
  icon: LucideIcon; label: string; hint: string;
  color: "emerald" | "amber" | "violet" | "blue";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50   text-amber-700",
    violet:  "bg-violet-50  text-violet-700",
    blue:    "bg-blue-50    text-blue-700",
  }[color];
  return (
    <button className="bg-white border border-slate-200 rounded-2xl p-3 text-left active:scale-[0.98] transition-transform">
      <div className={`w-9 h-9 rounded-xl ${styles} flex items-center justify-center`}>
        <Icon size={17} />
      </div>
      <div className="text-sm font-medium text-slate-900 mt-2">{label}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
    </button>
  );
}

function Step({
  icon: Icon, time, label, color, current = false, last = false,
}: {
  icon: LucideIcon; time: string; label: string;
  color: "emerald" | "amber" | "slate"; current?: boolean; last?: boolean;
}) {
  const styles = {
    emerald: { dot: "bg-emerald-500 text-white", text: "text-slate-900" },
    amber:   { dot: "bg-amber-500 text-white",   text: "text-slate-900 font-medium" },
    slate:   { dot: "bg-slate-200 text-slate-500", text: "text-slate-400" },
  }[color];
  return (
    <div className="flex items-start gap-2.5 relative">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full ${styles.dot} flex items-center justify-center shrink-0 ${current ? "ring-2 ring-amber-200" : ""}`}>
          <Icon size={12} />
        </div>
        {!last && <div className="w-px h-5 bg-slate-200 mt-0.5" />}
      </div>
      <div className={`flex-1 text-xs ${styles.text} pb-2`}>
        <div className="font-mono text-[10px] text-slate-400">{time}</div>
        <div>{label}</div>
      </div>
    </div>
  );
}

/* ============================================================
 * Check screen — simplified vehicle check
 * ========================================================== */
function CheckScreen({ vehicleId }: { vehicleId: string | null }) {
  const vehicle = vehicleById(vehicleId);
  const [type, setType] = useState<"Pre-Drive" | "Post-Drive">("Pre-Drive");
  const [photos, setPhotos] = useState<number>(0);
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState(80);
  const [items, setItems] = useState<Record<string, "ok" | "bad" | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const checklist = [
    { k: "tyres",     label: "Tyres & pressure" },
    { k: "lights",    label: "Lights & mirrors" },
    { k: "fluids",    label: "Fluids" },
    { k: "logger",    label: "Test logger" },
    { k: "hdd",       label: "HDD secured" },
    { k: "interior",  label: "Interior clean" },
  ];

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <div className="text-base font-semibold text-slate-900 mt-3">Check submitted</div>
          <div className="text-xs text-slate-500 mt-1">PMO and PM have been notified.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-4 py-3 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Vehicle check</h2>
        <div className="text-xs text-slate-500 mt-0.5">
          {vehicle?.plate ?? "—"} · {vehicle?.brand} {vehicle?.model}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(["Pre-Drive", "Post-Drive"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`py-2 rounded-lg text-xs font-medium ${
              type === t ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Photos · {photos} / 4</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => {
            const filled = i < photos;
            return (
              <button
                key={i}
                onClick={() => !filled && setPhotos((p) => p + 1)}
                className={`aspect-square rounded-lg flex items-center justify-center ${
                  filled ? "bg-emerald-50 border border-emerald-200 text-emerald-600" : "bg-slate-50 border border-dashed border-slate-200 text-slate-400"
                }`}
              >
                {filled ? <CheckCircle2 size={14} /> : <Camera size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Mileage</label>
        <input
          inputMode="numeric"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder={vehicle?.mileage.toLocaleString() ?? "Mileage"}
          className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Fuel / battery</span>
          <span className="font-mono text-slate-700">{fuel}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={fuel}
          onChange={(e) => setFuel(parseInt(e.target.value, 10))}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-slate-500">Quick checklist</div>
        {checklist.map((c) => {
          const s = items[c.k] ?? null;
          return (
            <div key={c.k} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-sm text-slate-900">{c.label}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setItems((cur) => ({ ...cur, [c.k]: cur[c.k] === "ok" ? null : "ok" }))}
                  className={`w-9 h-7 rounded-lg flex items-center justify-center ${
                    s === "ok" ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  ✓
                </button>
                <button
                  onClick={() => setItems((cur) => ({ ...cur, [c.k]: cur[c.k] === "bad" ? null : "bad" }))}
                  className={`w-9 h-7 rounded-lg flex items-center justify-center ${
                    s === "bad" ? "bg-red-500 text-white" : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setSubmitted(true)}
        className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <Send size={15} /> Submit {type} check
      </button>
    </div>
  );
}

/* ============================================================
 * Issue screen
 * ========================================================== */
function IssueScreen({ projectId }: { projectId: string | null }) {
  const project = projectById(projectId);
  const types: IssueType[] = ["Vehicle", "Device", "Data", "Route", "Plate", "Safety", "Weather"];
  const severities: IssueSeverity[] = ["Low", "Medium", "High", "Critical"];

  const [type, setType] = useState<IssueType>("Device");
  const [severity, setSeverity] = useState<IssueSeverity>("Medium");
  const [photos, setPhotos] = useState(0);
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={28} className="text-amber-600" />
          </div>
          <div className="text-base font-semibold text-slate-900 mt-3">Issue reported</div>
          <div className="text-xs text-slate-500 mt-1 px-6">
            PMO has been notified. Owner will reply on Lark Bot.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-4 py-3 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Report issue</h2>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{project?.name ?? "Unassigned"}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Type</div>
        <div className="grid grid-cols-3 gap-1.5">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-2 rounded-lg text-xs font-medium ${
                type === t ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Severity</div>
        <div className="grid grid-cols-4 gap-1.5">
          {severities.map((s) => {
            const styles =
              severity === s
                ? s === "Critical" ? "bg-red-500 text-white" :
                  s === "High"     ? "bg-orange-500 text-white" :
                  s === "Medium"   ? "bg-amber-500 text-white" :
                                     "bg-slate-500 text-white"
                : "bg-slate-50 text-slate-700";
            return (
              <button key={s} onClick={() => setSeverity(s)} className={`py-2 rounded-lg text-xs font-medium ${styles}`}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">What happened?</div>
        <textarea
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe briefly..."
          className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none"
        />
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Photos · {photos} / 4</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => {
            const filled = i < photos;
            return (
              <button
                key={i}
                onClick={() => !filled && setPhotos((p) => p + 1)}
                className={`aspect-square rounded-lg flex items-center justify-center ${
                  filled ? "bg-emerald-50 border border-emerald-200 text-emerald-600" : "bg-slate-50 border border-dashed border-slate-200 text-slate-400"
                }`}
              >
                {filled ? <CheckCircle2 size={14} /> : <Camera size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setSubmitted(true)}
        className="w-full mt-3 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <AlertTriangle size={15} /> Submit issue
      </button>
    </div>
  );
}

/* ============================================================
 * Expense screen
 * ========================================================== */
function ExpenseScreen({ projectId }: { projectId: string | null }) {
  const project = projectById(projectId);
  const categories: ExpenseCategory[] = [
    "Parking", "Charging", "Fuel", "Meal", "Hotel",
    "HDD Postage", "Public Transport", "Vehicle Cleaning",
  ];

  const [cat, setCat] = useState<ExpenseCategory>("Parking");
  const [amount, setAmount] = useState("");
  const [hasReceipt, setHasReceipt] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-violet-100 flex items-center justify-center">
            <Receipt size={28} className="text-violet-600" />
          </div>
          <div className="text-base font-semibold text-slate-900 mt-3">Expense submitted</div>
          <div className="text-xs text-slate-500 mt-1 px-6">
            Pending approval. PM will be notified.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-4 py-3 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">New expense</h2>
        <div className="text-xs text-slate-500 mt-0.5 truncate">{project?.name ?? "Unassigned"}</div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Category</div>
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`py-2.5 rounded-xl text-xs font-medium ${
                cat === c ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Amount (£)</div>
        <input
          type="number" step="0.01" inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-4 py-3 text-2xl font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
        />
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Receipt</div>
        <button
          onClick={() => setHasReceipt(true)}
          className={`w-full py-6 rounded-xl flex flex-col items-center justify-center gap-2 ${
            hasReceipt ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-slate-50 border border-dashed border-slate-200 text-slate-500"
          }`}
        >
          {hasReceipt ? (
            <>
              <CheckCircle2 size={24} />
              <span className="text-sm font-medium">Receipt uploaded</span>
            </>
          ) : (
            <>
              <Camera size={24} />
              <span className="text-sm">Take or upload photo</span>
            </>
          )}
        </button>
      </div>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!amount}
        className="w-full mt-2 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:bg-slate-300"
      >
        <Send size={15} /> Submit for approval
      </button>
    </div>
  );
}

import { useState } from "react";
import {
  ChevronLeft, Camera, CheckCircle2, AlertCircle, XCircle, Upload, Send,
} from "lucide-react";
import { sync } from "../lib/api";
import { Button, Field, inputCls } from "../components/primitives";

interface Props {
  vehicleId?: string;       // optional preselection from VehicleDetail
  onBack: () => void;
}

type CheckType = "Pre-Drive" | "Post-Drive" | "Check-In" | "Check-Out";
type CheckState = "ok" | "warning" | "bad" | null;

interface ChecklistItem {
  key: string;
  label: string;
  description?: string;
}

const CHECKLIST: ChecklistItem[] = [
  { key: "tyres",       label: "Tyres & pressure", description: "Visual inspection, no cuts, correct pressure" },
  { key: "lights",      label: "Lights",           description: "Head, brake, indicator, fog all functional" },
  { key: "mirrors",     label: "Mirrors",          description: "Both side mirrors clean and adjusted" },
  { key: "windscreen",  label: "Windscreen & wipers", description: "No cracks, washer fluid, wipers smooth" },
  { key: "dashboard",   label: "Dashboard warnings", description: "No fault lights illuminated" },
  { key: "fluids",      label: "Fluids",           description: "Coolant, oil, washer levels" },
  { key: "pnc",         label: "Test PNC",         description: "Power, sensors and logger functional" },
  { key: "logger",      label: "Data logger / GoPro", description: "Storage available, time synced" },
  { key: "gnss",        label: "GNSS antenna",     description: "Mounted, no obstructions" },
  { key: "hdd",         label: "HDD secured",      description: "Locked in bay, label correct" },
  { key: "interior",    label: "Interior cleanliness", description: "Free of debris and personal items" },
  { key: "seatbelts",   label: "Seatbelts",        description: "All seatbelts functional and not damaged" },
];

const TYPE_OPTIONS: CheckType[] = ["Pre-Drive", "Post-Drive", "Check-In", "Check-Out"];

export function VehicleCheckFormPage({ vehicleId, onBack }: Props) {
  const vehicles = sync.vehicles();
  const projects = sync.projects();

  const [type, setType] = useState<CheckType>("Pre-Drive");
  const [vehicle, setVehicle] = useState<string>(vehicleId ?? vehicles[0]?.id ?? "");
  const [project, setProject] = useState<string>("");
  const [mileage, setMileage] = useState<string>("");
  const [fuel, setFuel] = useState<number>(80);
  const [hdd, setHdd] = useState<string>("");
  const [issueFound, setIssueFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [states, setStates] = useState<Record<string, CheckState>>({});
  const [submitted, setSubmitted] = useState(false);

  const setItem = (k: string, s: CheckState) =>
    setStates((cur) => ({ ...cur, [k]: cur[k] === s ? null : s }));

  const progress = Object.values(states).filter(Boolean).length;
  const total = CHECKLIST.length;
  const okCount = Object.values(states).filter((s) => s === "ok").length;
  const warningCount = Object.values(states).filter((s) => s === "warning").length;
  const badCount = Object.values(states).filter((s) => s === "bad").length;

  const handleSubmit = () => {
    // Mock submit only — no backend in batch 2
    setSubmitted(true);
    setTimeout(() => onBack(), 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Check submitted</h3>
          <p className="text-sm text-slate-500 mt-2">
            {type} check recorded for {vehicles.find((v) => v.id === vehicle)?.plate ?? vehicle}.
          </p>
          <p className="text-xs text-slate-400 mt-3">Returning to vehicle list…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Vehicle check</h2>
        <p className="text-xs text-slate-500 mt-1">
          Complete all items and submit. Photos are stored on Lark Drive once the backend is connected.
        </p>

        {/* Type picker */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {TYPE_OPTIONS.map((t) => {
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Context */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Context</h3>
        <Field label="Vehicle" required>
          <select
            className={inputCls}
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model} ({v.id})</option>
            ))}
          </select>
        </Field>
        <Field label="Project">
          <select
            className={inputCls}
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mileage (mi)" required>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 38421"
              className={inputCls}
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </Field>
          <Field label="HDD free (GB)">
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 412"
              className={inputCls}
              value={hdd}
              onChange={(e) => setHdd(e.target.value)}
            />
          </Field>
        </div>
        <Field label={`Fuel / battery: ${fuel}%`}>
          <input
            type="range" min={0} max={100}
            value={fuel}
            onChange={(e) => setFuel(parseInt(e.target.value, 10))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>Empty</span><span>50%</span><span>Full</span>
          </div>
        </Field>
      </div>

      {/* Photo upload */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Photos</h3>
          <span className="text-xs text-slate-400">{photos.length} / 8</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < photos.length;
            return (
              <button
                key={i}
                onClick={() => !filled && setPhotos((p) => [...p, `photo-${Date.now()}-${i}.jpg`])}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-colors ${
                  filled
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                    : "bg-slate-50 border border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                {filled ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                <span className="text-[10px] mt-1">{filled ? "Uploaded" : "Add"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
          <Upload size={12} /> Front · Rear · Left · Right + any damage/anomaly
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Checklist</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> {okCount}
            </span>
            <span className="text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} /> {warningCount}
            </span>
            <span className="text-red-600 flex items-center gap-1">
              <XCircle size={12} /> {badCount}
            </span>
            <span className="text-slate-400">· {progress}/{total}</span>
          </div>
        </div>

        <div className="space-y-2">
          {CHECKLIST.map((item) => {
            const state = states[item.key] ?? null;
            return (
              <div key={item.key} className="border border-slate-100 rounded-xl p-3">
                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                )}
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <StateButton
                    icon={CheckCircle2}
                    label="OK"
                    active={state === "ok"}
                    color="emerald"
                    onClick={() => setItem(item.key, "ok")}
                  />
                  <StateButton
                    icon={AlertCircle}
                    label="Warn"
                    active={state === "warning"}
                    color="amber"
                    onClick={() => setItem(item.key, "warning")}
                  />
                  <StateButton
                    icon={XCircle}
                    label="Bad"
                    active={state === "bad"}
                    color="red"
                    onClick={() => setItem(item.key, "bad")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issue + notes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={issueFound}
            onChange={(e) => setIssueFound(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-slate-700">Issue found — needs follow-up</span>
        </label>
        <Field label="Notes">
          <textarea
            className={inputCls}
            rows={3}
            placeholder="Anything else PMO needs to know..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>

      {/* Sticky submit */}
      <div className="sticky bottom-4 z-10 bg-white rounded-2xl border border-slate-200/80 shadow-soft p-3 flex items-center gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1 justify-center">
          Cancel
        </Button>
        <Button icon={Send} onClick={handleSubmit} className="flex-1 justify-center" size="lg">
          Submit check
        </Button>
      </div>
    </div>
  );
}

function StateButton({
  icon: Icon, label, active, color, onClick,
}: {
  icon: typeof CheckCircle2;
  label: string;
  active: boolean;
  color: "emerald" | "amber" | "red";
  onClick: () => void;
}) {
  const styles = {
    emerald: { active: "bg-emerald-500 text-white border-emerald-500",  idle: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
    amber:   { active: "bg-amber-500 text-white border-amber-500",      idle: "border-amber-200 text-amber-700 hover:bg-amber-50" },
    red:     { active: "bg-red-500 text-white border-red-500",          idle: "border-red-200 text-red-700 hover:bg-red-50" },
  }[color];
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        active ? styles.active : `bg-white ${styles.idle}`
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

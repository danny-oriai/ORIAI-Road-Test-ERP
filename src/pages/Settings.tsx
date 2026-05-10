import { useState } from "react";
import {
  Link2, Database, Cloud, Bell, GitBranch, HardDrive, Lock,
  ScrollText, Building2, Save, ExternalLink, AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "../types";
import { Field, Button, inputCls } from "../components/primitives";

type SectionKey =
  | "lark" | "supabase" | "cloudflare" | "notifications"
  | "approval" | "backup" | "security" | "audit" | "company";

interface Section {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const SECTIONS: Section[] = [
  { key: "lark",           label: "Lark Integration",         icon: Link2,      desc: "App credentials, OAuth callback, Base sync, Bot." },
  { key: "supabase",       label: "Supabase Database",        icon: Database,   desc: "Project URL, region, RLS policy stub." },
  { key: "cloudflare",     label: "Cloudflare Deployment",    icon: Cloud,      desc: "Pages site + Workers API endpoint." },
  { key: "notifications",  label: "Notification Rules",       icon: Bell,       desc: "Which events trigger Lark Bot messages." },
  { key: "approval",       label: "Approval Workflow",        icon: GitBranch,  desc: "Project / expense / plate approval chains." },
  { key: "backup",         label: "Data Backup",              icon: HardDrive,  desc: "Scheduled exports of Supabase tables." },
  { key: "security",       label: "Security & Permissions",   icon: Lock,       desc: "Role permission matrix." },
  { key: "audit",          label: "Audit Log",                icon: ScrollText, desc: "Who changed what, when." },
  { key: "company",        label: "Company Profile",          icon: Building2,  desc: "Organisation info shown in reports." },
];

export function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("lark");

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure integrations, workflows, and security. Changes apply once the backend is connected.
        </p>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
        <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium">UI-only preview.</span>{" "}
          No values are saved or sent anywhere. Real configuration lives in Cloudflare Workers secrets and Supabase env vars.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Section nav */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2 space-y-0.5 lg:sticky lg:top-20">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active section content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            {active === "lark"          && <LarkSection />}
            {active === "supabase"      && <SupabaseSection />}
            {active === "cloudflare"    && <CloudflareSection />}
            {active === "notifications" && <NotificationsSection />}
            {active === "approval"      && <ApprovalSection />}
            {active === "backup"        && <BackupSection />}
            {active === "security"      && <SecuritySection />}
            {active === "audit"         && <AuditSection />}
            {active === "company"       && <CompanySection />}

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Section: {active}</span>
              <Button icon={Save}>Save changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Section components ---------- */

function SectionHeader({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Toggle({ label, hint, defaultOn = false }: { label: string; hint?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between py-2">
      <div className="pr-4">
        <div className="text-sm text-slate-900">{label}</div>
        {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`shrink-0 w-10 h-5.5 rounded-full transition-colors relative ${on ? "bg-blue-600" : "bg-slate-200"}`}
        style={{ height: 22 }}
      >
        <span
          className={`absolute top-0.5 ${on ? "left-5" : "left-0.5"} w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all`}
        />
      </button>
    </div>
  );
}

function LarkSection() {
  return (
    <div>
      <SectionHeader icon={Link2} title="Lark Integration" desc="Lark / Feishu workplace app credentials and sync." />
      <div className="space-y-1">
        <Field label="App ID">
          <input className={inputCls} placeholder="cli_xxxxxxxxxxxxxxxx" />
        </Field>
        <Field label="App Secret">
          <input type="password" className={inputCls} placeholder="••••••••••••••••" />
          <div className="text-[11px] text-slate-400 mt-1">Stored as Cloudflare Workers secret — never exposed to the browser.</div>
        </Field>
        <Field label="OAuth redirect URL">
          <input className={inputCls} defaultValue="https://road-test-erp-api.<sub>.workers.dev/api/lark/oauth/callback" />
        </Field>
        <Field label="Desktop homepage">
          <input className={inputCls} defaultValue="https://road-test-erp.pages.dev" />
        </Field>
        <Field label="Mobile homepage">
          <input className={inputCls} defaultValue="https://road-test-erp.pages.dev" />
        </Field>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-700 mb-2">Lark Base sync</div>
        <Toggle label="Sync to PMO Base view" hint="Manual sync for v0.3; auto-sync planned for Step 8." defaultOn />
        <Toggle label="Sync vehicles, plates and tasks tables" defaultOn />
        <Toggle label="Sync expense and issue tables" />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-700 mb-2">Lark Bot</div>
        <Toggle label="Send daily morning briefing to PMs" defaultOn />
        <Toggle label="Notify PM when an issue is reported" defaultOn />
        <Toggle label="Notify driver when plate is about to expire" defaultOn />
      </div>
    </div>
  );
}

function SupabaseSection() {
  return (
    <div>
      <SectionHeader icon={Database} title="Supabase Database" desc="Primary application database." />
      <Field label="Project URL">
        <input className={inputCls} placeholder="https://xxxxxxx.supabase.co" />
      </Field>
      <Field label="Region">
        <select className={inputCls} defaultValue="eu-west-2">
          <option value="eu-west-2">Europe (London) · eu-west-2</option>
          <option value="eu-central-1">Europe (Frankfurt) · eu-central-1</option>
          <option value="us-east-1">US East · us-east-1</option>
        </select>
      </Field>
      <Field label="Anon public key">
        <input className={inputCls} placeholder="eyJhbGci..." />
      </Field>
      <Field label="Service role key">
        <input type="password" className={inputCls} placeholder="••••••••••••••••" />
        <div className="text-[11px] text-slate-400 mt-1">Lives in Cloudflare Workers secrets — never in the front-end bundle.</div>
      </Field>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Toggle label="Enable Row-Level Security on all tables" defaultOn />
        <Toggle label="Enforce read-only access for Driver role" defaultOn />
      </div>
    </div>
  );
}

function CloudflareSection() {
  return (
    <div>
      <SectionHeader icon={Cloud} title="Cloudflare Deployment" desc="Where this site and its API live." />
      <Field label="Pages URL">
        <input className={inputCls} defaultValue="https://road-test-erp.pages.dev" />
      </Field>
      <Field label="Custom domain">
        <input className={inputCls} placeholder="erp.yourcompany.co.uk (optional)" />
      </Field>
      <Field label="Workers API endpoint">
        <input className={inputCls} placeholder="https://road-test-erp-api.<sub>.workers.dev" />
      </Field>
      <Field label="Frontend build environment">
        <select className={inputCls} defaultValue="production">
          <option>production</option>
          <option>preview</option>
        </select>
      </Field>
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <ExternalLink size={14} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">Wrangler deploy:</span>{" "}
          Workers API and Pages site deploy from GitHub. Secrets configured under Workers → Settings → Variables.
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div>
      <SectionHeader icon={Bell} title="Notification Rules" desc="Which events fire which channels." />
      <div className="space-y-1">
        <Toggle label="Critical issue reported" hint="Lark Bot DM to PMO + project's PM" defaultOn />
        <Toggle label="Plate expiring in 14 days" hint="Lark Bot DM to plate's responsible person" defaultOn />
        <Toggle label="Plate allocation conflict detected" hint="Lark Bot DM to both project PMs + PMO" defaultOn />
        <Toggle label="Vehicle MOT within 30 days" hint="Email to Admin" defaultOn />
        <Toggle label="Expense submitted by driver" hint="Lark Bot DM to PM" defaultOn />
        <Toggle label="Daily morning briefing" hint="Sent at 06:30 to driver / 07:30 to PM" defaultOn />
        <Toggle label="Manual attendance correction logged" hint="Email digest to PMO weekly" />
      </div>
    </div>
  );
}

function ApprovalSection() {
  return (
    <div>
      <SectionHeader icon={GitBranch} title="Approval Workflow" desc="Multi-step approvals via Lark Approval." />
      <ApprovalChain title="Project lifecycle" steps={["Draft", "PM submit", "PMO review", "Approved"]} />
      <ApprovalChain title="Expense ≥ £100"  steps={["Submitted", "PM approve", "Finance approve", "Paid"]} />
      <ApprovalChain title="Expense < £100"  steps={["Submitted", "PM approve", "Paid"]} />
      <ApprovalChain title="Plate renewal"   steps={["Request", "Admin issue", "PMO log"]} />
      <ApprovalChain title="Vehicle off-fleet" steps={["Request", "PMO + Finance approve"]} />
    </div>
  );
}

function ApprovalChain({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-sm font-medium text-slate-900 mb-2">{title}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{s}</span>
            {i < steps.length - 1 && <span className="text-slate-300">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function BackupSection() {
  return (
    <div>
      <SectionHeader icon={HardDrive} title="Data Backup" desc="Scheduled exports of Supabase tables." />
      <Field label="Schedule">
        <select className={inputCls} defaultValue="daily-0200">
          <option value="hourly">Every hour</option>
          <option value="daily-0200">Daily at 02:00 GMT</option>
          <option value="weekly-sunday">Weekly · Sunday 02:00</option>
        </select>
      </Field>
      <Field label="Destination">
        <select className={inputCls} defaultValue="r2">
          <option value="r2">Cloudflare R2 bucket</option>
          <option value="lark-drive">Lark Drive (encrypted)</option>
          <option value="s3">External AWS S3</option>
        </select>
      </Field>
      <Field label="Retention">
        <select className={inputCls} defaultValue="90">
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">365 days</option>
        </select>
      </Field>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Toggle label="Include vehicle check photos" defaultOn />
        <Toggle label="Include expense receipts" defaultOn />
        <Toggle label="Encrypt backup with company key" defaultOn />
      </div>
    </div>
  );
}

function SecuritySection() {
  const roles: Role[] = ["Admin", "PMO", "Project Manager", "Test Engineer", "Driver", "Finance"];
  const perms = ["View own", "View all", "Edit", "Approve", "Delete"];
  return (
    <div>
      <SectionHeader icon={Lock} title="Security & Permissions" desc="Role permission matrix — applied via Supabase RLS." />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-medium text-xs text-slate-600">Role</th>
              {perms.map((p) => (
                <th key={p} className="text-center px-2 py-2 font-medium text-xs text-slate-600">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r, i) => (
              <tr key={r} className="border-t border-slate-100">
                <td className="px-3 py-2 text-sm font-medium text-slate-900">{r}</td>
                {perms.map((p, j) => {
                  // crude demo matrix
                  const filled =
                    (r === "Admin")                                                         ? true :
                    (r === "PMO" && j !== 4)                                                ? true :
                    (r === "Project Manager" && (j === 0 || j === 1 || j === 2 || j === 3)) ? true :
                    (r === "Test Engineer"   && (j === 0 || j === 1))                       ? true :
                    (r === "Driver"          && (j === 0))                                  ? true :
                    (r === "Finance"         && (j === 1 || j === 3))                       ? true :
                    false;
                  void i; void p;
                  return (
                    <td key={p} className="text-center px-2 py-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${filled ? "bg-emerald-500" : "bg-slate-200"}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Toggle label="Require 2-factor authentication via Lark" defaultOn />
        <Toggle label="Auto-log out after 30 minutes of inactivity" defaultOn />
        <Toggle label="Restrict access by IP range (UK only)" />
      </div>
    </div>
  );
}

function AuditSection() {
  const sampleLog = [
    { who: "Sarah Mitchell",   what: "Approved expense EXP-7704", when: "2026-05-07 09:12", category: "Expense" },
    { who: "James Chen",       what: "Updated project PRJ-2025-014 status to In Progress", when: "2026-05-06 16:45", category: "Project" },
    { who: "Marcus Holloway",  what: "Manual attendance correction on AT-9004", when: "2026-05-07 10:02", category: "Attendance" },
    { who: "Olivia Brown",     what: "Closed issue ISS-505", when: "2026-05-06 11:30", category: "Issue" },
    { who: "Rachel Green",     what: "Marked expense EXP-7707 as Paid", when: "2026-05-05 14:18", category: "Expense" },
  ];
  return (
    <div>
      <SectionHeader icon={ScrollText} title="Audit Log" desc="Last 5 entries shown — full log searchable later." />
      <div className="space-y-2">
        {sampleLog.map((l, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-slate-900">{l.who}</span>{" "}
                <span className="text-slate-600">{l.what}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{l.when}</span>
            </div>
            <span className="inline-block mt-1.5 text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {l.category}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-400 text-center">
        Logged from Supabase audit_logs table once the backend is live.
      </div>
    </div>
  );
}

function CompanySection() {
  return (
    <div>
      <SectionHeader icon={Building2} title="Company Profile" desc="Used on PDF reports and PMO dashboards." />
      <Field label="Company name">
        <input className={inputCls} defaultValue="RTM Operations Ltd" />
      </Field>
      <Field label="Registered address">
        <textarea className={inputCls} rows={3} defaultValue="Suite 4, Cambridge Innovation Centre, 1 The Boulevard, Cambridge CB1 2GA" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company number">
          <input className={inputCls} placeholder="01234567" />
        </Field>
        <Field label="VAT number">
          <input className={inputCls} placeholder="GB123 4567 89" />
        </Field>
      </div>
      <Field label="Primary contact email">
        <input type="email" className={inputCls} placeholder="ops@yourcompany.co.uk" />
      </Field>
      <Field label="Logo">
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
          Drop PNG or SVG logo here (max 1 MB)
        </div>
      </Field>
    </div>
  );
}

/* end */

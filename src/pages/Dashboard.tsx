import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bus,
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  GraduationCap,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";

const data = [
  { name: "Jan", revenue: 4000, students: 2400 },
  { name: "Feb", revenue: 3000, students: 1398 },
  { name: "Mar", revenue: 2000, students: 9800 },
  { name: "Apr", revenue: 2780, students: 3908 },
  { name: "May", revenue: 1890, students: 4800 },
  { name: "Jun", revenue: 2390, students: 3800 },
];

function toneClasses(color: string) {
  switch (color) {
    case "emerald":
      return "bg-emerald-50 text-emerald-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "rose":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

export default function Dashboard() {
  const { schoolSettings, currentUser, students, users, healthRecords, vehicles, timetableEntries, feeBalances, can } = useApp();
  const canViewFees = can("fees");

  const totalOutstandingFees = React.useMemo(() => {
    return feeBalances.reduce((sum, balance) => sum + balance.outstandingAmount, 0);
  }, [feeBalances]);

  const stats = React.useMemo(
    () => [
      { label: "Students", value: students.length.toLocaleString(), icon: GraduationCap, trend: "+12%", color: "blue", href: "/students" },
      { label: "Staff Accounts", value: users.length.toLocaleString(), icon: Users, trend: "+3%", color: "emerald", href: "/staff" },
      ...(canViewFees ? [{ label: "Outstanding Fees", value: formatCurrency(totalOutstandingFees, schoolSettings.currency || "UGX"), icon: Wallet, trend: "Current period", color: "amber", href: "/fees" }] : []),
      { label: "Sick Bay Cases", value: healthRecords.filter((record) => record.status === "sick").length.toLocaleString(), icon: Activity, trend: "-0.5%", color: "rose", href: "/sick-bay" },
    ],
    [students.length, users.length, totalOutstandingFees, schoolSettings.currency, healthRecords, canViewFees],
  );

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Today at {schoolSettings.name}</p>
          <h2 className="app-page-title">School Overview</h2>
          <p className="app-page-subtitle">Welcome back, {currentUser?.name}. Key operations are summarized for quick decisions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="app-button-secondary">
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <button className="app-button-primary">Export report</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href} className="app-card group">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className={cn("rounded-xl p-2.5", toneClasses(stat.color))}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className={cn("app-badge", stat.trend.startsWith("+") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                {stat.trend.startsWith("+") ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{stat.value}</h3>
              <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Link to="/timetable" className="app-card">
          <SectionHeader icon={Clock} title="Class Schedule" meta="Today" />
          <div className="mt-5 space-y-3">
            {timetableEntries.length > 0 ? (
              timetableEntries.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                  <span className="w-14 text-xs font-semibold text-blue-700">{entry.startTime}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{entry.subject}</p>
                    <p className="truncate text-xs text-slate-500">{entry.class} / Room {entry.room}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="app-empty-state">No classes scheduled for today.</div>
            )}
          </div>
        </Link>

        <Link to="/transport" className="app-card">
          <SectionHeader icon={Bus} title="Fleet Status" meta="Live" />
          <div className="mt-5 space-y-3">
            {vehicles.length > 0 ? (
              vehicles.slice(0, 2).map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{vehicle.plateNumber}</p>
                    <p className="text-xs text-slate-500">{vehicle.driverName || "Driver unassigned"}</p>
                  </div>
                  <span className={cn("app-badge capitalize", vehicle.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{vehicle.status}</span>
                </div>
              ))
            ) : (
              <div className="app-empty-state">No active vehicles.</div>
            )}
          </div>
        </Link>

        <Link to="/grades" className="app-card">
          <SectionHeader icon={Award} title="Academic Performance" meta="Current term" />
          <div className="mt-6 flex h-32 items-end gap-2">
            {[40, 65, 52, 85, 78, 92].map((height, index) => (
              <div key={index} className="flex-1 rounded-t-lg bg-blue-100 transition-colors hover:bg-blue-500" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-blue-800">
            <p className="text-sm font-semibold">General average</p>
            <span className="text-lg font-semibold">78.4%</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="app-panel xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Revenue & Enrollment</h3>
              <p className="text-sm text-slate-500">Six-month trend from recorded school activity.</p>
            </div>
            <select className="app-select max-w-40">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 30px rgb(15 23 42 / 0.08)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="students" stroke="#059669" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="app-panel">
          <h3 className="text-lg font-semibold text-slate-950">Class Occupancy</h3>
          <div className="mt-5 space-y-4">
            {[
              { label: "Senior 1", value: 92 },
              { label: "Senior 2", value: 45 },
              { label: "Senior 3", value: 78 },
              { label: "Senior 4", value: 64 },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-950">{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-700" />
              <p className="text-sm leading-6 text-blue-800">Enrollment is trending upward. Review classes above 85% before next intake.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, meta }: { icon: React.ElementType; title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      </div>
      <span className="text-xs font-semibold text-slate-500">{meta}</span>
    </div>
  );
}

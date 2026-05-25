import React from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar as CalendarIcon,
  Bus,
  Clock,
  Award,
  ChevronRight
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const data = [
  { name: "Jan", revenue: 4000, students: 2400 },
  { name: "Feb", revenue: 3000, students: 1398 },
  { name: "Mar", revenue: 2000, students: 9800 },
  { name: "Apr", revenue: 2780, students: 3908 },
  { name: "May", revenue: 1890, students: 4800 },
  { name: "Jun", revenue: 2390, students: 3800 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const { schoolSettings, currentUser, students, users, healthRecords, vehicles, timetableEntries, getClassFees } = useApp();
  
  const totalOutstandingFees = React.useMemo(() => {
    return students.reduce((sum, s) => {
      const expected = getClassFees(s.class);
      return sum + Math.max(0, expected - s.totalFeesPaid);
    }, 0);
  }, [students, getClassFees]);
  
  const stats = React.useMemo(() => [
    { label: "Enrolled Students", value: students.length.toLocaleString(), icon: GraduationCap, trend: "+12%", color: "blue", href: "/students" },
    { label: "Active Faculty", value: users.length.toLocaleString(), icon: Users, trend: "+3%", color: "emerald", href: "/staff" },
    { label: "Treasury Arrears", value: formatCurrency(totalOutstandingFees, schoolSettings.currency || "UGX"), icon: Wallet, trend: "+8%", color: "amber", href: "/fees" },
    { label: "Health Protocol", value: healthRecords.filter(r => r.status === "sick").length.toLocaleString(), icon: Activity, trend: "-0.5%", color: "rose", href: "/sick-bay" },
  ], [students.length, users.length, totalOutstandingFees, schoolSettings.currency, healthRecords]);

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">School Overview</h2>
          <p className="text-gray-500 text-sm font-medium">Welcome back, {currentUser?.name}. Monitoring {schoolSettings.name}'s performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="webapp-card px-4 py-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </button>
          <button className="webapp-btn-primary !px-5 !py-3 !text-[10px]">
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href} className="webapp-card p-6 group overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300 shadow-sm",
                stat.color === "blue" ? "bg-blue-50 text-blue-600 shadow-blue-50" :
                stat.color === "emerald" ? "bg-emerald-50 text-emerald-600 shadow-emerald-50" :
                stat.color === "amber" ? "bg-amber-50 text-amber-600 shadow-amber-50" :
                "bg-rose-50 text-rose-600 shadow-rose-50"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={cn(
                "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
                stat.trend.startsWith("+") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {stat.trend.startsWith("+") ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">{stat.value}</h3>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </Link>
        ))}
      </div>

      {/* Integration Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Timetable Container */}
        <Link to="/timetable" className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Class Schedule</h3>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today</span>
          </div>
          <div className="space-y-4">
            {timetableEntries.length > 0 ? (
              timetableEntries.slice(0, 3).map((e, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                  <span className="text-[10px] font-black text-blue-600 w-12">{e.startTime}</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">{e.subject}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{e.className} • Room {e.room}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No classes scheduled</p>
              </div>
            )}
            <button className="w-full py-3 rounded-2xl border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
              Full Timetable
            </button>
          </div>
        </Link>

        {/* Transport Status Container */}
        <Link to="/transport" className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 text-bus-pulse">
                <Bus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Fleet Tracking</h3>
            </div>
            <div className="flex items-center gap-1.5 py-1 px-2 bg-emerald-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-emerald-600 uppercase">Live</span>
            </div>
          </div>
          <div className="space-y-4">
            {vehicles.slice(0, 2).map((v, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-900 rounded-3xl text-white relative overflow-hidden group/bus">
                <div className="absolute top-0 right-0 w-24 h-full bg-white/5 skew-x-12 -translate-x-12" />
                <div>
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{v.plateNumber}</p>
                   <p className="text-sm font-black text-white">{v.driverName}</p>
                   <p className="text-[9px] font-medium text-gray-400 mt-1 uppercase">On Route</p>
                </div>
                <div className="ml-auto text-right">
                   <p className="text-xl font-black text-white">45 <span className="text-[10px] text-gray-400">km/h</span></p>
                   <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">On-Time</p>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No vehicles active</p>
              </div>
            )}
            <button className="w-full py-3 rounded-2xl border border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
              Launch Tracking Map
            </button>
          </div>
        </Link>

        {/* Global Academic Performance */}
        <Link to="/grades" className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Academic Performance</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-6">
            <div className="flex items-end justify-between px-1 h-32 gap-2">
               {[40, 65, 52, 85, 78, 92].map((h, i) => (
                 <div key={i} className="flex-1 bg-indigo-100 rounded-t-xl relative group/bar hover:bg-indigo-600 transition-all duration-300" style={{ height: `${h}%` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-indigo-600 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {h}%
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-4 bg-indigo-600 rounded-3xl text-white">
               <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Current General GPA</p>
                  <span className="text-xl font-black">78.4%</span>
               </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Revenue & Enrollment</h3>
            <select className="bg-gray-50 border-gray-200 rounded-lg text-xs font-medium focus:ring-blue-500">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "#94a3b8", fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: "#94a3b8", fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="students" stroke="#10b981" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Class Occupancy</h3>
          <div className="space-y-4">
            {[
              { label: "Grade 10-A", value: 92, color: "#3b82f6" },
              { label: "Grade 12-B", value: 45, color: "#f59e0b" },
              { label: "Grade 8-C", value: 78, color: "#10b981" },
              { label: "Grade 11-A", value: 64, color: "#ef4444" },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">{item.label}</span>
                  <span className="text-gray-900 font-bold">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500" 
                    style={{ width: `${item.value}%`, backgroundColor: item.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-bold">Insight:</span> Enrollment is up 12% compared to last semester. Consider opening new sections for Grade 12.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

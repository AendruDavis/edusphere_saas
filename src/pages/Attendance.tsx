import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Fingerprint
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ResponsiveDialog } from "../components/ui/ResponsiveDialog";

export default function Attendance() {
  const { students, staff, attendanceRecords, addAttendanceRecord, recordAttendanceEvent } = useApp();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    entityId: "",
    status: "present" as "present" | "absent" | "late",
    eventType: "IN" as "IN" | "OUT",
    date: new Date().toISOString().split('T')[0],
    biometricVerified: false
  });

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = useMemo(() => {
    return attendanceRecords.filter(r => r.date === today);
  }, [attendanceRecords, today]);

  const stats = useMemo(() => {
    const total = students.length + staff.length;
    const present = todayLogs.filter(l => l.status === "present").length;
    const late = todayLogs.filter(l => l.status === "late").length;
    const absent = total - present - late;
    const biometricCount = todayLogs.filter(l => l.biometricVerified).length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { percent, present, late, absent, biometricCount };
  }, [students, staff, todayLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === formData.entityId);
    const staffMember = staff.find(s => s.id === formData.entityId);
    
    if (student && formData.status !== "absent") {
      await recordAttendanceEvent({
        studentId: student.id,
        timestamp: new Date(`${formData.date}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
        type: formData.eventType,
        source: "manual",
      });
      toast.success("Attendance event recorded and parent notifications queued where allowed.");
      setIsModalOpen(false);
      return;
    }

    if (student || staffMember) {
      await addAttendanceRecord({
        studentId: formData.entityId,
        studentName: student?.name || staffMember?.name || "Unknown",
        date: formData.date,
        status: formData.status,
        role: student ? "Student" : "Staff",
        biometricVerified: formData.biometricVerified
      });
      toast.success("Attendance record saved.");
      setIsModalOpen(false);
    }
  };

  const filteredLogs = todayLogs.filter(l => 
    l.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Monitoring</h2>
          <p className="text-gray-500 text-sm">Real-time tracking of students and staff presence.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500"
          >
            <UserCheck className="w-4 h-4" />
            Mark Manual Attendance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        <div className="rounded-lg border border-gray-100 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-bold text-gray-400 uppercase mb-1">Present Today</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900">{stats.percent}%</h3>
            <span className="text-emerald-600 text-sm font-bold flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {stats.present} Members
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-bold text-gray-400 uppercase mb-1">Late Arrivals</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900">{stats.late}</h3>
            <span className="text-amber-600 text-sm font-bold flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Impacts Rank
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 border-l-4 border-l-rose-500 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-bold text-gray-400 uppercase mb-1">Absentees</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900">{stats.absent}</h3>
            <span className="text-rose-600 text-sm font-bold flex items-center">
              <XCircle className="w-4 h-4 mr-1" />
              Auto-Mailing
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search current logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg pl-10 pr-4 py-2 text-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-200 md:hidden">
          {filteredLogs.map((log) => (
            <article key={log.id} className="app-mobile-record">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-950">{log.studentName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{log.role} · {log.date}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                  log.status === "present" ? "bg-emerald-100 text-emerald-700" :
                  log.status === "late" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700",
                )}>{log.status}</span>
              </div>
              <div className={cn(
                "mt-3 flex items-center gap-2 text-sm font-medium",
                log.biometricVerified ? "text-emerald-700" : "text-slate-500",
              )}>
                <Fingerprint className="h-4 w-4" aria-hidden="true" />
                {log.biometricVerified ? "Biometric verified" : "Manual record"}
              </div>
            </article>
          ))}
          {filteredLogs.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="font-semibold text-slate-900">No records today</p>
              <p className="mt-1 text-sm text-slate-500">Attendance entries will appear here.</p>
            </div>
          )}
        </div>
        <table className="hidden w-full text-left md:table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Biometric</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{log.studentName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    log.role === "Student" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  )}>{log.role}</span>
                </td>
                <td className="px-6 py-4">
                  {log.biometricVerified ? (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <Fingerprint className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Fingerprint className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Manual</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                    log.status === "present" ? "bg-emerald-100 text-emerald-700" :
                    log.status === "late" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  )}>{log.status}</span>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No attendance records found for today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ResponsiveDialog
        open={isModalOpen}
        title="Mark Attendance"
        description="Record a student or staff member's attendance for the selected date."
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setIsModalOpen(false)} className="app-button-secondary">Cancel</button>
            <button type="submit" form="attendance-form" className="app-button-primary bg-emerald-600 hover:bg-emerald-700">Submit Record</button>
          </>
        }
      >
            <form id="attendance-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Select Member</label>
                <select 
                  required
                  value={formData.entityId} 
                  onChange={e => setFormData({...formData, entityId: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                >
                  <option value="">Choose...</option>
                  <optgroup label="Students">
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                  </optgroup>
                  <optgroup label="Staff">
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Date</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                  />
                </div>
              </div>
              {students.some((student) => student.id === formData.entityId) && formData.status !== "absent" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Attendance Event</label>
                  <select
                    value={formData.eventType}
                    onChange={e => setFormData({...formData, eventType: e.target.value as "IN" | "OUT"})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                  >
                    <option value="IN">Check In</option>
                    <option value="OUT">Check Out</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  formData.biometricVerified ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400"
                )}>
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-900 uppercase">Biometric Verified</p>
                  <p className="text-xs text-gray-500">Confirmed from an approved attendance device</p>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={formData.biometricVerified}
                  aria-label="Biometric verified"
                  onClick={() => setFormData({...formData, biometricVerified: !formData.biometricVerified})}
                  className={cn(
                    "relative h-11 w-14 rounded-full transition-colors",
                    formData.biometricVerified ? "bg-emerald-500" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-3.5 h-4 w-4 rounded-full bg-white transition-all",
                    formData.biometricVerified ? "right-2" : "left-2"
                  )} />
                </button>
              </div>
            </form>
      </ResponsiveDialog>
    </div>
  );
}

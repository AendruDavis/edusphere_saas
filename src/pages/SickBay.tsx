import React, { useState } from "react";
import { 
  HeartPulse, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Stethoscope, 
  Pill,
  Clock,
  ArrowRight,
  TrendingUp,
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";

export default function SickBay() {
  const { students, healthRecords, addHealthRecord } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  
  const [formData, setFormData] = useState({
    sickness: "",
    diagnosis: "",
    medication: "",
    actionTaken: "",
    notifyParent: true,
    status: "sick" as "sick" | "sent-home" | "back-in-class" | "monitored",
    notes: ""
  });

  const studentSuggestions = studentSearch.trim() 
    ? students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 5)
    : [];

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !formData.sickness) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const newRecord: any = {
      studentId: student.id,
      studentName: student.name,
      sickness: formData.sickness,
      diagnosis: formData.diagnosis,
      medication: formData.medication,
      actionTaken: formData.actionTaken,
      notifyParent: formData.notifyParent,
      status: formData.status,
      date: new Date().toISOString().split('T')[0],
      notes: formData.notes
    };

    await addHealthRecord(newRecord);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStudentSearch("");
    setSelectedStudentId("");
    setFormData({
      sickness: "",
      diagnosis: "",
      medication: "",
      actionTaken: "",
      notifyParent: true,
      status: "sick",
      notes: ""
    });
  };

  const stats = [
    { label: "Active Cases", value: healthRecords.filter(r => r.status === "sick" || r.status === "monitored").length, icon: Stethoscope, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Sent Home", value: healthRecords.filter(r => r.status === "sent-home").length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Recovered", value: healthRecords.filter(r => r.status === "back-in-class").length, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8 pb-10" onClick={() => setShowStudentSuggestions(false)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sick Bay & Health Records</h2>
          <p className="text-gray-500 text-sm">Monitor student wellness and medical history.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Health Entry
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Recent Health Incidents</h3>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Filter status..." className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs" />
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {healthRecords.length === 0 ? (
                <div className="p-20 text-center space-y-3">
                  <HeartPulse className="w-12 h-12 text-gray-200 mx-auto" />
                  <p className="text-sm text-gray-400 font-medium">No health records found.</p>
                </div>
              ) : (
                healthRecords.map(record => (
                  <div key={record.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-sm">
                          {record.studentName[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{record.studentName}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                            <Calendar className="w-3 h-3" />
                            {record.date}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        record.status === "sick" ? "bg-rose-50 text-rose-600" :
                        record.status === "sent-home" ? "bg-amber-50 text-amber-600" :
                        record.status === "monitored" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {record.status.replace("-", " ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Stethoscope className="w-4 h-4 text-rose-400" />
                        <span className="font-medium text-gray-900">{record.diagnosis || record.sickness}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Pill className="w-4 h-4 text-emerald-400" />
                        <span>{record.medication || "No medication listed"}</span>
                      </div>
                    </div>
                    {record.notes && (
                      <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl italic">
                        "{record.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100">
            <h3 className="font-bold text-lg mb-2">Health Tip of the Day</h3>
            <p className="text-emerald-50 text-sm leading-relaxed mb-6">
              Encourage students to wash their hands frequently to prevent the spread of seasonal flu in classrooms.
            </p>
            <div className="p-4 bg-emerald-500/30 rounded-2xl flex items-center gap-3">
              <Clock className="w-10 h-10 text-emerald-100 opacity-50" />
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-200">Nurse Hours</p>
                <p className="text-sm font-bold">08:00 AM - 05:00 PM</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Stock Alerts</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-xs font-bold text-rose-700">Painkillers</span>
                <span className="text-[10px] font-bold text-rose-500 uppercase">Low Stock</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-xs font-bold text-gray-700">Bandages</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">In Stock</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-rose-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">New Health Record</h3>
                <p className="text-rose-100 text-xs">Document clinical event or monitoring</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="p-8 space-y-6" onSubmit={handleCreateRecord}>
              <div className="space-y-1.5 relative" onClick={(e) => e.stopPropagation()}>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Student</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentSuggestions(true);
                    }}
                    onFocus={() => setShowStudentSuggestions(true)}
                    placeholder="Search student name..." 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" 
                    required
                  />
                </div>
                
                {showStudentSuggestions && studentSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl z-20 overflow-hidden">
                    {studentSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStudentSearch(s.name);
                          setSelectedStudentId(s.id);
                          setShowStudentSuggestions(false);
                        }}
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50"
                      >
                        <p className="text-sm font-bold text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.reg} • {s.class}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Condition/Sickness</label>
                  <input 
                    type="text" 
                    value={formData.sickness}
                    onChange={(e) => setFormData({ ...formData, sickness: e.target.value })}
                    placeholder="e.g. Severe Headache" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" 
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Diagnosis</label>
                  <input 
                    type="text" 
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="e.g. Migraine" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Medication/Drugs</label>
                  <input 
                    type="text" 
                    value={formData.medication}
                    onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                    placeholder="e.g. Panadol 500mg" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Action Taken</label>
                  <input 
                    type="text" 
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    placeholder="e.g. Rested, parent called" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Current Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "sick", label: "Sick" },
                    { id: "monitored", label: "Monitor" },
                    { id: "sent-home", label: "Sent Home" },
                    { id: "back-in-class", label: "Recovered" }
                  ].map((s) => (
                    <button 
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s.id as any })}
                      className={cn(
                        "py-2 px-3 rounded-lg border-2 text-[10px] font-bold uppercase transition-all",
                        formData.status === s.id 
                          ? "border-rose-600 bg-rose-50 text-rose-600" 
                          : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">Notes & Observations</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Clinical notes, diet instructions, etc..." 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm min-h-[100px]" 
                />
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <span>
                  <span className="block text-sm font-bold text-gray-800">Notify parent</span>
                  <span className="text-xs text-gray-500">Send an email/SMS/WhatsApp alert when contacts are available.</span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.notifyParent}
                  onChange={(event) => setFormData({ ...formData, notifyParent: event.target.checked })}
                  className="h-5 w-5 accent-rose-600"
                />
              </label>

              <button 
                type="submit"
                className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl mt-4 hover:bg-rose-700 active:scale-95 transition-all shadow-xl shadow-rose-100"
              >
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

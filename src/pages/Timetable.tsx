import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Download, 
  Printer, 
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Bookmark
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { TimetableEntry } from "../types";

export default function Timetable() {
  const { timetableEntries, schoolSettings, staff, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useApp();
  const [activeTab, setActiveTab] = useState<"class" | "teacher" | "exam">("class");
  const [selectedClass, setSelectedClass] = useState(schoolSettings.classes[0] || "");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [viewType, setViewType] = useState<"weekly" | "daily">("weekly");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<TimetableEntry> | null>(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 10:30", // Break
    "10:30 - 11:30",
    "11:30 - 12:30",
    "12:30 - 01:30",
    "01:30 - 02:30", // Lunch
    "02:30 - 03:30",
    "03:30 - 04:30"
  ];

  const subjects = ["Mathematics", "English", "Science", "Social Studies", "Religious Education", "Swahili", "Art & Craft", "Physical Education"];

  const handleOpenModal = (day?: string, time?: string) => {
    if (day && time) {
      setEditingEntry({
        day,
        startTime: time.split(" - ")[0],
        endTime: time.split(" - ")[1],
        class: selectedClass,
        type: activeTab === "exam" ? "exam" : "class"
      });
    } else {
      setEditingEntry({
        type: activeTab === "exam" ? "exam" : "class",
        class: selectedClass
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry?.subject || !editingEntry?.day || !editingEntry?.startTime) return;

    if (editingEntry.id) {
      await updateTimetableEntry(editingEntry.id, editingEntry);
    } else {
      await addTimetableEntry(editingEntry as Omit<TimetableEntry, "id">);
    }
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this entry?")) {
      await deleteTimetableEntry(id);
    }
  };

  const filteredEntries = timetableEntries.filter(entry => {
    if (activeTab === "class") return entry.class === selectedClass && entry.type === "class";
    if (activeTab === "teacher") return entry.teacherId === selectedTeacher && entry.type === "class";
    if (activeTab === "exam") return entry.class === selectedClass && entry.type === "exam";
    return false;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Academic Timetable</h1>
          <p className="text-gray-500 font-medium">Coordinate classes, teachers, and rooms efficiently</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-indigo-600 transition-all shadow-sm">
            <Printer className="w-5 h-5" />
          </button>
          <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-indigo-600 transition-all shadow-sm">
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 uppercase tracking-widest text-xs"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="bg-white p-1 rounded-2xl inline-flex border border-gray-100 shadow-sm overflow-x-auto max-w-full">
          {(["class", "teacher", "exam"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-widest whitespace-nowrap",
                activeTab === tab 
                  ? "bg-gray-900 text-white shadow-md" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              By {tab === "class" ? "Class" : tab === "teacher" ? "Teacher" : "Exam Schedule"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-3">
             <Filter className="w-4 h-4 text-gray-400" />
             <select 
               className="bg-transparent border-none font-bold text-gray-900 focus:ring-0 text-sm"
               value={activeTab === "teacher" ? selectedTeacher : selectedClass}
               onChange={(e) => activeTab === "teacher" ? setSelectedTeacher(e.target.value) : setSelectedClass(e.target.value)}
             >
               <option value="" disabled>Select {activeTab === "teacher" ? "Teacher" : "Class"}</option>
               {activeTab === "teacher" 
                 ? staff.filter(s => s.role.includes("Teacher")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                 : schoolSettings.classes.map(c => <option key={c} value={c}>{c}</option>)
               }
             </select>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="flex p-1 gap-1">
             <button 
               onClick={() => setViewType("weekly")}
               className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewType === "weekly" ? "bg-gray-100 text-gray-900" : "text-gray-400")}
             >
               Weekly
             </button>
             <button 
               onClick={() => setViewType("daily")}
               className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all", viewType === "daily" ? "bg-gray-100 text-gray-900" : "text-gray-400")}
             >
               Daily
             </button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-6 bg-gray-50 border-r border-b border-gray-100 w-32 shrink-0"></th>
                {days.map(day => (
                  <th key={day} className="p-6 bg-gray-50 border-b border-gray-100 text-sm font-black text-gray-900 uppercase tracking-widest min-w-[200px]">
                    {day}
                  </th>
                ) )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => {
                const isBreak = slot.includes("Break") || slot.includes("Lunch");
                
                return (
                  <tr key={slot}>
                    <td className="p-6 border-r border-b border-gray-50 text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-tight">{slot.split(" - ")[0]}</p>
                       <div className="w-1 h-4 bg-gray-100 mx-auto my-1 rounded-full" />
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-tight">{slot.split(" - ")[1]}</p>
                    </td>
                    {isBreak ? (
                      <td colSpan={5} className="p-4 bg-gray-50/50 border-b border-gray-50 text-center">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
                          {slot.includes("Break") ? "Recess / Break" : "Lunch Hour"}
                        </span>
                      </td>
                    ) : (
                      days.map(day => {
                        // Find entry for this day and slot
                        const entry = filteredEntries.find(e => e.day === day && e.startTime === slot.split(" - ")[0]);
                        
                        return (
                          <td 
                            key={`${day}-${slot}`} 
                            className="p-3 border-r border-b border-gray-50 group hover:bg-gray-50/50 transition-all cursor-pointer"
                            onClick={() => !entry && handleOpenModal(day, slot)}
                          >
                            {entry ? (
                              <div className={cn(
                                "p-4 rounded-2xl h-full border-l-4 shadow-sm group-hover:shadow-md transition-all relative",
                                entry.subject === "Mathematics" ? "bg-indigo-50 border-indigo-500" :
                                entry.subject === "English" ? "bg-emerald-50 border-emerald-500" :
                                entry.subject === "Science" ? "bg-amber-50 border-amber-500" :
                                "bg-blue-50 border-blue-500"
                              )}>
                                <div className="flex items-start justify-between mb-2">
                                   <div className={cn(
                                     "p-1.5 rounded-lg",
                                     entry.subject === "Mathematics" ? "bg-indigo-100 text-indigo-700" :
                                     entry.subject === "English" ? "bg-emerald-100 text-emerald-700" :
                                     entry.subject === "Science" ? "bg-amber-100 text-amber-700" :
                                     "bg-blue-100 text-blue-700"
                                   )}>
                                      <Bookmark className="w-3.5 h-3.5" />
                                   </div>
                                   <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); setIsModalOpen(true); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded-lg transition-all text-gray-400"
                                   >
                                      <MoreHorizontal className="w-4 h-4" />
                                   </button>
                                </div>
                                <h4 className="font-black text-gray-900 text-sm leading-tight mb-1">{entry.subject}</h4>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase">
                                      <User className="w-2.5 h-2.5" />
                                      {entry.teacherName}
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase">
                                      <MapPin className="w-2.5 h-2.5" />
                                      Room {entry.room}
                                   </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full w-full min-h-[80px] rounded-2xl border-2 border-dashed border-gray-50 group-hover:border-indigo-100 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Plus className="w-5 h-5 text-indigo-300" />
                              </div>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
               <h2 className="text-2xl font-black text-gray-900">{editingEntry?.id ? "Edit Entry" : "New Entry"}</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
               </button>
            </div>
            <form onSubmit={handleSaveEntry} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</label>
                     <select 
                       required
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       value={editingEntry?.subject || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, subject: e.target.value})}
                     >
                        <option value="">Select Subject</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teacher</label>
                     <select 
                       required
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       value={editingEntry?.teacherId || ""}
                       onChange={(e) => {
                         const t = staff.find(s => s.id === e.target.value);
                         setEditingEntry({...editingEntry, teacherId: t?.id, teacherName: t?.name});
                       }}
                     >
                        <option value="">Select Teacher</option>
                        {staff.filter(s => s.role.includes("Teacher")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Day</label>
                     <select 
                       required
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       value={editingEntry?.day || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, day: e.target.value})}
                     >
                        <option value="">Select Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</label>
                     <input 
                       required
                       type="text"
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       placeholder="e.g. 104"
                       value={editingEntry?.room || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, room: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</label>
                     <input 
                       required
                       type="text"
                       placeholder="08:00"
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       value={editingEntry?.startTime || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, startTime: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time</label>
                     <input 
                       required
                       type="text"
                       placeholder="09:00"
                       className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl font-bold"
                       value={editingEntry?.endTime || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, endTime: e.target.value})}
                     />
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  {editingEntry?.id && (
                    <button 
                      type="button" 
                      onClick={() => handleDelete(editingEntry.id!)}
                      className="px-6 py-4 rounded-2xl bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all flex-1"
                    >
                      Delete
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="px-6 py-4 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex-[2] shadow-xl shadow-gray-100"
                  >
                    {editingEntry?.id ? "Update Synchronization" : "Commit to Schedule"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Scanner & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm shrink-0">
               <AlertCircle className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-lg font-black text-rose-900 mb-1">Double Booking Detected</h4>
               <p className="text-sm font-bold text-rose-700/70 mb-4">Teacher Peter Okello is scheduled for Mathematics (P.5) and Science (P.7) on Monday at 09:00 AM.</p>
               <button className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">
                  Resolve Conflict
               </button>
            </div>
         </div>

         <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
               <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-lg font-black text-emerald-900 mb-1">Schedule Optimized</h4>
               <p className="text-sm font-bold text-emerald-700/70 mb-4">Class rosters are balanced. All core subjects meet the minimum weekly hour requirements specified in curriculum.</p>
               <div className="flex gap-2">
                 <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Mined Capacity</span>
                 <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Teacher Load OK</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

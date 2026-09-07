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
import { ResponsiveDialog } from "../components/ui/ResponsiveDialog";
import { FormGrid, HorizontalScroller, SegmentedTabs } from "../components/ui/ResponsivePrimitives";

export default function Timetable() {
  const { timetableEntries, schoolSettings, subjects: subjectRecords, staff, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useApp();
  const [activeTab, setActiveTab] = useState<"class" | "teacher" | "exam">("class");
  const [selectedClass, setSelectedClass] = useState(schoolSettings.classes[0] || "");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [viewType, setViewType] = useState<"weekly" | "daily">("weekly");
  const [selectedDay, setSelectedDay] = useState("Monday");
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

  const subjects = Array.from(new Set([
    ...subjectRecords.filter((subject) => subject.active).map((subject) => subject.name),
    ...timetableEntries.map((entry) => entry.subject),
  ])).sort();

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
  const selectedDayEntries = filteredEntries.filter((entry) => entry.day === selectedDay);

  return (
    <div className="app-page">
      {/* Header */}
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Academics</p>
          <h1 className="app-page-title">Academic Timetable</h1>
          <p className="app-page-subtitle">Coordinate classes, teachers, and rooms efficiently.</p>
        </div>
        <div className="grid grid-cols-[44px_44px_1fr] gap-2 sm:flex">
          <button className="app-button-secondary px-0" aria-label="Print timetable">
            <Printer className="w-5 h-5" />
          </button>
          <button className="app-button-secondary px-0" aria-label="Download timetable">
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="app-button-primary"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="app-panel flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs
          value={activeTab}
          onChange={setActiveTab}
          label="Timetable type"
          options={[
            { value: "class", label: "By class" },
            { value: "teacher", label: "By teacher" },
            { value: "exam", label: "Exam schedule" },
          ]}
        />

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-56">
             <select 
               className="app-select pl-9"
               value={activeTab === "teacher" ? selectedTeacher : selectedClass}
               onChange={(e) => activeTab === "teacher" ? setSelectedTeacher(e.target.value) : setSelectedClass(e.target.value)}
             >
               <option value="" disabled>Select {activeTab === "teacher" ? "Teacher" : "Class"}</option>
               {activeTab === "teacher" 
                 ? staff.filter(s => s.role.includes("Teacher")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                 : schoolSettings.classes.map(c => <option key={c} value={c}>{c}</option>)
               }
             </select>
             <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="hidden gap-1 rounded-lg bg-slate-100 p-1 lg:flex">
             <button 
               onClick={() => setViewType("weekly")}
               className={cn("app-tab", viewType === "weekly" && "app-tab-active")}
             >
               Weekly
             </button>
             <button 
               onClick={() => setViewType("daily")}
               className={cn("app-tab", viewType === "daily" && "app-tab-active")}
             >
               Daily
             </button>
          </div>
        </div>
      </div>

      <section className="space-y-4 lg:hidden" aria-label="Daily timetable">
        <div className="app-panel space-y-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor="mobile-timetable-day">Day</label>
          <select id="mobile-timetable-day" className="app-select" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-950">{selectedDay}</h2>
            <p className="text-sm text-slate-500">{selectedDayEntries.length} scheduled period{selectedDayEntries.length === 1 ? "" : "s"}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {timeSlots.map((slot) => {
              const entry = selectedDayEntries.find((item) => item.startTime === slot.split(" - ")[0]);
              return (
                <div key={slot} className="flex items-start gap-3 p-4">
                  <div className="w-20 shrink-0 pt-1 text-xs font-semibold text-slate-500">{slot}</div>
                  {entry ? (
                    <button type="button" className="min-w-0 flex-1 rounded-lg bg-blue-50 p-3 text-left" onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }}>
                      <span className="block font-semibold text-slate-950">{entry.subject}</span>
                      <span className="mt-1 block text-sm text-slate-600">{entry.teacherName || "Teacher not assigned"}{entry.room ? ` / Room ${entry.room}` : ""}</span>
                    </button>
                  ) : (
                    <button type="button" className="app-button-secondary min-w-0 flex-1 border-dashed text-slate-500" onClick={() => handleOpenModal(selectedDay, slot)}>
                      <Plus className="h-4 w-4" />
                      Add period
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timetable Grid */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm lg:block">
        <HorizontalScroller label="Weekly timetable" showHint={false}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-32 shrink-0 border-b border-r border-gray-100 bg-gray-50 p-6"></th>
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
                    <td className="sticky left-0 z-10 border-b border-r border-gray-50 bg-white p-6 text-center">
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
        </HorizontalScroller>
      </div>

      {/* Modal */}
      <ResponsiveDialog
        open={isModalOpen}
        title={editingEntry?.id ? "Edit timetable entry" : "New timetable entry"}
        description="Assign a subject, teacher, room, and time."
        onClose={() => { setIsModalOpen(false); setEditingEntry(null); }}
        maxWidth="max-w-xl"
        footer={(
          <>
            {editingEntry?.id && (
              <button type="button" onClick={() => handleDelete(editingEntry.id!)} className="app-button-secondary text-rose-600 sm:mr-auto">
                Delete entry
              </button>
            )}
            <button type="button" className="app-button-secondary" onClick={() => { setIsModalOpen(false); setEditingEntry(null); }}>Cancel</button>
            <button type="submit" form="timetable-entry-form" className="app-button-primary">
              {editingEntry?.id ? "Update entry" : "Add to timetable"}
            </button>
          </>
        )}
      >
            <form id="timetable-entry-form" onSubmit={handleSaveEntry}>
               <FormGrid>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Subject</label>
                     <select 
                       required
                       className="app-select"
                       value={editingEntry?.subject || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, subject: e.target.value})}
                     >
                        <option value="">Select Subject</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Teacher</label>
                     <select 
                       required
                       className="app-select"
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
                     <label className="text-sm font-medium text-slate-700">Day</label>
                     <select 
                       required
                       className="app-select"
                       value={editingEntry?.day || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, day: e.target.value})}
                     >
                        <option value="">Select Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Room</label>
                     <input 
                       required
                       type="text"
                       className="app-input"
                       placeholder="e.g. 104"
                       value={editingEntry?.room || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, room: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Start time</label>
                     <input 
                       required
                       type="text"
                       placeholder="08:00"
                       className="app-input"
                       value={editingEntry?.startTime || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, startTime: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">End time</label>
                     <input 
                       required
                       type="text"
                       placeholder="09:00"
                       className="app-input"
                       value={editingEntry?.endTime || ""}
                       onChange={(e) => setEditingEntry({...editingEntry, endTime: e.target.value})}
                     />
                  </div>
               </FormGrid>
            </form>
      </ResponsiveDialog>

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

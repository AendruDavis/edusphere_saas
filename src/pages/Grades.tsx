import React, { useState } from "react";
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  History,
  Save,
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { Student, Mark } from "../types";

export default function Grades() {
  const { students, marks, addMark, updateMark, deleteMark, schoolSettings } = useApp();
  const [activeTab, setActiveTab] = useState<"entry" | "reports" | "analytics">("entry");
  const [selectedClass, setSelectedClass] = useState(schoolSettings.classes[0] || "");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [marksToUpdate, setMarksToUpdate] = useState<{[studentId: string]: string}>({});

  const filteredStudents = students.filter(s => 
    s.class === selectedClass && 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.reg.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subjects = ["Mathematics", "English", "Science", "Social Studies", "Religious Education", "Swahili", "Art & Craft", "Physical Education"];

  const handleSaveMarks = async () => {
    Object.entries(marksToUpdate).forEach(async ([studentId, score]) => {
      if (score === "") return;
      const existingMark = marks.find(m => m.studentId === studentId && m.subject === selectedSubject && m.term === selectedTerm);
      if (existingMark) {
        await updateMark(existingMark.id, { score: Number(score) });
      } else {
        await addMark({
          studentId,
          subject: selectedSubject,
          score: Number(score),
          term: selectedTerm,
          date: new Date().toISOString().split('T')[0]
        });
      }
    });
    setMarksToUpdate({});
    alert("Marks saved successfully!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Academic Records</h1>
          <p className="text-gray-500 font-medium tracking-tight">Rapid assessment capturing and automated report generation.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "entry" && (
            <button 
              onClick={handleSaveMarks}
              className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-100 uppercase tracking-[0.2em] text-[10px]"
            >
              <Save className="w-5 h-5" />
              Commit Batch
            </button>
          )}
          {activeTab === "reports" && (
            <button className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200 uppercase tracking-[0.2em] text-[10px]">
              <Download className="w-5 h-5" />
              Parallel Export
            </button>
          )}
        </div>
      </div>

      {/* Optimized Control Center */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-wrap items-center gap-4">
            <div className="bg-gray-100 p-1 rounded-2xl inline-flex shadow-inner">
              {(["entry", "reports", "analytics"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-8 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest whitespace-nowrap",
                    activeTab === tab 
                      ? "bg-white text-gray-900 shadow-md scale-105" 
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {tab === "entry" ? "Marks Matrix" : tab === "reports" ? "Report Terminal" : "Class Analytics"}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl">
               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedTerm} Control Active</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Grade Level</label>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
              <select 
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-[1.5rem] font-black text-gray-900 focus:ring-4 focus:ring-indigo-100 transition-all appearance-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {schoolSettings.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Subject Domain</label>
            <div className="relative group">
              <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <select 
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-[1.5rem] font-black text-gray-900 focus:ring-4 focus:ring-emerald-100 transition-all appearance-none"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Identifier Filter</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Query name, registration or tag..." 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-[1.5rem] font-black text-gray-900 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Entry Matrix */}
      {activeTab === "entry" && (
        <div className="bg-white rounded-[48px] border border-gray-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-white rounded-3xl shadow-sm text-indigo-600">
                   <FileText className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-gray-900">Mark Matrix: {selectedSubject}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedClass} • {filteredStudents.length} Students Detected</p>
                </div>
             </div>
             <div className="hidden lg:flex items-center gap-6">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-gray-400 uppercase">Input Mode</span>
                   <span className="text-xs font-black text-emerald-600">Manual Direct Sync</span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
             </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white">Student Account</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white text-center">Reference</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white text-center w-48">Score Vector</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white text-center">Grade Level</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white text-right">Commit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((student) => {
                const mark = marks.find(m => m.studentId === student.id && m.subject === selectedSubject && m.term === selectedTerm);
                const score = marksToUpdate[student.id] !== undefined ? marksToUpdate[student.id] : (mark?.score || "");
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-3xl bg-white border border-gray-100 flex items-center justify-center text-gray-900 font-black text-lg uppercase shadow-sm group-hover:scale-110 transition-transform">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight uppercase tracking-tighter">{student.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Class Rosters {student.class}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center font-black text-gray-300 uppercase tracking-widest text-xs">
                      {student.reg}
                    </td>
                    <td className="px-10 py-8">
                      <div className="relative max-w-[120px] mx-auto">
                        <input 
                          type="number" 
                          max="100" 
                          min="0"
                          placeholder="--"
                          className="w-full px-6 py-4 bg-white border-2 border-transparent group-hover:border-indigo-100 rounded-2xl text-center font-black text-2xl text-indigo-600 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all"
                          value={score}
                          onChange={(e) => setMarksToUpdate({...marksToUpdate, [student.id]: e.target.value})}
                        />
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <span className={cn(
                        "px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm",
                        Number(score) >= 80 ? "bg-emerald-50 text-emerald-600" :
                        Number(score) >= 60 ? "bg-blue-50 text-blue-600" :
                        Number(score) >= 40 ? "bg-amber-50 text-amber-600" :
                        score === "" ? "bg-gray-50 text-gray-400" : "bg-rose-50 text-rose-600"
                      )}>
                        {Number(score) >= 80 ? "D1" : Number(score) >= 70 ? "D2" : Number(score) >= 60 ? "C3" : Number(score) >= 50 ? "C4" : Number(score) >= 40 ? "C5" : score === "" ? "--" : "F9"}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      {mark || marksToUpdate[student.id] ? (
                        <div className="flex items-center justify-end gap-2 text-emerald-500">
                           <span className="text-[8px] font-black uppercase">Captured</span>
                           <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 text-gray-200">
                           <span className="text-[8px] font-black uppercase text-gray-300">Pending</span>
                           <AlertCircle className="w-6 h-6" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="py-40 text-center text-gray-300 font-black uppercase tracking-[0.5em] italic opacity-50">
              <Search className="w-20 h-20 mx-auto mb-6 opacity-10" />
              Roster Selection Empty
            </div>
          )}
        </div>
      )}

      {/* Reports Terminal */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 flex flex-col gap-2">
                 <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                    <Download className="w-5 h-5" />
                 </button>
                 <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                    <FileText className="w-5 h-5" />
                 </button>
              </div>

              <div className="mb-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-black text-2xl uppercase mb-4">
                   {student.name.charAt(0)}
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{student.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{student.reg}</p>
              </div>

              <div className="space-y-4">
                 <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Average Score</p>
                      <p className="text-xl font-black text-gray-900">74.5%</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                       <TrendingUp className="w-5 h-5" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Position</p>
                       <p className="text-lg font-black text-blue-900">08 / 45</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Grade</p>
                       <p className="text-lg font-black text-emerald-900">Div 1</p>
                    </div>
                 </div>
              </div>

              <button className="w-full mt-8 py-4 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]">
                <Award className="w-4 h-4 text-amber-400" />
                View Detailed Report
              </button>
            </div>
          ))}
          {filteredStudents.length === 0 && (
            <div className="py-40 col-span-full text-center text-gray-300 font-black uppercase tracking-[0.5em] italic opacity-50">
              Roster Selection Empty
            </div>
          )}
        </div>
      )}

      {/* Analytics Terminal */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-900">Performance Over Time</h3>
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Average</span>
                  </div>
                </div>
                <div className="h-64 flex items-end justify-between gap-4 px-4">
                  {[45, 62, 58, 81, 75, 92, 88].map((h, i) => (
                    <div key={i} className="flex-1 space-y-4 flex flex-col items-center group">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-md mb-2">
                        {h}%
                      </div>
                      <div 
                        className="w-full bg-indigo-50 rounded-t-xl group-hover:bg-indigo-600 transition-all duration-500 relative" 
                        style={{ height: `${h}%` }}
                      >
                         <div className="absolute top-0 left-0 w-full h-1 bg-white/20 rounded-full" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Week {i+1}</p>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
                <div>
                   <h3 className="text-xl font-black mb-2 opacity-90">Best Performing Subject</h3>
                   <p className="text-4xl font-black mb-6">Mathematics</p>
                   <div className="inline-flex items-center gap-2 bg-indigo-500 px-3 py-1.5 rounded-full">
                      <Trophy className="w-4 h-4 text-amber-300" />
                      <span className="text-xs font-black uppercase tracking-widest">82.4% Average</span>
                   </div>
                </div>
                
                <div className="mt-8 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Top Performers</p>
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold">1. Sarah Nabirye</span>
                         <span className="text-sm font-black">98%</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold">2. John Mukasa</span>
                         <span className="text-sm font-black">95%</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold">3. Peter Okello</span>
                         <span className="text-sm font-black">92%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Class Average", value: "68.2%", icon: TrendingUp, color: "blue", trend: "+2.4%" },
              { label: "Passed (50%+)", value: "32 / 45", icon: CheckCircle2, color: "emerald", trend: "71%" },
              { label: "At Risk (<40%)", value: "05 / 45", icon: AlertCircle, color: "rose", trend: "11%" },
              { label: "Pending Marks", value: "12 Students", icon: History, color: "amber", trend: "8 subjects" },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  <p className={cn("text-[10px] font-black uppercase mt-2", 
                    stat.color === "emerald" ? "text-emerald-600" : 
                    stat.color === "rose" ? "text-rose-600" : "text-indigo-600"
                  )}>
                    {stat.trend} this term
                  </p>
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", 
                  stat.color === "blue" ? "bg-blue-50 text-blue-600" :
                  stat.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                  stat.color === "rose" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                )}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

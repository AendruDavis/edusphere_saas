import React, { useState } from "react";
import { 
  BookOpen, 
  GraduationCap, 
  FileCheck, 
  Search, 
  Download, 
  Printer, 
  MoreVertical,
  Plus,
  ArrowRight,
  BookMarked,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";

export default function Academics() {
  const { students, marks, addMark, schoolSettings } = useApp();
  const [activeTab, setActiveTab] = useState<"classes" | "marks" | "reports">("classes");
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [markForm, setMarkForm] = useState({
    subject: "Mathematics",
    score: 0,
    term: "Term 1",
    year: schoolSettings.academicYear,
    comment: ""
  });

  const getGrade = (score: number) => {
    if (!schoolSettings.gradingScale) return { grade: "N/A", comment: "" };
    const scale = [...schoolSettings.gradingScale].sort((a, b) => b.min - a.min);
    for (const g of scale) {
      if (score >= g.min) return g;
    }
    return { grade: "F", comment: "Poor" };
  };

  const handleMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const gradeInfo = getGrade(markForm.score);
    await addMark({
      ...markForm,
      studentId: selectedStudentId,
      comment: markForm.comment || gradeInfo.comment
    });
    setIsMarkModalOpen(false);
  };

  const handleGenerateReports = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const classes = [
    { name: "S.1", level: "Secondary" },
    { name: "S.2", level: "Secondary" },
    { name: "P.7", level: "Primary" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Academic Hub</h2>
          <p className="text-gray-500 text-sm">Control curriculum, classes, exams, and dynamic report card generation.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMarkModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            Enter Marks
          </button>
          <button 
            onClick={handleGenerateReports}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
          >
            <FileCheck className="w-4 h-4" />
            {isGenerating ? "Processing..." : "Generate Reports"}
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-100 gap-8">
        {(["classes", "marks", "reports"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab === "classes" && (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {(schoolSettings.classes || []).map(cls => (
              <div key={cls} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class</span>
                </div>
                <h4 className="text-xl font-black text-gray-900">{cls}</h4>
                <p className="text-gray-400 text-xs font-bold uppercase mb-6 tracking-tighter">
                  {students.filter(s => s.class === cls).length} Students Enrolled
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <button className="text-xs font-black text-blue-600 hover:underline uppercase tracking-widest">View Roster</button>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "marks" && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marks.map(m => {
                  const student = students.find(s => s.id === m.studentId);
                  const grade = getGrade(m.score);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-black">{student?.name || "Unknown"}</td>
                      <td className="px-6 py-4 font-bold uppercase">{m.subject}</td>
                      <td className="px-6 py-4 text-gray-500">{m.term}</td>
                      <td className="px-6 py-4 font-black text-blue-600">{m.score}%</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 rounded font-black">{grade.grade}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-white font-black">
                    {s.name[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900">{s.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.class}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px] uppercase transition-all hover:bg-blue-600 hover:text-white">
                  <Printer className="w-3 h-3" />
                  Print Report
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Academic Insights
            </h3>
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                  <span>General GPA</span>
                  <span className="text-emerald-400">72.4%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 w-[72.4%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                  <span>Term Coverage</span>
                  <span className="text-blue-400">85%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 w-[85%]" />
                </div>
              </div>
            </div>
            <button className="w-full py-2.5 bg-white/5 border border-white/10 rounded-2xl mt-8 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10">
              Generate Faculty Audit
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Quick Links</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <BookMarked className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-gray-900">Curriculum Map</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-900">Exam Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Marks Modal */}
      {isMarkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Academic Mark Entry</h3>
                <p className="text-gray-400 text-xs">Record student performance results</p>
              </div>
              <button onClick={() => setIsMarkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleMarkSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Student</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <input type="text" value={markForm.subject} onChange={(e) => setMarkForm({...markForm, subject: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Score (%)</label>
                  <input type="number" value={markForm.score} onChange={(e) => setMarkForm({...markForm, score: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Term</label>
                  <select value={markForm.term} onChange={(e) => setMarkForm({...markForm, term: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm">
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Year</label>
                  <input type="text" value={markForm.year} onChange={(e) => setMarkForm({...markForm, year: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Teacher Comment (Optional)</label>
                <textarea value={markForm.comment} onChange={(e) => setMarkForm({...markForm, comment: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" rows={2} />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-black rounded-xl mt-6 hover:bg-blue-700 transition-all active:scale-95">Verify & Record Mark</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

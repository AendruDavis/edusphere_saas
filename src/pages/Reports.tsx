import React, { useState, useMemo, useRef } from "react";
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  CheckCircle2, 
  GraduationCap, 
  Receipt,
  PenTool,
  Clock,
  ArrowDownToLine,
  X,
  Send,
  Calendar,
  Layers,
  Award,
  AlertCircle
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { Student, Mark, AttendanceRecord } from "../types";

export default function Reports() {
  const { schoolSettings, students, marks, attendanceRecords, currentUser } = useApp();
  const [reportType, setReportType] = useState<"invoice" | "report-card">("report-card");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Set initial student if currentUser is a student
  React.useEffect(() => {
    if (currentUser?.role === "student") {
      const student = students.find(s => s.email === currentUser.email);
      if (student) setSelectedStudent(student);
    }
  }, [currentUser, students]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedYear, setSelectedYear] = useState(schoolSettings.academicYear || "2026/2027");
  const [isSending, setIsSending] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.reg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const studentData = useMemo(() => {
    if (!selectedStudent) return null;

    const studentMarks = marks.filter(m => 
      m.studentId === selectedStudent.id && 
      m.term === selectedTerm && 
      m.year === selectedYear
    );

    const studentAttendance = attendanceRecords.filter(a => 
      a.studentId === selectedStudent.id && 
      a.date.startsWith(selectedYear.split('/')[0]) // Simplified logic for year
    );

    const totalDays = studentAttendance.length;
    const daysPresent = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;
    const attendancePercentage = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100;

    const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
    const averageScore = studentMarks.length > 0 ? Math.round(totalScore / studentMarks.length) : 0;

    return {
      marks: studentMarks,
      attendance: {
        total: totalDays,
        present: daysPresent,
        percentage: attendancePercentage
      },
      stats: {
        total: totalScore,
        average: averageScore,
        count: studentMarks.length
      }
    };
  }, [selectedStudent, selectedTerm, selectedYear, marks, attendanceRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendDigitally = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      alert(`Report card sent to ${selectedStudent?.name}'s parent portal.`);
    }, 1500);
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "D1", comment: "Excellent" };
    if (score >= 80) return { grade: "D2", comment: "Very Good" };
    if (score >= 70) return { grade: "C3", comment: "Good" };
    if (score >= 60) return { grade: "C4", comment: "Credit" };
    if (score >= 55) return { grade: "C5", comment: "Fair" };
    if (score >= 50) return { grade: "C6", comment: "Pass" };
    if (score >= 45) return { grade: "P7", comment: "Weak Pass" };
    if (score >= 40) return { grade: "P8", comment: "Weak" };
    return { grade: "F9", comment: "Fail" };
  };

  return (
    <div className="space-y-8 print:space-y-0 print:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">Reports & Digital Portals</h2>
          <p className="text-gray-500 text-sm">Design, generate and distribute student academic documents.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 print:hidden">
        <button 
          onClick={() => { setReportType("report-card"); setSelectedStudent(null); }}
          className={cn(
            "flex-1 p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4",
            reportType === "report-card" ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100" : "border-gray-100 bg-white hover:border-gray-200"
          )}
        >
          <div className={cn("p-4 rounded-2xl", reportType === "report-card" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 uppercase tracking-tighter">Academic Reports</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Synced with Exam Scores</p>
          </div>
        </button>
        <button 
          onClick={() => { setReportType("invoice"); setSelectedStudent(null); }}
          className={cn(
            "flex-1 p-6 rounded-[2rem] border-2 transition-all text-left flex items-start gap-4",
            reportType === "invoice" ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100" : "border-gray-100 bg-white hover:border-gray-200"
          )}
        >
          <div className={cn("p-4 rounded-2xl", reportType === "invoice" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 uppercase tracking-tighter">Fee Statements</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Financial Reconciliation</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10">
        {/* Sidebar Selector */}
        {currentUser?.role !== "student" && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 lg:h-fit print:hidden">
          <div className="space-y-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Academic Period</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedTerm} 
                    onChange={e => setSelectedTerm(e.target.value)}
                    className="flex-1 bg-gray-50 border-none rounded-xl text-xs font-bold px-4 py-2 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </div>
             </div>
             
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Find student..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-50" 
                />
             </div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Candidate List ({filteredStudents.length})</h4>
            {filteredStudents.map(s => (
              <button 
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={cn(
                  "w-full p-4 rounded-3xl border-2 text-left transition-all relative group",
                  selectedStudent?.id === s.id ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-100" : "border-transparent hover:bg-gray-50"
                )}
              >
                <p className="text-sm font-black text-gray-900 group-hover:translate-x-1 transition-transform">{s.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-blue-600 font-black uppercase bg-blue-100 px-2 py-0.5 rounded-full">{s.reg}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{s.class}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Report Preview */}
        <div className={cn("lg:col-span-3", currentUser?.role === "student" && "lg:col-span-4")}>
          {selectedStudent ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[800px] print:border-none print:shadow-none">
              <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                      <Layers className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-xs font-black text-gray-900 uppercase">Live Document Engine</p>
                      <p className="text-[10px] text-gray-500 font-bold">Standard A4 Layout Ready</p>
                   </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSendDigitally}
                    disabled={isSending}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-900 text-xs font-black rounded-2xl hover:bg-gray-50 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                  >
                    {isSending ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-blue-600" />
                    )}
                    Send Digitally
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest"
                  >
                    <Printer className="w-4 h-4" />
                    Generate PDF
                  </button>
                </div>
              </div>

              {/* The "PDF" Content - Optimized for Print */}
              <div id="print-area" className="p-16 space-y-16 bg-white print:p-0 print:space-y-10" ref={reportRef}>
                {/* School Header */}
                <div className="flex justify-between items-start border-b-4 border-gray-900 pb-10">
                  <div className="flex items-center gap-6">
                    {schoolSettings.logo ? (
                      <img src={schoolSettings.logo} alt="Logo" className="w-24 h-24 object-contain" />
                    ) : (
                      <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl">ES</div>
                    )}
                    <div className="space-y-1">
                      <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">{schoolSettings.name}</h1>
                      <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">{schoolSettings.address || "Main Campus, Kampala Uganda"}</p>
                      <p className="text-xs text-gray-400 font-bold font-mono">Tel: {schoolSettings.phone || "+256 700 000 000"} • Email: {schoolSettings.email || "info@school.edu"}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-3xl font-black text-blue-600 uppercase tracking-tighter">
                      {reportType === "report-card" ? "Report Card" : "Fee Statement"}
                    </div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest transition-all">Serial Code: {selectedStudent.reg.replace('-', '')}-{Math.floor(Math.random()*10000)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-12 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Student Information</h4>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{selectedStudent.name}</p>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedStudent.reg}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Class & Period</h4>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{selectedStudent.class}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedTerm} • {selectedYear}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Digital Date</h4>
                    <p className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>

                {reportType === "report-card" ? (
                  <div className="space-y-10">
                    {/* Performance Table */}
                    <div className="overflow-hidden rounded-[2rem] border border-gray-100">
                      <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white">
                          <tr>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest">Subject Detail</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">Score /100</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-center">Grade</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-right">Teacher Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {studentData?.marks.map((mark) => {
                            const { grade, comment } = getGrade(mark.score);
                            return (
                              <tr key={mark.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-5 font-black text-gray-900 uppercase tracking-tighter">{mark.subject}</td>
                                <td className="px-8 py-5 text-center text-xl font-black text-gray-900">{mark.score}</td>
                                <td className="px-8 py-5 text-center">
                                  <span className={cn(
                                    "px-4 py-1 rounded-lg font-black text-sm",
                                    mark.score >= 80 ? "bg-emerald-50 text-emerald-600" :
                                    mark.score >= 50 ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                                  )}>{grade}</span>
                                </td>
                                <td className="px-8 py-5 text-right text-xs font-bold text-gray-400 italic">
                                  {mark.comment || comment}
                                </td>
                              </tr>
                            );
                          })}
                          {(!studentData || studentData.marks.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-8 py-20 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-30">
                                   <AlertCircle className="w-12 h-12" />
                                   <p className="font-black uppercase tracking-widest text-sm">No Academic Records for this Period</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-6">
                       <div className="p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-100 flex flex-col justify-between h-32">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Total Score</p>
                          <div className="flex items-end justify-between">
                             <h4 className="text-4xl font-black">{studentData?.stats.total}</h4>
                             <Award className="w-8 h-8 opacity-40" />
                          </div>
                       </div>
                       <div className="p-6 bg-white border border-gray-100 rounded-[2rem] flex flex-col justify-between h-32">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Term Average</p>
                          <div className="flex items-end justify-between">
                             <h4 className="text-4xl font-black text-gray-900">{studentData?.stats.average}%</h4>
                             <CheckCircle2 className="w-8 h-8 text-emerald-100" />
                          </div>
                       </div>
                       <div className="p-6 bg-white border border-gray-100 rounded-[2rem] flex flex-col justify-between h-32">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Attendance</p>
                          <div className="flex items-end justify-between">
                             <h4 className="text-4xl font-black text-gray-900">{studentData?.attendance.percentage}%</h4>
                             <Clock className="w-8 h-8 text-blue-100" />
                          </div>
                       </div>
                       <div className="p-6 bg-gray-900 text-white rounded-[2rem] flex flex-col justify-between h-32">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Subjects</p>
                          <h4 className="text-4xl font-black">{studentData?.stats.count}</h4>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="overflow-hidden rounded-[2rem] border border-gray-100">
                      <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white">
                          <tr>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest">Fees Category</th>
                            <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-right">Value (UGX)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-bold text-gray-600">
                          <tr>
                            <td className="px-8 py-6">Tuition & Development Fees</td>
                            <td className="px-8 py-6 text-right font-black text-gray-900">{formatCurrency(1200000, schoolSettings.currency || "UGX")}</td>
                          </tr>
                          <tr>
                            <td className="px-8 py-6 text-emerald-600 font-black">Payments Received</td>
                            <td className="px-8 py-6 text-right font-black text-emerald-600">( {formatCurrency(selectedStudent.totalFeesPaid || 0, schoolSettings.currency || "UGX")} )</td>
                          </tr>
                          <tr className="bg-rose-50 text-rose-600">
                            <td className="px-8 py-8 text-xl font-black uppercase tracking-tighter">Outstanding Balance</td>
                            <td className="px-8 py-8 text-right text-3xl font-black tracking-tighter">{formatCurrency(selectedStudent.feesBalance || 0, schoolSettings.currency || "UGX")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100">
                       <p className="text-xs font-bold text-amber-800 leading-relaxed italic">
                         Note: Please ensure all outstanding balances are cleared by the next school registration date to avoid service interruption. Digital receipts for all payments are available on the parent portal.
                       </p>
                    </div>
                  </div>
                )}

                {/* Validation Footer */}
                <div className="pt-20 flex justify-between items-end">
                  <div className="space-y-12">
                    <div className="w-48 h-px bg-gray-900"></div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">Head Teacher's Approval</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">EduSphere Certified Seal</p>
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="relative inline-block">
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 opacity-40 mix-blend-multiply flex items-center justify-center -rotate-6">
                         <div className="font-serif text-5xl italic text-blue-900 pointer-events-none select-none">M. George</div>
                      </div>
                      <div className="w-64 h-px bg-gray-900 mx-auto"></div>
                    </div>
                    <div>
                      <p className="font-black text-gray-900 uppercase tracking-tighter">Principal Principal</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Academic Board Authority</p>
                    </div>
                  </div>
                </div>

                <div className="pt-16 border-t border-gray-100 text-center opacity-30">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">
                    Generated by EduSphere Digital Academic Engine • Document ID: 9283-X921-PL02 • Strictly Confidential
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-gray-100 h-full min-h-[700px] flex flex-col items-center justify-center text-center p-12 space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-300">
                <FileText className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Console Idle</h3>
                <p className="text-sm text-gray-400 max-w-xs font-bold leading-relaxed lowercase">
                   Select a student from the candidate list to boot the academic document engine and preview their report.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}


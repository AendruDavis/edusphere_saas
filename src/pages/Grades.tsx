import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileText,
  Filter,
  Lock,
  Plus,
  Save,
  Search,
  ShieldCheck,
  TrendingUp,
  Unlock,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Mark } from "../types";

type Draft = {
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  examScore: string;
  teacherInitials: string;
};

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
  "CRE",
  "Agriculture",
  "Computer Studies",
  "Entrepreneurship",
];

const TERMS = ["Term 1", "Term 2", "Term 3"];

function scoreToString(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function draftFromMark(mark?: Mark): Draft {
  return {
    a1: scoreToString(mark?.a1 ?? mark?.score),
    a2: scoreToString(mark?.a2 ?? mark?.score),
    a3: scoreToString(mark?.a3 ?? mark?.score),
    a4: scoreToString(mark?.a4 ?? mark?.score),
    examScore: scoreToString(mark?.examScore ?? mark?.score),
    teacherInitials: mark?.teacherInitials || "",
  };
}

function numberOrNull(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function roundScore(value: number | null) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function calculateDraft(draft: Draft, model: "competency_3" | "percentage_100") {
  const assessmentScores = [draft.a1, draft.a2, draft.a3, draft.a4].map(numberOrNull).filter((value): value is number => value !== null);
  const avg = assessmentScores.length ? assessmentScores.reduce((sum, value) => sum + value, 0) / assessmentScores.length : null;
  const examScore = numberOrNull(draft.examScore);
  const maxAssessmentScore = model === "competency_3" ? 3 : 100;
  const coursework = avg === null ? null : (avg / maxAssessmentScore) * 20;
  const examWeighted = examScore === null ? null : examScore * 0.8;
  const finalScore = coursework === null || examWeighted === null ? null : coursework + examWeighted;

  return {
    avg: roundScore(avg),
    identifier: model === "competency_3" && avg !== null ? Math.round(avg) : null,
    twenty: roundScore(coursework),
    eighty: roundScore(examWeighted),
    finalScore: roundScore(finalScore),
  };
}

function gradeFromScale(score: number | null, scale: { min: number; grade: string; comment: string }[] | undefined) {
  if (score === null) return { grade: "--", comment: "Pending" };
  const sorted = [...(scale || [])].sort((a, b) => b.min - a.min);
  return sorted.find((entry) => score >= entry.min) || { grade: "--", comment: "Unconfigured" };
}

function gradeBadge(score: number | null) {
  if (score === null) return "bg-gray-50 text-gray-400";
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 70) return "bg-blue-50 text-blue-700";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  if (score >= 50) return "bg-orange-50 text-orange-700";
  return "bg-rose-50 text-rose-700";
}

export default function Grades() {
  const { students, marks, addMark, updateMark, schoolSettings, currentUser } = useApp();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"entry" | "reports" | "analytics">("entry");
  const [selectedClass, setSelectedClass] = useState(schoolSettings.classes[0] || "");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedYear, setSelectedYear] = useState(schoolSettings.academicYear || "2026/2027");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [extraSubjects, setExtraSubjects] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const assessmentModel = schoolSettings.assessmentModel || "percentage_100";
  const courseworkMax = assessmentModel === "competency_3" ? 3 : 100;

  const subjects = useMemo(() => Array.from(new Set([...DEFAULT_SUBJECTS, ...marks.map((mark) => mark.subject), ...extraSubjects])).sort(), [extraSubjects, marks]);
  const selectedMarks = marks.filter((mark) => mark.subject === selectedSubject && mark.term === selectedTerm && mark.year === selectedYear);
  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return student.class === selectedClass && (student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query));
  });

  const studentMark = (studentId: string) => selectedMarks.find((mark) => mark.studentId === studentId);
  const canUnlock = currentUser?.role === "admin";

  const updateDraft = (studentId: string, field: keyof Draft, value: string, mark?: Mark) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...draftFromMark(mark),
        ...current[studentId],
        [field]: value,
      },
    }));
  };

  const addCustomSubject = () => {
    const subject = customSubject.trim();
    if (!subject) return;
    setExtraSubjects((current) => (current.includes(subject) ? current : [...current, subject]));
    setSelectedSubject(subject);
    setCustomSubject("");
  };

  const handleSaveMarks = async () => {
    try {
      const entries = Object.entries(drafts) as Array<[string, Draft]>;
      let saved = 0;
      for (const [studentId, draft] of entries) {
        const computed = calculateDraft(draft, assessmentModel);
        if (computed.finalScore === null) continue;
        const existingMark = studentMark(studentId);
        if (existingMark?.locked && currentUser?.role !== "admin") continue;

        const payload = {
          studentId,
          subject: selectedSubject,
          term: selectedTerm,
          year: selectedYear,
          score: computed.finalScore,
          a1: numberOrNull(draft.a1),
          a2: numberOrNull(draft.a2),
          a3: numberOrNull(draft.a3),
          a4: numberOrNull(draft.a4),
          examScore: numberOrNull(draft.examScore),
          teacherInitials: draft.teacherInitials.trim() || null,
        };

        if (existingMark) {
          await updateMark(existingMark.id, payload);
        } else {
          await addMark(payload);
        }
        saved += 1;
      }

      setDrafts({});
      toast.success(`${saved} mark ${saved === 1 ? "record" : "records"} saved.`);
    } catch (error: any) {
      toast.error(error.message || "Could not save marks.");
    }
  };

  const handleToggleLock = async (mark: Mark) => {
    try {
      await updateMark(mark.id, { locked: !mark.locked });
      toast.success(mark.locked ? "Mark reopened for editing." : "Mark locked after submission.");
    } catch (error: any) {
      toast.error(error.message || "Could not update mark status.");
    }
  };

  const classAverage = selectedMarks.length
    ? selectedMarks.reduce((sum, mark) => sum + Number(mark.score || 0), 0) / selectedMarks.length
    : null;

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Academics</p>
          <h1 className="app-page-title">Academic Records</h1>
          <p className="app-page-subtitle">Capture coursework assessments and exam scores using the school's configured calculation policy.</p>
        </div>
        {activeTab === "entry" && (
          <button
            onClick={handleSaveMarks}
            disabled={Object.keys(drafts).length === 0}
            className="app-button-primary"
          >
            <Save className="h-5 w-5" />
            Commit Batch
          </button>
        )}
      </div>

      <div className="app-panel space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {(["entry", "reports", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "app-tab whitespace-nowrap",
                  activeTab === tab && "app-tab-active",
                )}
              >
                {tab === "entry" ? "Marks Matrix" : tab === "reports" ? "Report Terminal" : "Class Analytics"}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="app-badge bg-blue-50 text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Backend RBAC + audit active
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="space-y-3">
            <label className="ml-1 text-sm font-semibold text-slate-700">Class</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
              <select className="app-select appearance-none pl-10" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
                {schoolSettings.classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Subject</label>
            <div className="relative">
              <Award className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <select className="w-full appearance-none rounded-[1.5rem] border-none bg-gray-50 py-4 pl-10 pr-4 font-black text-gray-900 transition-all focus:ring-4 focus:ring-emerald-100" value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Term</label>
            <select className="w-full rounded-[1.5rem] border-none bg-gray-50 px-4 py-4 font-black text-gray-900 transition-all focus:ring-4 focus:ring-blue-100" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)}>
              {TERMS.map((term) => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Year</label>
            <input className="w-full rounded-[1.5rem] border-none bg-gray-50 px-4 py-4 font-black text-gray-900 transition-all focus:ring-4 focus:ring-blue-100" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} />
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input className="w-full rounded-[1.5rem] border-none bg-gray-50 py-4 pl-12 pr-4 font-black text-gray-900 placeholder:text-gray-300 focus:ring-4 focus:ring-blue-100" placeholder="Name or reg..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl bg-gray-50 p-4 sm:flex-row sm:items-center">
          <input className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:ring-4 focus:ring-indigo-100" placeholder="Add a custom subject for this class..." value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} />
          <button onClick={addCustomSubject} className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-gray-800">
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        </div>
      </div>

      {activeTab === "entry" && (
        <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-white p-4 text-indigo-600 shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Mark Matrix: {selectedSubject}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{selectedClass} / {selectedTerm} / {selectedYear} / {filteredStudents.length} students</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
              <Metric label="Captured" value={`${selectedMarks.length}`} tone="text-emerald-600" />
              <Metric label="Locked" value={`${selectedMarks.filter((mark) => mark.locked).length}`} tone="text-indigo-600" />
              <Metric label="Average" value={classAverage === null ? "--" : `${classAverage.toFixed(1)}%`} tone="text-gray-900" />
              <Metric label="Drafts" value={`${Object.keys(drafts).length}`} tone="text-amber-600" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="bg-white">
                  {["Student", "Reg", "A1", "A2", "A3", "A4", "AVG", "IDF", "EXAM", "20%", "80%", "100%", "Grade", "Init", "Status"].map((heading) => (
                    <th key={heading} className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 first:px-8 first:text-left">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((student) => {
                  const mark = studentMark(student.id);
                  const draft = { ...draftFromMark(mark), ...drafts[student.id] };
                  const computed = calculateDraft(draft, assessmentModel);
                  const grade = gradeFromScale(computed.finalScore, schoolSettings.gradingScale);
                  const isLocked = Boolean(mark?.locked);
                  const lockedForUser = isLocked && !canUnlock;

                  return (
                    <tr key={student.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black uppercase tracking-tight text-gray-900">{student.name}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{student.class}</p>
                      </td>
                      <td className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-gray-400">{student.reg}</td>
                      {(["a1", "a2", "a3", "a4"] as const).map((field) => (
                        <td key={field} className="px-2 py-5 text-center">
                          <ScoreInput max={courseworkMax} step={assessmentModel === "competency_3" ? 0.1 : 1} disabled={lockedForUser} value={draft[field]} onChange={(value) => updateDraft(student.id, field, value, mark)} />
                        </td>
                      ))}
                      <td className="px-4 py-5 text-center text-sm font-black text-gray-700">{computed.avg ?? "--"}</td>
                      <td className="px-4 py-5 text-center text-sm font-black text-gray-700">{computed.identifier ?? "--"}</td>
                      <td className="px-2 py-5 text-center">
                        <ScoreInput max={100} step={1} disabled={lockedForUser} value={draft.examScore} onChange={(value) => updateDraft(student.id, "examScore", value, mark)} />
                      </td>
                      <td className="px-4 py-5 text-center text-sm font-black text-gray-500">{computed.twenty ?? "--"}</td>
                      <td className="px-4 py-5 text-center text-sm font-black text-gray-500">{computed.eighty ?? "--"}</td>
                      <td className="px-4 py-5 text-center text-lg font-black text-indigo-700">{computed.finalScore ?? "--"}</td>
                      <td className="px-4 py-5 text-center">
                        <span className={cn("inline-flex min-w-14 justify-center rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest", gradeBadge(computed.finalScore))}>{grade.grade}</span>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">{grade.comment}</p>
                      </td>
                      <td className="px-2 py-5 text-center">
                        <input disabled={lockedForUser} maxLength={8} className="w-20 rounded-xl border border-gray-100 bg-white px-2 py-3 text-center text-xs font-black uppercase text-gray-700 outline-none focus:ring-4 focus:ring-indigo-50 disabled:bg-gray-50 disabled:text-gray-300" value={draft.teacherInitials} onChange={(event) => updateDraft(student.id, "teacherInitials", event.target.value.toUpperCase(), mark)} />
                      </td>
                      <td className="px-4 py-5 text-right">
                        {mark ? (
                          <button
                            onClick={() => handleToggleLock(mark)}
                            disabled={isLocked && !canUnlock}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                              isLocked ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700",
                              isLocked && !canUnlock && "cursor-not-allowed opacity-60",
                            )}
                          >
                            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            {isLocked ? "Locked" : "Open"}
                          </button>
                        ) : drafts[student.id] ? (
                          <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700">
                            <AlertCircle className="h-4 w-4" />
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <AlertCircle className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="py-32 text-center text-gray-300">
              <Search className="mx-auto mb-6 h-16 w-16 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.4em]">No students found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const studentMarks = marks.filter((mark) => mark.studentId === student.id && mark.term === selectedTerm && mark.year === selectedYear);
            const average = studentMarks.length ? studentMarks.reduce((sum, mark) => sum + Number(mark.score || 0), 0) / studentMarks.length : null;
            const grade = gradeFromScale(average, schoolSettings.gradingScale);
            return (
              <div key={student.id} className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-2xl font-black uppercase text-gray-400">{student.name.charAt(0)}</div>
                    <h3 className="text-xl font-black leading-tight text-gray-900">{student.name}</h3>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{student.reg}</p>
                  </div>
                  <span className={cn("rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest", gradeBadge(average))}>{grade.grade}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PanelStat label="Average" value={average === null ? "--" : `${average.toFixed(1)}%`} />
                  <PanelStat label="Subjects" value={`${studentMarks.length}`} />
                  <PanelStat label="Locked" value={`${studentMarks.filter((mark) => mark.locked).length}`} />
                  <PanelStat label="Descriptor" value={grade.comment} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm lg:col-span-2">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">Class Performance Summary</h3>
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <PanelStat label="Class Average" value={classAverage === null ? "--" : `${classAverage.toFixed(1)}%`} />
              <PanelStat label="Submitted Marks" value={`${selectedMarks.length}`} />
              <PanelStat label="Locked Marks" value={`${selectedMarks.filter((mark) => mark.locked).length}`} />
            </div>
          </div>
          <div className="rounded-[32px] bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100">
            <CheckCircle2 className="mb-6 h-10 w-10 text-emerald-200" />
            <h3 className="mb-2 text-xl font-black">Audit-ready Academics</h3>
            <p className="text-sm font-semibold leading-6 text-indigo-100">Every create, update, lock, unlock, and delete action is logged on the backend after the migration is applied.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreInput({ value, disabled, max, step, onChange }: { value: string; disabled: boolean; max: number; step: number; onChange: (value: string) => void }) {
  return (
    <input
      type="number"
      max={max}
      min="0"
      step={step}
      disabled={disabled}
      placeholder="--"
      className="w-20 rounded-xl border border-gray-100 bg-white px-2 py-3 text-center text-sm font-black text-indigo-700 outline-none transition-all focus:ring-4 focus:ring-indigo-50 disabled:bg-gray-50 disabled:text-gray-300"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className={cn("text-lg font-black", tone)}>{value}</p>
    </div>
  );
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}

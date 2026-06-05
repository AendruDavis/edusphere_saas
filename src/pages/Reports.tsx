import React, { useMemo, useState } from "react";
import { CheckCircle2, FileText, Printer, Receipt, Search, ShieldCheck } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import type { Mark, Student } from "../types";

const SCHOOL_BLUE = "#0066CC";
const CONTACT_GREEN = "#009900";

const DEFAULT_SUBJECTS = [
  "ENGLISH LANGUAGE",
  "MATHEMATICS",
  "BIOLOGY",
  "CHEMISTRY",
  "PHYSICS",
  "HISTORY",
  "GEOGRAPHY",
  "CHRISTIAN RELIGIOUS EDUCATION",
  "COMPUTER STUDIES",
];

type ReportSubject = {
  key: string;
  subject: string;
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  avg: string;
  idf: string;
  twentyPercent: string;
  eightyPercent: string;
  finalScore: string;
  grade: string;
  descriptor: string;
  teacherInitials: string;
};

type SubjectOverrides = Record<string, Partial<Pick<ReportSubject, "a1" | "a2" | "a3" | "a4" | "idf" | "teacherInitials">>>;

type ReportSummary = {
  projectWork: string;
  overallIdentifier: string;
  overallGrade: string;
  overallPerformance: string;
  result: string;
  termDates: string;
};

type ReportComments = {
  classTeacherComment: string;
  headTeacherComment: string;
};

type GradeScale = { min: number; grade: string; comment: string }[];

const REPORT_GRADE_SCALE: GradeScale = [
  { min: 80, grade: "A", comment: "Exceptional" },
  { min: 70, grade: "B", comment: "Outstanding" },
  { min: 60, grade: "C", comment: "Satisfactory" },
  { min: 50, grade: "D", comment: "Basic" },
  { min: 0, grade: "E", comment: "Elementary" },
];

function gradeFromScore(score: number | null, scale: GradeScale = REPORT_GRADE_SCALE) {
  if (score === null || Number.isNaN(score)) return "-";
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find((entry) => score >= entry.min)?.grade || "-";
}

function descriptorForScore(score: number | null, scale: GradeScale = REPORT_GRADE_SCALE) {
  if (score === null || Number.isNaN(score)) return "-";
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find((entry) => score >= entry.min)?.comment || "-";
}

function gradeClassName(grade: string) {
  switch (grade.charAt(0).toUpperCase()) {
    case "A":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "B":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "C":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "D":
      return "bg-red-50 text-red-700 border-red-200";
    case "E":
      return "bg-gray-100 text-gray-600 border-gray-300";
    default:
      return "bg-white text-gray-400 border-gray-200";
  }
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function scoreText(value: number | null) {
  return value === null ? "" : String(value);
}

function initialsFromSubject(subject: string) {
  return subject
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function markScoreText(value: number | null | undefined, fallback = "") {
  return value === null || value === undefined ? fallback : String(Math.round(Number(value)));
}

function buildSubjectRow(mark: Mark | undefined, subject: string, overrides: SubjectOverrides, gradingScale?: GradeScale): ReportSubject {
  const key = mark?.id || subject;
  const baseScore = typeof mark?.score === "number" ? String(Math.round(mark.score)) : "";
  const override = overrides[key] || {};
  const a1 = override.a1 ?? markScoreText(mark?.a1, baseScore);
  const a2 = override.a2 ?? markScoreText(mark?.a2, baseScore);
  const a3 = override.a3 ?? markScoreText(mark?.a3, baseScore);
  const a4 = override.a4 ?? markScoreText(mark?.a4, baseScore);
  const avg = average([numberOrNull(a1), numberOrNull(a2), numberOrNull(a3), numberOrNull(a4)]);
  const idf = numberOrNull(override.idf ?? markScoreText(mark?.idf, scoreText(avg)));
  const twenty = avg === null ? null : Math.round(avg * 0.2);
  const eighty = idf === null ? null : Math.round(idf * 0.8);
  const finalScore = twenty === null && eighty === null ? null : Math.round((twenty ?? 0) + (eighty ?? 0));
  const grade = gradeFromScore(finalScore, gradingScale);

  return {
    key,
    subject,
    a1,
    a2,
    a3,
    a4,
    avg: scoreText(avg),
    idf: scoreText(idf),
    twentyPercent: scoreText(twenty),
    eightyPercent: scoreText(eighty),
    finalScore: scoreText(finalScore),
    grade,
    descriptor: descriptorForScore(finalScore, gradingScale),
    teacherInitials: override.teacherInitials ?? mark?.teacherInitials ?? initialsFromSubject(subject),
  };
}

function buildReportData(params: {
  selectedStudent: Student | null;
  students: Student[];
  marks: Mark[];
  selectedTerm: string;
  selectedYear: string;
  overrides: SubjectOverrides;
  summary: ReportSummary;
  comments: ReportComments;
  gradingScale?: GradeScale;
}) {
  const { selectedStudent, students, marks, selectedTerm, selectedYear, overrides, summary, comments, gradingScale } = params;
  const studentMarks = selectedStudent
    ? marks.filter((mark) => mark.studentId === selectedStudent.id && mark.term === selectedTerm && mark.year === selectedYear)
    : [];
  const subjects = (studentMarks.length > 0 ? studentMarks.map((mark) => mark.subject) : DEFAULT_SUBJECTS).map((subject) => {
    const mark = studentMarks.find((entry) => entry.subject === subject);
    return buildSubjectRow(mark, subject.toUpperCase(), overrides, gradingScale);
  });
  const finalScores = subjects.map((subject) => numberOrNull(subject.finalScore)).filter((value): value is number => value !== null);
  const overallAverage = finalScores.length ? Math.round(finalScores.reduce((sum, value) => sum + value, 0) / finalScores.length) : 0;
  const overallGrade = gradeFromScore(overallAverage, gradingScale);
  const roll = selectedStudent ? students.findIndex((student) => student.id === selectedStudent.id) + 1 : 0;

  return {
    school: {
      logoUrl: null,
      name: "NELSON HIGH SCHOOL",
      shortName: "NELSON HIGH SCH PALLISA",
      motto: "IN GOD WE TRUST",
      box: "P.O BOX 34 PALLISA - (U)",
      phones: "+256 700 000 000 / +256 772 000 000",
      email: "nelsonhighschoolpallisa@gmail.com",
    },
    student: {
      name: selectedStudent?.name || "{{STUDENT_NAME}}",
      photoUrl: selectedStudent?.photo || null,
      lin: selectedStudent?.reg || "{{LIN}}",
      payCode: selectedStudent ? `PAY-${selectedStudent.reg.replace(/\W/g, "").slice(-5)}` : "{{PAY_CODE}}",
      section: selectedStudent?.section || "{{SECTION}}",
      gender: selectedStudent?.gender || "{{GENDER}}",
      roll: roll > 0 ? String(roll).padStart(2, "0") : "{{ROLL}}",
      year: selectedYear || "{{YEAR}}",
      term: selectedTerm || "{{TERM}}",
      class: selectedStudent?.class || "{{CLASS}}",
    },
    subjects,
    summary: {
      averages: overallAverage,
      projectWork: summary.projectWork,
      overallIdentifier: summary.overallIdentifier,
      overallGrade: summary.overallGrade || overallGrade,
      overallPerformance: summary.overallPerformance || descriptorForScore(overallAverage, gradingScale),
      result: summary.result,
      feesBalance: selectedStudent?.feesBalance ?? 0,
      termDates: summary.termDates,
    },
    comments,
  };
}

function EditableScore({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="report-input"
      inputMode="decimal"
    />
  );
}

export default function Reports() {
  const { schoolSettings, students, marks, currentUser } = useApp();
  const [reportType, setReportType] = useState<"report-card" | "invoice">("report-card");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedYear, setSelectedYear] = useState(schoolSettings.academicYear || "2026/2027");
  const [subjectOverrides, setSubjectOverrides] = useState<SubjectOverrides>({});
  const [summary, setSummary] = useState<ReportSummary>({
    projectWork: "DONE",
    overallIdentifier: "COMPETENT",
    overallGrade: "",
    overallPerformance: "",
    result: "PROMOTED",
    termDates: "NEXT TERM BEGINS: {{NEXT_TERM_START}}    ENDS: {{NEXT_TERM_END}}",
  });
  const [comments, setComments] = useState<ReportComments>({
    classTeacherComment: "A focused learner. Maintain steady revision and active class participation.",
    headTeacherComment: "Good progress. Continue working hard and keep discipline at all times.",
  });

  React.useEffect(() => {
    if (currentUser?.role === "student") {
      const student = students.find((entry) => entry.parentEmail === currentUser.email);
      if (student) setSelectedStudent(student);
    }
  }, [currentUser, students]);

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query);
  });

  const reportData = useMemo(
    () =>
      buildReportData({
        selectedStudent,
        students,
        marks,
        selectedTerm,
        selectedYear,
        overrides: subjectOverrides,
        summary,
        comments,
        gradingScale: schoolSettings.gradingScale,
      }),
    [selectedStudent, students, marks, selectedTerm, selectedYear, subjectOverrides, summary, comments, schoolSettings.gradingScale],
  );

  const updateSubjectOverride = (key: string, field: keyof SubjectOverrides[string], value: string) => {
    setSubjectOverrides((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="app-page print:space-y-0 print:pb-0">
      <div className="app-page-header print:hidden">
        <div>
          <p className="app-page-kicker">Documents</p>
          <h2 className="app-page-title">Reports & Digital Portals</h2>
          <p className="app-page-subtitle">Generate editable A4 academic reports and fee statements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType("report-card")}
            className={cn(
              "app-button-secondary",
              reportType === "report-card" && "border-blue-600 bg-blue-50 text-blue-700",
            )}
          >
            <FileText className="h-4 w-4" />
            Progressive Report
          </button>
          <button
            onClick={() => setReportType("invoice")}
            className={cn(
              "app-button-secondary",
              reportType === "invoice" && "border-blue-600 bg-blue-50 text-blue-700",
            )}
          >
            <Receipt className="h-4 w-4" />
            Fee Statement
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedStudent}
            className="app-button-primary"
          >
            <Printer className="h-4 w-4" />
            Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr] print:block">
        <aside className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm print:hidden">
          {currentUser?.role !== "student" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-bold uppercase text-gray-500">
                  Term
                  <select
                    value={selectedTerm}
                    onChange={(event) => setSelectedTerm(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  >
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-bold uppercase text-gray-500">
                  Year
                  <input
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search student"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSubjectOverrides({});
                    }}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      selectedStudent?.id === student.id ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50",
                    )}
                  >
                    <p className="text-sm font-black text-gray-900">{student.name}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase text-blue-600">
                      {student.reg} · {student.class}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="space-y-3 border-t border-gray-100 pt-5">
            <label className="block space-y-1 text-xs font-bold uppercase text-gray-500">
              Project Work
              <input
                value={summary.projectWork}
                onChange={(event) => setSummary({ ...summary, projectWork: event.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm normal-case text-gray-900"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold uppercase text-gray-500">
              Overall Identifier
              <input
                value={summary.overallIdentifier}
                onChange={(event) => setSummary({ ...summary, overallIdentifier: event.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm normal-case text-gray-900"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold uppercase text-gray-500">
              Result
              <input
                value={summary.result}
                onChange={(event) => setSummary({ ...summary, result: event.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm normal-case text-gray-900"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold uppercase text-gray-500">
              Term Dates
              <input
                value={summary.termDates}
                onChange={(event) => setSummary({ ...summary, termDates: event.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm normal-case text-gray-900"
              />
            </label>
          </div>
        </aside>

        <section className="overflow-auto rounded-2xl bg-gray-100 p-4 print:overflow-visible print:rounded-none print:bg-white print:p-0">
          {!selectedStudent ? (
            <div className="flex min-h-[680px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center print:hidden">
              <div>
                <ShieldCheck className="mx-auto h-12 w-12 text-blue-200" />
                <h3 className="mt-4 text-xl font-black text-gray-900">Select a student</h3>
                <p className="mt-2 max-w-sm text-sm text-gray-500">Choose a candidate to populate the report variables and preview the A4 document.</p>
              </div>
            </div>
          ) : reportType === "report-card" ? (
            <div id="print-area" className="report-sheet mx-auto bg-white text-[11px] text-gray-900 shadow-xl print:shadow-none">
              <header className="report-header">
                <div className="logo-box">
                  <div className="logo-circle">LOGO</div>
                  <strong>{reportData.school.shortName}</strong>
                  <span>{reportData.school.motto}</span>
                </div>
                <div className="school-block">
                  <h1>{reportData.school.name}</h1>
                  <p className="box-line">{reportData.school.box}</p>
                  <p>{reportData.school.phones}</p>
                  <p className="contact-line">{reportData.school.email}</p>
                </div>
                <div className="photo-box">
                  {reportData.student.photoUrl ? (
                    <img src={reportData.student.photoUrl} alt={reportData.student.name} />
                  ) : (
                    <span>PHOTO</span>
                  )}
                </div>
              </header>

              <h2 className="report-title">END OF TERM PROGRESSIVE REPORT</h2>

              <section className="student-grid">
                {[
                  ["LIN", reportData.student.lin],
                  ["PAY-CODE", reportData.student.payCode],
                  ["SECTION", reportData.student.section],
                  ["GENDER", reportData.student.gender],
                  ["ROLL", reportData.student.roll],
                  ["YEAR", reportData.student.year],
                  ["TERM", reportData.student.term],
                  ["CLASS", reportData.student.class],
                ].map(([label, value]) => (
                  <div key={label} className="student-cell">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
                <div className="student-cell name-cell">
                  <span>NAME</span>
                  <strong>{reportData.student.name}</strong>
                </div>
              </section>

              <table className="progress-table">
                <thead>
                  <tr>
                    {["SUBJECT", "A1", "A2", "A3", "A4", "AVG", "IDF", "20%", "80%", "100%", "GRD", "DESCRIPTOR", "INIT"].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.subjects.map((subject, index) => (
                    <tr key={subject.key} className={index % 2 === 0 ? "row-white" : "row-cyan"}>
                      <td className="subject-name">{subject.subject}</td>
                      <td>
                        <EditableScore value={subject.a1} ariaLabel={`${subject.subject} A1`} onChange={(value) => updateSubjectOverride(subject.key, "a1", value)} />
                      </td>
                      <td>
                        <EditableScore value={subject.a2} ariaLabel={`${subject.subject} A2`} onChange={(value) => updateSubjectOverride(subject.key, "a2", value)} />
                      </td>
                      <td>
                        <EditableScore value={subject.a3} ariaLabel={`${subject.subject} A3`} onChange={(value) => updateSubjectOverride(subject.key, "a3", value)} />
                      </td>
                      <td>
                        <EditableScore value={subject.a4} ariaLabel={`${subject.subject} A4`} onChange={(value) => updateSubjectOverride(subject.key, "a4", value)} />
                      </td>
                      <td>{subject.avg || "-"}</td>
                      <td>
                        <EditableScore value={subject.idf} ariaLabel={`${subject.subject} IDF`} onChange={(value) => updateSubjectOverride(subject.key, "idf", value)} />
                      </td>
                      <td>{subject.twentyPercent || "-"}</td>
                      <td>{subject.eightyPercent || "-"}</td>
                      <td>{subject.finalScore || "-"}</td>
                      <td>
                        <span className={cn("grade-pill", gradeClassName(subject.grade))}>{subject.grade}</span>
                      </td>
                      <td>{subject.descriptor}</td>
                      <td>
                        <input
                          aria-label={`${subject.subject} initials`}
                          value={subject.teacherInitials}
                          onChange={(event) => updateSubjectOverride(subject.key, "teacherInitials", event.target.value)}
                          className="report-input init-input"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="averages-row">
                    <td>AVERAGES</td>
                    <td colSpan={8}></td>
                    <td>{reportData.summary.averages}</td>
                    <td>
                      <span className={cn("grade-pill", gradeClassName(reportData.summary.overallGrade as ReportSubject["grade"]))}>{reportData.summary.overallGrade}</span>
                    </td>
                    <td>{reportData.summary.overallPerformance}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <section className="summary-strip">
                <div>
                  <span>PROJECT WORK</span>
                  <strong>{reportData.summary.projectWork}</strong>
                </div>
                <div>
                  <span>OVERALL IDENTIFIER</span>
                  <strong>{reportData.summary.overallIdentifier}</strong>
                </div>
                <div>
                  <span>OVERALL GRADE</span>
                  <strong>{reportData.summary.overallGrade}</strong>
                </div>
                <div>
                  <span>OVERALL PERFORMANCE</span>
                  <strong>{reportData.summary.overallPerformance}</strong>
                </div>
                <div>
                  <span>RESULT</span>
                  <strong>{reportData.summary.result}</strong>
                </div>
              </section>

              <section className="comments-grid">
                <label>
                  Class Teacher's Comment
                  <textarea value={comments.classTeacherComment} onChange={(event) => setComments({ ...comments, classTeacherComment: event.target.value })} />
                </label>
                <label>
                  Head teacher's Comment
                  <textarea value={comments.headTeacherComment} onChange={(event) => setComments({ ...comments, headTeacherComment: event.target.value })} />
                </label>
              </section>

              <section className="legend-table">
                <table>
                  <tbody>
                    {[
                      ["A", "80-100", "Exceptional"],
                      ["B", "70-79", "Outstanding"],
                      ["C", "60-69", "Satisfactory"],
                      ["D", "50-59", "Basic"],
                      ["E", "0-49", "Elementary"],
                    ].map(([grade, range, descriptor]) => (
                      <tr key={grade}>
                        <td className="legend-grade">{grade}</td>
                        <td>{range}</td>
                        <td>{descriptor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="report-footer">
                <span>{reportData.summary.termDates}</span>
                <em>Not Valid without school Official Stamp</em>
                <span>Fess Balance: shs. {formatCurrency(reportData.summary.feesBalance, schoolSettings.currency || "UGX")}</span>
              </footer>
            </div>
          ) : (
            <div id="print-area" className="mx-auto min-h-[297mm] w-[210mm] bg-white p-12 shadow-xl print:shadow-none">
              <h1 className="text-3xl font-black text-gray-900">Fee Statement</h1>
              <p className="mt-2 text-sm text-gray-500">{selectedStudent.name} · {selectedStudent.class}</p>
              <div className="mt-10 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr>
                      <td className="border-b border-gray-200 px-6 py-4 font-bold">Total Fees Paid</td>
                      <td className="border-b border-gray-200 px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(selectedStudent.totalFeesPaid || 0, schoolSettings.currency || "UGX")}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-bold">Outstanding Balance</td>
                      <td className="px-6 py-4 text-right font-black text-red-600">{formatCurrency(selectedStudent.feesBalance || 0, schoolSettings.currency || "UGX")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        .report-sheet {
          width: 210mm;
          min-height: 297mm;
          padding: 9mm;
          font-family: Arial, Calibri, sans-serif;
        }

        .report-header {
          display: grid;
          grid-template-columns: 37mm 1fr 32mm;
          align-items: start;
          gap: 6mm;
        }

        .logo-box,
        .photo-box {
          text-align: center;
          color: #111827;
        }

        .logo-box strong,
        .logo-box span {
          display: block;
          font-size: 8px;
          line-height: 1.2;
        }

        .logo-box span {
          color: ${CONTACT_GREEN};
          font-style: italic;
          margin-top: 2px;
        }

        .logo-circle {
          width: 23mm;
          height: 23mm;
          border: 1px solid #9ca3af;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-weight: 800;
          font-size: 9px;
          margin-bottom: 3px;
        }

        .school-block {
          text-align: center;
          line-height: 1.25;
        }

        .school-block h1 {
          color: ${SCHOOL_BLUE};
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          letter-spacing: .02em;
        }

        .school-block p {
          margin: 2px 0;
          font-size: 11px;
          font-weight: 700;
        }

        .school-block .box-line {
          color: #111827;
          font-weight: 800;
        }

        .school-block .contact-line {
          color: ${CONTACT_GREEN};
        }

        .photo-box {
          display: flex;
          justify-content: center;
        }

        .photo-box span,
        .photo-box img {
          width: 25mm;
          height: 25mm;
          border: 1px solid #9ca3af;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          object-fit: cover;
          color: #6b7280;
          font-weight: 800;
          font-size: 9px;
        }

        .report-title {
          margin: 5mm 0 3mm;
          text-align: center;
          color: ${SCHOOL_BLUE};
          font-size: 17px;
          font-weight: 900;
          letter-spacing: .06em;
          border-top: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
          padding: 2mm 0;
        }

        .student-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #9ca3af;
          margin-bottom: 4mm;
        }

        .student-cell {
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          padding: 1.5mm 2mm;
          min-height: 9mm;
        }

        .student-cell span {
          display: block;
          color: #4b5563;
          font-size: 8px;
          font-weight: 900;
        }

        .student-cell strong {
          display: block;
          margin-top: 1px;
          font-size: 10px;
        }

        .name-cell {
          grid-column: span 4;
          border-bottom: 0;
        }

        .name-cell strong {
          color: ${SCHOOL_BLUE};
          font-size: 15px;
          text-transform: uppercase;
        }

        .progress-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9px;
        }

        .progress-table th,
        .progress-table td {
          border: 1px solid #9ca3af;
          text-align: center;
          padding: 1.4mm .8mm;
          vertical-align: middle;
        }

        .progress-table th {
          background: ${SCHOOL_BLUE};
          color: white;
          font-size: 8px;
          font-weight: 900;
        }

        .progress-table th:first-child,
        .progress-table td:first-child {
          width: 31mm;
          text-align: left;
        }

        .progress-table th:nth-child(12),
        .progress-table td:nth-child(12) {
          width: 20mm;
        }

        .row-cyan {
          background: #e8fbff;
        }

        .row-white {
          background: #ffffff;
        }

        .subject-name {
          color: ${SCHOOL_BLUE};
          font-weight: 900;
        }

        .report-input {
          width: 100%;
          min-width: 0;
          border: 0;
          background: transparent;
          text-align: center;
          font: inherit;
          font-weight: 800;
          color: #111827;
          outline: none;
        }

        .init-input {
          text-transform: uppercase;
        }

        .grade-pill {
          display: inline-flex;
          min-width: 7mm;
          justify-content: center;
          border: 1px solid;
          border-radius: 4px;
          padding: 1px 4px;
          font-weight: 900;
        }

        .averages-row {
          background: #f3f4f6;
          font-weight: 900;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          border: 1px solid #9ca3af;
          border-top: 0;
        }

        .summary-strip div {
          border-right: 1px solid #d1d5db;
          padding: 2mm;
          text-align: center;
        }

        .summary-strip span {
          display: block;
          font-size: 7px;
          font-weight: 900;
          color: #4b5563;
        }

        .summary-strip strong {
          display: block;
          margin-top: 1mm;
          color: ${SCHOOL_BLUE};
          font-size: 10px;
        }

        .comments-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-top: 4mm;
        }

        .comments-grid label {
          font-size: 9px;
          font-weight: 900;
          color: #111827;
        }

        .comments-grid textarea {
          display: block;
          width: 100%;
          height: 23mm;
          margin-top: 1mm;
          border: 1px solid #9ca3af;
          padding: 2mm;
          resize: none;
          font: inherit;
          font-weight: 600;
          outline: none;
        }

        .legend-table {
          margin-top: 4mm;
        }

        .legend-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }

        .legend-table td {
          border: 1px solid #9ca3af;
          padding: 1.2mm 2mm;
        }

        .legend-grade {
          width: 12mm;
          text-align: center;
          color: ${SCHOOL_BLUE};
          font-weight: 900;
        }

        .report-footer {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          gap: 3mm;
          margin-top: 5mm;
          font-size: 9px;
          font-weight: 800;
        }

        .report-footer em {
          color: ${CONTACT_GREEN};
          text-align: center;
          font-style: italic;
          font-weight: 900;
        }

        .report-footer span:last-child {
          text-align: right;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
          }

          .print\\:hidden {
            display: none !important;
          }

          input,
          textarea {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

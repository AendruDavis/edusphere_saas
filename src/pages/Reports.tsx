import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Printer,
  Receipt,
  Save,
  Search,
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { apiRequest } from "../lib/api";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ProgressiveReportTemplate } from "../components/reports/ProgressiveReportTemplate";
import { exportProgressiveReportPdf } from "../infrastructure/pdf/progressiveReportPdf";
import { exportInvoicePdf } from "../infrastructure/pdf/invoicePdf";
import type { ProgressiveReportData } from "../../shared/reporting";
import type { InvoiceData } from "../../shared/invoice";
import type { Student } from "../types";

type ReportType = "report-card" | "invoice";

export default function Reports() {
  const { schoolSettings, students, currentUser, feeStructures } = useApp();
  const toast = useToast();
  const [reportType, setReportType] = useState<ReportType>("report-card");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedYear, setSelectedYear] = useState(schoolSettings.academicYear || "2026/2027");
  const [report, setReport] = useState<ProgressiveReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "student") {
      const student = students.find((entry) => entry.parentEmail === currentUser.email);
      if (student) setSelectedStudent(student);
    }
  }, [currentUser, students]);

  useEffect(() => {
    let active = true;
    if (!selectedStudent || reportType !== "report-card") {
      setReport(null);
      return;
    }

    setLoading(true);
    apiRequest<ProgressiveReportData>(
      `/api/reports/students/${selectedStudent.id}/progressive?term=${encodeURIComponent(selectedTerm)}&year=${encodeURIComponent(selectedYear)}`,
    )
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((error) => {
        if (active) {
          setReport(null);
          toast.error(error.message || "Could not build the progressive report.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedStudent, selectedTerm, selectedYear, reportType, toast]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((student) => !query || student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query));
  }, [students, searchQuery]);

  const updateComment = (field: "classTeacherComment" | "headTeacherComment", value: string) => {
    setReport((current) => current ? {
      ...current,
      comments: { ...current.comments, [field]: value },
    } : current);
  };

  const saveComments = async () => {
    if (!report || !selectedStudent) return;
    setSaving(true);
    try {
      await apiRequest(`/api/reports/students/${selectedStudent.id}/comments`, {
        method: "PUT",
        json: {
          term: selectedTerm,
          year: selectedYear,
          classTeacherComment: report.comments.classTeacherComment,
          headTeacherComment: report.comments.headTeacherComment,
          projectWork: report.summary.projectWork,
          result: report.summary.result,
        },
      });
      toast.success("Report comments saved.");
    } catch (error: any) {
      toast.error(error.message || "Could not save report comments.");
    } finally {
      setSaving(false);
    }
  };

  const finalizeReport = async () => {
    if (!report || !selectedStudent) return;
    setSaving(true);
    try {
      await saveComments();
      await apiRequest(`/api/reports/students/${selectedStudent.id}/finalize`, {
        method: "POST",
        json: { term: selectedTerm, year: selectedYear },
      });
      setReport((current) => current ? { ...current, status: "finalized" } : current);
      toast.success("Report finalized and marks locked.");
    } catch (error: any) {
      toast.error(error.message || "Could not finalize this report.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportProgressiveReportPdf(report);
      toast.success("Progressive report PDF downloaded.");
    } catch (error: any) {
      toast.error(error.message || "Could not generate the PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-page print:space-y-0 print:pb-0">
      <div className="app-page-header print:hidden">
        <div>
          <p className="app-page-kicker">Documents</p>
          <h1 className="app-page-title">Reports & Digital Portals</h1>
          <p className="app-page-subtitle">Build settings-driven academic reports and student fee statements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={cn("app-button-secondary", reportType === "report-card" && "border-blue-600 bg-blue-50 text-blue-700")} onClick={() => setReportType("report-card")}>
            <FileText className="h-4 w-4" />
            Progressive Report
          </button>
          <button className={cn("app-button-secondary", reportType === "invoice" && "border-blue-600 bg-blue-50 text-blue-700")} onClick={() => setReportType("invoice")}>
            <Receipt className="h-4 w-4" />
            Fee Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)] print:block">
        <aside className="space-y-4 print:hidden">
          <div className="app-panel">
            <label className="text-sm font-semibold text-slate-700">Academic period</label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className="app-select" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)}>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
              <input className="app-input" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} aria-label="Academic year" />
            </div>
          </div>

          <div className="app-panel p-0">
            <div className="border-b border-slate-200 p-4">
              <label className="text-sm font-semibold text-slate-700">Student</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="app-input pl-9" placeholder="Search name or LIN..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto p-2">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    selectedStudent?.id === student.id ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="truncate text-xs text-slate-500">{student.lin || student.reg} / {student.class}</p>
                  </div>
                </button>
              ))}
              {filteredStudents.length === 0 && <div className="app-empty-state m-2">No students found.</div>}
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {!selectedStudent ? (
            <div className="app-empty-state flex min-h-[520px] flex-col items-center justify-center">
              <FileText className="mb-3 h-10 w-10 text-slate-300" />
              Select a student to build a report.
            </div>
          ) : reportType === "invoice" ? (
            <FeeStatement
              student={selectedStudent}
              currency={schoolSettings.currency || "UGX"}
              schoolSettings={schoolSettings}
              term={selectedTerm}
              year={selectedYear}
              feeItems={feeStructures.find((fee) => fee.className === selectedStudent.class && fee.term === selectedTerm && fee.academicYear === selectedYear)?.items || []}
            />
          ) : loading ? (
            <div className="app-empty-state flex min-h-[520px] items-center justify-center gap-3">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              Building report from school records...
            </div>
          ) : report ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className={cn("app-badge", report.status === "finalized" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                    {report.status === "finalized" ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {report.status}
                  </span>
                  <span className="text-sm text-slate-500">{report.subjects.length} subjects</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="app-button-secondary" onClick={saveComments} disabled={saving || report.status === "finalized"}>
                    <Save className="h-4 w-4" />
                    Save comments
                  </button>
                  <button className="app-button-secondary" onClick={finalizeReport} disabled={saving || report.status === "finalized"}>
                    <LockKeyhole className="h-4 w-4" />
                    Finalize
                  </button>
                  <button className="app-button-secondary" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button className="app-button-primary" onClick={downloadPdf} disabled={exporting}>
                    {exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Export UNEB PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl bg-slate-200/50 p-3 print:overflow-visible print:bg-white print:p-0">
                <ProgressiveReportTemplate
                  report={report}
                  currency={schoolSettings.currency || "UGX"}
                  editable={report.status !== "finalized" && ["admin", "teacher"].includes(currentUser?.role || "")}
                  onCommentChange={updateComment}
                />
              </div>
            </div>
          ) : (
            <div className="app-empty-state min-h-[520px]">The report could not be loaded.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function FeeStatement({
  student,
  currency,
  schoolSettings,
  term,
  year,
  feeItems,
}: {
  student: Student;
  currency: string;
  schoolSettings: ReturnType<typeof useApp>["schoolSettings"];
  term: string;
  year: string;
  feeItems: { name: string; amount: number }[];
}) {
  const items = feeItems.length ? feeItems : [{ name: "School Fees", amount: student.totalFeesPaid + student.feesBalance }];
  const invoice: InvoiceData = {
    invoiceNumber: `INV-${year.replace(/\W/g, "")}-${student.reg}`,
    date: new Date().toISOString().slice(0, 10),
    term,
    year,
    school: {
      name: schoolSettings.name,
      logoUrl: schoolSettings.logo,
      address: schoolSettings.address || "",
      tin: schoolSettings.tin || "",
      deoCode: schoolSettings.deoCode || "",
      primaryColor: schoolSettings.primaryColor || "#0066CC",
      bankName: schoolSettings.bankName || "",
      bankAccount: schoolSettings.bankAccount || "",
      payCode: schoolSettings.payCode || "",
      motto: schoolSettings.motto || "",
    },
    student: { name: student.name, lin: student.lin || student.reg, class: student.class },
    items: items.map((item) => ({ description: item.name, quantity: 1, unitPrice: item.amount, total: item.amount })),
    subtotal: items.reduce((sum, item) => sum + item.amount, 0),
    vat: 0,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    paid: student.totalFeesPaid,
    balance: student.feesBalance,
    currency,
  };

  return (
    <div className="mx-auto min-h-[297mm] w-[210mm] bg-white p-12 shadow-xl print:shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{schoolSettings.name}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Fee Statement</h2>
        </div>
        <button className="app-button-primary print:hidden" onClick={() => exportInvoicePdf(invoice)}>
          <FileText className="h-4 w-4" />
          Download Invoice PDF
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-500">{student.name} / {student.class} / {student.lin || student.reg}</p>
      <div className="mt-10 overflow-hidden rounded-xl border border-slate-200">
        <table className="app-table">
          <tbody>
            <tr><td>Total fees paid</td><td className="text-right font-semibold text-emerald-700">{formatCurrency(student.totalFeesPaid || 0, currency)}</td></tr>
            <tr><td>Outstanding balance</td><td className="text-right font-semibold text-rose-700">{formatCurrency(student.feesBalance || 0, currency)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

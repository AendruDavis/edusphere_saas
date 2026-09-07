import React from "react";
import {
  CheckCircle2,
  FileText,
  History,
  LoaderCircle,
  LockKeyhole,
  Printer,
  Receipt,
  Save,
  Search,
  X,
} from "lucide-react";
import type { InvoiceData } from "../../shared/invoice";
import type { ProgressiveReportData } from "../../shared/reporting";
import { ProgressiveReportTemplate } from "../components/reports/ProgressiveReportTemplate";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { exportInvoicePdf } from "../infrastructure/pdf/invoicePdf";
import { exportProgressiveReportPdf } from "../infrastructure/pdf/progressiveReportPdf";
import { apiRequest } from "../lib/api";
import { cn, formatCurrency } from "../lib/utils";
import type { FeeBalance, Student } from "../types";

type ReportType = "report-card" | "invoice";

export default function Reports() {
  const { activeRoles, can, currentUser, feeStructures, schoolSettings, students } = useApp();
  const toast = useToast();
  const [reportType, setReportType] = React.useState<ReportType>("report-card");
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTerm, setSelectedTerm] = React.useState(schoolSettings.currentTerm || "Term 1");
  const [selectedYear, setSelectedYear] = React.useState(schoolSettings.academicYear || "2026/2027");
  const [report, setReport] = React.useState<ProgressiveReportData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [correctionMode, setCorrectionMode] = React.useState(false);
  const [correctionReason, setCorrectionReason] = React.useState("");
  const [invoiceBalance, setInvoiceBalance] = React.useState<FeeBalance | null>(null);
  const [invoiceLoading, setInvoiceLoading] = React.useState(false);

  const isAdmin = activeRoles.includes("admin");
  const canUpdateReports = can("reports", "update");
  const canViewFees = can("fees");

  React.useEffect(() => {
    if (selectedStudent && !students.some((student) => student.id === selectedStudent.id)) {
      setSelectedStudent(null);
      return;
    }
    if (selectedStudent) return;
    const linked = currentUser?.studentId ? students.find((student) => student.id === currentUser.studentId) : null;
    if (linked) setSelectedStudent(linked);
    else if ((activeRoles.includes("student") || activeRoles.includes("parent")) && students.length === 1) setSelectedStudent(students[0]);
  }, [activeRoles, currentUser?.studentId, selectedStudent, students]);

  React.useEffect(() => {
    let active = true;
    setCorrectionMode(false);
    setCorrectionReason("");
    if (!selectedStudent || reportType !== "report-card") {
      setReport(null);
      return;
    }

    setLoading(true);
    void apiRequest<ProgressiveReportData>(
      `/api/reports/students/${selectedStudent.id}/progressive?term=${encodeURIComponent(selectedTerm)}&year=${encodeURIComponent(selectedYear)}`,
    )
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((error) => {
        if (active) {
          setReport(null);
          toast.error(error instanceof Error ? error.message : "Could not build the progressive report.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reportType, selectedStudent, selectedTerm, selectedYear, toast]);

  React.useEffect(() => {
    if (!canViewFees && reportType === "invoice") setReportType("report-card");
  }, [canViewFees, reportType]);

  React.useEffect(() => {
    let active = true;
    if (!selectedStudent || reportType !== "invoice" || !canViewFees) {
      setInvoiceBalance(null);
      return;
    }
    setInvoiceLoading(true);
    const params = new URLSearchParams({ term: selectedTerm, year: selectedYear, className: selectedStudent.class });
    void apiRequest<{ balances: FeeBalance[] }>(`/api/fees/balances?${params}`)
      .then((result) => {
        if (active) setInvoiceBalance(result.balances.find((balance) => balance.studentId === selectedStudent.id) ?? null);
      })
      .catch((error) => {
        if (active) {
          setInvoiceBalance(null);
          toast.error(error instanceof Error ? error.message : "Could not load the fee balance.");
        }
      })
      .finally(() => {
        if (active) setInvoiceLoading(false);
      });
    return () => { active = false; };
  }, [canViewFees, reportType, selectedStudent, selectedTerm, selectedYear, toast]);

  const filteredStudents = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((student) => !query || student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query));
  }, [students, searchQuery]);

  const updateComment = (field: "classTeacherComment" | "headTeacherComment", value: string) => {
    setReport((current) => current ? { ...current, comments: { ...current.comments, [field]: value } } : current);
  };

  const persistComments = async () => {
    if (!report || !selectedStudent) return;
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
  };

  const saveComments = async () => {
    setSaving(true);
    try {
      await persistComments();
      toast.success("Report comments saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save report comments.");
    } finally {
      setSaving(false);
    }
  };

  const finalizeReport = async () => {
    if (!report || !selectedStudent || !isAdmin) return;
    setSaving(true);
    try {
      await persistComments();
      const finalized = await apiRequest<ProgressiveReportData>(`/api/reports/students/${selectedStudent.id}/finalize`, {
        method: "POST",
        json: { term: selectedTerm, year: selectedYear },
      });
      setReport(finalized);
      toast.success("Report finalized and marks locked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finalize this report.");
    } finally {
      setSaving(false);
    }
  };

  const issueCorrection = async () => {
    if (!report || !selectedStudent || !isAdmin) return;
    if (correctionReason.trim().length < 10) {
      toast.error("Enter a correction reason of at least 10 characters.");
      return;
    }
    setSaving(true);
    try {
      const revised = await apiRequest<ProgressiveReportData>(`/api/reports/students/${selectedStudent.id}/revise`, {
        method: "POST",
        json: {
          term: selectedTerm,
          year: selectedYear,
          reason: correctionReason.trim(),
          classTeacherComment: report.comments.classTeacherComment,
          headTeacherComment: report.comments.headTeacherComment,
          projectWork: report.summary.projectWork,
          result: report.summary.result,
        },
      });
      setReport(revised);
      setCorrectionMode(false);
      setCorrectionReason("");
      toast.success(`Correction revision ${revised.revision} issued.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue the correction revision.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportProgressiveReportPdf(report, schoolSettings.currency || "UGX");
      toast.success("Progressive report PDF downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the PDF.");
    } finally {
      setExporting(false);
    }
  };

  const draftEditable = Boolean(report?.status === "draft" && canUpdateReports);
  const correctionEditable = Boolean(report?.status === "finalized" && correctionMode && isAdmin);

  return (
    <div className="app-page print:space-y-0 print:pb-0">
      <div className="app-page-header print:hidden">
        <div>
          <p className="app-page-kicker">Documents</p>
          <h1 className="app-page-title">Reports and statements</h1>
          <p className="app-page-subtitle">Academic reports and fee documents generated from school records.</p>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button className={cn("min-h-10 rounded-md px-3 text-sm font-semibold", reportType === "report-card" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")} onClick={() => setReportType("report-card")}><FileText className="mr-2 inline h-4 w-4" />Report</button>
          {canViewFees && <button className={cn("min-h-10 rounded-md px-3 text-sm font-semibold", reportType === "invoice" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")} onClick={() => setReportType("invoice")}><Receipt className="mr-2 inline h-4 w-4" />Statement</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)] print:block">
        <aside className="space-y-4 print:hidden">
          <div className="app-panel">
            <label className="text-sm font-semibold text-slate-700">Academic period</label>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <select className="app-select min-h-11" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
              <input className="app-input min-h-11" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} aria-label="Academic year" />
            </div>
          </div>

          <div className="app-panel p-0">
            <div className="border-b border-slate-200 p-4">
              <label className="text-sm font-semibold text-slate-700">Student</label>
              <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="app-input min-h-11 pl-9" placeholder="Search name or LIN" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
            </div>
            <div className="max-h-[520px] overflow-y-auto p-2">
              {filteredStudents.map((student) => (
                <button key={student.id} onClick={() => setSelectedStudent(student)} className={cn("flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left", selectedStudent?.id === student.id ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50")}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{student.name.charAt(0)}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{student.name}</p><p className="truncate text-xs text-slate-500">{student.lin || student.reg} / {student.class}</p></div>
                </button>
              ))}
              {!filteredStudents.length && <div className="app-empty-state m-2">No students found.</div>}
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {!selectedStudent ? (
            <div className="app-empty-state flex min-h-[420px] flex-col items-center justify-center"><FileText className="mb-3 h-10 w-10 text-slate-300" />Select a student to build a report.</div>
          ) : reportType === "invoice" ? (
            invoiceLoading ? <div className="app-empty-state flex min-h-[420px] items-center justify-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />Loading fee statement...</div> :
            <FeeStatement student={selectedStudent} currency={schoolSettings.currency || "UGX"} schoolSettings={schoolSettings} term={selectedTerm} year={selectedYear} feeItems={feeStructures.find((fee) => fee.className === selectedStudent.class && fee.term === selectedTerm && fee.academicYear === selectedYear)?.items || []} feeBalance={invoiceBalance} />
          ) : loading ? (
            <div className="app-empty-state flex min-h-[420px] items-center justify-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />Building report...</div>
          ) : report ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2"><span className={cn("app-badge", report.status === "finalized" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{report.status === "finalized" ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{report.status}</span><span className="text-sm text-slate-500">Revision {report.revision} / {report.subjects.length} subjects</span></div>
                <div className="flex flex-wrap gap-2">
                  {draftEditable && <button className="app-button-secondary min-h-11" onClick={() => void saveComments()} disabled={saving}><Save className="h-4 w-4" />Save comments</button>}
                  {isAdmin && report.status === "draft" && <button className="app-button-secondary min-h-11" onClick={() => void finalizeReport()} disabled={saving}><LockKeyhole className="h-4 w-4" />Finalize</button>}
                  {isAdmin && report.status === "finalized" && !correctionMode && <button className="app-button-secondary min-h-11" onClick={() => setCorrectionMode(true)}><History className="h-4 w-4" />Create correction</button>}
                  <button className="app-button-secondary min-h-11" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</button>
                  <button className="app-button-primary min-h-11" onClick={() => void downloadPdf()} disabled={exporting}>{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Export PDF</button>
                </div>
              </div>

              {correctionMode && (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 print:hidden sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1"><span className="mb-1.5 block text-sm font-semibold text-amber-950">Correction reason</span><textarea className="app-input min-h-20 resize-y" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={500} /></label>
                  <div className="flex gap-2"><button className="app-button-secondary min-h-11" onClick={() => { setCorrectionMode(false); setCorrectionReason(""); }}><X className="h-4 w-4" />Cancel</button><button className="app-button-primary min-h-11" disabled={saving} onClick={() => void issueCorrection()}><History className="h-4 w-4" />Issue revision</button></div>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg bg-slate-200/50 p-3 print:overflow-visible print:bg-white print:p-0" role="region" aria-label="Progressive report preview" tabIndex={0}>
                <ProgressiveReportTemplate report={report} currency={schoolSettings.currency || "UGX"} editable={draftEditable || correctionEditable} canEditHeadComment={(draftEditable && isAdmin) || correctionEditable} onCommentChange={updateComment} />
              </div>
            </div>
          ) : (
            <div className="app-empty-state min-h-[420px]">The report could not be loaded.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function FeeStatement({ student, currency, schoolSettings, term, year, feeItems, feeBalance }: { student: Student; currency: string; schoolSettings: ReturnType<typeof useApp>["schoolSettings"]; term: string; year: string; feeItems: { name: string; amount: number }[]; feeBalance: FeeBalance | null }) {
  const items = feeItems.length ? feeItems : feeBalance && feeBalance.standardFee > 0 ? [{ name: "School Fees", amount: feeBalance.standardFee }] : [];
  const invoice: InvoiceData = {
    invoiceNumber: `INV-${year.replace(/\W/g, "")}-${student.reg}`,
    date: new Date().toISOString().slice(0, 10),
    term,
    year,
    school: {
      name: schoolSettings.name,
      logoUrl: schoolSettings.logoVariants?.favicon || schoolSettings.logoVariants?.wide || schoolSettings.logo,
      address: schoolSettings.address || "",
      tin: schoolSettings.tin || "",
      deoCode: schoolSettings.deoCode || "",
      primaryColor: schoolSettings.primaryColor || "#2563eb",
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
    paid: feeBalance?.paidAmount || 0,
    balance: feeBalance?.outstandingAmount || 0,
    currency,
  };

  return (
    <div className="overflow-x-auto rounded-lg bg-slate-200/50 p-3" role="region" aria-label="Fee statement preview" tabIndex={0}>
      <div className="mx-auto min-h-[297mm] w-[210mm] bg-white p-12 shadow-xl print:shadow-none">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{schoolSettings.name}</p><h2 className="mt-2 text-3xl font-semibold text-slate-950">Fee statement</h2></div><button className="app-button-primary print:hidden" onClick={() => void exportInvoicePdf(invoice)}><FileText className="h-4 w-4" />Download PDF</button></div>
        <p className="mt-2 text-sm text-slate-500">{student.name} / {student.class} / {student.lin || student.reg}</p>
        {!feeBalance && <p className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">No active fee structure is configured for this class and period.</p>}
        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200"><table className="app-table"><tbody><tr><td>Total fees paid</td><td className="text-right font-semibold text-emerald-700">{formatCurrency(feeBalance?.paidAmount || 0, currency)}</td></tr><tr><td>Outstanding balance</td><td className="text-right font-semibold text-rose-700">{formatCurrency(feeBalance?.outstandingAmount || 0, currency)}</td></tr>{(feeBalance?.creditAmount || 0) > 0 && <tr><td>Credit</td><td className="text-right font-semibold text-blue-700">{formatCurrency(feeBalance?.creditAmount || 0, currency)}</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}

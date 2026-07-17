import React from "react";
import { BarChart3, Save, Star } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { ValidatedForm } from "../components/ui/ValidatedForm";

type MonitoringSummary = {
  kpis?: Record<string, number | string>;
  leaveBreakdown?: Array<Record<string, unknown> & { type: string; count: number }>;
  attendanceTrend?: Array<Record<string, unknown> & { month: string; percent: string | number }>;
};

export default function StaffMonitoring() {
  const { staff } = useApp();
  const toast = useToast();
  const [summary, setSummary] = React.useState<MonitoringSummary>({});
  const [form, setForm] = React.useState({
    staffId: "",
    term: "Term 1",
    lessonPlansSubmitted: 0,
    punctualityPercent: 0,
    studentResultsAverage: 0,
    rating: 3,
    comment: "",
  });

  const refresh = React.useCallback(async () => {
    try {
      setSummary(await apiRequest<MonitoringSummary>("/api/staff/m-e"));
    } catch (error: any) {
      toast.error(error.message || "Could not load staff monitoring.");
    }
  }, [toast]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveAppraisal = async () => {
    try {
      await apiRequest("/api/staff/appraisal", { method: "POST", json: form });
      setForm((current) => ({ ...current, comment: "" }));
      toast.success("Appraisal saved and queued for email where available.");
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not save appraisal.");
    }
  };

  const trendColumns: DataTableColumn<NonNullable<MonitoringSummary["attendanceTrend"]>[number]>[] = [
    { key: "month", header: "Month", accessor: (row) => row.month, sortValue: (row) => row.month },
    { key: "percent", header: "Attendance %", accessor: (row) => `${row.percent}%`, sortValue: (row) => Number(row.percent) },
  ];

  const kpis = summary.kpis || {};

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Staff</p>
          <h1 className="app-page-title">Monitoring & Evaluation</h1>
          <p className="app-page-subtitle">Track leave, attendance, and term appraisal indicators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Total Staff", kpis.totalStaff ?? 0],
          ["On Leave", kpis.onLeave ?? 0],
          ["Active Today", kpis.activeToday ?? 0],
          ["Avg Leave Days", Number(kpis.avgLeaveDaysPerTerm ?? 0).toFixed(1)],
        ].map(([label, value]) => (
          <div key={String(label)} className="app-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="app-panel">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Staff Appraisal</h2>
              <p className="text-sm text-slate-500">Use measurable indicators and concise comments.</p>
            </div>
          </div>
          <ValidatedForm onSubmit={saveAppraisal}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Staff member</span>
              <select required className="app-select" value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })}>
                <option value="">Select staff</option>
                {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Term</span>
              <input className="app-input" required value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} />
            </label>
            {[
              ["Lesson plans submitted", "lessonPlansSubmitted"],
              ["Punctuality %", "punctualityPercent"],
              ["Student results average", "studentResultsAverage"],
            ].map(([label, key]) => (
              <label key={key} className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <input className="app-input" type="number" min="0" max="100" value={String(form[key as keyof typeof form])} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
              </label>
            ))}
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Rating</span>
              <input className="app-input" type="number" min="1" max="5" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Comment</span>
              <textarea className="app-input min-h-24" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
            </label>
            <button className="app-button-primary w-full justify-center">
              <Save className="h-4 w-4" />
              Save Appraisal
            </button>
          </ValidatedForm>
        </section>

        <section className="space-y-5">
          <div className="app-panel">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Leave Breakdown
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(summary.leaveBreakdown || []).map((item) => (
                <div key={item.type} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.type}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{item.count}</p>
                </div>
              ))}
              {(summary.leaveBreakdown || []).length === 0 && <p className="text-sm text-slate-500">No leave records yet.</p>}
            </div>
          </div>

          <DataTable rows={summary.attendanceTrend || []} columns={trendColumns} searchPlaceholder="Search month..." exportFilename="staff-attendance-trend" />
        </section>
      </div>
    </div>
  );
}

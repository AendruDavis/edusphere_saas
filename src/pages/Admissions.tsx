import React from "react";
import { CheckCircle2, ClipboardList, UserPlus, XCircle } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ValidatedForm } from "../components/ui/ValidatedForm";

type Admission = Record<string, unknown> & {
  id: string;
  studentName: string;
  classApplied: string;
  parentName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  status: "applied" | "admitted" | "enrolled" | "rejected";
  admissionNo?: string | null;
  createdAt: string;
};

const emptyForm = {
  studentName: "",
  gender: "",
  dateOfBirth: "",
  classApplied: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  parentWhatsApp: "",
};

function toneFor(status: Admission["status"]) {
  if (status === "enrolled" || status === "admitted") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

export default function Admissions() {
  const { schoolSettings } = useApp();
  const toast = useToast();
  const [admissions, setAdmissions] = React.useState<Admission[]>([]);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      setAdmissions(await apiRequest<Admission[]>("/api/admissions"));
    } catch (error: any) {
      toast.error(error.message || "Could not load admissions.");
    }
  }, [toast]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/admissions", {
        method: "POST",
        json: { ...form, classApplied: form.classApplied || schoolSettings.classes[0] },
      });
      setForm(emptyForm);
      toast.success("Admission application saved.");
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not save admission.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: Admission["status"]) => {
    try {
      await apiRequest(`/api/admissions/${id}/status`, { method: "PATCH", json: { status } });
      toast.success(`Admission ${status}.`);
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not update admission.");
    }
  };

  const columns: DataTableColumn<Admission>[] = [
    { key: "studentName", header: "Student", accessor: (row) => <span className="font-semibold text-slate-950">{row.studentName}</span>, sortValue: (row) => row.studentName },
    { key: "classApplied", header: "Class", accessor: (row) => row.classApplied },
    { key: "parentName", header: "Guardian", accessor: (row) => row.parentName },
    { key: "admissionNo", header: "Admission No", accessor: (row) => row.admissionNo || "-" },
    { key: "status", header: "Status", accessor: (row) => <StatusBadge tone={toneFor(row.status)}>{row.status}</StatusBadge>, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex flex-wrap gap-2">
          <button className="app-button-secondary h-9" onClick={() => updateStatus(row.id, "admitted")} disabled={row.status !== "applied"}>
            <CheckCircle2 className="h-4 w-4" />
            Admit
          </button>
          <button className="app-button-secondary h-9" onClick={() => updateStatus(row.id, "enrolled")} disabled={!["applied", "admitted"].includes(row.status)}>
            Enroll
          </button>
          <button className="app-button-secondary h-9 text-rose-600" onClick={() => updateStatus(row.id, "rejected")} disabled={row.status === "enrolled"}>
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Students</p>
          <h1 className="app-page-title">Admissions</h1>
          <p className="app-page-subtitle">Capture applications and convert admitted learners into student records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="app-panel">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">New Application</h2>
              <p className="text-sm text-slate-500">Only collect information needed for admission.</p>
            </div>
          </div>

          <ValidatedForm onSubmit={submit}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Student name</span>
              <input className="app-input" required value={form.studentName} onChange={(event) => setForm({ ...form, studentName: event.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Gender</span>
                <select className="app-select" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Date of birth</span>
                <input className="app-input" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Class applied</span>
              <select className="app-select" required value={form.classApplied} onChange={(event) => setForm({ ...form, classApplied: event.target.value })}>
                <option value="">Select class</option>
                {schoolSettings.classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Guardian name</span>
              <input className="app-input" required value={form.parentName} onChange={(event) => setForm({ ...form, parentName: event.target.value })} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input className="app-input" type="email" value={form.parentEmail} onChange={(event) => setForm({ ...form, parentEmail: event.target.value })} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Phone</span>
                <input className="app-input" value={form.parentPhone} onChange={(event) => setForm({ ...form, parentPhone: event.target.value })} />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">WhatsApp</span>
              <input className="app-input" value={form.parentWhatsApp} onChange={(event) => setForm({ ...form, parentWhatsApp: event.target.value })} placeholder="+256..." />
            </label>
            <button className="app-button-primary w-full justify-center" disabled={saving}>
              <ClipboardList className="h-4 w-4" />
              {saving ? "Saving..." : "Save Application"}
            </button>
          </ValidatedForm>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Admissions Register</h2>
          <DataTable rows={admissions} columns={columns} searchPlaceholder="Search admissions..." exportFilename="admissions-register" />
        </section>
      </div>
    </div>
  );
}

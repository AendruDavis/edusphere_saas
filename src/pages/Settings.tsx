import React from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Link2,
  LockKeyhole,
  Plus,
  Save,
  School,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SCHOOL_ROLES, isSchoolRole, type SchoolRole } from "../../shared/permissions";
import {
  DEFAULT_REPORT_SETTINGS,
  REPORT_TEMPLATE_PRESETS,
  normalizeReportSettings,
  type LogoVariants,
  type ReportSettings,
} from "../../shared/reportSettings";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { apiFieldErrors, apiRequest } from "../lib/api";
import { cn, formatCurrency } from "../lib/utils";
import type { SchoolSettings, Subject, User } from "../types";
import { AccountDialog } from "../components/accounts/AccountDialog";

type SettingsSection = "profile" | "reports" | "fees" | "grading" | "subjects" | "access";
type EditableSettings = SchoolSettings & {
  address: string;
  phone: string;
  email: string;
  academicYear: string;
  currentTerm: string;
  currency: string;
  classFees: Record<string, number>;
  gradingScale: NonNullable<SchoolSettings["gradingScale"]>;
  motto: string;
  deoCode: string;
  tin: string;
  primaryColor: string;
  secondaryColor: string;
  bankName: string;
  bankAccount: string;
  payCode: string;
  reportFooter: string;
  stampWarning: string;
  assessmentModel: NonNullable<SchoolSettings["assessmentModel"]>;
  reportSettings: ReportSettings;
};

type ReferenceItem = { id: string; name: string; detail?: string | null };
type StreamReference = ReferenceItem & { classId: string };
type TeacherAssignment = {
  id?: string;
  userId: string;
  academicYearId: string;
  classId: string;
  streamId: string | null;
  subjectId: string | null;
  isClassTeacher: boolean;
};
type AccessReferences = {
  authorizationMode: "audit" | "enforce";
  parents: ReferenceItem[];
  students: ReferenceItem[];
  staff: ReferenceItem[];
  academicYears: ReferenceItem[];
  classes: ReferenceItem[];
  streams: StreamReference[];
  subjects: ReferenceItem[];
  assignments: TeacherAssignment[];
};
type AccessReadiness = {
  unlinkedParents: number;
  unlinkedStudents: number;
  unassignedTeachers: number;
  totalUnresolved: number;
};

const sectionOptions: Array<{ id: SettingsSection; label: string; icon: React.ElementType }> = [
  { id: "profile", label: "School profile", icon: School },
  { id: "reports", label: "Reports and identity", icon: FileText },
  { id: "fees", label: "Class fees", icon: ImageIcon },
  { id: "grading", label: "Grading scale", icon: GraduationCap },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "access", label: "Access control", icon: ShieldCheck },
];

const roleLabels: Record<SchoolRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant",
  staff: "Staff",
  driver: "Driver",
  librarian: "Librarian",
  nurse: "Nurse",
};

function editableSettings(source: SchoolSettings): EditableSettings {
  return {
    ...source,
    name: source.name || "",
    logo: source.logo || null,
    level: source.level || "Primary",
    classes: source.classes || [],
    address: source.address || "",
    phone: source.phone || "",
    email: source.email || "",
    academicYear: source.academicYear || "2026/2027",
    currentTerm: source.currentTerm || "Term 1",
    currency: source.currency || "UGX",
    classFees: source.classFees || {},
    gradingScale: source.gradingScale || [],
    motto: source.motto || "",
    deoCode: source.deoCode || "",
    tin: source.tin || "",
    primaryColor: source.primaryColor || "#2563eb",
    secondaryColor: source.secondaryColor || "#15803d",
    bankName: source.bankName || "",
    bankAccount: source.bankAccount || "",
    payCode: source.payCode || "",
    reportFooter: source.reportFooter || "",
    stampWarning: source.stampWarning || "Not valid without the school official stamp",
    assessmentModel: source.assessmentModel || "percentage_100",
    reportSettings: normalizeReportSettings(source.reportSettings),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Unable to read the selected image"));
    reader.readAsDataURL(file);
  });
}

function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-blue-600" />
    </label>
  );
}

function TeacherScopeEditor({
  user,
  references,
  onChanged,
}: {
  user: User;
  references: AccessReferences;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const assignments = references.assignments.filter((assignment) => assignment.userId === user.id);
  const defaultYear = references.academicYears.find((item) => item.detail === "Active")?.id || references.academicYears[0]?.id || "";
  const [draft, setDraft] = React.useState({ academicYearId: defaultYear, classId: references.classes[0]?.id || "", streamId: "", subjectId: "", isClassTeacher: false });
  const [saving, setSaving] = React.useState(false);
  const streams = references.streams.filter((stream) => stream.classId === draft.classId);
  const labelFor = (items: ReferenceItem[], id: string | null) => id ? items.find((item) => item.id === id)?.name || "Unknown" : "All";

  const persist = async (next: TeacherAssignment[]) => {
    setSaving(true);
    try {
      await apiRequest(`/api/access/teachers/${user.id}/assignments`, {
        method: "PUT",
        json: {
          assignments: next.map(({ academicYearId, classId, streamId, subjectId, isClassTeacher }) => ({
            academicYearId,
            classId,
            streamId: streamId || null,
            subjectId: subjectId || null,
            isClassTeacher,
          })),
        },
      });
      await onChanged();
      toast.success("Teacher scope updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update teacher scope");
    } finally {
      setSaving(false);
    }
  };

  const addAssignment = async () => {
    if (!draft.academicYearId || !draft.classId || (!draft.subjectId && !draft.isClassTeacher)) {
      toast.error("Select a year, class, and either a subject or class-teacher scope.");
      return;
    }
    const candidate: TeacherAssignment = {
      userId: user.id,
      academicYearId: draft.academicYearId,
      classId: draft.classId,
      streamId: draft.streamId || null,
      subjectId: draft.subjectId || null,
      isClassTeacher: draft.isClassTeacher,
    };
    const duplicate = assignments.some((item) => item.academicYearId === candidate.academicYearId && item.classId === candidate.classId && item.streamId === candidate.streamId && item.subjectId === candidate.subjectId && item.isClassTeacher === candidate.isClassTeacher);
    if (duplicate) return;
    await persist([...assignments, candidate]);
  };

  if (!references.academicYears.length || !references.classes.length) {
    return <p className="text-xs text-amber-700">Academic years and normalized classes are required before teacher scopes can be assigned.</p>;
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teaching scope</p>
      {assignments.map((assignment) => (
        <div key={assignment.id || `${assignment.academicYearId}-${assignment.classId}-${assignment.subjectId}`} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{labelFor(references.classes, assignment.classId)} / {labelFor(references.subjects, assignment.subjectId)}</p>
            <p className="mt-1 text-slate-500">{labelFor(references.academicYears, assignment.academicYearId)}{assignment.isClassTeacher ? " / Class teacher" : ""}</p>
          </div>
          <button type="button" disabled={saving} onClick={() => void persist(assignments.filter((item) => item !== assignment))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove teaching scope">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select className="app-select min-h-11" aria-label="Academic year" value={draft.academicYearId} onChange={(event) => setDraft((value) => ({ ...value, academicYearId: event.target.value }))}>
          {references.academicYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="app-select min-h-11" aria-label="Class" value={draft.classId} onChange={(event) => setDraft((value) => ({ ...value, classId: event.target.value, streamId: "" }))}>
          {references.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="app-select min-h-11" aria-label="Stream" value={draft.streamId} onChange={(event) => setDraft((value) => ({ ...value, streamId: event.target.value }))}>
          <option value="">All streams</option>
          {streams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="app-select min-h-11" aria-label="Subject" value={draft.subjectId} onChange={(event) => setDraft((value) => ({ ...value, subjectId: event.target.value }))}>
          <option value="">No subject</option>
          {references.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.isClassTeacher} onChange={(event) => setDraft((value) => ({ ...value, isClassTeacher: event.target.checked }))} className="h-5 w-5 accent-blue-600" />
          Class teacher
        </label>
        <button type="button" disabled={saving} onClick={() => void addAssignment()} className="app-button-secondary min-h-11">
          <Plus className="h-4 w-4" /> Add scope
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { addSubject, currentUser, deactivateSubject, schoolSettings, setSchoolSettings, subjects, updateSubject, users } = useApp();
  const toast = useToast();
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("profile");
  const [localSettings, setLocalSettings] = React.useState<EditableSettings>(() => editableSettings(schoolSettings));
  const [pendingLogo, setPendingLogo] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [newClass, setNewClass] = React.useState("");
  const [newGrade, setNewGrade] = React.useState({ min: 0, grade: "", comment: "" });
  const [references, setReferences] = React.useState<AccessReferences | null>(null);
  const [readiness, setReadiness] = React.useState<AccessReadiness | null>(null);
  const [accessLoading, setAccessLoading] = React.useState(false);
  const [linking, setLinking] = React.useState<string | null>(null);
  const [linkOverrides, setLinkOverrides] = React.useState<Record<string, string>>({});
  const [accountDialogOpen, setAccountDialogOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<User | null>(null);
  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = React.useState({ name: "", code: "", schoolType: schoolSettings.level, classLevel: "" });
  const [subjectErrors, setSubjectErrors] = React.useState<Record<string, string[]>>({});
  const [subjectSaving, setSubjectSaving] = React.useState(false);

  React.useEffect(() => setLocalSettings(editableSettings(schoolSettings)), [schoolSettings]);

  const loadAccessData = React.useCallback(async () => {
    setAccessLoading(true);
    try {
      const [referenceResult, readinessResult] = await Promise.all([
        apiRequest<AccessReferences>("/api/access/reference-data"),
        apiRequest<AccessReadiness>("/api/access/readiness"),
      ]);
      setReferences(referenceResult);
      setReadiness(readinessResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load access controls");
    } finally {
      setAccessLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (activeSection === "access" && !references) void loadAccessData();
  }, [activeSection, loadAccessData, references]);

  const updateReportSetting = <Key extends keyof ReportSettings>(key: Key, value: ReportSettings[Key]) => {
    setLocalSettings((settings) => ({ ...settings, reportSettings: { ...settings.reportSettings, [key]: value } }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo files must be 3 MB or smaller.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingLogo(dataUrl);
      setLocalSettings((settings) => ({ ...settings, logo: dataUrl }));
    } catch {
      toast.error("Unable to read the selected logo.");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      let logo = localSettings.logo;
      let logoVariants = localSettings.logoVariants;
      if (pendingLogo) {
        const uploaded = await apiRequest<{ url: string; variants: LogoVariants }>("/api/storage/logo", { method: "POST", json: { dataUrl: pendingLogo } });
        logo = uploaded.url;
        logoVariants = uploaded.variants;
      }
      await setSchoolSettings({ ...localSettings, logo, logoVariants, reportSettings: localSettings.reportSettings });
      setPendingLogo(null);
      toast.success("School settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save school settings");
    } finally {
      setSaving(false);
    }
  };

  const addClass = () => {
    const value = newClass.trim();
    if (!value || localSettings.classes.includes(value)) return;
    setLocalSettings((settings) => ({ ...settings, classes: [...settings.classes, value] }));
    setNewClass("");
  };

  const addGrade = () => {
    if (!newGrade.grade.trim()) return;
    setLocalSettings((settings) => ({
      ...settings,
      gradingScale: [...settings.gradingScale, { ...newGrade, grade: newGrade.grade.trim(), comment: newGrade.comment.trim() }].sort((left, right) => right.min - left.min),
    }));
    setNewGrade({ min: 0, grade: "", comment: "" });
  };

  const rolesFor = (user: User): SchoolRole[] => user.roles?.length
    ? user.roles
    : isSchoolRole(user.role) ? [user.role] : [];

  const editSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setSubjectDraft({
      name: subject.name,
      code: subject.code || "",
      schoolType: subject.schoolType || localSettings.level,
      classLevel: subject.classLevel || "",
    });
    setSubjectErrors({});
  };

  const resetSubjectDraft = () => {
    setEditingSubjectId(null);
    setSubjectDraft({ name: "", code: "", schoolType: localSettings.level, classLevel: "" });
    setSubjectErrors({});
  };

  const saveSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubjectSaving(true);
    setSubjectErrors({});
    try {
      if (editingSubjectId) await updateSubject(editingSubjectId, subjectDraft);
      else await addSubject(subjectDraft);
      toast.success(editingSubjectId ? "Subject updated." : "Subject added.");
      resetSubjectDraft();
    } catch (error) {
      setSubjectErrors(apiFieldErrors(error));
      toast.error(error instanceof Error ? error.message : "Unable to save subject");
    } finally {
      setSubjectSaving(false);
    }
  };

  const linkAccount = async (user: User, kind: "parent" | "student" | "staff", recordId: string) => {
    if (!recordId) return;
    const key = `${kind}:${user.id}`;
    setLinking(key);
    try {
      await apiRequest(`/api/access/links/${kind}`, { method: "PUT", json: { userId: user.id, recordId } });
      setLinkOverrides((value) => ({ ...value, [key]: recordId }));
      await loadAccessData();
      toast.success("Account record linked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to link account");
    } finally {
      setLinking(null);
    }
  };

  const enableEnforcement = async () => {
    if (!readiness || readiness.totalUnresolved > 0) return;
    try {
      await apiRequest("/api/access/enforcement", { method: "PUT", json: { mode: "enforce" } });
      await loadAccessData();
      toast.success("Record-level access enforcement enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable enforcement");
    }
  };

  const logoPreview = pendingLogo || localSettings.logoVariants?.square || localSettings.logo;
  const activeOption = sectionOptions.find((section) => section.id === activeSection)!;

  return (
    <div className="app-page mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-page-kicker">Administration</p>
          <h1 className="app-page-title">System settings</h1>
          <p className="app-page-subtitle">School identity, report presentation, academic rules, and access.</p>
        </div>
        <button type="button" disabled={saving} onClick={() => void saveSettings()} className="app-button-primary min-h-11 w-full sm:w-auto">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      <label className="block lg:hidden">
        <span className="mb-2 block text-sm font-semibold text-slate-700">Settings section</span>
        <select className="app-select min-h-11" value={activeSection} onChange={(event) => setActiveSection(event.target.value as SettingsSection)}>
          {sectionOptions.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="hidden border-r border-slate-200 pr-4 lg:block" aria-label="Settings sections">
          <div className="sticky top-2 space-y-1">
            {sectionOptions.map((section) => (
              <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium", activeSection === section.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")}>
                <section.icon className="h-4 w-4" /> {section.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="min-w-0" aria-labelledby={`settings-${activeSection}`}>
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <activeOption.icon className="h-5 w-5 text-blue-600" />
            <h2 id={`settings-${activeSection}`} className="text-lg font-semibold text-slate-950">{activeOption.label}</h2>
          </div>

          {activeSection === "profile" && (
            <div className="app-panel space-y-6">
              <div>
                <h2 id="settings-profile" className="text-lg font-semibold text-slate-950">School profile</h2>
                <p className="mt-1 text-sm text-slate-500">Official identity and contact details.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">Official school name</span><input className="app-input" value={localSettings.name} onChange={(event) => setLocalSettings((value) => ({ ...value, name: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">School level</span><select className="app-select" value={localSettings.level} onChange={(event) => setLocalSettings((value) => ({ ...value, level: event.target.value as "Primary" | "Secondary" }))}><option>Primary</option><option>Secondary</option></select></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Academic year</span><input className="app-input" value={localSettings.academicYear} onChange={(event) => setLocalSettings((value) => ({ ...value, academicYear: event.target.value }))} /></label>
                <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">Motto</span><input className="app-input" value={localSettings.motto} onChange={(event) => setLocalSettings((value) => ({ ...value, motto: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Email</span><input type="email" className="app-input" value={localSettings.email} onChange={(event) => setLocalSettings((value) => ({ ...value, email: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Phone</span><input className="app-input" value={localSettings.phone} onChange={(event) => setLocalSettings((value) => ({ ...value, phone: event.target.value }))} /></label>
                <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">Address or P.O. Box</span><input className="app-input" value={localSettings.address} onChange={(event) => setLocalSettings((value) => ({ ...value, address: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">DEO code</span><input className="app-input" value={localSettings.deoCode} onChange={(event) => setLocalSettings((value) => ({ ...value, deoCode: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">TIN</span><input className="app-input" value={localSettings.tin} onChange={(event) => setLocalSettings((value) => ({ ...value, tin: event.target.value }))} /></label>
              </div>
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Classes</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {localSettings.classes.map((className) => (
                    <span key={className} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm text-slate-700">{className}<button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setLocalSettings((value) => ({ ...value, classes: value.classes.filter((item) => item !== className) }))} aria-label={`Remove ${className}`}><Trash2 className="h-3.5 w-3.5" /></button></span>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="app-input" value={newClass} onChange={(event) => setNewClass(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addClass(); } }} placeholder="Class name" /><button type="button" onClick={addClass} className="app-button-secondary min-h-11 shrink-0"><Plus className="h-4 w-4" /> Add class</button></div>
              </div>
            </div>
          )}

          {activeSection === "reports" && (
            <div className="app-panel space-y-6">
              <div><h2 id="settings-reports" className="text-lg font-semibold text-slate-950">Reports and identity</h2><p className="mt-1 text-sm text-slate-500">Shared branding and report defaults.</p></div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                      {logoPreview ? <img src={logoPreview} alt="School logo preview" className="h-full w-full object-contain p-2" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
                    </div>
                    <div><label className="app-button-secondary min-h-11 cursor-pointer"><Upload className="h-4 w-4" /> Select logo<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleLogoUpload(event)} /></label><p className="mt-2 text-xs text-slate-500">PNG, JPEG, or WebP, up to 3 MB.</p></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label><span className="mb-2 block text-sm font-medium text-slate-700">Primary color</span><span className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg border border-slate-200 bg-white p-1" value={localSettings.primaryColor} onChange={(event) => setLocalSettings((value) => ({ ...value, primaryColor: event.target.value }))} /><input className="app-input" value={localSettings.primaryColor} onChange={(event) => setLocalSettings((value) => ({ ...value, primaryColor: event.target.value }))} /></span></label>
                    <label><span className="mb-2 block text-sm font-medium text-slate-700">Secondary color</span><span className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg border border-slate-200 bg-white p-1" value={localSettings.secondaryColor} onChange={(event) => setLocalSettings((value) => ({ ...value, secondaryColor: event.target.value }))} /><input className="app-input" value={localSettings.secondaryColor} onChange={(event) => setLocalSettings((value) => ({ ...value, secondaryColor: event.target.value }))} /></span></label>
                  </div>
                  <div><span className="mb-2 block text-sm font-medium text-slate-700">Report preset</span><div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">{REPORT_TEMPLATE_PRESETS.map((preset) => <button key={preset} type="button" onClick={() => updateReportSetting("preset", preset)} className={cn("min-h-10 rounded-md px-2 text-xs font-semibold capitalize", localSettings.reportSettings.preset === preset ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}>{preset}</button>)}</div></div>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Report title</span><input className="app-input" value={localSettings.reportSettings.title} onChange={(event) => updateReportSetting("title", event.target.value)} /></label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-medium text-slate-700">Class teacher label</span><input className="app-input" value={localSettings.reportSettings.classTeacherLabel} onChange={(event) => updateReportSetting("classTeacherLabel", event.target.value)} /></label><label><span className="mb-2 block text-sm font-medium text-slate-700">Head teacher label</span><input className="app-input" value={localSettings.reportSettings.headTeacherLabel} onChange={(event) => updateReportSetting("headTeacherLabel", event.target.value)} /></label></div>
                  <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    <ToggleRow label="Show school logo" checked={localSettings.reportSettings.showLogo} onChange={(value) => updateReportSetting("showLogo", value)} />
                    <ToggleRow label="Show student photo" checked={localSettings.reportSettings.showStudentPhoto} onChange={(value) => updateReportSetting("showStudentPhoto", value)} />
                    <ToggleRow label="Show class position" checked={localSettings.reportSettings.showPosition} onChange={(value) => updateReportSetting("showPosition", value)} />
                    <ToggleRow label="Show attendance" checked={localSettings.reportSettings.showAttendance} onChange={(value) => updateReportSetting("showAttendance", value)} />
                    <ToggleRow label="Show fee summary" checked={localSettings.reportSettings.showFees} onChange={(value) => updateReportSetting("showFees", value)} />
                    <ToggleRow label="Show health summary" checked={localSettings.reportSettings.showHealth} onChange={(value) => updateReportSetting("showHealth", value)} />
                    <ToggleRow label="Show library summary" checked={localSettings.reportSettings.showLibrary} onChange={(value) => updateReportSetting("showLibrary", value)} />
                  </div>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Report footer</span><input className="app-input" value={localSettings.reportFooter} onChange={(event) => setLocalSettings((value) => ({ ...value, reportFooter: event.target.value }))} /></label>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Official stamp notice</span><input className="app-input" value={localSettings.stampWarning} onChange={(event) => setLocalSettings((value) => ({ ...value, stampWarning: event.target.value }))} /></label>
                </div>
                <aside className="border-t border-slate-200 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" aria-label="Report preview">
                  <div className="sticky top-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="h-2" style={{ backgroundColor: localSettings.primaryColor }} />
                    <div className="p-5 text-center">
                      {localSettings.reportSettings.showLogo && logoPreview && <img src={logoPreview} alt="" className="mx-auto mb-3 h-14 w-14 object-contain" />}
                      <p className="text-sm font-bold text-slate-950">{localSettings.name || "School name"}</p><p className="mt-1 text-[10px] text-slate-500">{localSettings.motto}</p>
                      <p className="mt-4 border-y border-slate-200 py-2 text-[10px] font-bold text-slate-800">{localSettings.reportSettings.title}</p>
                      <div className="mt-4 space-y-2 text-left text-[10px] text-slate-600"><p className="flex justify-between"><span>Student</span><strong>Sample learner</strong></p><p className="flex justify-between"><span>Class</span><strong>P.6</strong></p>{localSettings.reportSettings.showPosition && <p className="flex justify-between"><span>Position</span><strong>4 / 32</strong></p>}</div>
                      <div className="mt-4 h-20 rounded bg-slate-100" />
                      <div className="mt-3 flex flex-wrap gap-1">{localSettings.reportSettings.showAttendance && <span className="rounded bg-slate-100 px-2 py-1 text-[9px]">Attendance</span>}{localSettings.reportSettings.showFees && <span className="rounded bg-slate-100 px-2 py-1 text-[9px]">Fees</span>}{localSettings.reportSettings.showHealth && <span className="rounded bg-slate-100 px-2 py-1 text-[9px]">Health</span>}{localSettings.reportSettings.showLibrary && <span className="rounded bg-slate-100 px-2 py-1 text-[9px]">Library</span>}</div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeSection === "fees" && (
            <div className="app-panel space-y-6">
              <div><h2 id="settings-fees" className="text-lg font-semibold text-slate-950">Fee defaults</h2><p className="mt-1 text-sm text-slate-500">Choose the active reporting period and payment currency.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Current term</span><select className="app-select" value={localSettings.currentTerm} onChange={(event) => setLocalSettings((value) => ({ ...value, currentTerm: event.target.value }))}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Academic year</span><input className="app-input" value={localSettings.academicYear} onChange={(event) => setLocalSettings((value) => ({ ...value, academicYear: event.target.value }))} /></label>
                <label><span className="mb-2 block text-sm font-medium text-slate-700">Currency</span><input className="app-input" value={localSettings.currency} onChange={(event) => setLocalSettings((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} /></label>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-medium text-slate-700">Bank name</span><input className="app-input" value={localSettings.bankName} onChange={(event) => setLocalSettings((value) => ({ ...value, bankName: event.target.value }))} /></label><label><span className="mb-2 block text-sm font-medium text-slate-700">Bank account</span><input className="app-input" value={localSettings.bankAccount} onChange={(event) => setLocalSettings((value) => ({ ...value, bankAccount: event.target.value }))} /></label><label><span className="mb-2 block text-sm font-medium text-slate-700">School pay code</span><input className="app-input" value={localSettings.payCode} onChange={(event) => setLocalSettings((value) => ({ ...value, payCode: event.target.value }))} /></label></div>
              <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-blue-900">Class charges are managed as term-specific fee structures.</p><Link to="/fees" className="app-button-primary shrink-0">Open fee configuration</Link></div>
            </div>
          )}

          {activeSection === "grading" && (
            <div className="app-panel space-y-6"><div><h2 id="settings-grading" className="text-lg font-semibold text-slate-950">Grading scale</h2><p className="mt-1 text-sm text-slate-500">Ordered score boundaries and report comments.</p></div><div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[7rem_8rem_minmax(0,1fr)_auto]"><label><span className="mb-1 block text-xs font-semibold text-slate-500">Minimum</span><input type="number" min={0} max={100} className="app-input" value={newGrade.min} onChange={(event) => setNewGrade((value) => ({ ...value, min: Number(event.target.value) || 0 }))} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">Grade</span><input className="app-input" value={newGrade.grade} onChange={(event) => setNewGrade((value) => ({ ...value, grade: event.target.value }))} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">Comment</span><input className="app-input" value={newGrade.comment} onChange={(event) => setNewGrade((value) => ({ ...value, comment: event.target.value }))} /></label><button type="button" onClick={addGrade} className="app-button-primary min-h-11 self-end"><Plus className="h-4 w-4" /> Add</button></div><div className="divide-y divide-slate-200 rounded-lg border border-slate-200">{localSettings.gradingScale.map((grade, index) => <div key={`${grade.grade}-${grade.min}`} className="grid grid-cols-[4rem_minmax(0,1fr)_2.75rem] items-center gap-3 p-3 sm:grid-cols-[5rem_6rem_minmax(0,1fr)_2.75rem]"><strong className="text-sm text-blue-700">{grade.min}%</strong><span className="hidden text-sm font-semibold text-slate-900 sm:block">{grade.grade}</span><span className="min-w-0 text-sm text-slate-600"><strong className="mr-2 sm:hidden">{grade.grade}</strong>{grade.comment}</span><button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => setLocalSettings((value) => ({ ...value, gradingScale: value.gradingScale.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Remove ${grade.grade}`}><Trash2 className="h-4 w-4" /></button></div>)}{!localSettings.gradingScale.length && <p className="p-6 text-center text-sm text-slate-500">No grading bands configured.</p>}</div></div>
          )}

          {activeSection === "subjects" && (
            <div className="space-y-6">
              <form onSubmit={saveSubject} className="app-panel space-y-5" noValidate>
                <div><h2 id="settings-subjects" className="text-lg font-semibold text-slate-950">Academic subjects</h2><p className="mt-1 text-sm text-slate-500">One shared subject list is used for marks, timetables, and teacher scopes.</p></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Subject name</span><input className="app-input" required value={subjectDraft.name} onChange={(event) => setSubjectDraft((value) => ({ ...value, name: event.target.value }))} />{subjectErrors.name?.[0] && <span className="mt-1 block text-xs text-rose-700">{subjectErrors.name[0]}</span>}</label>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Code</span><input className="app-input" required value={subjectDraft.code} onChange={(event) => setSubjectDraft((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />{subjectErrors.code?.[0] && <span className="mt-1 block text-xs text-rose-700">{subjectErrors.code[0]}</span>}</label>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">School level</span><select className="app-select" value={subjectDraft.schoolType} onChange={(event) => setSubjectDraft((value) => ({ ...value, schoolType: event.target.value as "Primary" | "Secondary" }))}><option>Primary</option><option>Secondary</option></select></label>
                  <label><span className="mb-2 block text-sm font-medium text-slate-700">Class range</span><input className="app-input" placeholder="For example P.1-P.7" value={subjectDraft.classLevel} onChange={(event) => setSubjectDraft((value) => ({ ...value, classLevel: event.target.value }))} /></label>
                </div>
                <div className="flex flex-wrap justify-end gap-2">{editingSubjectId && <button type="button" className="app-button-secondary" onClick={resetSubjectDraft}>Cancel edit</button>}<button type="submit" className="app-button-primary" disabled={subjectSaving}><Plus className="h-4 w-4" />{subjectSaving ? "Saving..." : editingSubjectId ? "Update subject" : "Add subject"}</button></div>
              </form>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="divide-y divide-slate-200">{subjects.map((subject) => <div key={subject.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{subject.name}</h3><span className={cn("app-badge", subject.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{subject.active ? "Active" : "Inactive"}</span></div><p className="mt-1 text-sm text-slate-500">{subject.code || "No code"}{subject.schoolType ? ` / ${subject.schoolType}` : ""}{subject.classLevel ? ` / ${subject.classLevel}` : ""}</p></div><div className="flex gap-2"><button type="button" className="app-button-secondary" onClick={() => editSubject(subject)}>Edit</button><button type="button" className="app-button-secondary" onClick={() => void (subject.active ? deactivateSubject(subject.id) : updateSubject(subject.id, { active: true }))}>{subject.active ? "Deactivate" : "Reactivate"}</button></div></div>)}{!subjects.length && <div className="app-empty-state">No subjects configured.</div>}</div>
              </div>
            </div>
          )}

          {activeSection === "access" && (
            <div className="space-y-6">
              <div className="app-panel space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 id="settings-access" className="text-lg font-semibold text-slate-950">Access control</h2><p className="mt-1 text-sm text-slate-500">School roles, linked identities, and teaching scopes.</p></div>{references && <span className={cn("app-badge self-start", references.authorizationMode === "enforce" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>{references.authorizationMode === "enforce" ? "Enforced" : "Audit mode"}</span>}</div>
                {accessLoading && !references ? <p className="py-8 text-center text-sm text-slate-500">Loading access controls...</p> : readiness && references ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-2xl font-bold text-slate-950">{readiness.totalUnresolved}</p><p className="text-xs text-slate-500">Unresolved</p></div><div><p className="text-2xl font-bold text-slate-950">{readiness.unlinkedParents}</p><p className="text-xs text-slate-500">Parents</p></div><div><p className="text-2xl font-bold text-slate-950">{readiness.unlinkedStudents}</p><p className="text-xs text-slate-500">Students</p></div><div><p className="text-2xl font-bold text-slate-950">{readiness.unassignedTeachers}</p><p className="text-xs text-slate-500">Teachers</p></div></div>
                    {references.authorizationMode === "audit" && <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><p className="text-sm text-amber-900">Resolve all account links and teaching scopes before enabling enforcement.</p></div><button type="button" disabled={readiness.totalUnresolved > 0} onClick={() => void enableEnforcement()} className="app-button-primary min-h-11 shrink-0 disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> Enable enforcement</button></div>}
                  </div>
                ) : null}
              </div>

              {references && <div className="space-y-4">{users.map((user) => {
                const userRoles = rolesFor(user);
                const linkedParent = linkOverrides[`parent:${user.id}`] || user.parentId || "";
                const linkedStudent = linkOverrides[`student:${user.id}`] || user.studentId || "";
                const linkedStaff = linkOverrides[`staff:${user.id}`] || user.staffId || "";
                return (
                  <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-950">{user.name}</h3><p className="truncate text-xs text-slate-500">{user.email}</p><div className="mt-2 flex flex-wrap gap-1.5">{userRoles.map((role) => <span key={role} className="app-badge bg-blue-50 text-blue-800">{roleLabels[role]}</span>)}{user.platformRole && <span className="app-badge bg-slate-900 text-white">Platform {user.platformRole.replace("_", " ")}</span>}</div></div><button type="button" className="app-button-secondary shrink-0" onClick={() => { setEditingAccount(user); setAccountDialogOpen(true); }}>Edit account</button></div>
                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {userRoles.includes("parent") && <label><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Link2 className="h-3.5 w-3.5" /> Parent record</span><select className="app-select min-h-11" value={linkedParent} disabled={linking === `parent:${user.id}`} onChange={(event) => void linkAccount(user, "parent", event.target.value)}><option value="">Select parent</option>{references.parents.map((item) => <option key={item.id} value={item.id}>{item.name}{item.detail ? ` / ${item.detail}` : ""}</option>)}</select></label>}
                      {userRoles.includes("student") && <label><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Link2 className="h-3.5 w-3.5" /> Student record</span><select className="app-select min-h-11" value={linkedStudent} disabled={linking === `student:${user.id}`} onChange={(event) => void linkAccount(user, "student", event.target.value)}><option value="">Select student</option>{references.students.map((item) => <option key={item.id} value={item.id}>{item.name}{item.detail ? ` / ${item.detail}` : ""}</option>)}</select></label>}
                      {userRoles.includes("staff") && <label><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Link2 className="h-3.5 w-3.5" /> Staff record</span><select className="app-select min-h-11" value={linkedStaff} disabled={linking === `staff:${user.id}`} onChange={(event) => void linkAccount(user, "staff", event.target.value)}><option value="">Select staff member</option>{references.staff.map((item) => <option key={item.id} value={item.id}>{item.name}{item.detail ? ` / ${item.detail}` : ""}</option>)}</select></label>}
                    </div>
                    {userRoles.includes("teacher") && <TeacherScopeEditor user={user} references={references} onChanged={loadAccessData} />}
                  </article>
                );
              })}{!users.length && <div className="app-empty-state"><Users className="mx-auto mb-2 h-6 w-6" />No school users found.</div>}</div>}
            </div>
          )}
        </section>
      </div>
      <AccountDialog open={accountDialogOpen} account={editingAccount} onClose={() => { setAccountDialogOpen(false); setEditingAccount(null); }} onSaved={() => { setReferences(null); void loadAccessData(); }} />
    </div>
  );
}

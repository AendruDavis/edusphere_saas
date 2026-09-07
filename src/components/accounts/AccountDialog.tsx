import React from "react";
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { SCHOOL_ROLES, type SchoolRole } from "../../../shared/permissions";
import type { AccountProvisioningResult, User } from "../../types";
import { useApp } from "../../context/AppContext";
import { apiFieldErrors } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { ResponsiveDialog } from "../ui/ResponsiveDialog";
import { FormGrid } from "../ui/ResponsivePrimitives";

const ROLE_LABELS: Record<SchoolRole, string> = {
  admin: "School administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent / guardian",
  accountant: "Accountant",
  staff: "Staff",
  driver: "Driver",
  librarian: "Librarian",
  nurse: "Nurse",
};

function rolesForUser(user: User | null): SchoolRole[] {
  if (!user) return ["teacher"];
  if (user.roles?.length) return user.roles;
  return SCHOOL_ROLES.includes(user.role as SchoolRole) ? [user.role as SchoolRole] : [];
}

function sameRoles(left: SchoolRole[], right: SchoolRole[]) {
  return [...left].sort().join("|") === [...right].sort().join("|");
}

export function AccountDialog({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: User | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { addUser, currentUser, resetUserPassword, updateUser, updateUserRoles } = useApp();
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [roles, setRoles] = React.useState<SchoolRole[]>(["teacher"]);
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [saving, setSaving] = React.useState(false);
  const [provisioned, setProvisioned] = React.useState<AccountProvisioningResult | null>(null);
  const originalRoles = React.useMemo(() => rolesForUser(account), [account]);
  const editingSelf = account?.id === currentUser?.id;
  const administratorChanged = originalRoles.includes("admin") !== roles.includes("admin");

  React.useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setEmail(account?.email ?? "");
    setDept(account?.dept ?? "");
    setRoles(rolesForUser(account));
    setConfirmPassword("");
    setErrors({});
    setProvisioned(null);
  }, [account, open]);

  const toggleRole = (role: SchoolRole) => {
    if (editingSelf) return;
    setRoles((current) => current.includes(role) ? current.filter((entry) => entry !== role) : [...current, role]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    if (roles.length === 0) {
      setErrors({ roles: ["Select at least one role"] });
      return;
    }
    setSaving(true);
    try {
      if (!account) {
        const result = await addUser({ name, email, dept, roles, confirmPassword: roles.includes("admin") ? confirmPassword : undefined });
        setProvisioned(result);
        toast.success("Account created. Share the temporary password privately.");
      } else {
        const profileChanged = name !== account.name || email !== account.email || dept !== (account.dept ?? "");
        if (profileChanged) await updateUser(account.id, { name, email, dept });
        if (!sameRoles(originalRoles, roles)) {
          await updateUserRoles(account.id, roles, administratorChanged ? confirmPassword : undefined);
        }
        toast.success("Account access updated.");
        onSaved?.();
        onClose();
      }
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error instanceof Error ? error.message : "Unable to save this account");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!account) return;
    setErrors({});
    setSaving(true);
    try {
      const result = await resetUserPassword(account.id, confirmPassword);
      setProvisioned(result);
      toast.success("A new temporary password has been issued.");
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error instanceof Error ? error.message : "Unable to reset this password");
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = async () => {
    if (!provisioned) return;
    await navigator.clipboard.writeText(provisioned.temporaryPassword);
    toast.success("Temporary password copied.");
  };

  const fieldError = (field: string) => errors[field]?.[0];

  return (
    <ResponsiveDialog
      open={open}
      title={provisioned ? "Temporary password" : account ? "Edit login account" : "Create login account"}
      description={provisioned ? "This password is shown once. Share it using a private channel." : "Assign only the access needed for this person's work."}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={provisioned ? (
        <button type="button" className="app-button-primary" onClick={() => { onSaved?.(); onClose(); }}>Done</button>
      ) : (
        <>
          <button type="button" className="app-button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="account-dialog-form" className="app-button-primary" disabled={saving}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving..." : account ? "Save account" : "Create account"}
          </button>
        </>
      )}
    >
      {provisioned ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The user must change this password at first sign-in. It cannot be retrieved after this dialog closes.
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Temporary password
            <span className="mt-2 flex gap-2">
              <input className="app-input font-mono" readOnly value={provisioned.temporaryPassword} aria-label="Temporary password" />
              <button type="button" className="app-button-secondary px-3" onClick={copyPassword} aria-label="Copy temporary password">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </span>
          </label>
        </div>
      ) : (
        <form id="account-dialog-form" onSubmit={submit} className="space-y-5" noValidate>
          <FormGrid>
            <Field label="Full name" value={name} onChange={setName} error={fieldError("name")} autoComplete="name" />
            <Field label="Email address" value={email} onChange={setEmail} error={fieldError("email")} type="email" autoComplete="email" />
          </FormGrid>
          <Field label="Department (optional)" value={dept} onChange={setDept} error={fieldError("dept")} />

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">School roles</legend>
            <p className="mt-1 text-xs text-slate-500">Multiple roles combine permissions. Changes are enforced by the server.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SCHOOL_ROLES.map((role) => (
                <label key={role} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={roles.includes(role)} disabled={editingSelf} onChange={() => toggleRole(role)} className="h-4 w-4 accent-blue-600" />
                  <span>{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            {editingSelf && <p className="mt-2 text-xs text-amber-700">Your own roles cannot be changed from this account.</p>}
            {fieldError("roles") && <p className="mt-2 text-xs text-rose-700">{fieldError("roles")}</p>}
          </fieldset>

          {((!account && roles.includes("admin")) || administratorChanged || account) && (
            <div className="border-t border-slate-200 pt-5">
              <label className="block text-sm font-semibold text-slate-700">
                Your password {account && !administratorChanged ? "(required only to reset password)" : ""}
                <span className="relative mt-2 block">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required={!account && roles.includes("admin") || administratorChanged}
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldError("confirmPassword"))}
                    className="app-input pl-10"
                  />
                </span>
              </label>
              {fieldError("confirmPassword") && <p className="mt-1.5 text-xs text-rose-700">{fieldError("confirmPassword")}</p>}
              {account && (
                <button type="button" className="app-button-secondary mt-3" disabled={saving || !confirmPassword} onClick={resetPassword}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Issue new temporary password
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </ResponsiveDialog>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
      {label}
      <span className="relative mt-2 block">
        {type === "email" ? <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /> : null}
        <input
          id={id}
          type={type}
          required={label !== "Department (optional)"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`app-input ${type === "email" ? "pl-10" : ""}`}
        />
      </span>
      {error && <span className="mt-1.5 block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

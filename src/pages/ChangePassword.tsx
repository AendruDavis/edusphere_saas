import React from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { apiFieldErrors } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function ChangePassword() {
  const { changePassword, currentUser, logout } = useApp();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [saving, setSaving] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      toast.success("Password changed. Your school workspace is ready.");
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field: string) => errors[field]?.[0];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
        <div className="h-1.5 bg-blue-600" />
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Create your private password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {currentUser?.name}, replace the temporary password before opening school records.
          </p>

          <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
            <PasswordField
              label="Temporary password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              error={fieldError("currentPassword")}
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              error={fieldError("newPassword")}
              hint="Use at least 12 characters. A short phrase is easier to remember."
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={fieldError("confirmPassword")}
            />
            <button type="submit" disabled={saving} className="app-button-primary w-full">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {saving ? "Changing password..." : "Change password"}
            </button>
          </form>

          <button type="button" onClick={() => void logout()} className="mt-4 min-h-11 w-full text-sm font-semibold text-slate-600 hover:text-slate-950">
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  const id = React.useId();
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type="password"
          required
          minLength={label === "New password" ? 12 : 1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className="app-input min-h-11 pl-10"
        />
      </span>
      {(error || hint) && <span id={`${id}-help`} className={`mt-1.5 block text-xs ${error ? "text-rose-700" : "text-slate-500"}`}>{error || hint}</span>}
    </label>
  );
}

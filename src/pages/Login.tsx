import React, { useState } from "react";
import { BookOpen, GraduationCap, Lock, LogIn, Mail, ShieldCheck, Stethoscope, Wallet } from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

const roles = [
  { role: "Admin", icon: ShieldCheck },
  { role: "Teacher", icon: GraduationCap },
  { role: "Accountant", icon: Wallet },
  { role: "Librarian", icon: BookOpen },
  { role: "Nurse", icon: Stethoscope },
];

export default function Login() {
  const { login, loginWithCredentials, isLoggingIn } = useApp();
  const toast = useToast();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCredentialLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole) {
      toast.warning("Choose your role before signing in.");
      return;
    }

    try {
      await loginWithCredentials(email, password, selectedRole.toLowerCase());
      toast.success("Welcome back. Your workspace is ready.");
    } catch {
      // AppContext shows the error toast.
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_520px]">
      <section className="hidden min-h-screen flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">EduSphere</p>
            <p className="text-sm text-slate-400">School operations platform</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-300">Secure portal</p>
          <h1 className="text-5xl font-semibold tracking-tight">A clearer workspace for running the school day.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Manage learners, payments, academics, attendance, and staff from one calm operational surface.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Role based</p>
            <p className="mt-1 text-xs leading-5">Access follows staff responsibility.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Audit ready</p>
            <p className="mt-1 text-xs leading-5">Key academic workflows are traceable.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">Local first</p>
            <p className="mt-1 text-xs leading-5">Built around school operations.</p>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">EduSphere</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>
          </div>

          <div className="app-panel p-6 sm:p-8">
            <div className="mb-7">
              <p className="app-page-kicker">Account access</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Select your role and enter your official account credentials.</p>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-slate-700">Role</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {roles.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRole(item.role)}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                      selectedRole === item.role ? "border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs">{item.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <span className="relative block">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@edusphere.com" required className="app-input pl-10" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <span className="relative block">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required className="app-input pl-10" />
                </span>
              </label>

              <button type="submit" disabled={isLoggingIn || !selectedRole} className="app-button-primary w-full">
                {isLoggingIn ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <LogIn className="h-4 w-4" />}
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button type="button" onClick={login} disabled={isLoggingIn} className="app-button-secondary w-full">
              <LogIn className="h-4 w-4" />
              Google SSO
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">Protected workspace for authorized school staff.</p>
        </div>
      </main>
    </div>
  );
}

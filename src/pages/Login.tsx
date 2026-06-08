import React, { useState } from "react";
import { Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login, loginWithCredentials, isLoggingIn } = useApp();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCredentialLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await loginWithCredentials(email, password);
      toast.success("Welcome back. Your workspace is ready.");
    } catch {
      // AppContext shows the error toast.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8 rounded-[40px] border border-gray-100/50 bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gray-900 text-white shadow-2xl shadow-gray-200">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h2 className="text-4xl font-black leading-none tracking-tight text-gray-900">EduSphere</h2>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-gray-400">Portal Management</p>
        </div>

        <div className="space-y-8">
          <form onSubmit={handleCredentialLogin} className="space-y-5">
            <div className="space-y-4">
              <label className="block text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Account Credentials</label>
              <div className="group relative">
                <Mail className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Official Email Address"
                  required
                  autoComplete="email"
                  className="webapp-input !pl-14"
                />
              </div>
              <div className="group relative">
                <Lock className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-gray-900" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="System Password"
                  required
                  autoComplete="current-password"
                  className="webapp-input !pl-14"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoggingIn} className="webapp-btn-primary group relative w-full overflow-hidden">
              <span className="relative flex items-center justify-center gap-3">
                {isLoggingIn ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoggingIn ? "Verifying..." : "Access Portal"}
              </span>
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-3 rounded-3xl border-2 border-gray-100 py-4 text-xs font-black uppercase tracking-widest text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            Google SSO
          </button>
        </div>

        <div className="border-t border-gray-50 pt-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Powered by EduSphere Academy</p>
        </div>
      </div>
    </div>
  );
}

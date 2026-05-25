import React, { useState } from "react";
import { LogIn, ShieldCheck, BookOpen, Stethoscope, GraduationCap, Wallet, Mail, Lock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";

export default function Login() {
  const { login, loginWithCredentials, isLoggingIn } = useApp();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      alert("Please select your role first.");
      return;
    }
    try {
      await loginWithCredentials(email, password, selectedRole.toLowerCase());
    } catch (e) {
      // Error handled in context
    }
  };

  const roles = [
    { role: "Admin", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { role: "Librarian", icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
    { role: "Nurse", icon: Stethoscope, color: "text-rose-600", bg: "bg-rose-50" },
    { role: "Teacher", icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
    { role: "Accountant", icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100/50">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gray-900 rounded-[28px] flex items-center justify-center text-white mb-6 shadow-2xl shadow-gray-200">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none">EduSphere</h2>
          <p className="mt-3 text-xs text-gray-400 font-bold uppercase tracking-[0.3em]">
            Portal Management
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] block text-center">Identity & Role</label>
            <div className="grid grid-cols-5 gap-3">
              {roles.map((item) => (
                <button 
                  key={item.role} 
                  onClick={() => setSelectedRole(item.role)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all hover:scale-110 active:scale-95 shadow-sm",
                    selectedRole === item.role 
                      ? "border-gray-900 bg-gray-900 text-white shadow-xl shadow-gray-200" 
                      : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 mb-1.5", selectedRole === item.role ? "text-white" : item.color)} />
                  <span className="text-[7px] font-black uppercase tracking-tighter truncate w-full">{item.role}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCredentialLogin} className="space-y-5">
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] block text-center">Account Credentials</label>
               <div className="relative group">
                 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                 <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Official Email Address"
                  required
                  className="webapp-input !pl-14"
                 />
               </div>
               <div className="relative group">
                 <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                 <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="System Password"
                  required
                  className="webapp-input !pl-14"
                 />
               </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !selectedRole}
              className="webapp-btn-primary w-full group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              <span className="relative flex items-center justify-center gap-3">
                {isLoggingIn ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 text-emerald-400" />
                )}
                {isLoggingIn ? "Verifying..." : "Access Portal"}
              </span>
            </button>
          </form>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-3xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
            Google SSO
          </button>
        </div>

        <div className="pt-6 text-center border-t border-gray-50">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Powered by EduSphere Academy
          </p>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Lock, LogIn, Mail, School, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import type { PublicSchoolBranding } from "../../shared/reportSettings";
import { useApp } from "../context/AppContext";
import { apiRequest } from "../lib/api";
import { useToast } from "../context/ToastContext";

const DEFAULT_ACCENT = "#2563eb";

function readableTextColor(hex: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return "#ffffff";
  const [red, green, blue] = match.slice(1).map((part) => Number.parseInt(part, 16));
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

export default function Login() {
  const { schoolSlug } = useParams<{ schoolSlug?: string }>();
  const { loginWithCredentials, isLoggingIn } = useApp();
  const toast = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [branding, setBranding] = React.useState<PublicSchoolBranding | null>(null);
  const [brandingLoading, setBrandingLoading] = React.useState(Boolean(schoolSlug));
  const [schoolUnavailable, setSchoolUnavailable] = React.useState(false);

  React.useEffect(() => {
    if (!schoolSlug) {
      setBranding(null);
      setBrandingLoading(false);
      setSchoolUnavailable(false);
      return;
    }

    const controller = new AbortController();
    setBrandingLoading(true);
    setSchoolUnavailable(false);
    void apiRequest<PublicSchoolBranding>(`/api/public/schools/${encodeURIComponent(schoolSlug)}/branding`, {
      signal: controller.signal,
    })
      .then((result) => {
        setBranding(result);
        document.title = `${result.name} | EduSphere`;
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setSchoolUnavailable(true);
      })
      .finally(() => setBrandingLoading(false));

    return () => controller.abort();
  }, [schoolSlug]);

  React.useEffect(() => {
    const favicon = branding?.logoVariants.favicon;
    if (!favicon) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ?? document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    if (!link.parentNode) document.head.appendChild(link);
  }, [branding]);

  const handleCredentialLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (schoolUnavailable) return;
    try {
      await loginWithCredentials(email.trim(), password, schoolSlug);
      toast.success("Welcome back. Your workspace is ready.");
    } catch {
      // AppContext presents the server-safe error message.
    }
  };

  const name = branding?.name ?? "EduSphere";
  const accent = branding?.primaryColor || DEFAULT_ACCENT;
  const logo = branding?.logoVariants.square || branding?.logo;

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8 sm:flex sm:items-center sm:justify-center">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
        <div className="h-1.5" style={{ backgroundColor: accent }} />
        <div className="p-6 sm:p-8">
          <header className="mb-8">
            <div className="mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
              {brandingLoading ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" aria-label="Loading school identity" />
              ) : logo ? (
                <img src={logo} alt={`${name} logo`} className="h-full w-full object-contain p-1.5" />
              ) : schoolSlug ? (
                <School className="h-8 w-8 text-slate-700" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-slate-700" aria-hidden="true" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-950">{schoolUnavailable ? "School portal unavailable" : name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {schoolUnavailable
                ? "Check the school portal address or contact the school administrator."
                : branding?.motto || "Sign in to your school workspace."}
            </p>
          </header>

          <form onSubmit={handleCredentialLogin} className="space-y-5" aria-busy={isLoggingIn}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  disabled={schoolUnavailable || brandingLoading}
                  className="app-input min-h-11 pl-10"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={schoolUnavailable || brandingLoading}
                  className="app-input min-h-11 pl-10"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoggingIn || schoolUnavailable || brandingLoading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accent, color: readableTextColor(accent), outlineColor: accent }}
            >
              {isLoggingIn ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <footer className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
            Secure school access powered by EduSphere
          </footer>
        </div>
      </section>
    </main>
  );
}

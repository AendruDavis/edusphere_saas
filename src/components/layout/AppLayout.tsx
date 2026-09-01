import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  Bus,
  Calendar,
  DollarSign,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserSquare2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { AppModule } from "../../../shared/permissions";
import { useApp } from "../../context/AppContext";
import { cn, formatCurrency } from "../../lib/utils";

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  module: AppModule;
  group: "Core" | "Operations" | "People" | "System";
};

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard", group: "Core" },
  { name: "Students", href: "/students", icon: Users, module: "students", group: "Core" },
  { name: "Academics", href: "/academics", icon: GraduationCap, module: "academics", group: "Core" },
  { name: "Grades", href: "/grades", icon: TrendingUp, module: "grades", group: "Core" },
  { name: "Timetable", href: "/timetable", icon: Calendar, module: "timetable", group: "Core" },
  { name: "Attendance", href: "/attendance", icon: ShieldCheck, module: "attendance", group: "Core" },
  { name: "Fees", href: "/fees", icon: Wallet, module: "fees", group: "Operations" },
  { name: "Finance", href: "/finance", icon: DollarSign, module: "finance", group: "Operations" },
  { name: "Transport", href: "/transport", icon: Bus, module: "transport", group: "Operations" },
  { name: "Hostels", href: "/hostels", icon: Home, module: "hostels", group: "Operations" },
  { name: "Library", href: "/library", icon: Library, module: "library", group: "Operations" },
  { name: "Sick Bay", href: "/sick-bay", icon: Stethoscope, module: "sickBay", group: "Operations" },
  { name: "Communication", href: "/communication", icon: MessageSquare, module: "communication", group: "People" },
  { name: "Reports", href: "/reports", icon: FileText, module: "reports", group: "People" },
  { name: "Staff", href: "/staff", icon: UserSquare2, module: "staff", group: "People" },
  { name: "Inventory", href: "/inventory", icon: Package, module: "inventory", group: "System" },
  { name: "AI Accounting", href: "/ai-accounting", icon: BrainCircuit, module: "aiAccounting", group: "System" },
  { name: "Settings", href: "/settings", icon: Settings, module: "settings", group: "System" },
];

const groups: NavigationItem["group"][] = ["Core", "Operations", "People", "System"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ logo, name }: { logo: string | null; name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logo ? (
        <img src={logo} alt={`${name} logo`} className="h-10 w-10 rounded-lg border border-slate-200 object-contain p-0.5" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">ES</div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
        <p className="text-xs text-slate-500">School operations</p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const sidebarCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);
  const location = useLocation();
  const {
    activeRoles,
    activeSchoolId,
    books,
    can,
    currentUser,
    logout,
    notifications,
    products,
    schoolSettings,
    schools,
    setActiveSchool,
    students,
    transactions,
    users,
  } = useApp();

  const filteredNavigation = React.useMemo(() => navigation.filter((item) => can(item.module)), [can]);
  const logo = schoolSettings.logoVariants?.wide || schoolSettings.logoVariants?.square || schoolSettings.logo;
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const roleLabel = activeRoles.map((role) => role.replace("_", " ")).join(", ") || "No school role";

  const suggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{ id: string; type: string; href: string; title: string; subtitle: string }> = [];

    if (can("students")) {
      students
        .filter((student) => student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query))
        .slice(0, 3)
        .forEach((student) => results.push({ id: student.id, type: "student", href: `/students/${student.id}`, title: student.name, subtitle: `${student.reg} / ${student.class}` }));
    }
    if (can("staff")) {
      users
        .filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
        .slice(0, 3)
        .forEach((user) => results.push({ id: user.id, type: "staff", href: "/staff", title: user.name, subtitle: user.roles?.join(", ") || user.role }));
    }
    if (can("library")) {
      books
        .filter((book) => book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query))
        .slice(0, 3)
        .forEach((book) => results.push({ id: book.id, type: "book", href: "/library", title: book.title, subtitle: `By ${book.author}` }));
    }
    if (can("finance")) {
      transactions
        .filter((transaction) => transaction.category.toLowerCase().includes(query) || transaction.type.toLowerCase().includes(query))
        .slice(0, 3)
        .forEach((transaction) => results.push({
          id: transaction.id,
          type: "transaction",
          href: "/finance",
          title: transaction.category,
          subtitle: `${transaction.type} / ${formatCurrency(transaction.amount || 0, schoolSettings.currency || "UGX")}`,
        }));
    }
    if (can("inventory")) {
      products
        .filter((product) => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query))
        .slice(0, 3)
        .forEach((product) => results.push({ id: product.id, type: "inventory", href: "/inventory", title: product.name, subtitle: `${product.category} / ${product.quantity} in stock` }));
    }
    return results.slice(0, 10);
  }, [books, can, products, schoolSettings.currency, searchQuery, students, transactions, users]);

  React.useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => sidebarCloseButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ) as HTMLElement[];
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [sidebarOpen]);

  React.useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSearchOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileSearchOpen]);

  const closeSearch = () => {
    setShowSuggestions(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
  };

  const SearchPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="relative w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        ref={mobile ? mobileSearchInputRef : undefined}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Search school records"
        aria-label="Search school records"
        className="app-input h-11 pl-10"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold text-slate-500">Search results</span>
            <span className="text-xs text-slate-400">{suggestions.length} found</span>
          </div>
          {suggestions.map((item) => (
            <Link key={`${item.type}-${item.id}`} to={item.href} onClick={closeSearch} className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                {item.type === "student" && <Users className="h-4 w-4" />}
                {item.type === "staff" && <UserSquare2 className="h-4 w-4" />}
                {item.type === "book" && <BookOpen className="h-4 w-4" />}
                {item.type === "inventory" && <Package className="h-4 w-4" />}
                {item.type === "transaction" && <DollarSign className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <span className="app-badge bg-slate-100 text-slate-600">{item.type}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const SchoolSelector = () => schools.length > 1 ? (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-500">Active school</span>
      <span className="relative block">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <select className="app-select min-h-11 pl-9" value={activeSchoolId || ""} onChange={(event) => void setActiveSchool(event.target.value)}>
          {schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
        </select>
      </span>
    </label>
  ) : null;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <BrandMark logo={logo} name={schoolSettings.name} />
        {mobile && (
          <button ref={sidebarCloseButtonRef} onClick={() => setSidebarOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close navigation">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        {groups.map((group) => {
          const items = filteredNavigation.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
              {items.map((item) => {
                const active = isActive(location.pathname, item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => mobile && setSidebarOpen(false)}
                    className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-slate-200 p-4">
        {mobile && <SchoolSelector />}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold uppercase text-blue-700">{currentUser?.name?.[0] || "U"}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{currentUser?.name || "User"}</p>
            <p className="truncate text-xs capitalize text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible" onClick={() => setShowSuggestions(false)}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setSidebarOpen(false)} />
          <div ref={sidebarRef} role="dialog" aria-modal="true" aria-label="Main navigation" className="fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-2rem))] shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <aside className="hidden w-72 shrink-0 border-r border-slate-200 lg:block"><Sidebar /></aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4 lg:px-6">
          <button ref={menuButtonRef} onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" aria-expanded={sidebarOpen}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="hidden min-[480px]:block"><SearchPanel /></div>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 min-[480px]:hidden" onClick={() => setMobileSearchOpen(true)} aria-label="Search school records">
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label={`${unreadCount} unread notifications`}>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}
          </button>
          {schools.length > 1 && (
            <div className="hidden w-56 md:block"><SchoolSelector /></div>
          )}
          <div className="hidden max-w-52 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate text-sm font-semibold capitalize text-slate-700">{roleLabel}</span>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 print:overflow-visible">{children}</main>
      </div>

      {mobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-[70] flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 min-[480px]:hidden">
          <SearchPanel mobile />
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

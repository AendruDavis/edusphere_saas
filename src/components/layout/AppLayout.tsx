import React, { useState } from "react";
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
import { cn, formatCurrency } from "../../lib/utils";
import { useApp } from "../../context/AppContext";

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group: "Core" | "Operations" | "People" | "System";
};

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["super_admin", "admin", "teacher", "accountant", "parent", "student", "driver", "librarian", "nurse"], group: "Core" },
  { name: "Students", href: "/students", icon: Users, roles: ["super_admin", "admin", "teacher", "accountant", "parent", "student"], group: "Core" },
  { name: "Academics", href: "/academics", icon: GraduationCap, roles: ["super_admin", "admin", "teacher", "accountant", "parent", "student"], group: "Core" },
  { name: "Grades", href: "/grades", icon: TrendingUp, roles: ["super_admin", "admin", "teacher", "parent", "student"], group: "Core" },
  { name: "Timetable", href: "/timetable", icon: Calendar, roles: ["super_admin", "admin", "teacher", "parent", "student"], group: "Core" },
  { name: "Attendance", href: "/attendance", icon: ShieldCheck, roles: ["super_admin", "admin", "teacher", "nurse", "parent", "student"], group: "Core" },
  { name: "Fees", href: "/fees", icon: Wallet, roles: ["super_admin", "admin", "accountant", "parent", "student"], group: "Operations" },
  { name: "Finance", href: "/finance", icon: DollarSign, roles: ["super_admin", "admin", "accountant"], group: "Operations" },
  { name: "Transport", href: "/transport", icon: Bus, roles: ["super_admin", "admin", "driver", "parent", "student"], group: "Operations" },
  { name: "Hostels", href: "/hostels", icon: Home, roles: ["super_admin", "admin", "teacher", "staff"], group: "Operations" },
  { name: "Library", href: "/library", icon: Library, roles: ["super_admin", "admin", "teacher", "student", "librarian"], group: "Operations" },
  { name: "Sick Bay", href: "/sick-bay", icon: Stethoscope, roles: ["super_admin", "admin", "nurse"], group: "Operations" },
  { name: "Communication", href: "/communication", icon: MessageSquare, roles: ["super_admin", "admin", "teacher", "parent", "student", "librarian", "nurse"], group: "People" },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["super_admin", "admin", "accountant", "teacher", "parent", "student", "librarian", "nurse"], group: "People" },
  { name: "Staff", href: "/staff", icon: UserSquare2, roles: ["super_admin", "admin"], group: "People" },
  { name: "Inventory", href: "/inventory", icon: Package, roles: ["super_admin", "admin", "accountant"], group: "System" },
  { name: "AI Accounting", href: "/ai-accounting", icon: BrainCircuit, roles: ["super_admin", "admin", "accountant"], group: "System" },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"], group: "System" },
];

const groups: NavigationItem["group"][] = ["Core", "Operations", "People", "System"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ logo, name }: { logo: string | null; name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {logo ? (
        <img src={logo} alt={`${name} logo`} className="h-9 w-9 rounded-xl object-contain ring-1 ring-slate-200" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/20">ES</div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
        <p className="text-xs font-medium text-slate-500">School operations</p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const sidebarCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);
  const location = useLocation();
  const {
    schoolSettings,
    students,
    users,
    transactions,
    books,
    products,
    currentUser,
    logout,
    notifications,
    schools,
    activeSchoolId,
    setActiveSchool,
  } = useApp();

  const suggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{ id: string; type: string; href: string; title: string; subtitle: string }> = [];

    students
      .filter((student) => student.name.toLowerCase().includes(query) || student.reg.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((student) => results.push({ id: student.id, type: "student", href: `/students/${student.id}`, title: student.name, subtitle: `${student.reg} / ${student.class}` }));

    users
      .filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((user) => results.push({ id: user.id, type: "staff", href: "/staff", title: user.name, subtitle: user.role }));

    books
      .filter((book) => book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((book) => results.push({ id: book.id, type: "book", href: "/library", title: book.title, subtitle: `By ${book.author}` }));

    transactions
      .filter((transaction) => transaction.category.toLowerCase().includes(query) || transaction.type.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((transaction) =>
        results.push({
          id: transaction.id,
          type: "transaction",
          href: "/finance",
          title: transaction.category,
          subtitle: `${transaction.type} / ${formatCurrency(transaction.amount || 0, schoolSettings.currency || "UGX")}`,
        }),
      );

    products
      .filter((product) => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((product) => results.push({ id: product.id, type: "inventory", href: "/inventory", title: product.name, subtitle: `${product.category} / ${product.quantity} in stock` }));

    return results.slice(0, 10);
  }, [searchQuery, students, users, books, transactions, products, schoolSettings.currency]);

  const filteredNavigation = React.useMemo(() => navigation.filter((item) => !currentUser || item.roles.includes(currentUser.role)), [currentUser?.role]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  React.useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => sidebarCloseButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
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

  const SearchPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="relative w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={mobile ? mobileSearchInputRef : undefined}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Search students, staff, books, payments..."
        aria-label="Search school records"
        className="app-input h-11 pl-10"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-in">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold text-slate-500">Search results</span>
            <span className="text-xs text-slate-400">{suggestions.length} found</span>
          </div>
          {suggestions.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.href}
              onClick={() => {
                setShowSuggestions(false);
                setMobileSearchOpen(false);
                setSearchQuery("");
              }}
              className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <BrandMark logo={schoolSettings.logo} name={schoolSettings.name} />
        {mobile && (
          <button ref={sidebarCloseButtonRef} onClick={() => setSidebarOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => {
          const items = filteredNavigation.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
              {items.map((item) => {
                const active = isActive(location.pathname, item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => mobile && setSidebarOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        {mobile && ["super_admin", "admin"].includes(currentUser?.role || "") && schools.length > 1 && (
          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Active school</span>
            <span className="relative block">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="app-select pl-9"
                value={activeSchoolId || ""}
                onChange={(event) => void setActiveSchool(event.target.value)}
              >
                {schools.map((school) => (
                  <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>
                ))}
              </select>
            </span>
          </label>
        )}
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold uppercase text-blue-700">{currentUser?.name?.[0] || "U"}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{currentUser?.name || "User"}</p>
            <p className="truncate text-xs text-slate-500">{currentUser?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-slate-50 print:h-auto print:overflow-visible" onClick={() => setShowSuggestions(false)}>
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <button type="button" aria-label="Close navigation" className={cn("absolute inset-0 bg-slate-950/50 transition-opacity", sidebarOpen ? "opacity-100" : "opacity-0")} onClick={() => setSidebarOpen(false)} />
        <div role="dialog" aria-modal="true" aria-label="Main navigation" aria-hidden={!sidebarOpen} className={cn("fixed inset-y-0 left-0 w-[min(20rem,calc(100vw-2rem))] shadow-2xl transition-transform duration-300", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <Sidebar mobile />
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 border-r border-slate-200 lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button ref={menuButtonRef} onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="hidden min-[480px]:block"><SearchPanel /></div>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 min-[480px]:hidden" onClick={() => setMobileSearchOpen(true)} aria-label="Search school records">
              <Search className="h-5 w-5" />
            </button>
          </div>

          <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}
          </button>
          {["super_admin", "admin"].includes(currentUser?.role || "") && schools.length > 1 && (
            <label className="relative hidden md:block">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                aria-label="Active school"
                className="app-select h-10 max-w-56 appearance-none pl-9 pr-8"
                value={activeSchoolId || ""}
                onChange={(event) => void setActiveSchool(event.target.value)}
              >
                {schools.map((school) => (
                  <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>
                ))}
              </select>
            </label>
          )}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold capitalize text-slate-700">{currentUser?.role || "Guest"}</span>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 print:overflow-visible">{children}</main>
      </div>

      {mobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-[70] flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 min-[480px]:hidden">
          <SearchPanel mobile />
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

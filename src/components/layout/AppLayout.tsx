import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Wallet,
  DollarSign, 
  Settings, 
  Search, 
  Bell, 
  Menu, 
  X,
  Library,
  Bus,
  Home,
  ShieldCheck,
  Stethoscope,
  MessageSquare,
  FileText,
  Package,
  TrendingUp,
  BrainCircuit,
  LogOut
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useApp } from "../../context/AppContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { schoolSettings, students, users, transactions, books, products, currentUser, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search Students
    students.filter(s => s.name.toLowerCase().includes(query)).slice(0, 3).forEach(s => {
      results.push({ id: s.id, type: 'student', href: `/students/${s.id}`, title: s.name, subtitle: `${s.reg} • ${s.class}` });
    });

    // Search Staff
    users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)).slice(0, 3).forEach(u => {
      results.push({ id: u.id, type: 'staff', href: '/staff', title: u.name, subtitle: u.role.toUpperCase() });
    });

    // Search Books
    books.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query)).slice(0, 3).forEach(b => {
      results.push({ id: b.id, type: 'book', href: '/library', title: b.title, subtitle: `Book by ${b.author}` });
    });

    // Search Transactions
    transactions.filter(t => t.category.toLowerCase().includes(query) || t.type.toLowerCase().includes(query)).slice(0, 3).forEach(t => {
      results.push({ id: t.id, type: 'transaction', href: '/finance', title: t.category, subtitle: `${t.type.toUpperCase()} • ${formatCurrency(t.amount || 0, schoolSettings.currency || "UGX")}` });
    });

    // Search Inventory
    products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)).slice(0, 3).forEach(p => {
      results.push({ id: p.id, type: 'inventory', href: '/inventory', title: p.name, subtitle: `${p.category} • ${p.quantity} In Stock` });
    });

    return results.slice(0, 10);
  }, [searchQuery, students, users, books, transactions, products, schoolSettings.currency]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "teacher", "accountant", "parent", "student", "driver", "librarian", "nurse"] },
    { name: "Students", href: "/students", icon: Users, roles: ["admin", "teacher", "accountant"] },
    { name: "Academics", href: "/academics", icon: GraduationCap, roles: ["admin", "teacher"] },
    { name: "Grades", href: "/grades", icon: TrendingUp, roles: ["admin", "teacher", "parent", "student"] },
    { name: "Timetable", href: "/timetable", icon: Calendar, roles: ["admin", "teacher", "parent", "student"] },
    { name: "Attendance", href: "/attendance", icon: ShieldCheck, roles: ["admin", "teacher"] },
    { name: "Fees & Payments", href: "/fees", icon: Wallet, roles: ["admin", "accountant", "parent"] },
    { name: "Finance", href: "/finance", icon: DollarSign, roles: ["admin", "accountant"] },
    { name: "Transport", href: "/transport", icon: Bus, roles: ["admin", "driver", "parent", "student"] },
    { name: "Hostels", href: "/hostels", icon: Home, roles: ["admin", "teacher", "staff"] },
    { name: "Library", href: "/library", icon: Library, roles: ["admin", "teacher", "student", "librarian"] },
    { name: "Sick Bay", href: "/sick-bay", icon: Stethoscope, roles: ["admin", "teacher", "nurse"] },
    { name: "Communication", href: "/communication", icon: MessageSquare, roles: ["admin", "teacher", "parent", "student", "librarian", "nurse"] },
    { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "accountant", "teacher"] },
    { name: "Staff", href: "/staff", icon: UserSquare2, roles: ["admin"] },
    { name: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "accountant"] },
    { name: "AI Accounting", href: "/ai-accounting", icon: BrainCircuit, roles: ["admin", "accountant"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
  ];

  const filteredNavigation = React.useMemo(() => 
    navigation.filter(item => !currentUser || item.roles.includes(currentUser.role)),
    [currentUser?.role]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex" onClick={() => setShowSuggestions(false)}>
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
        sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col p-4">
          <div className="flex items-center gap-3 mb-8">
            {schoolSettings.logo ? (
              <img src={schoolSettings.logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">ES</div>
            )}
            <h1 className="text-xl font-bold text-gray-900 truncate">{schoolSettings.name}</h1>
            <button onClick={() => setSidebarOpen(false)} className="p-2 ml-auto">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.href 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-center gap-3">
          {schoolSettings.logo ? (
            <img src={schoolSettings.logo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">ES</div>
          )}
          <h1 className="text-xl font-bold text-gray-900 truncate">{schoolSettings.name}</h1>
        </div>
        <nav className="flex-1 space-y-1 px-4 pb-4 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.href 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
              {currentUser?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.name || "User"}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-xl mx-4">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search students, staff, books, or records..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg pl-10 pr-4 py-2 text-sm transition-all"
              />
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Results</span>
                    <span className="text-[10px] text-gray-400 font-medium">{suggestions.length} found</span>
                  </div>
                  {suggestions.map((item: any) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.href}
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50 group"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs transition-transform group-hover:scale-110",
                        item.type === 'student' ? "bg-blue-600" :
                        item.type === 'staff' ? "bg-emerald-600" :
                        item.type === 'book' ? "bg-purple-600" : 
                        item.type === 'inventory' ? "bg-indigo-600" : "bg-amber-600"
                      )}>
                        {item.type === 'student' && <Users className="w-4 h-4" />}
                        {item.type === 'staff' && <UserSquare2 className="w-4 h-4" />}
                        {item.type === 'book' && <Library className="w-4 h-4" />}
                        {item.type === 'inventory' && <Package className="w-4 h-4" />}
                        {item.type === 'transaction' && <DollarSign className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                            item.type === 'student' ? "bg-blue-50 text-blue-600" :
                            item.type === 'staff' ? "bg-emerald-50 text-emerald-600" :
                            item.type === 'book' ? "bg-purple-50 text-purple-600" :
                            item.type === 'inventory' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{item.subtitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-gray-200 mx-1" />
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm font-black text-gray-900 uppercase tracking-widest">{currentUser?.role || "Guest"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

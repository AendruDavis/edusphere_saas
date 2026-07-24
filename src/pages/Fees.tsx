import React, { useState } from "react";
import { 
  Wallet, 
  Plus, 
  DollarSign, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Search,
  AlertCircle,
  CreditCard,
  Trash2
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { ResponsiveDialog } from "../components/ui/ResponsiveDialog";
import { FormGrid, HorizontalScroller, SegmentedTabs } from "../components/ui/ResponsivePrimitives";

export default function Fees() {
  const { students, schoolSettings, transactions, recordFeePayment, feeStructures, addFeeStructure, updateFeeStructure, getClassFees } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "structure">("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeeStructureId, setEditingFeeStructureId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [feeStatusFilter, setFeeStatusFilter] = useState<"all" | "paid" | "partial" | "unpaid">("all");

  const [paymentFormData, setPaymentFormData] = useState({
    studentId: "",
    amount: 0,
    category: "tuition",
    method: "Cash",
    date: new Date().toISOString().split('T')[0],
    description: ""
  });

  const [feeFormData, setFeeFormData] = useState({
    className: "",
    term: "Term 1",
    academicYear: schoolSettings.academicYear || "2026/2027",
    items: [{ name: "Tuition", amount: 0 }],
    totalAmount: 0
  });

  const studentPayments = transactions.filter(t => t.type === "income" && t.studentId);
  const totalCollected = studentPayments.reduce((sum, t) => sum + t.amount, 0);

  // Calculate totals based on Class Fees set in settings
  const studentsFilteredByClass = selectedClass === "All" ? students : students.filter(s => s.class === selectedClass);
  
  const totalExpected = studentsFilteredByClass.reduce((sum, s) => sum + getClassFees(s.class), 0);
  const totalPaid = studentsFilteredByClass.reduce((sum, s) => sum + s.totalFeesPaid, 0);
  const totalOutstanding = totalExpected - totalPaid;

  const studentsWithBalance = studentsFilteredByClass.filter(s => {
    const expected = getClassFees(s.class);
    const balance = expected - s.totalFeesPaid;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.reg.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (feeStatusFilter === "unpaid") return balance === expected && expected > 0 && matchesSearch;
    if (feeStatusFilter === "partial") return balance > 0 && balance < expected && matchesSearch;
    if (feeStatusFilter === "paid") return balance <= 0 && expected > 0 && matchesSearch;
    return matchesSearch;
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === paymentFormData.studentId);
    if (!student) return;

    await recordFeePayment({
      studentId: student.id,
      amount: paymentFormData.amount,
      term: "Term 1",
      year: schoolSettings.academicYear || "2026/2027",
      method: paymentFormData.method,
      description: `Fees payment for ${student.name} - ${paymentFormData.description || paymentFormData.category}`
    });

    setIsModalOpen(false);
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = feeFormData.items.reduce((s, i) => s + i.amount, 0);
    if (editingFeeStructureId) {
      await updateFeeStructure(editingFeeStructureId, { ...feeFormData, totalAmount: total });
    } else {
      await addFeeStructure({ ...feeFormData, totalAmount: total });
    }
    setIsModalOpen(false);
    setEditingFeeStructureId(null);
  };

  const openPaymentDialog = (studentId = "") => {
    setEditingFeeStructureId(null);
    setPaymentFormData({
      studentId,
      amount: 0,
      category: "tuition",
      method: "Cash",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setIsModalOpen(true);
  };

  const openFeeStructureDialog = (feeStructure?: (typeof feeStructures)[number]) => {
    setEditingFeeStructureId(feeStructure?.id || null);
    setFeeFormData(feeStructure ? {
      className: feeStructure.className,
      term: feeStructure.term,
      academicYear: feeStructure.academicYear,
      items: feeStructure.items.length ? feeStructure.items : [{ name: "Tuition", amount: 0 }],
      totalAmount: feeStructure.totalAmount,
    } : {
      className: schoolSettings.classes[0] || "",
      term: "Term 1",
      academicYear: schoolSettings.academicYear || "2026/2027",
      items: [{ name: "Tuition", amount: 0 }],
      totalAmount: 0,
    });
    setIsModalOpen(true);
  };

  const filteredPayments = studentPayments.filter(p => {
    const student = students.find(s => s.id === p.studentId);
    return (student?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.reference?.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedClass === "All" || student?.class === selectedClass);
  });

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">Finance</p>
          <h1 className="app-page-title">Fees and Payments</h1>
          <p className="app-page-subtitle">Manage balances, collections, and class fee structures.</p>
        </div>
          <button
            onClick={() => activeTab === "structure" ? openFeeStructureDialog() : openPaymentDialog()}
            className="app-button-primary"
          >
            <Plus className="w-5 h-5" />
            {activeTab === "structure" ? "Add fee structure" : "Collect fees"}
          </button>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button onClick={() => setFeeStatusFilter("all")} className={cn(
          "app-card text-left",
          feeStatusFilter === "all" ? "border-blue-300 ring-2 ring-blue-100" : ""
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Expected</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(totalExpected, schoolSettings.currency || "UGX")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Wallet className="h-5 w-5" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Based on class settings</p>
        </button>

        <button onClick={() => setFeeStatusFilter("paid")} className={cn(
          "app-card text-left",
          feeStatusFilter === "paid" ? "border-emerald-300 ring-2 ring-emerald-100" : ""
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Collected</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totalPaid, schoolSettings.currency || "UGX")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ArrowUpRight className="h-5 w-5" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Posted to the ledger</p>
        </button>

        <button onClick={() => setFeeStatusFilter("unpaid")} className={cn(
          "app-card text-left",
          feeStatusFilter === "unpaid" ? "border-rose-300 ring-2 ring-rose-100" : ""
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Outstanding</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{formatCurrency(totalOutstanding, schoolSettings.currency || "UGX")}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Requires follow-up</p>
        </button>
      </div>

      {/* Enhanced Filters */}
      <div className="app-panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student or reference..." 
              className="app-input pl-12"
            />
          </div>
          <div className="relative group">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <select 
               value={selectedClass} 
               onChange={e => setSelectedClass(e.target.value)}
               className="app-select appearance-none pl-10"
             >
               <option value="All">All Classes</option>
               {schoolSettings.classes.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <div className="relative group">
             <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <select 
               value={feeStatusFilter} 
               onChange={e => setFeeStatusFilter(e.target.value as any)}
               className="app-select appearance-none pl-10"
             >
               <option value="all">Any Payment Status</option>
               <option value="paid">Fully Paid</option>
               <option value="partial">Partial Balance</option>
               <option value="unpaid">Zero Paid / Arrears</option>
             </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        label="Fees view"
        options={[
          { value: "overview", label: "Student balances" },
          { value: "payments", label: "Collection ledger" },
          { value: "structure", label: "Fee configuration" },
        ]}
        className="w-fit"
      />

      {/* Main Content Areas */}
      {activeTab === "overview" && (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
            {studentsWithBalance.map((student) => {
              const expected = getClassFees(student.class);
              const paid = student.totalFeesPaid;
              const balance = expected - paid;
              return (
                <button key={student.id} type="button" className="app-mobile-record w-full text-left" onClick={() => openPaymentDialog(student.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{student.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{student.reg} / {student.class}</p>
                    </div>
                    <span className={cn("app-badge", balance <= 0 ? "bg-emerald-50 text-emerald-700" : paid > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")}>
                      {balance <= 0 ? "Cleared" : formatCurrency(balance, schoolSettings.currency || "UGX")}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div><dt className="text-xs text-slate-500">Expected</dt><dd className="mt-1 font-medium text-slate-800">{formatCurrency(expected, schoolSettings.currency || "UGX")}</dd></div>
                    <div><dt className="text-xs text-slate-500">Paid</dt><dd className="mt-1 font-medium text-emerald-700">{formatCurrency(paid, schoolSettings.currency || "UGX")}</dd></div>
                  </dl>
                </button>
              );
            })}
            {studentsWithBalance.length === 0 && <div className="app-empty-state bg-white">No student balances match the current filters.</div>}
          </div>
          <HorizontalScroller label="Student fee balances" showHint={false} className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student Identifier</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Standard Fee</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Paid Amount</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentsWithBalance.map(student => {
                const expected = getClassFees(student.class);
                const paid = student.totalFeesPaid;
                const balance = expected - paid;
                const status = balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => {
                     openPaymentDialog(student.id);
                  }}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2x flex items-center justify-center font-black transition-all group-hover:scale-110",
                          status === "paid" ? "bg-emerald-50 text-emerald-600" :
                          status === "partial" ? "bg-amber-50 text-amber-600" :
                          "bg-rose-50 text-rose-600"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors">{student.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{student.reg} • {student.class}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-bold text-gray-400 text-sm">{formatCurrency(expected, schoolSettings.currency || "UGX")}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <span className="font-black text-emerald-600 text-sm">{formatCurrency(paid, schoolSettings.currency || "UGX")}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className={cn(
                         "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest",
                         status === "paid" ? "bg-emerald-50 text-emerald-600" :
                         status === "partial" ? "bg-amber-50 text-amber-600" :
                         "bg-rose-50 text-rose-600 shadow-lg shadow-rose-50"
                       )}>
                         {balance > 0 ? formatCurrency(balance, schoolSettings.currency || "UGX") : "CLEARED"}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {studentsWithBalance.length === 0 && (
                <tr><td colSpan={4} className="py-32 text-center text-gray-300 font-black uppercase tracking-[0.3em] opacity-30 italic">No records match filter</td></tr>
              )}
            </tbody>
          </table>
          </HorizontalScroller>
        </div>
      )}

      {/* Rest of the Tabs (Payments, Structure) and Modals - abbreviated for space but keeping logic */}
      {activeTab === "payments" && (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
            {filteredPayments.map((payment) => {
              const student = students.find((entry) => entry.id === payment.studentId);
              return (
                <div key={payment.id} className="app-mobile-record">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{student?.name || "Unknown student"}</p>
                      <p className="mt-1 text-sm text-slate-500">{payment.date} / {payment.reference || "No reference"}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-emerald-700">{formatCurrency(payment.amount, schoolSettings.currency || "UGX")}</p>
                  </div>
                </div>
              );
            })}
            {filteredPayments.length === 0 && <div className="app-empty-state bg-white">No collection records match the current filters.</div>}
          </div>
          <HorizontalScroller label="Fee collection ledger" showHint={false} className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payer Account</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Reference</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Receipt Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map(p => {
                const student = students.find(s => s.id === p.studentId);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-tighter">{p.date}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-indigo-600 flex items-center justify-center font-black">
                          {student?.name.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{student?.name || "Unknown"}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{p.category} • {student?.class}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-4 py-1.5 bg-gray-100 rounded-xl font-black text-[10px] text-gray-500 tracking-widest uppercase">
                        {p.reference || "NO-REF"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-xl font-black text-emerald-600">
                        {formatCurrency(p.amount, schoolSettings.currency || "UGX")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </HorizontalScroller>
        </div>
      )}

      {activeTab === "structure" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {feeStructures.map((feeStructure) => (
            <button key={feeStructure.id} type="button" className="app-card text-left" onClick={() => openFeeStructureDialog(feeStructure)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{feeStructure.className}</h2>
                  <p className="mt-1 text-sm text-slate-500">{feeStructure.term} / {feeStructure.academicYear}</p>
                </div>
                <span className="font-semibold text-blue-700">{formatCurrency(feeStructure.totalAmount, schoolSettings.currency || "UGX")}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">{feeStructure.items.length} fee item{feeStructure.items.length === 1 ? "" : "s"}</p>
            </button>
          ))}
          {feeStructures.length === 0 && (
            <button type="button" className="app-empty-state min-h-40 text-left" onClick={() => openFeeStructureDialog()}>
              <span className="block font-semibold text-slate-700">No fee structures configured</span>
              <span className="mt-1 block font-normal text-slate-500">Add the first class fee structure.</span>
            </button>
          )}
        </div>
      )}

      <ResponsiveDialog
        open={isModalOpen}
        title={activeTab === "structure" ? (editingFeeStructureId ? "Edit fee structure" : "New fee structure") : "Record fee payment"}
        description={activeTab === "structure" ? "Define the charges for a class, term, and academic year." : "Record a verified payment against a student account."}
        onClose={() => { setIsModalOpen(false); setEditingFeeStructureId(null); }}
        maxWidth="max-w-xl"
        footer={(
          <>
            <button type="button" className="app-button-secondary" onClick={() => { setIsModalOpen(false); setEditingFeeStructureId(null); }}>Cancel</button>
            <button type="submit" form="fees-entry-form" className="app-button-primary">
              {activeTab === "structure" ? (editingFeeStructureId ? "Update structure" : "Save structure") : "Record payment"}
            </button>
          </>
        )}
      >
        <form id="fees-entry-form" onSubmit={activeTab === "structure" ? handleFeeSubmit : handlePaymentSubmit} className="space-y-4">
          {activeTab !== "structure" ? (
            <>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Student
                <select value={paymentFormData.studentId} onChange={(event) => setPaymentFormData({ ...paymentFormData, studentId: event.target.value })} className="app-select" required>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.reg}) - Balance {formatCurrency(getClassFees(student.class) - student.totalFeesPaid, schoolSettings.currency || "UGX")}
                    </option>
                  ))}
                </select>
              </label>
              <FormGrid>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Amount ({schoolSettings.currency || "UGX"})
                  <input type="number" min="1" required value={paymentFormData.amount} onChange={(event) => setPaymentFormData({ ...paymentFormData, amount: Number(event.target.value) || 0 })} className="app-input" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Transaction date
                  <input type="date" required value={paymentFormData.date} onChange={(event) => setPaymentFormData({ ...paymentFormData, date: event.target.value })} className="app-input" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Payment method
                  <select value={paymentFormData.method} onChange={(event) => setPaymentFormData({ ...paymentFormData, method: event.target.value })} className="app-select">
                    <option>Cash</option>
                    <option>Mobile Money</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Category
                  <select value={paymentFormData.category} onChange={(event) => setPaymentFormData({ ...paymentFormData, category: event.target.value })} className="app-select">
                    <option value="tuition">Tuition</option>
                    <option value="boarding">Boarding</option>
                    <option value="transport">Transport</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </FormGrid>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Note
                <textarea value={paymentFormData.description} onChange={(event) => setPaymentFormData({ ...paymentFormData, description: event.target.value })} className="app-input min-h-24 resize-y" placeholder="Optional payment note" />
              </label>
            </>
          ) : (
            <>
              <FormGrid>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Class
                  <select required className="app-select" value={feeFormData.className} onChange={(event) => setFeeFormData({ ...feeFormData, className: event.target.value })}>
                    <option value="">Select class</option>
                    {schoolSettings.classes.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Term
                  <select className="app-select" value={feeFormData.term} onChange={(event) => setFeeFormData({ ...feeFormData, term: event.target.value })}>
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  Academic year
                  <input required className="app-input" value={feeFormData.academicYear} onChange={(event) => setFeeFormData({ ...feeFormData, academicYear: event.target.value })} />
                </label>
              </FormGrid>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Fee items</h3>
                  <button type="button" className="app-button-secondary" onClick={() => setFeeFormData({ ...feeFormData, items: [...feeFormData.items, { name: "", amount: 0 }] })}>
                    <Plus className="h-4 w-4" />
                    Add item
                  </button>
                </div>
                {feeFormData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,140px)_44px] gap-2">
                    <input required aria-label={`Fee item ${index + 1} name`} className="app-input" placeholder="Fee name" value={item.name} onChange={(event) => setFeeFormData({ ...feeFormData, items: feeFormData.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry) })} />
                    <input required aria-label={`Fee item ${index + 1} amount`} type="number" min="0" className="app-input" value={item.amount} onChange={(event) => setFeeFormData({ ...feeFormData, items: feeFormData.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, amount: Number(event.target.value) || 0 } : entry) })} />
                    <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove fee item ${index + 1}`} disabled={feeFormData.items.length === 1} onClick={() => setFeeFormData({ ...feeFormData, items: feeFormData.items.filter((_, itemIndex) => itemIndex !== index) })}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">Total</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(feeFormData.items.reduce((sum, item) => sum + item.amount, 0), schoolSettings.currency || "UGX")}</span>
                </div>
              </div>
            </>
          )}
        </form>
      </ResponsiveDialog>
    </div>
  );
}

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BrainCircuit,
  ArrowRight,
  FileText,
  Calendar as CalendarIcon,
  Filter,
  X,
  Printer,
  MessageSquare
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { apiRequest } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Transaction } from "../types";

export default function Finance() {
  const { transactions, addTransaction, students, schoolSettings, expenses, addExpense } = useApp();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "expenses" | "fees">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "income" as "income" | "expense",
    studentId: "",
    category: "Tuition Fees",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reference: ""
  });

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTransaction({
      ...txForm,
      status: "completed"
    });
    setIsTxModalOpen(false);
    setTxForm({ type: "income", studentId: "", category: "Tuition Fees", amount: 0, date: new Date().toISOString().split('T')[0], reference: "" });
  };

  const generateInvoice = (tx: Transaction) => {
    setSelectedTx(tx);
  };

  const printInvoice = () => {
    window.print();
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === "expenses") return t.type === "expense";
    if (activeTab === "fees") return t.type === "income" && (t.category.toLowerCase().includes("fee") || t.studentId);
    return true;
  });

  const handleAiAnalyze = async () => {
    setIsAiLoading(true);
    try {
      const data = await apiRequest<{ analysis: string }>("/api/ai/accounting/analyze", {
        method: "POST",
        json: { 
          transactions, 
          query: "What is our current financial health and are there any anomalies?" 
        }
      });
      setAiInsight(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Ledger</h2>
          <p className="text-gray-500 text-sm">Track school income, expenses, and AI-powered insights.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setTxForm({ ...txForm, type: "income" });
              setIsTxModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Record Payment
          </button>
          <button 
            onClick={() => {
              setTxForm({ ...txForm, type: "expense" });
              setIsTxModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome, schoolSettings.currency || "UGX")}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpense, schoolSettings.currency || "UGX")}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Net Balance</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(netProfit, schoolSettings.currency || "UGX")}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-100 gap-8">
        {(["all", "expenses", "fees"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search transactions..."
                className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg pl-10 pr-4 py-2 text-sm transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right tracking-widest">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{t.category}</p>
                        {t.studentId && (
                          <p className="text-[10px] text-blue-600 font-black uppercase">{students.find(s => s.id === t.studentId)?.name || "Unknown Student"}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-gray-900">
                        <span className={t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, schoolSettings.currency || "UGX")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">{t.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedTx(t)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Accounting Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/50 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">AI Financial Insights</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Our AI analyzes your transactions to detect anomalies, predict future cash flow, and offer strategic budgeting advice.
            </p>
            <button 
              onClick={handleAiAnalyze}
              disabled={isAiLoading}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-200",
                isAiLoading 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              )}
            >
              {isAiLoading ? "Analyzing Data..." : "Run AI Deep Audit"}
            </button>

            {aiInsight && (
              <div className="mt-6 p-4 bg-white border border-blue-100 rounded-xl animate-in slide-in-from-top-4 duration-300">
                <h4 className="text-xs font-bold text-blue-600 uppercase mb-2">Audit Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                  {aiInsight}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl shadow-gray-200">
            <h4 className="text-sm font-bold mb-4 opacity-70 uppercase tracking-widest">Upcoming Payments</h4>
            <div className="space-y-4">
              {[
                { label: "Faculty Payroll", date: "May 25", amount: 32000 },
                { label: "Insurance Premium", date: "Jun 01", amount: 1500 },
              ].map((p) => (
                <div key={p.label} className="flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold">{p.label}</p>
                    <p className="text-xs text-gray-400">{p.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(p.amount)}</p>
                    <ArrowRight className="w-4 h-4 text-blue-400 mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={cn(
              "p-6 text-white flex justify-between items-center",
              txForm.type === 'income' ? "bg-emerald-600" : "bg-blue-600"
            )}>
              <div>
                <h3 className="text-xl font-bold">Record {txForm.type === 'income' ? 'Collection' : 'Expenditure'}</h3>
                <p className="text-white/80 text-xs">Enter financial record details</p>
              </div>
              <button 
                onClick={() => setIsTxModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
               >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={handleTxSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select 
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                >
                  {txForm.type === 'income' ? (
                    <>
                      <option>Tuition Fees</option>
                      <option>Uniforms</option>
                      <option>Registration</option>
                      <option>Other Income</option>
                    </>
                  ) : (
                    <>
                      <option>Salaries</option>
                      <option>Utilities</option>
                      <option>Stationery</option>
                      <option>Food & Maintenance</option>
                      <option>Other Expense</option>
                    </>
                  )}
                </select>
              </div>

              {txForm.type === 'income' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Student (Optional for fees)</label>
                  <select 
                    value={txForm.studentId}
                    onChange={(e) => setTxForm({ ...txForm, studentId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.reg})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <input 
                    type="number" 
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <input 
                    type="date" 
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Reference / Notes</label>
                <input 
                  type="text" 
                  value={txForm.reference}
                  onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })}
                  placeholder="e.g. Receipt #1234"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                />
              </div>

              <button 
                type="submit"
                className={cn(
                  "w-full py-3 text-white font-bold rounded-xl mt-6 transition-all active:scale-95",
                  txForm.type === 'income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden print:shadow-none animate-in fade-in zoom-in duration-300">
            <div className="p-10 space-y-10" id="printable-invoice">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                    {schoolSettings.name[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight uppercase">{schoolSettings.name}</h2>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">Official Financial Document</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 uppercase">Receipt #TX-{selectedTx.id.slice(0, 8)}</p>
                  <p className="text-xs font-bold text-gray-400">{selectedTx.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Institution Details</p>
                  <div className="text-xs font-bold text-gray-700 space-y-1">
                    <p>{schoolSettings.name}</p>
                    <p>Kampala, Central Region</p>
                    <p>Uganda</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Client Details</p>
                  <div className="text-xs font-bold text-gray-700 space-y-1">
                    {selectedTx.studentId ? (
                      <>
                        <p>{students.find(s => s.id === selectedTx.studentId)?.name}</p>
                        <p>Registration: {students.find(s => s.id === selectedTx.studentId)?.reg}</p>
                        <p>Class: {students.find(s => s.id === selectedTx.studentId)?.class}</p>
                      </>
                    ) : (
                      <p>General Transaction</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 font-black text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Transaction Details</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-6 py-6">
                        <p className="font-black text-gray-900 text-sm uppercase">{selectedTx.category}</p>
                        <p className="text-gray-400 font-bold mt-1 uppercase tracking-tighter">Reference: {selectedTx.reference || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-6 text-right font-black text-gray-900 text-base">
                        {formatCurrency(selectedTx.amount, schoolSettings.currency || "UGX")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-900 text-white font-black">
                    <tr>
                      <td className="px-6 py-6 text-sm uppercase tracking-widest">Grand Total</td>
                      <td className="px-6 py-6 text-right text-lg">
                        {formatCurrency(selectedTx.amount, schoolSettings.currency || "UGX")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-between items-center pt-10 opacity-50">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-gray-400">Payment Status</p>
                  <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase">Confirmed & Verified</span>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-gray-400 mb-6">Authorize Signature</p>
                  <div className="w-40 border-b-2 border-gray-900" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-4 print:hidden">
              <button 
                onClick={printInvoice}
                className="flex-[2] py-3 bg-gray-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Print / Download
              </button>
              <button 
                onClick={() => {
                   const text = `Receipt for ${selectedTx.category}: ${formatCurrency(selectedTx.amount, schoolSettings.currency || "UGX")} - Verified by ${schoolSettings.name}`;
                   alert(`Sharing receipt to student's contact: ${text}`);
                }}
                className="flex-1 py-3 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Share
              </button>
              <button 
                onClick={() => setSelectedTx(null)}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

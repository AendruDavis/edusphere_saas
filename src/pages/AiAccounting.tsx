import React, { useState } from "react";
import { 
  BrainCircuit, 
  Search, 
  Sparkles, 
  Zap, 
  ShieldAlert, 
  Target,
  BarChart3,
  Lightbulb,
  History,
  TrendingDown,
  ArrowRight
} from "lucide-react";
import { cn } from "../lib/utils";

export default function AiAccounting() {
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleDeepAudit = async () => {
    setIsAnalyzing(true);
    // Same endpoint as Finance but with a "Deep Audit" intent
    const res = await fetch("/api/ai/accounting/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        transactions: [
          { category: "Tuition", amount: 120000 },
          { category: "Payroll", amount: 45000 },
          { category: "Maintenance", amount: 5000 },
          { category: "Electricity", amount: 1200 },
          { category: "Water", amount: 400 },
        ],
        query: query || "Perform a full financial health audit and project revenue for next quarter."
      })
    });
    const data = await res.json();
    setResult(data.analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          Powered by Gemini 2.0
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI Accounting Hub</h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Intelligent financial audits, anomaly detection, and automated bookkeeping tailored for EduSphere SaaS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-50/50">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Advanced Financial Query
            </h3>
            <div className="space-y-4">
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything (e.g., 'Compare this year's science department budget with last year's actual spend')..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all text-gray-700 leading-relaxed"
              />
              <div className="flex gap-2">
                {["Anomaly Check", "Q4 Projections", "Tax Readiness"].map((tag) => (
                  <button 
                    key={tag}
                    onClick={() => setQuery(`Perform a ${tag.toLowerCase()} based on current trends.`)}
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleDeepAudit}
                disabled={isAnalyzing}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                  isAnalyzing 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <BrainCircuit className="w-5 h-5 animate-pulse" />
                    Analyzing Financial Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate AI Insight
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-50 ring-1 ring-blue-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-1">Generated Report</h4>
                  <p className="text-2xl font-bold text-gray-900">Intelligence Audit Output</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>
              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {result}
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <History className="w-4 h-4" />
                  Generated 2 seconds ago
                </div>
                <button className="text-sm font-bold text-blue-600 hover:underline">
                  Download PDF Report
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Live Risk Audit
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase">High Risk</span>
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-sm font-bold">Unusual Maintenance Spend</p>
                <p className="text-xs text-gray-400 mt-1">Science lab renovation exceeded budget by 42%.</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase">Warning</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-sm font-bold">Fee Arrears Rising</p>
                <p className="text-xs text-gray-400 mt-1">15% of Grade 10 students have outstanding balances.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Smart Tips</h3>
              <p className="text-sm text-blue-100 leading-relaxed">
                Automating recurring invoices for Grade 12 could save the accounting team up to 8 hours per month.
              </p>
              <button className="text-sm font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                Enable Automation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

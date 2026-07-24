import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  User, 
  Book as BookIcon, 
  Receipt, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Activity,
  Award,
  HeartPulse,
  Stethoscope,
  Pill,
  Users
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { apiRequest } from "../lib/api";
import { SegmentedTabs } from "../components/ui/ResponsivePrimitives";

type StudentStatusSummary = {
  daysAttended: number;
  expectedSchoolDays: number;
  feesBalance: number;
  sicknessStatus: string;
  lastSickbayVisit: string | null;
  booksBorrowed: number;
  borrowedBookTitles: string[];
};

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, borrowings, healthRecords, schoolSettings, getClassFees, transactions } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "fees" | "library" | "health">("overview");
  const [statusSummary, setStatusSummary] = useState<StudentStatusSummary | null>(null);

  // Find the current student from context or use a fallback for mock display
  const foundStudent = students.find(s => s.id === id);
  const studentBorrowings = borrowings.filter(b => b.studentId === id);
  const studentHealth = healthRecords.filter(h => h.studentId === id);
  const studentPayments = transactions.filter(t => t.type === "income" && t.studentId === id);
  
  const expectedFees = foundStudent ? getClassFees(foundStudent.class) : 0;
  const paidFees = foundStudent ? foundStudent.totalFeesPaid : 0;
  const balanceFees = expectedFees - paidFees;

  React.useEffect(() => {
    if (!id) return;
    apiRequest<StudentStatusSummary>(
      `/api/students/${id}/status-summary?term=${encodeURIComponent("Term 1")}&year=${encodeURIComponent(schoolSettings.academicYear || "2026/2027")}`,
    )
      .then(setStatusSummary)
      .catch(() => setStatusSummary(null));
  }, [id, schoolSettings.academicYear]);

  const student = {
    id: foundStudent?.id || id,
    name: foundStudent?.name || "Student Not Found",
    reg: foundStudent?.reg || "---",
    class: foundStudent?.class || "---",
    gender: foundStudent?.gender || "---",
    dob: foundStudent?.dateOfBirth || "---",
    status: foundStudent?.status || "inactive",
    photo: foundStudent?.photo || null,
    fees: {
      total: expectedFees,
      paid: paidFees,
      balance: balanceFees,
      history: studentPayments.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        method: t.reference ? "Logged" : "Cash",
        status: "cleared"
      }))
    },
    parent: {
      name: foundStudent?.parent || "Not Specified",
      phone: foundStudent?.parentPhone || "---",
      email: foundStudent?.parentEmail || "---",
      address: "Registration address contact required"
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/students")}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-100 uppercase sm:w-28 sm:h-28">
              {student.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-gray-900">{student.name}</h2>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full tracking-widest">
                  {student.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{student.reg} • {student.class}</p>
                {student.fees.balance > 0 && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-full tracking-wider border border-rose-100 flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    Balance: {formatCurrency(student.fees.balance || 0, schoolSettings.currency || "UGX")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
            Edit Profile
          </button>
          <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
            Print ID Card
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Fees Balance", value: formatCurrency(statusSummary?.feesBalance ?? student.fees.balance, schoolSettings.currency || "UGX"), dot: "bg-rose-500" },
          { label: "Books Borrowed", value: String(statusSummary?.booksBorrowed ?? studentBorrowings.filter((item) => item.status === "active").length), dot: "bg-amber-500" },
          { label: "Sickness Status", value: statusSummary?.sicknessStatus ?? (studentHealth[0]?.status || "Cleared"), dot: "bg-emerald-500" },
          { label: "Days Attended", value: `${statusSummary?.daysAttended ?? 0}/${statusSummary?.expectedSchoolDays || "-"}`, dot: "bg-blue-500" },
        ].map((item) => (
          <div key={item.label} className="app-card flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p>
            </div>
            <span className={cn("h-3 w-3 rounded-full", item.dot)} />
          </div>
        ))}
      </section>

      {/* Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        label="Student record section"
        options={[
          { value: "overview", label: "Overview" },
          { value: "fees", label: "Fees" },
          { value: "library", label: "Library" },
          { value: "health", label: "Health" },
        ]}
      />

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gender</span>
                  <p className="font-bold text-gray-900">{student.gender}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</span>
                  <p className="font-bold text-gray-900">{student.dob}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blood Group</span>
                  <p className="font-bold text-gray-900">O+ (Positive)</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allergies</span>
                  <p className="font-bold text-rose-600">Peanuts, Dust</p>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50">
                <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-purple-600" />
                  Parent / Guardian Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Primary Contact</span>
                    <p className="font-bold text-gray-900">{student.parent.name}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {student.parent.phone}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {student.parent.email}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {student.parent.address}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="space-y-6 rounded-lg bg-blue-600 p-4 text-white shadow-lg sm:p-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-blue-200">Fees Balance</h4>
              <div className="flex items-end gap-2">
                <span className="break-all text-3xl font-black sm:text-4xl">{formatCurrency(student.fees.balance, schoolSettings.currency || "UGX")}</span>
                <span className="text-lg font-bold opacity-60 mb-1">Due</span>
              </div>
              <div className="h-2 w-full bg-blue-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all shadow-sm" 
                  style={{ width: `${(student.fees.paid / student.fees.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                {Math.round((student.fees.paid / student.fees.total) * 100)}% Paid ({formatCurrency(student.fees.paid, schoolSettings.currency || "UGX")} / {formatCurrency(student.fees.total, schoolSettings.currency || "UGX")})
              </p>
            </div>

            <div className="space-y-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Library Brief</h4>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <BookIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{studentBorrowings.filter(b => b.status === "active").length}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Active Loans</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 rounded-2xl">
                    <HeartPulse className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{studentHealth.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Health Incidents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "fees" && (
        <div className="space-y-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
             <h3 className="text-xl font-bold flex items-center gap-3">
               <Receipt className="w-6 h-6 text-emerald-600" />
               Fee Payment History
             </h3>
             <button className="app-button-primary bg-emerald-600 hover:bg-emerald-700">
               Record New Payment
             </button>
           </div>

           <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 md:hidden">
             {student.fees.history.map((transaction) => (
               <article key={transaction.id} className="app-mobile-record">
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <h3 className="font-semibold text-slate-950">#{transaction.id}</h3>
                     <p className="mt-1 text-sm text-slate-500">{transaction.date} · {transaction.method}</p>
                   </div>
                   <p className="text-sm font-bold text-slate-950">{formatCurrency(transaction.amount, schoolSettings.currency || "UGX")}</p>
                 </div>
                 <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                   {transaction.status}
                 </span>
               </article>
             ))}
             {student.fees.history.length === 0 && <div className="px-4 py-12 text-center text-sm text-slate-500">No payment history.</div>}
           </div>
           <div className="hidden overflow-x-auto md:block">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-gray-100">
                   <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID</th>
                   <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                   <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Method</th>
                   <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                   <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {student.fees.history.map(tx => (
                   <tr key={tx.id}>
                     <td className="py-4 text-sm font-bold text-gray-900 uppercase">#{tx.id}</td>
                     <td className="py-4 text-sm text-gray-500">{tx.date}</td>
                     <td className="py-4 text-sm text-gray-500">{tx.method}</td>
                     <td className="py-4">
                       <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full">
                         {tx.status}
                       </span>
                     </td>
                     <td className="py-4 text-right font-black text-gray-900">{formatCurrency(tx.amount, schoolSettings.currency || "UGX")}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <BookIcon className="w-6 h-6 text-amber-600" />
            Library Borrowing Records
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentBorrowings.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400">
                No library records found.
              </div>
            ) : (
              studentBorrowings.map(item => (
                <div key={item.id} className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{item.bookTitle}</h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        item.status === "active" ? "bg-blue-50 text-blue-600" :
                        item.status === "returned" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Borrowed: {item.borrowDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due Date: {item.dueDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div className="space-y-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <HeartPulse className="w-6 h-6 text-rose-600" />
            Clinical & Sick Bay Records
          </h3>
          <div className="space-y-4">
            {studentHealth.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Clean medical history.
              </div>
            ) : (
              studentHealth.map(record => (
                <div key={record.id} className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-rose-100 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-50 rounded-xl">
                        <Stethoscope className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{record.sickness}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Recorded on {record.date}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      record.status === "sick" ? "bg-rose-50 text-rose-600" :
                      record.status === "sent-home" ? "bg-amber-50 text-amber-600" :
                      record.status === "monitored" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {record.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-50 mb-4">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-emerald-700">{record.medication || "Observation Only"}</span>
                  </div>
                  {record.notes && (
                    <p className="text-xs text-gray-500 italic px-4 border-l-2 border-gray-200">
                      "{record.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

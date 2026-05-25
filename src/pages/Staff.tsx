import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  GraduationCap, 
  Briefcase,
  MoreVertical,
  Download,
  Filter,
  X,
  UserCheck,
  ShieldCheck,
  BookOpen,
  Stethoscope
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";

export default function Staff() {
  const { users, addUser, updateUser, deleteUser, staff, addStaff, updateStaff, deleteStaff, leaveRequests, addLeaveRequest, updateLeaveRequest, schoolSettings } = useApp();
  const [activeTab, setActiveTab] = useState<"users" | "staff" | "leaves">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", email: "", role: "teacher", dept: "", password: "password123" });
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    employeeId: "",
    role: "",
    department: "",
    salary: 0,
    status: "active" as "active" | "on-leave" | "terminated",
    email: "",
    phone: ""
  });
  const [leaveFormData, setLeaveFormData] = useState({
    staffId: "",
    staffName: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    reason: "",
    type: "vacation" as "sick" | "vacation" | "emergency" | "other"
  });

  const filteredUsers = users.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "All" || s.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedStaff = staff.find(s => s.id === leaveFormData.staffId);
    await addLeaveRequest({
      ...leaveFormData,
      staffName: selectedStaff?.name || "Unknown",
      status: "pending",
      appliedDate: new Date().toISOString().split('T')[0]
    });
    setIsLeaveModalOpen(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      await updateStaff(editingStaff.id, staffFormData);
    } else {
      await addStaff(staffFormData);
    }
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({ name: "", email: "", role: "teacher", dept: "", password: "password123" });
  };

  const facultyCount = users.filter(u => u.role === "teacher").length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const accountantCount = users.filter(u => u.role === "accountant").length;
  const librarianCount = users.filter(u => u.role === "librarian").length;
  const nurseCount = users.filter(u => u.role === "nurse").length;

  const handleEdit = (s: any) => {
    setEditingStaff(s);
    setFormData({ name: s.name, email: s.email, role: s.role, dept: s.dept || "", password: "" });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      await deleteUser(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData };
    if (editingStaff && !payload.password) {
      delete payload.password;
    }

    if (editingStaff) {
      await updateUser(editingStaff.id, payload);
    } else {
      await addUser(payload);
    }
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({ name: "", email: "", role: "teacher", dept: "", password: "password123" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff & HR Management</h2>
          <p className="text-gray-500 text-sm">Oversee school personnel, payroll, and department allocations.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "users" && (
            <button 
              onClick={() => { setEditingStaff(null); setFormData({ name: "", email: "", role: "teacher", dept: "", password: "password123" }); setIsModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Admin/Teacher
            </button>
          )}
          {activeTab === "staff" && (
            <button 
              onClick={() => { 
                setEditingStaff(null); 
                setStaffFormData({ name: "", employeeId: "", role: "", department: "", salary: 0, status: "active", email: "", phone: "" });
                setIsModalOpen(true); 
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              Add HR Record
            </button>
          )}
          {activeTab === "leaves" && (
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black shadow-sm transition-all"
            >
              <Briefcase className="w-4 h-4 text-blue-400" />
              Request Leave
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-100 mb-6 gap-8">
        {(["users", "staff", "leaves"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab === "users" ? "System Access" : tab === "staff" ? "Staff Records" : "Leave Management"}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: "Faculty", count: facultyCount, icon: GraduationCap, color: "blue" },
              { label: "Administrative", count: adminCount, icon: ShieldCheck, color: "emerald" },
              { label: "Accounts", count: accountantCount, icon: Users, color: "amber" },
              { label: "Library", count: librarianCount, icon: BookOpen, color: "purple" },
              { label: "Health", count: nurseCount, icon: Stethoscope, color: "rose" },
            ].map((item) => (
              <div key={item.label} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    item.color === "blue" ? "bg-blue-50 text-blue-600" :
                    item.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                    item.color === "amber" ? "bg-amber-50 text-amber-600" :
                    item.color === "purple" ? "bg-purple-50 text-purple-600" :
                    "bg-rose-50 text-rose-600"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none mb-1">{item.label}</p>
                    <p className="text-xl font-black text-gray-900">{item.count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search access accounts..."
                className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg pl-10 pr-4 py-2 text-sm transition-all outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500 italic">{s.role.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{s.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                          s.role === "admin" ? "bg-purple-100 text-purple-700" :
                          s.role === "teacher" ? "bg-blue-100 text-blue-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {s.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Mail className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "leaves" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-6">Staff Member</th>
                <th className="px-6 py-6">Duration</th>
                <th className="px-6 py-6">Type</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaveRequests.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-black text-gray-900 text-sm uppercase tracking-tighter">{leave.staffName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Applied: {leave.appliedDate}</p>
                  </td>
                  <td className="px-6 py-5 font-bold text-gray-600">
                    {leave.startDate} to {leave.endDate}
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-0.5 bg-gray-100 rounded font-black uppercase text-[9px] tracking-widest">
                      {leave.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full font-black uppercase text-[10px] tracking-widest shadow-sm",
                      leave.status === "approved" ? "bg-emerald-500 text-white" :
                      leave.status === "rejected" ? "bg-rose-500 text-white" : "bg-amber-400 text-white"
                    )}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {leave.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => updateLeaveRequest(leave.id, { status: "approved" })}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateLeaveRequest(leave.id, { status: "rejected" })}
                          className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "staff" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-6">Employee</th>
                <th className="px-6 py-6">ID & Dept</th>
                <th className="px-6 py-6">Salary</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-black text-gray-900 text-sm">{s.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.role}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-gray-700 uppercase tracking-tighter">{s.employeeId}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.department}</p>
                  </td>
                  <td className="px-6 py-5 font-black text-gray-900">
                    {formatCurrency(s.salary, schoolSettings.currency || "UGX")}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full font-black uppercase text-[10px] tracking-widest shadow-sm",
                      s.status === "active" ? "bg-emerald-500 text-white" :
                      s.status === "on-leave" ? "bg-blue-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => { setEditingStaff(s); setStaffFormData(s); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><MoreVertical className="w-4 h-4" /></button>
                       <button onClick={() => deleteStaff(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsLeaveModalOpen(false)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-gray-900 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Request Leave</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Employee Time-Off Application</p>
            </div>
            
            <form onSubmit={handleLeaveSubmit} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Staff Member</label>
                <select 
                  required
                  value={leaveFormData.staffId}
                  onChange={(e) => setLeaveFormData({...leaveFormData, staffId: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-900"
                >
                  <option value="">Select Staff...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Start Date</label>
                  <input type="date" value={leaveFormData.startDate} onChange={e => setLeaveFormData({...leaveFormData, startDate: e.target.value})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">End Date</label>
                  <input type="date" value={leaveFormData.endDate} onChange={e => setLeaveFormData({...leaveFormData, endDate: e.target.value})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Leave Type</label>
                <select value={leaveFormData.type} onChange={e => setLeaveFormData({...leaveFormData, type: e.target.value as any})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold">
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reason</label>
                <textarea value={leaveFormData.reason} onChange={e => setLeaveFormData({...leaveFormData, reason: e.target.value})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold min-h-[100px]" required placeholder="State your reason clearly..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Modal (User or Staff HR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{editingStaff ? "Update" : "New"} {activeTab === "users" ? "Login Account" : "HR Record"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={activeTab === "users" ? handleSubmit : handleStaffSubmit} className="p-6 space-y-4">
              {activeTab === "users" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Access Password</label>
                    <input type="text" required={!editingStaff} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-mono" />
                    <p className="text-[10px] text-gray-400 mt-1 italic">{editingStaff ? "Leave blank to keep the existing password." : "Provide this password to the staff member for login."}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold">
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="accountant">Accountant</option>
                      <option value="librarian">Librarian</option>
                      <option value="nurse">Nurse</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Admins can manage settings, users, and financial data.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Employee Name</label>
                      <input type="text" value={staffFormData.name} onChange={e => setStaffFormData({...staffFormData, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Employee ID</label>
                      <input type="text" value={staffFormData.employeeId} onChange={e => setStaffFormData({...staffFormData, employeeId: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Department</label>
                      <input type="text" value={staffFormData.department} onChange={e => setStaffFormData({...staffFormData, department: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Job Title</label>
                      <input type="text" value={staffFormData.role} onChange={e => setStaffFormData({...staffFormData, role: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Monthly Salary</label>
                      <input type="number" value={staffFormData.salary} onChange={e => setStaffFormData({...staffFormData, salary: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-black text-emerald-600" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Work Status</label>
                      <select value={staffFormData.status} onChange={e => setStaffFormData({...staffFormData, status: e.target.value as any})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold">
                        <option value="active">Active</option>
                        <option value="on-leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm">{editingStaff ? "Save" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

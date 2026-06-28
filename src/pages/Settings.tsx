import React, { useState } from "react";
import { 
  Settings as SettingsIcon, 
  School, 
  Shield, 
  Users, 
  Save, 
  Upload,
  UserCheck,
  MoreVertical,
  Check,
  X,
  GraduationCap
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { uploadDataUrlAsset } from "../lib/api";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const { schoolSettings, setSchoolSettings, users, updateUser } = useApp();
  const toast = useToast();
  const [isCompressing, setIsCompressing] = useState(false);
  const [newGrade, setNewGrade] = useState({ min: 0, grade: "A", comment: "Excellent" });
  const [localSettings, setLocalSettings] = useState({
    ...schoolSettings,
    email: schoolSettings.email || "contact@edusphere.edu",
    phone: schoolSettings.phone || "+1 234 567 890",
    address: schoolSettings.address || "123 Education Lane, Academic City",
    academicYear: schoolSettings.academicYear || "2026/2027",
    currency: schoolSettings.currency || "UGX",
    classFees: schoolSettings.classFees || {},
    motto: schoolSettings.motto || "",
    deoCode: schoolSettings.deoCode || "",
    tin: schoolSettings.tin || "",
    primaryColor: schoolSettings.primaryColor || "#0066CC",
    secondaryColor: schoolSettings.secondaryColor || "#009900",
    bankName: schoolSettings.bankName || "",
    bankAccount: schoolSettings.bankAccount || "",
    payCode: schoolSettings.payCode || "",
    reportFooter: schoolSettings.reportFooter || "",
    stampWarning: schoolSettings.stampWarning || "Not Valid without school Official Stamp",
    assessmentModel: schoolSettings.assessmentModel || "percentage_100"
  });

  // Sync local settings when schoolSettings load (first time)
  React.useEffect(() => {
    if (schoolSettings.name) {
      setLocalSettings(prev => ({
        ...prev,
        ...schoolSettings,
        email: schoolSettings.email || prev.email,
        phone: schoolSettings.phone || prev.phone,
        address: schoolSettings.address || prev.address,
        academicYear: schoolSettings.academicYear || prev.academicYear,
        currency: schoolSettings.currency || prev.currency
      }));
    }
  }, [schoolSettings]);

  const addGrade = () => {
    const scale = [...(localSettings.gradingScale || []), newGrade].sort((a, b) => b.min - a.min);
    setLocalSettings({ ...localSettings, gradingScale: scale });
    setNewGrade({ min: 0, grade: "", comment: "" });
  };

  const removeGrade = (index: number) => {
    const scale = (localSettings.gradingScale || []).filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, gradingScale: scale });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const result = canvas.toDataURL("image/jpeg", 0.6);
          setIsCompressing(false);
          resolve(result);
        };
      };
      reader.onerror = (error) => {
        setIsCompressing(false);
        reject(error);
      };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setLocalSettings({ ...localSettings, logo: compressed });
      } catch (err) {
        console.error("Logo compression failed", err);
      }
    }
  };

  const PRIMARY_CLASSES = ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];
  const SECONDARY_CLASSES = ["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"];

  const saveBranding = async () => {
    const storedLogo = await uploadDataUrlAsset(localSettings.logo, "branding");
    await setSchoolSettings({
      name: localSettings.name,
      logo: storedLogo,
      level: localSettings.level as "Primary" | "Secondary",
      classes: localSettings.classes,
      currency: localSettings.currency,
      academicYear: localSettings.academicYear,
      classFees: localSettings.classFees,
      gradingScale: localSettings.gradingScale,
      address: localSettings.address,
      phone: localSettings.phone,
      email: localSettings.email,
      motto: localSettings.motto,
      deoCode: localSettings.deoCode,
      tin: localSettings.tin,
      primaryColor: localSettings.primaryColor,
      secondaryColor: localSettings.secondaryColor,
      bankName: localSettings.bankName,
      bankAccount: localSettings.bankAccount,
      payCode: localSettings.payCode,
      reportFooter: localSettings.reportFooter,
      stampWarning: localSettings.stampWarning,
      assessmentModel: localSettings.assessmentModel
    });
    toast.success("Settings saved successfully.");
  };

  const handleLevelChange = (level: "Primary" | "Secondary") => {
    const newClasses = level === "Primary" ? PRIMARY_CLASSES : SECONDARY_CLASSES;
    setLocalSettings({ ...localSettings, level, classes: newClasses });
  };

  const addClass = () => {
    const className = prompt("Enter new class name:");
    if (className && !localSettings.classes.includes(className)) {
      setLocalSettings({ 
        ...localSettings, 
        classes: [...localSettings.classes, className] 
      });
    }
  };

  const removeClass = (className: string) => {
    setLocalSettings({ 
      ...localSettings, 
      classes: (localSettings.classes || []).filter(c => c !== className) 
    });
  };

  const handleFeeChange = (className: string, amount: number) => {
    setLocalSettings({
      ...localSettings,
      classFees: {
        ...(localSettings.classFees || {}),
        [className]: amount
      }
    });
  };

  const updateRole = async (userId: string, role: string) => {
    await updateUser(userId, { role });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-500 text-sm">Configure school branding, classes, and global preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* School Branding Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
              <School className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">School Profile</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">School Badge / Logo</label>
                <div className="relative w-40 h-40 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group">
                  {localSettings.logo ? (
                    <img src={localSettings.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Upload Logo</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isCompressing}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Official School Name</label>
                  <input 
                    type="text"
                    value={localSettings.name}
                    onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Currency</label>
                    <input 
                      type="text"
                      value={localSettings.currency}
                      onChange={(e) => setLocalSettings({ ...localSettings, currency: e.target.value })}
                      placeholder="e.g. UGX"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Academic Year</label>
                    <input 
                      type="text"
                      value={localSettings.academicYear}
                      onChange={(e) => setLocalSettings({ ...localSettings, academicYear: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Motto</span>
                    <input className="app-input" value={localSettings.motto} onChange={(e) => setLocalSettings({ ...localSettings, motto: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">DEO Code</span>
                    <input className="app-input" value={localSettings.deoCode} onChange={(e) => setLocalSettings({ ...localSettings, deoCode: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Address / P.O. Box</span>
                    <input className="app-input" value={localSettings.address} onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">TIN</span>
                    <input className="app-input" value={localSettings.tin} onChange={(e) => setLocalSettings({ ...localSettings, tin: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Phone</span>
                    <input className="app-input" value={localSettings.phone} onChange={(e) => setLocalSettings({ ...localSettings, phone: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Email</span>
                    <input className="app-input" type="email" value={localSettings.email} onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Primary color</span>
                    <input className="app-input h-11" type="color" value={localSettings.primaryColor} onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Secondary color</span>
                    <input className="app-input h-11" type="color" value={localSettings.secondaryColor} onChange={(e) => setLocalSettings({ ...localSettings, secondaryColor: e.target.value })} />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Bank name</span>
                    <input className="app-input" value={localSettings.bankName} onChange={(e) => setLocalSettings({ ...localSettings, bankName: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Bank account</span>
                    <input className="app-input" value={localSettings.bankAccount} onChange={(e) => setLocalSettings({ ...localSettings, bankAccount: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">School pay-code</span>
                    <input className="app-input" value={localSettings.payCode} onChange={(e) => setLocalSettings({ ...localSettings, payCode: e.target.value })} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-gray-700">Assessment model</span>
                    <select className="app-select" value={localSettings.assessmentModel} onChange={(e) => setLocalSettings({ ...localSettings, assessmentModel: e.target.value as "competency_3" | "percentage_100" })}>
                      <option value="competency_3">Competency A1-A4 (0-3)</option>
                      <option value="percentage_100">Percentage A1-A4 (0-100)</option>
                    </select>
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Official stamp warning</span>
                    <input className="app-input" value={localSettings.stampWarning} onChange={(e) => setLocalSettings({ ...localSettings, stampWarning: e.target.value })} />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-700">Report footer</span>
                    <input className="app-input" value={localSettings.reportFooter} onChange={(e) => setLocalSettings({ ...localSettings, reportFooter: e.target.value })} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Class Fees Section */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Class Fees Configuration</h3>
                <p className="text-xs text-gray-500">Set the standard total fees for each class per term.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {localSettings.classes.map((className) => (
                <div key={className} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{className}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                      {localSettings.currency}
                    </span>
                    <input 
                      type="number"
                      value={localSettings.classFees?.[className] || 0}
                      onChange={(e) => handleFeeChange(className, parseInt(e.target.value) || 0)}
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
               <button 
                onClick={saveBranding}
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100"
               >
                 <Save className="w-4 h-4" />
                 Update Fee Structure
               </button>
            </div>
          </div>

          {/* Grading Scale Section */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Grading Scale System
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Min %</span>
                  <input 
                    type="number" 
                    value={newGrade.min}
                    onChange={(e) => setNewGrade({ ...newGrade, min: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Grade</span>
                  <input 
                    type="text" 
                    value={newGrade.grade}
                    placeholder="A"
                    onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Comment</span>
                  <input 
                    type="text" 
                    value={newGrade.comment}
                    placeholder="Excellent"
                    onChange={(e) => setNewGrade({ ...newGrade, comment: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={addGrade}
                    className="w-full py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-50 rounded-2xl overflow-hidden shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-tighter">
                    <tr>
                      <th className="px-6 py-3">Score &ge;</th>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Recommendation</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(localSettings.gradingScale || []).map((g, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 font-mono font-bold text-blue-600">{g.min}%</td>
                        <td className="px-6 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded-md font-black">{g.grade}</span></td>
                        <td className="px-6 py-3 text-gray-500 italic">{g.comment}</td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => removeGrade(i)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(localSettings.gradingScale || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No grading scale defined.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button 
                onClick={saveBranding}
                disabled={isCompressing}
                className="inline-flex items-center gap-2 px-10 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isCompressing ? "Processing..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* Role Management Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">User Access</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed italic">
              Assign specific roles to users to control which modules they can access.
            </p>

            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{user.email}</p>
                    </div>
                    <div className="p-1 px-2.5 bg-blue-50 text-blue-600 text-[10px] font-extrabold rounded-full uppercase">
                      {user.role}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {["admin", "teacher", "accountant", "parent"].map((role) => (
                      <button 
                        key={role}
                        onClick={() => updateRole(user.id, role)}
                        className={cn(
                          "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap",
                          user.role === role 
                            ? "bg-blue-600 text-white shadow-sm" 
                            : "bg-white text-gray-400 hover:bg-gray-200 border border-gray-100"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4" />
              Invite New User
            </button>
          </div>

          <div className="bg-rose-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Danger Zone
            </h4>
            <p className="text-[11px] text-rose-200 leading-relaxed">
              Reset school data will permanently delete all students, transactions, and academic records. This action cannot be undone.
            </p>
            <button className="w-full py-2 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-colors">
              Factory Reset System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

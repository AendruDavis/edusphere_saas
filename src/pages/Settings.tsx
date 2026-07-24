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

type SettingsSection = "profile" | "fees" | "grading" | "access" | "danger";

export default function Settings() {
  const { schoolSettings, setSchoolSettings, users, updateUser } = useApp();
  const toast = useToast();
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
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
        name: schoolSettings.name || prev.name || "",
        email: schoolSettings.email || prev.email || "",
        phone: schoolSettings.phone || prev.phone || "",
        address: schoolSettings.address || prev.address || "",
        academicYear: schoolSettings.academicYear || prev.academicYear || "",
        currency: schoolSettings.currency || prev.currency || "UGX",
        motto: schoolSettings.motto || prev.motto || "",
        deoCode: schoolSettings.deoCode || prev.deoCode || "",
        tin: schoolSettings.tin || prev.tin || "",
        primaryColor: schoolSettings.primaryColor || prev.primaryColor || "#0066CC",
        secondaryColor: schoolSettings.secondaryColor || prev.secondaryColor || "#009900",
        bankName: schoolSettings.bankName || prev.bankName || "",
        bankAccount: schoolSettings.bankAccount || prev.bankAccount || "",
        payCode: schoolSettings.payCode || prev.payCode || "",
        reportFooter: schoolSettings.reportFooter || prev.reportFooter || "",
        stampWarning: schoolSettings.stampWarning || prev.stampWarning || "",
        classFees: schoolSettings.classFees || prev.classFees || {},
        gradingScale: schoolSettings.gradingScale || prev.gradingScale || [],
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
    <div className="app-page mx-auto max-w-6xl">
      <div>
        <p className="app-page-kicker">Administration</p>
        <h1 className="app-page-title">System Settings</h1>
        <p className="app-page-subtitle">Configure school branding, classes, access, and global preferences.</p>
      </div>

      <label className="app-panel block space-y-2 lg:hidden">
        <span className="text-sm font-semibold text-slate-700">Settings section</span>
        <select className="app-select" value={activeSection} onChange={(event) => setActiveSection(event.target.value as SettingsSection)}>
          <option value="profile">School profile</option>
          <option value="fees">Class fees</option>
          <option value="grading">Grading scale</option>
          <option value="access">User access</option>
          <option value="danger">Danger zone</option>
        </select>
      </label>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* School Branding Section */}
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <div className={cn("app-panel space-y-6 sm:space-y-8", activeSection !== "profile" && "hidden lg:block")}>
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
              <School className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">School Profile</h3>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-widest">School Badge / Logo</label>
                <div className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 sm:h-40 sm:w-40">
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
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className={cn("app-panel space-y-6", activeSection !== "fees" && "hidden lg:block")}>
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
                <div key={className} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{className}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                      {localSettings.currency}
                    </span>
                    <input 
                      type="number"
                      value={localSettings.classFees?.[className] || 0}
                      onChange={(e) => handleFeeChange(className, parseInt(e.target.value) || 0)}
                    className="app-input pl-12 font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
               <button 
                onClick={saveBranding}
                className="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
               >
                 <Save className="w-4 h-4" />
                 Update Fee Structure
               </button>
            </div>
          </div>

          {/* Grading Scale Section */}
          <div className={cn("app-panel", activeSection !== "grading" && "hidden lg:block")}>
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Grading Scale System
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Min %</span>
                  <input 
                    type="number" 
                    value={newGrade.min}
                    onChange={(e) => setNewGrade({ ...newGrade, min: parseInt(e.target.value) || 0 })}
                    className="app-input"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Grade</span>
                  <input 
                    type="text" 
                    value={newGrade.grade}
                    placeholder="A"
                    onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                    className="app-input"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Comment</span>
                  <input 
                    type="text" 
                    value={newGrade.comment}
                    placeholder="Excellent"
                    onChange={(e) => setNewGrade({ ...newGrade, comment: e.target.value })}
                    className="app-input"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={addGrade}
                    className="app-button-primary w-full"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 sm:hidden">
                {(localSettings.gradingScale || []).map((grade, index) => (
                  <div key={`${grade.grade}-${grade.min}`} className="app-mobile-record flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{grade.grade} from {grade.min}%</p>
                      <p className="mt-1 text-sm text-slate-500">{grade.comment}</p>
                    </div>
                    <button type="button" onClick={() => removeGrade(index)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove grade ${grade.grade}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(localSettings.gradingScale || []).length === 0 && <div className="app-empty-state">No grading scale defined.</div>}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-gray-100 sm:block" role="region" aria-label="Grading scale" tabIndex={0}>
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
                          <button onClick={() => removeGrade(i)} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label={`Remove grade ${g.grade}`}>
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
                className="app-button-primary w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {isCompressing ? "Processing..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* Role Management Section */}
        <div className="space-y-6">
          <div className={cn("app-panel space-y-6", activeSection !== "access" && "hidden lg:block")}>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">User Access</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed italic">
              Assign specific roles to users to control which modules they can access.
            </p>

            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{user.email}</p>
                    </div>
                    <div className="p-1 px-2.5 bg-blue-50 text-blue-600 text-[10px] font-extrabold rounded-full uppercase">
                      {user.role}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {["admin", "teacher", "accountant", "parent"].map((role) => (
                      <button 
                        key={role}
                        onClick={() => updateRole(user.id, role)}
                        className={cn(
                          "min-h-11 rounded-lg px-2 py-2 text-xs font-semibold capitalize transition-colors",
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

            <button className="app-button-secondary w-full border-2 border-dashed">
              <UserCheck className="w-4 h-4" />
              Invite New User
            </button>
          </div>

          <div className={cn("space-y-4 rounded-lg bg-rose-900 p-6 text-white shadow-sm", activeSection !== "danger" && "hidden lg:block")}>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Danger Zone
            </h4>
            <p className="text-[11px] text-rose-200 leading-relaxed">
              Reset school data will permanently delete all students, transactions, and academic records. This action cannot be undone.
            </p>
            <button className="app-button w-full bg-rose-500 text-white hover:bg-rose-600">
              Factory Reset System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

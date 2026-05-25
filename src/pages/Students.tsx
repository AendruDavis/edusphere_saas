import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { uploadDataUrlAsset } from "../lib/api";

const studentSchema = z.object({
  firstName: z.string().min(2, "First name is too short"),
  lastName: z.string().min(2, "Last name is too short"),
  class: z.string().min(1, "Class is required"),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.string().min(1, "DOB is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentEmail: z.string().email("Invalid email"),
  parentPhone: z.string().min(10, "Valid phone is required"),
  address: z.string().min(5, "Address is required"),
  photo: z.any().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function Students() {
  const { students, addStudent, updateStudent, deleteStudent, schoolSettings, getClassFees } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema)
  });

  const photoFile = watch("photo");

  React.useEffect(() => {
    if (editingStudent) {
      const [firstName, lastName] = (editingStudent.name || "").split(" ");
      setValue("firstName", firstName || "");
      setValue("lastName", lastName || "");
      setValue("class", editingStudent.class);
      setValue("parentName", editingStudent.parent || "");
      setPhotoPreview(editingStudent.photo);
    } else {
      reset();
      setPhotoPreview(null);
    }
  }, [editingStudent, setValue, reset]);

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
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
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
          const result = canvas.toDataURL("image/jpeg", 0.5); // Lower quality and size
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

  React.useEffect(() => {
    if (photoFile && photoFile[0] instanceof File) {
      compressImage(photoFile[0]).then(compressed => {
        setPhotoPreview(compressed);
      }).catch(err => {
        console.error("Compression failed", err);
      });
    }
  }, [photoFile]);

  const generateRegNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STU-${year}-${random}`;
  };

  const onSubmit = async (data: StudentFormValues) => {
    const storedPhoto = await uploadDataUrlAsset(photoPreview, "students");
    const studentData: any = {
      name: `${data.firstName} ${data.lastName}`,
      reg: editingStudent ? editingStudent.reg : generateRegNumber(),
      class: data.class,
      parent: data.parentName,
      status: "active" as const,
      photo: storedPhoto,
      totalFeesPaid: editingStudent ? editingStudent.totalFeesPaid : 0,
    };

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, studentData);
      } else {
        await addStudent(studentData);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      reset();
      setPhotoPreview(null);
    } catch (error) {
      console.error("Failed to save student", error);
    }
  };

  const filteredStudents = students.filter(student => {
    const name = student.name || "";
    const reg = student.reg || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         reg.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "All" || student.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this student?")) {
      await deleteStudent(id);
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Directory</h2>
          <p className="text-gray-500 text-sm">Manage student enrollment, records, and academic status.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStudent(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Admit Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or class..."
            className="w-full bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-lg pl-10 pr-4 py-2 text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 outline-none"
          >
            <option value="All">All Classes</option>
            {(schoolSettings.classes || []).map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reg. Number</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fees Balance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Parent/Guardian</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {student.name ? student.name.charAt(0) : "?"}
                          </div>
                        )}
                        <div>
                          <Link to={`/students/${student.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {student.name}
                          </Link>
                          <p className="text-xs text-gray-500">Regular Session</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{student.reg}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.class}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        (getClassFees(student.class) - (student.totalFeesPaid || 0)) > 0 
                          ? "bg-rose-50 text-rose-600 border border-rose-100" 
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      )}>
                        {getClassFees(student.class) - (student.totalFeesPaid || 0) > 0 
                          ? `Due: ${getClassFees(student.class) - (student.totalFeesPaid || 0)}` 
                          : "Cleared"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.parent}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        student.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {student.status ? (student.status.charAt(0).toUpperCase() + student.status.slice(1)) : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(student)}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingStudent(null); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{editingStudent ? "Update Student" : "Admission Form"}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingStudent(null); }} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center justify-center space-y-4 pb-6 border-b border-gray-100">
                <div className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="w-8 h-8 text-gray-400" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    {...register("photo")}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isCompressing}
                  />
                  {isCompressing && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {isCompressing ? "Optimizing image..." : "Click to upload profile photo"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <input 
                    {...register("firstName")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <input 
                    {...register("lastName")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.lastName && <p className="text-xs text-red-500 font-medium">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Class/Grade</label>
                  <select 
                    {...register("class")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  >
                    <option value="">Select Class</option>
                    {(schoolSettings.classes || []).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  {errors.class && <p className="text-xs text-red-500 font-medium">{errors.class.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select 
                    {...register("gender")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-500 font-medium">{errors.gender.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <input 
                    {...register("dateOfBirth")}
                    type="date"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.dateOfBirth && <p className="text-xs text-red-500 font-medium">{errors.dateOfBirth.message}</p>}
                </div>

                <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-50">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Parent / Guardian Information</h4>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Parent Full Name</label>
                  <input 
                    {...register("parentName")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.parentName && <p className="text-xs text-red-500 font-medium">{errors.parentName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Parent Phone</label>
                  <input 
                    {...register("parentPhone")}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.parentPhone && <p className="text-xs text-red-500 font-medium">{errors.parentPhone.message}</p>}
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Parent Email</label>
                  <input 
                    {...register("parentEmail")}
                    type="email"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  />
                  {errors.parentEmail && <p className="text-xs text-red-500 font-medium">{errors.parentEmail.message}</p>}
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Home Address</label>
                  <textarea 
                    {...register("address")}
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none" 
                  />
                  {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCompressing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompressing ? "Processing..." : "Submit Admission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

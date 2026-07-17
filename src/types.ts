import type { UserRole } from "../shared/permissions";

export type { UserRole };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  photo?: string | null;
}

export interface SchoolMembership {
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  role: UserRole;
}

export interface SchoolSettings {
  name: string;
  logo: string | null;
  level: "Primary" | "Secondary";
  classes: string[];
  currency?: string;
  academicYear?: string;
  address?: string;
  classFees?: { [key: string]: number };
  phone?: string;
  email?: string;
  gradingScale?: { min: number; grade: string; comment: string }[];
  motto?: string;
  deoCode?: string;
  tin?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bankName?: string;
  bankAccount?: string;
  payCode?: string;
  reportFooter?: string;
  stampWarning?: string;
  assessmentModel?: "competency_3" | "percentage_100";
}

export interface Student {
  id: string;
  name: string;
  reg: string;
  class: string;
  section?: string;
  parent?: string;
  parentPhone?: string;
  parentEmail?: string;
  photo?: string | null;
  status: "active" | "inactive" | "suspended" | "graduated";
  feesBalance: number;
  totalFeesPaid: number;
  admissionDate?: string;
  gender?: string;
  dateOfBirth?: string;
  lin?: string;
  payCode?: string;
  parentWhatsApp?: string;
  biometricReference?: string;
}

export interface Staff {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  status: "active" | "on-leave" | "terminated";
  email?: string;
  phone?: string;
  joinDate?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  type: "sick" | "vacation" | "emergency" | "other";
  appliedDate: string;
}

export interface Mark {
  id: string;
  studentId: string;
  subject: string;
  score: number;
  a1?: number | null;
  a2?: number | null;
  a3?: number | null;
  a4?: number | null;
  idf?: number | null;
  examScore?: number | null;
  courseworkScore?: number | null;
  examWeightedScore?: number | null;
  finalScore?: number | null;
  identifier?: number | null;
  assessmentModel?: "competency_3" | "percentage_100";
  gradingPolicyId?: string | null;
  policySnapshot?: Record<string, unknown> | null;
  term: string;
  year: string;
  comment?: string;
  teacherInitials?: string | null;
  locked?: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  submittedAt?: string | null;
  submittedBy?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paidBy: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  status: string;
  studentId?: string;
  reference?: string;
  description?: string;
  currency?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  available: number;
  total: number;
}

export interface BorrowingRecord {
  id: string;
  studentId: string;
  studentName: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  status: "active" | "returned" | "overdue";
}

export interface HealthRecord {
  id: string;
  studentId: string;
  studentName: string;
  sickness: string;
  diagnosis?: string;
  medication: string;
  actionTaken?: string;
  notifyParent?: boolean;
  parentNotifiedAt?: string;
  status: "sick" | "sent-home" | "back-in-class" | "monitored";
  date: string;
  notes?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  driverId: string;
  driverName: string;
  capacity: number;
  status: "active" | "maintenance" | "inactive";
  lastLocation?: { lat: number; lng: number; lastUpdate: string };
}

export interface Route {
  id: string;
  name: string;
  stops: { name: string; time: string; fee: number }[];
  vehicleId?: string;
  morningStartTime: string;
  eveningStartTime: string;
}

export interface TimetableEntry {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  class: string;
  room: string;
  type?: "class" | "exam";
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  targetRole?: UserRole;
  read: boolean;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: "present" | "absent" | "late";
  role: "Student" | "Staff";
  biometricVerified?: boolean;
  eventType?: "IN" | "OUT";
  parentNotificationStatus?: "not_required" | "queued" | "sent" | "failed" | "pending_approval" | "skipped";
}

export interface FeeStructure {
  id: string;
  className: string;
  term: string;
  academicYear: string;
  items: { name: string; amount: number }[];
  totalAmount: number;
}

export interface Dormitory {
  id: string;
  name: string;
  capacity: number;
  gender: "Male" | "Female" | "Mixed";
  rooms: string[]; // room IDs
  wardenName?: string;
}

export interface DormRoom {
  id: string;
  dormId: string;
  roomNumber: string;
  capacity: number;
  occupants: string[]; // student IDs
}

export interface DormAllocation {
  id: string;
  studentId: string;
  studentName: string;
  dormId: string;
  roomId: string;
  allocationDate: string;
  status: "active" | "checked-out";
}

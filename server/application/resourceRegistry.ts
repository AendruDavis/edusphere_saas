import type { UserRole } from "../domain/roles";
import { ACADEMIC_ROLES, FINANCE_ROLES, HEALTH_ROLES, LIBRARY_ROLES, SCHOOL_ADMINS, USER_ROLES } from "../../shared/permissions";

export type ResourceKey =
  | "users"
  | "students"
  | "staff"
  | "borrowings"
  | "healthRecords"
  | "transactions"
  | "books"
  | "marks"
  | "products"
  | "expenses"
  | "leaveRequests"
  | "feeStructures"
  | "attendanceRecords"
  | "vehicles"
  | "routes"
  | "timetableEntries"
  | "dormitories"
  | "dormRooms"
  | "dormAllocations"
  | "notifications";

export type ResourceConfig = {
  key: ResourceKey;
  table: string;
  read: UserRole[];
  create: UserRole[];
  update: UserRole[];
  delete: UserRole[];
};

const allRoles: UserRole[] = [...USER_ROLES];
const adminOnly: UserRole[] = SCHOOL_ADMINS;
const superAdminOnly: UserRole[] = ["super_admin"];
const academicWriters: UserRole[] = ACADEMIC_ROLES;
const financeWriters: UserRole[] = FINANCE_ROLES;
const libraryWriters: UserRole[] = LIBRARY_ROLES;
const healthWriters: UserRole[] = HEALTH_ROLES;
const transportWriters: UserRole[] = ["super_admin", "admin", "driver"];
const hostelWriters: UserRole[] = ["super_admin", "admin", "staff"];

const studentReaders: UserRole[] = ["super_admin", "admin", "teacher", "accountant", "student", "parent"];
const academicReaders: UserRole[] = ["super_admin", "admin", "teacher", "student", "parent", "accountant"];
const financeReaders: UserRole[] = ["super_admin", "admin", "accountant", "student", "parent"];
const libraryReaders: UserRole[] = ["super_admin", "admin", "teacher", "librarian", "student"];
const healthReaders: UserRole[] = HEALTH_ROLES;
const transportReaders: UserRole[] = ["super_admin", "admin", "driver", "student", "parent"];
const hostelReaders: UserRole[] = ["super_admin", "admin", "teacher", "staff"];

export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  users: { key: "users", table: "users", read: adminOnly, create: adminOnly, update: adminOnly, delete: superAdminOnly },
  students: { key: "students", table: "students", read: studentReaders, create: adminOnly, update: adminOnly, delete: adminOnly },
  staff: { key: "staff", table: "staff", read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  borrowings: { key: "borrowings", table: "borrowings", read: libraryReaders, create: libraryWriters, update: libraryWriters, delete: adminOnly },
  healthRecords: { key: "healthRecords", table: "health_records", read: healthReaders, create: healthWriters, update: healthWriters, delete: adminOnly },
  transactions: { key: "transactions", table: "transactions", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  books: { key: "books", table: "books", read: libraryReaders, create: libraryWriters, update: libraryWriters, delete: adminOnly },
  marks: { key: "marks", table: "marks", read: academicReaders, create: academicWriters, update: academicWriters, delete: adminOnly },
  products: { key: "products", table: "inventory", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  expenses: { key: "expenses", table: "expenses", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  leaveRequests: { key: "leaveRequests", table: "leave_requests", read: adminOnly, create: ["super_admin", "admin", "teacher", "staff"], update: adminOnly, delete: adminOnly },
  feeStructures: { key: "feeStructures", table: "fee_structures", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  attendanceRecords: { key: "attendanceRecords", table: "attendance_records", read: ["admin", "teacher", "nurse"], create: ["admin", "teacher", "nurse"], update: ["admin", "teacher"], delete: adminOnly },
  vehicles: { key: "vehicles", table: "vehicles", read: transportReaders, create: transportWriters, update: transportWriters, delete: adminOnly },
  routes: { key: "routes", table: "routes", read: transportReaders, create: transportWriters, update: transportWriters, delete: adminOnly },
  timetableEntries: { key: "timetableEntries", table: "timetable_entries", read: academicReaders, create: academicWriters, update: academicWriters, delete: adminOnly },
  dormitories: { key: "dormitories", table: "dormitories", read: hostelReaders, create: hostelWriters, update: hostelWriters, delete: adminOnly },
  dormRooms: { key: "dormRooms", table: "dorm_rooms", read: hostelReaders, create: hostelWriters, update: hostelWriters, delete: adminOnly },
  dormAllocations: { key: "dormAllocations", table: "dorm_allocations", read: hostelReaders, create: hostelWriters, update: hostelWriters, delete: adminOnly },
  notifications: { key: "notifications", table: "notifications", read: allRoles, create: ["admin", "teacher"], update: allRoles, delete: adminOnly },
};

export const SNAPSHOT_RESOURCES = Object.keys(RESOURCE_CONFIGS) as ResourceKey[];

export function getResourceConfig(resource: string) {
  return RESOURCE_CONFIGS[resource as ResourceKey];
}

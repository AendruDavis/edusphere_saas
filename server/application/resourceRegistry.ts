import type { UserRole } from "../domain/roles";

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

const allRoles: UserRole[] = ["admin", "teacher", "student", "parent", "accountant", "staff", "driver", "librarian", "nurse"];
const adminOnly: UserRole[] = ["admin"];
const academicWriters: UserRole[] = ["admin", "teacher"];
const financeWriters: UserRole[] = ["admin", "accountant"];
const libraryWriters: UserRole[] = ["admin", "teacher", "librarian"];
const healthWriters: UserRole[] = ["admin", "teacher", "nurse"];
const transportWriters: UserRole[] = ["admin", "driver"];
const hostelWriters: UserRole[] = ["admin", "teacher", "staff"];

const studentReaders: UserRole[] = ["admin", "teacher", "accountant"];
const academicReaders: UserRole[] = ["admin", "teacher", "student", "parent"];
const financeReaders: UserRole[] = ["admin", "accountant"];
const libraryReaders: UserRole[] = ["admin", "teacher", "librarian", "student"];
const healthReaders: UserRole[] = ["admin", "teacher", "nurse"];
const transportReaders: UserRole[] = ["admin", "driver", "student", "parent"];
const hostelReaders: UserRole[] = ["admin", "teacher", "staff"];

export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  users: { key: "users", table: "users", read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  students: { key: "students", table: "students", read: studentReaders, create: ["admin", "teacher", "accountant"], update: ["admin", "teacher", "accountant"], delete: adminOnly },
  staff: { key: "staff", table: "staff", read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  borrowings: { key: "borrowings", table: "borrowings", read: libraryReaders, create: libraryWriters, update: libraryWriters, delete: adminOnly },
  healthRecords: { key: "healthRecords", table: "health_records", read: healthReaders, create: healthWriters, update: healthWriters, delete: adminOnly },
  transactions: { key: "transactions", table: "transactions", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  books: { key: "books", table: "books", read: libraryReaders, create: libraryWriters, update: libraryWriters, delete: adminOnly },
  marks: { key: "marks", table: "marks", read: academicReaders, create: academicWriters, update: academicWriters, delete: adminOnly },
  products: { key: "products", table: "inventory", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  expenses: { key: "expenses", table: "expenses", read: financeReaders, create: financeWriters, update: financeWriters, delete: adminOnly },
  leaveRequests: { key: "leaveRequests", table: "leave_requests", read: adminOnly, create: ["admin", "teacher", "staff"], update: ["admin"], delete: adminOnly },
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

import type { AppModule, SchoolRole } from "../../shared/permissions";
import { MODULE_PERMISSIONS } from "../../shared/permissions";

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
  module: AppModule;
  read: SchoolRole[];
  create: SchoolRole[];
  update: SchoolRole[];
  delete: SchoolRole[];
};

function resource(key: ResourceKey, table: string, module: AppModule): ResourceConfig {
  return { key, table, module, ...MODULE_PERMISSIONS[module] };
}

export const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  users: resource("users", "users", "staff"),
  students: resource("students", "students", "students"),
  staff: resource("staff", "staff", "staff"),
  borrowings: resource("borrowings", "borrowings", "library"),
  healthRecords: resource("healthRecords", "health_records", "sickBay"),
  transactions: resource("transactions", "transactions", "finance"),
  books: resource("books", "books", "library"),
  marks: resource("marks", "marks", "grades"),
  products: resource("products", "inventory", "inventory"),
  expenses: resource("expenses", "expenses", "finance"),
  leaveRequests: resource("leaveRequests", "leave_requests", "staff"),
  feeStructures: resource("feeStructures", "fee_structures", "fees"),
  attendanceRecords: resource("attendanceRecords", "attendance_records", "attendance"),
  vehicles: resource("vehicles", "vehicles", "transport"),
  routes: resource("routes", "routes", "transport"),
  timetableEntries: resource("timetableEntries", "timetable_entries", "timetable"),
  dormitories: resource("dormitories", "dormitories", "hostels"),
  dormRooms: resource("dormRooms", "dorm_rooms", "hostels"),
  dormAllocations: resource("dormAllocations", "dorm_allocations", "hostels"),
  notifications: resource("notifications", "notifications", "communication"),
};

export const SNAPSHOT_RESOURCES = Object.keys(RESOURCE_CONFIGS) as ResourceKey[];

export function getResourceConfig(resourceKey: string) {
  return RESOURCE_CONFIGS[resourceKey as ResourceKey];
}

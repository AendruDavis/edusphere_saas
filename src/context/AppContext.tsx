import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest, clearAuthSession, getAccessToken, setAuthSession } from "../lib/api";
import { useToast } from "./ToastContext";
import {
  AppNotification,
  AttendanceRecord,
  Book,
  BorrowingRecord,
  DormAllocation,
  Dormitory,
  DormRoom,
  Expense,
  FeeStructure,
  HealthRecord,
  LeaveRequest,
  Mark,
  Product,
  Route,
  SchoolSettings,
  Staff,
  Student,
  TimetableEntry,
  Transaction,
  User,
  Vehicle,
} from "../types";

interface AppContextType {
  schoolSettings: SchoolSettings;
  setSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  currentUser: User | null;
  students: Student[];
  addStudent: (student: Omit<Student, "id">) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  users: User[];
  addUser: (user: Omit<User, "id">) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  borrowings: BorrowingRecord[];
  addBorrowing: (record: Omit<BorrowingRecord, "id">) => Promise<void>;
  updateBorrowing: (id: string, data: Partial<BorrowingRecord>) => Promise<void>;
  healthRecords: HealthRecord[];
  addHealthRecord: (record: Omit<HealthRecord, "id">) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (record: Omit<Transaction, "id">) => Promise<void>;
  books: Book[];
  addBook: (book: Omit<Book, "id">) => Promise<void>;
  updateBook: (id: string, data: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  marks: Mark[];
  addMark: (mark: Omit<Mark, "id">) => Promise<void>;
  updateMark: (id: string, data: Partial<Mark>) => Promise<void>;
  deleteMark: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  staff: Staff[];
  addStaff: (member: Omit<Staff, "id">) => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (request: Omit<LeaveRequest, "id">) => Promise<void>;
  updateLeaveRequest: (id: string, data: Partial<LeaveRequest>) => Promise<void>;
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (record: Omit<AttendanceRecord, "id">) => Promise<void>;
  feeStructures: FeeStructure[];
  addFeeStructure: (fee: Omit<FeeStructure, "id">) => Promise<void>;
  updateFeeStructure: (id: string, data: Partial<FeeStructure>) => Promise<void>;
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  routes: Route[];
  addRoute: (route: Omit<Route, "id">) => Promise<void>;
  updateRoute: (id: string, data: Partial<Route>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  timetableEntries: TimetableEntry[];
  getClassFees: (className: string) => number;
  addTimetableEntry: (entry: Omit<TimetableEntry, "id">) => Promise<void>;
  updateTimetableEntry: (id: string, data: Partial<TimetableEntry>) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  dormitories: Dormitory[];
  addDormitory: (dorm: Omit<Dormitory, "id">) => Promise<void>;
  updateDormitory: (id: string, data: Partial<Dormitory>) => Promise<void>;
  deleteDormitory: (id: string) => Promise<void>;
  dormRooms: DormRoom[];
  addDormRoom: (room: Omit<DormRoom, "id">) => Promise<void>;
  updateDormRoom: (id: string, data: Partial<DormRoom>) => Promise<void>;
  deleteDormRoom: (id: string) => Promise<void>;
  dormAllocations: DormAllocation[];
  allocateDorm: (allocation: Omit<DormAllocation, "id">) => Promise<void>;
  updateAllocation: (id: string, data: Partial<DormAllocation>) => Promise<void>;
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, "id">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  login: () => Promise<void>;
  loginWithCredentials: (email: string, pass: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
}

type AppSnapshot = {
  schoolSettings: SchoolSettings;
  users: User[];
  students: Student[];
  staff: Staff[];
  borrowings: BorrowingRecord[];
  healthRecords: HealthRecord[];
  transactions: Transaction[];
  books: Book[];
  marks: Mark[];
  products: Product[];
  expenses: Expense[];
  leaveRequests: LeaveRequest[];
  feeStructures: FeeStructure[];
  attendanceRecords: AttendanceRecord[];
  vehicles: Vehicle[];
  routes: Route[];
  timetableEntries: TimetableEntry[];
  dormitories: Dormitory[];
  dormRooms: DormRoom[];
  dormAllocations: DormAllocation[];
  notifications: AppNotification[];
};

type ResourceKey =
  | "students"
  | "users"
  | "borrowings"
  | "healthRecords"
  | "books"
  | "marks"
  | "products"
  | "expenses"
  | "staff"
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

const PRIMARY_CLASSES = ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];

const DEFAULT_SETTINGS: SchoolSettings = {
  name: "EduSphere Academy",
  logo: null,
  level: "Primary",
  classes: PRIMARY_CLASSES,
  currency: "UGX",
  academicYear: "2026/2027",
  classFees: {},
  gradingScale: [
    { min: 80, grade: "D1", comment: "Distinction 1" },
    { min: 75, grade: "D2", comment: "Distinction 2" },
    { min: 70, grade: "C3", comment: "Credit 3" },
    { min: 65, grade: "C4", comment: "Credit 4" },
    { min: 60, grade: "C5", comment: "Credit 5" },
    { min: 55, grade: "C6", comment: "Credit 6" },
    { min: 50, grade: "P7", comment: "Pass 7" },
    { min: 45, grade: "P8", comment: "Pass 8" },
    { min: 0, grade: "F9", comment: "Fail 9" },
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function emptySnapshot(settings = DEFAULT_SETTINGS): AppSnapshot {
  return {
    schoolSettings: settings,
    users: [],
    students: [],
    staff: [],
    borrowings: [],
    healthRecords: [],
    transactions: [],
    books: [],
    marks: [],
    products: [],
    expenses: [],
    leaveRequests: [],
    feeStructures: [],
    attendanceRecords: [],
    vehicles: [],
    routes: [],
    timetableEntries: [],
    dormitories: [],
    dormRooms: [],
    dormAllocations: [],
    notifications: [],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => emptySnapshot());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySnapshot = useCallback((next: Partial<AppSnapshot>) => {
    setSnapshot({
      ...emptySnapshot(next.schoolSettings || DEFAULT_SETTINGS),
      ...next,
      schoolSettings: next.schoolSettings || DEFAULT_SETTINGS,
    });
  }, []);

  const refreshData = useCallback(async () => {
    const next = await apiRequest<AppSnapshot>("/api/app/snapshot");
    applySnapshot(next);
  }, [applySnapshot]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await apiRequest<{ user: User }>("/api/auth/me");
        if (!isMounted) return;
        setCurrentUser(user);
        await refreshData();
      } catch (error) {
        console.error("Session restore failed", error);
        clearAuthSession();
        if (isMounted) {
          setCurrentUser(null);
          applySnapshot(emptySnapshot());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, [applySnapshot, refreshData]);

  const createResource = async <T,>(resource: ResourceKey, payload: T) => {
    await apiRequest(`/api/resources/${resource}`, { method: "POST", json: payload });
    await refreshData();
  };

  const updateResource = async <T,>(resource: ResourceKey, id: string, payload: T) => {
    await apiRequest(`/api/resources/${resource}/${id}`, { method: "PATCH", json: payload });
    await refreshData();
  };

  const deleteResource = async (resource: ResourceKey, id: string) => {
    await apiRequest(`/api/resources/${resource}/${id}`, { method: "DELETE" });
    await refreshData();
  };

  const login = async () => {
    toast.info("Google SSO can be added later. Credential login is active for now.");
  };

  const loginWithCredentials = async (email: string, pass: string, role: string) => {
    setIsLoggingIn(true);
    try {
      const session = await apiRequest<{ accessToken: string; refreshToken?: string; user: User }>("/api/auth/login", {
        method: "POST",
        json: { email, pass, role },
      });
      setAuthSession(session);
      setCurrentUser(session.user);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Credential login failed");
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    clearAuthSession();
    setCurrentUser(null);
    applySnapshot(emptySnapshot());
  };

  const setSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    const nextSettings = {
      ...snapshot.schoolSettings,
      ...settings,
      currency: settings.currency || snapshot.schoolSettings.currency || "UGX",
      academicYear: settings.academicYear || snapshot.schoolSettings.academicYear || "2026/2027",
      classFees: {
        ...(snapshot.schoolSettings.classFees || {}),
        ...(settings.classFees || {}),
      },
    };

    await apiRequest<SchoolSettings>("/api/settings/school", {
      method: "PUT",
      json: nextSettings,
    });
    await refreshData();
  };

  const getClassFees = (className: string) => snapshot.schoolSettings.classFees?.[className] || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        schoolSettings: snapshot.schoolSettings,
        setSchoolSettings,
        currentUser,
        students: snapshot.students,
        addStudent: (student) => createResource("students", student),
        updateStudent: (id, data) => updateResource("students", id, data),
        deleteStudent: (id) => deleteResource("students", id),
        users: snapshot.users,
        addUser: async (user) => {
          await apiRequest<User>("/api/users", { method: "POST", json: user });
          await refreshData();
        },
        updateUser: async (id, data) => {
          await apiRequest<User>(`/api/users/${id}`, { method: "PATCH", json: data });
          await refreshData();
        },
        deleteUser: async (id) => {
          await apiRequest(`/api/users/${id}`, { method: "DELETE" });
          await refreshData();
        },
        borrowings: snapshot.borrowings,
        addBorrowing: (record) => createResource("borrowings", record),
        updateBorrowing: (id, data) => updateResource("borrowings", id, data),
        healthRecords: snapshot.healthRecords,
        addHealthRecord: (record) => createResource("healthRecords", record),
        transactions: snapshot.transactions,
        addTransaction: async (record) => {
          await apiRequest<Transaction>("/api/transactions", { method: "POST", json: record });
          await refreshData();
        },
        books: snapshot.books,
        addBook: (book) => createResource("books", book),
        updateBook: (id, data) => updateResource("books", id, data),
        deleteBook: (id) => deleteResource("books", id),
        marks: snapshot.marks,
        addMark: (mark) => createResource("marks", mark),
        updateMark: (id, data) => updateResource("marks", id, data),
        deleteMark: (id) => deleteResource("marks", id),
        products: snapshot.products,
        addProduct: (product) => createResource("products", product),
        updateProduct: (id, data) => updateResource("products", id, data),
        deleteProduct: (id) => deleteResource("products", id),
        expenses: snapshot.expenses,
        addExpense: async (expense) => {
          await apiRequest<Expense>("/api/expenses", { method: "POST", json: expense });
          await refreshData();
        },
        updateExpense: (id, data) => updateResource("expenses", id, data),
        deleteExpense: (id) => deleteResource("expenses", id),
        staff: snapshot.staff,
        addStaff: (member) => createResource("staff", member),
        updateStaff: (id, data) => updateResource("staff", id, data),
        deleteStaff: (id) => deleteResource("staff", id),
        leaveRequests: snapshot.leaveRequests,
        addLeaveRequest: (request) => createResource("leaveRequests", request),
        updateLeaveRequest: (id, data) => updateResource("leaveRequests", id, data),
        attendanceRecords: snapshot.attendanceRecords,
        addAttendanceRecord: async (record) => {
          await apiRequest<AttendanceRecord>("/api/attendance", { method: "POST", json: record });
          await refreshData();
        },
        feeStructures: snapshot.feeStructures,
        addFeeStructure: (fee) => createResource("feeStructures", fee),
        updateFeeStructure: (id, data) => updateResource("feeStructures", id, data),
        vehicles: snapshot.vehicles,
        addVehicle: (vehicle) => createResource("vehicles", vehicle),
        updateVehicle: (id, data) => updateResource("vehicles", id, data),
        deleteVehicle: (id) => deleteResource("vehicles", id),
        routes: snapshot.routes,
        addRoute: (route) => createResource("routes", route),
        updateRoute: (id, data) => updateResource("routes", id, data),
        deleteRoute: (id) => deleteResource("routes", id),
        timetableEntries: snapshot.timetableEntries,
        getClassFees,
        addTimetableEntry: (entry) => createResource("timetableEntries", entry),
        updateTimetableEntry: (id, data) => updateResource("timetableEntries", id, data),
        deleteTimetableEntry: (id) => deleteResource("timetableEntries", id),
        dormitories: snapshot.dormitories,
        addDormitory: (dorm) => createResource("dormitories", dorm),
        updateDormitory: (id, data) => updateResource("dormitories", id, data),
        deleteDormitory: (id) => deleteResource("dormitories", id),
        dormRooms: snapshot.dormRooms,
        addDormRoom: (room) => createResource("dormRooms", room),
        updateDormRoom: (id, data) => updateResource("dormRooms", id, data),
        deleteDormRoom: (id) => deleteResource("dormRooms", id),
        dormAllocations: snapshot.dormAllocations,
        allocateDorm: (allocation) => createResource("dormAllocations", allocation),
        updateAllocation: (id, data) => updateResource("dormAllocations", id, data),
        notifications: snapshot.notifications,
        addNotification: (notification) => createResource("notifications", notification),
        markNotificationRead: (id) => updateResource("notifications", id, { read: true }),
        login,
        loginWithCredentials,
        logout,
        isLoggingIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

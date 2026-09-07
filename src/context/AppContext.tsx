import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { rolesCan, type AppModule, type PermissionAction, type SchoolRole } from "../../shared/permissions";
import { DEFAULT_REPORT_SETTINGS } from "../../shared/reportSettings";
import { apiRequest, clearAuthSession, getAccessToken, getActiveSchoolId, setActiveSchoolId, setAuthSession } from "../lib/api";
import { useToast } from "./ToastContext";
import type {
  AppNotification,
  AccountProvisioningResult,
  AttendanceRecord,
  Book,
  BorrowingRecord,
  DormAllocation,
  Dormitory,
  DormRoom,
  Expense,
  FeeStructure,
  FeeBalance,
  FeePeriod,
  HealthRecord,
  LeaveRequest,
  Mark,
  Product,
  Route,
  SchoolMembership,
  SchoolSettings,
  Staff,
  Student,
  Subject,
  TimetableEntry,
  Transaction,
  User,
  Vehicle,
} from "../types";

interface AppContextType {
  schoolSettings: SchoolSettings;
  setSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  currentUser: User | null;
  schools: SchoolMembership[];
  activeSchoolId: string | null;
  activeRoles: SchoolRole[];
  can: (module: AppModule, action?: PermissionAction) => boolean;
  setActiveSchool: (schoolId: string) => Promise<void>;
  students: Student[];
  addStudent: (student: Omit<Student, "id">) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  users: User[];
  addUser: (user: { name: string; email: string; roles: SchoolRole[]; dept?: string; photo?: string | null; confirmPassword?: string }) => Promise<AccountProvisioningResult>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  updateUserRoles: (id: string, roles: SchoolRole[], confirmPassword?: string) => Promise<void>;
  resetUserPassword: (id: string, confirmPassword: string) => Promise<AccountProvisioningResult>;
  deleteUser: (id: string, confirmPassword?: string) => Promise<void>;
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, "id" | "active"> & { active?: boolean }) => Promise<void>;
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  deactivateSubject: (id: string) => Promise<void>;
  borrowings: BorrowingRecord[];
  addBorrowing: (record: Omit<BorrowingRecord, "id">) => Promise<void>;
  updateBorrowing: (id: string, data: Partial<BorrowingRecord>) => Promise<void>;
  healthRecords: HealthRecord[];
  addHealthRecord: (record: Omit<HealthRecord, "id">) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (record: Omit<Transaction, "id">) => Promise<void>;
  recordFeePayment: (payment: { studentId: string; amount: number; term: string; year: string; method: string; paidAt?: string; description?: string }) => Promise<void>;
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
  recordAttendanceEvent: (event: { studentId: string; timestamp: string; type: "IN" | "OUT"; source: "manual" }) => Promise<void>;
  feeStructures: FeeStructure[];
  addFeeStructure: (fee: Omit<FeeStructure, "id">) => Promise<void>;
  updateFeeStructure: (id: string, data: Partial<FeeStructure>) => Promise<void>;
  deactivateFeeStructure: (id: string) => Promise<void>;
  feeBalances: FeeBalance[];
  feePeriod: FeePeriod;
  refreshFeeBalances: (period?: Partial<FeePeriod> & { className?: string }) => Promise<void>;
  getStudentFeeBalance: (studentId: string) => FeeBalance | undefined;
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
  loginWithCredentials: (email: string, pass: string, schoolSlug?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
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
  feeBalances: FeeBalance[];
  feePeriod: FeePeriod;
  subjects: Subject[];
  attendanceRecords: AttendanceRecord[];
  vehicles: Vehicle[];
  routes: Route[];
  timetableEntries: TimetableEntry[];
  dormitories: Dormitory[];
  dormRooms: DormRoom[];
  dormAllocations: DormAllocation[];
  notifications: AppNotification[];
};

type ResourceKey = "students" | "users" | "borrowings" | "healthRecords" | "books" | "marks" | "products" | "expenses" | "staff" | "leaveRequests" | "feeStructures" | "attendanceRecords" | "vehicles" | "routes" | "timetableEntries" | "dormitories" | "dormRooms" | "dormAllocations" | "notifications";

const PRIMARY_CLASSES = ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];
const DEFAULT_SETTINGS: SchoolSettings = {
  name: "EduSphere Academy",
  logo: null,
  logoVariants: {},
  brandingVersion: 1,
  reportSettings: DEFAULT_REPORT_SETTINGS,
  level: "Primary",
  classes: PRIMARY_CLASSES,
  currency: "UGX",
  academicYear: "2026/2027",
  currentTerm: "Term 1",
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
    schoolSettings: settings, users: [], students: [], staff: [], borrowings: [], healthRecords: [], transactions: [],
    books: [], marks: [], products: [], expenses: [], leaveRequests: [], feeStructures: [], feeBalances: [],
    feePeriod: { term: settings.currentTerm || "Term 1", year: settings.academicYear || "2026/2027" }, subjects: [], attendanceRecords: [],
    vehicles: [], routes: [], timetableEntries: [], dormitories: [], dormRooms: [], dormAllocations: [], notifications: [],
  };
}

function userForMembership(user: User, membership: SchoolMembership): User {
  return { ...user, role: membership.role, roles: membership.roles };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<SchoolMembership[]>([]);
  const [activeSchoolIdState, setActiveSchoolIdState] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => emptySnapshot());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeMembership = useMemo(
    () => schools.find((membership) => membership.schoolId === activeSchoolIdState) ?? null,
    [activeSchoolIdState, schools],
  );
  const activeRoles = activeMembership?.roles ?? [];
  const can = useCallback((module: AppModule, action: PermissionAction = "read") => rolesCan(activeRoles, module, action), [activeRoles]);

  const applySnapshot = useCallback((next: Partial<AppSnapshot>) => {
    const settings = next.schoolSettings || DEFAULT_SETTINGS;
    setSnapshot({ ...emptySnapshot(settings), ...next, schoolSettings: settings });
  }, []);

  const refreshData = useCallback(async () => {
    applySnapshot(await apiRequest<AppSnapshot>("/api/app/snapshot"));
  }, [applySnapshot]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--school-primary", snapshot.schoolSettings.primaryColor || "#0066CC");
    root.style.setProperty("--school-secondary", snapshot.schoolSettings.secondaryColor || "#009900");
    document.title = `${snapshot.schoolSettings.name || "EduSphere"} | EduSphere`;
    const favicon = snapshot.schoolSettings.logoVariants?.favicon;
    if (favicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = `${favicon}?v=${snapshot.schoolSettings.brandingVersion || 1}`;
    }
  }, [snapshot.schoolSettings]);

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user, schools: memberships } = await apiRequest<{ user: User; schools: SchoolMembership[] }>("/api/auth/me");
        if (!mounted) return;
        const storedSchoolId = getActiveSchoolId();
        const membership = memberships.find((entry) => entry.schoolId === storedSchoolId) ?? memberships[0];
        if (!membership) throw new Error("This account has no active school membership");
        setActiveSchoolId(membership.schoolId);
        setActiveSchoolIdState(membership.schoolId);
        setSchools(memberships);
        setCurrentUser(userForMembership(user, membership));
        if (!user.mustChangePassword) await refreshData();
      } catch (error) {
        console.error("Session restore failed", error);
        clearAuthSession();
        if (mounted) {
          setCurrentUser(null);
          applySnapshot(emptySnapshot());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void restoreSession();
    return () => { mounted = false; };
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

  const login = async () => { toast.info("Google SSO can be added later. Credential login is active for now."); };
  const loginWithCredentials = async (email: string, pass: string, schoolSlug?: string) => {
    setIsLoggingIn(true);
    try {
      const session = await apiRequest<{ accessToken: string; refreshToken?: string; preferredSchoolId?: string | null; user: User }>("/api/auth/login", {
        method: "POST", json: { email, pass, schoolSlug },
      });
      setAuthSession(session);
      const memberships = await apiRequest<SchoolMembership[]>("/api/me/schools");
      const membership = memberships.find((entry) => entry.schoolId === session.preferredSchoolId) ?? memberships[0];
      if (!membership) throw new Error("This account has no active school membership");
      setActiveSchoolId(membership.schoolId);
      setActiveSchoolIdState(membership.schoolId);
      setSchools(memberships);
      setCurrentUser(userForMembership(session.user, membership));
      if (!session.user.mustChangePassword) await refreshData();
    } catch (error) {
      clearAuthSession();
      toast.error(errorMessage(error, "Credential login failed"));
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    clearAuthSession();
    setCurrentUser(null);
    setSchools([]);
    setActiveSchoolIdState(null);
    applySnapshot(emptySnapshot());
    document.title = "EduSphere";
  };

  const setSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    const nextSettings: SchoolSettings = {
      ...snapshot.schoolSettings,
      ...settings,
      currency: settings.currency || snapshot.schoolSettings.currency || "UGX",
      academicYear: settings.academicYear || snapshot.schoolSettings.academicYear || "2026/2027",
      currentTerm: settings.currentTerm || snapshot.schoolSettings.currentTerm || "Term 1",
      classFees: { ...(snapshot.schoolSettings.classFees || {}), ...(settings.classFees || {}) },
      reportSettings: settings.reportSettings || snapshot.schoolSettings.reportSettings || DEFAULT_REPORT_SETTINGS,
    };
    await apiRequest<SchoolSettings>("/api/settings/school", { method: "PUT", json: nextSettings });
    const auth = await apiRequest<{ user: User; schools: SchoolMembership[] }>("/api/auth/me");
    const membership = auth.schools.find((entry) => entry.schoolId === activeSchoolIdState) ?? auth.schools[0];
    setSchools(auth.schools);
    if (membership) setCurrentUser(userForMembership(auth.user, membership));
    await refreshData();
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const session = await apiRequest<{ accessToken: string; refreshToken: string; user: User }>("/api/auth/change-password", {
      method: "POST",
      json: { currentPassword, newPassword, confirmPassword },
    });
    setAuthSession(session);
    const membership = schools.find((entry) => entry.schoolId === activeSchoolIdState) ?? schools[0];
    setCurrentUser(membership ? userForMembership(session.user, membership) : session.user);
    await refreshData();
  };

  const refreshFeeBalances = async (period: Partial<FeePeriod> & { className?: string } = {}) => {
    const params = new URLSearchParams();
    if (period.term) params.set("term", period.term);
    if (period.year) params.set("year", period.year);
    if (period.className) params.set("className", period.className);
    const result = await apiRequest<{ term: string; year: string; balances: FeeBalance[] }>(`/api/fees/balances?${params}`);
    setSnapshot((current) => ({ ...current, feeBalances: result.balances, feePeriod: { term: result.term, year: result.year } }));
  };

  const setActiveSchool = async (schoolId: string) => {
    const membership = schools.find((entry) => entry.schoolId === schoolId);
    if (!membership) throw new Error("You do not have access to this school");
    setActiveSchoolId(schoolId);
    setActiveSchoolIdState(schoolId);
    setCurrentUser((user) => user ? userForMembership(user, membership) : user);
    await refreshData();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /></div>;
  }

  return (
    <AppContext.Provider value={{
      schoolSettings: snapshot.schoolSettings,
      setSchoolSettings,
      currentUser,
      schools,
      activeSchoolId: activeSchoolIdState,
      activeRoles,
      can,
      setActiveSchool,
      students: snapshot.students,
      addStudent: (student) => createResource("students", student),
      updateStudent: (id, data) => updateResource("students", id, data),
      deleteStudent: (id) => deleteResource("students", id),
      users: snapshot.users,
      addUser: async (user) => { const created = await apiRequest<AccountProvisioningResult>("/api/users", { method: "POST", json: user }); await refreshData(); return created; },
      updateUser: async (id, data) => { await apiRequest<User>(`/api/users/${id}`, { method: "PATCH", json: data }); await refreshData(); },
      updateUserRoles: async (id, roles, confirmPassword) => { await apiRequest(`/api/users/${id}/roles`, { method: "PUT", json: { roles, confirmPassword } }); await refreshData(); },
      resetUserPassword: async (id, confirmPassword) => { const result = await apiRequest<AccountProvisioningResult>(`/api/users/${id}/reset-password`, { method: "POST", json: { confirmPassword } }); await refreshData(); return result; },
      deleteUser: async (id, confirmPassword) => { await apiRequest(`/api/users/${id}`, { method: "DELETE", json: { confirmPassword } }); await refreshData(); },
      subjects: snapshot.subjects,
      addSubject: async (subject) => { await apiRequest("/api/subjects", { method: "POST", json: subject }); await refreshData(); },
      updateSubject: async (id, subject) => { await apiRequest(`/api/subjects/${id}`, { method: "PUT", json: subject }); await refreshData(); },
      deactivateSubject: async (id) => { await apiRequest(`/api/subjects/${id}`, { method: "DELETE" }); await refreshData(); },
      borrowings: snapshot.borrowings,
      addBorrowing: (record) => createResource("borrowings", record),
      updateBorrowing: (id, data) => updateResource("borrowings", id, data),
      healthRecords: snapshot.healthRecords,
      addHealthRecord: (record) => createResource("healthRecords", record),
      transactions: snapshot.transactions,
      addTransaction: async (record) => { await apiRequest<Transaction>("/api/transactions", { method: "POST", json: record }); await refreshData(); },
      recordFeePayment: async (payment) => { await apiRequest("/api/fees/pay", { method: "POST", json: payment }); await refreshData(); },
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
      addExpense: async (expense) => { await apiRequest<Expense>("/api/expenses", { method: "POST", json: expense }); await refreshData(); },
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
      addAttendanceRecord: async (record) => { await apiRequest<AttendanceRecord>("/api/attendance", { method: "POST", json: record }); await refreshData(); },
      recordAttendanceEvent: async (event) => { await apiRequest<AttendanceRecord>("/api/attendance/manual", { method: "POST", json: event }); await refreshData(); },
      feeStructures: snapshot.feeStructures,
      addFeeStructure: async (fee) => { await apiRequest("/api/fee-structures", { method: "POST", json: fee }); await refreshData(); },
      updateFeeStructure: async (id, data) => { await apiRequest(`/api/fee-structures/${id}`, { method: "PUT", json: data }); await refreshData(); },
      deactivateFeeStructure: async (id) => { await apiRequest(`/api/fee-structures/${id}`, { method: "DELETE" }); await refreshData(); },
      feeBalances: snapshot.feeBalances,
      feePeriod: snapshot.feePeriod,
      refreshFeeBalances,
      getStudentFeeBalance: (studentId) => snapshot.feeBalances.find((balance) => balance.studentId === studentId),
      vehicles: snapshot.vehicles,
      addVehicle: (vehicle) => createResource("vehicles", vehicle),
      updateVehicle: (id, data) => updateResource("vehicles", id, data),
      deleteVehicle: (id) => deleteResource("vehicles", id),
      routes: snapshot.routes,
      addRoute: (route) => createResource("routes", route),
      updateRoute: (id, data) => updateResource("routes", id, data),
      deleteRoute: (id) => deleteResource("routes", id),
      timetableEntries: snapshot.timetableEntries,
      getClassFees: (className) => snapshot.feeStructures.find((fee) =>
        fee.active !== false && fee.className === className && fee.term === snapshot.feePeriod.term && fee.academicYear === snapshot.feePeriod.year
      )?.totalAmount || 0,
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
      changePassword,
      logout,
      isLoggingIn,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}

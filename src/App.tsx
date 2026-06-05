import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";

// Lazy load components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const Finance = lazy(() => import("./pages/Finance"));
const Staff = lazy(() => import("./pages/Staff"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AiAccounting = lazy(() => import("./pages/AiAccounting"));
const Academics = lazy(() => import("./pages/Academics"));
const Library = lazy(() => import("./pages/Library"));
const Fees = lazy(() => import("./pages/Fees"));
const SickBay = lazy(() => import("./pages/SickBay"));
const Communication = lazy(() => import("./pages/Communication"));
const Reports = lazy(() => import("./pages/Reports"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Settings = lazy(() => import("./pages/Settings"));
const Transport = lazy(() => import("./pages/Transport"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Grades = lazy(() => import("./pages/Grades"));
const Hostels = lazy(() => import("./pages/Hostels"));
const Login = lazy(() => import("./pages/Login"));

function LoadingView() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">Initializing Module...</p>
      </div>
    </div>
  );
}

function RoleProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { currentUser } = useApp();

  if (!currentUser) return <Navigate to="/login" />;
  if (!roles.includes(currentUser.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return (
      <BrowserRouter>
        <Suspense fallback={<LoadingView />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  const navRoles = {
    dashboard: ["admin", "teacher", "accountant", "parent", "student", "driver", "librarian", "nurse"],
    students: ["admin", "teacher", "accountant"],
    staff: ["admin"],
    academics: ["admin", "teacher"],
    grades: ["admin", "teacher", "parent", "student"],
    timetable: ["admin", "teacher", "parent", "student"],
    transport: ["admin", "driver", "parent", "student"],
    hostels: ["admin", "teacher", "staff"],
    attendance: ["admin", "teacher"],
    library: ["admin", "teacher", "student", "librarian"],
    sickBay: ["admin", "teacher", "nurse"],
    fees: ["admin", "accountant", "parent"],
    finance: ["admin", "accountant"],
    communication: ["admin", "teacher", "parent", "student", "librarian", "nurse"],
    reports: ["admin", "accountant", "teacher"],
    aiAccounting: ["admin", "accountant"],
    inventory: ["admin", "accountant"],
    settings: ["admin"]
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingView />}>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          
          <Route path="/students" element={
            <RoleProtectedRoute roles={navRoles.students}>
              <AppLayout><Students /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/students/:id" element={
            <RoleProtectedRoute roles={navRoles.students}>
              <AppLayout><StudentDetail /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/staff" element={
            <RoleProtectedRoute roles={navRoles.staff}>
              <AppLayout><Staff /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/academics" element={
            <RoleProtectedRoute roles={navRoles.academics}>
              <AppLayout><Academics /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/grades" element={
            <RoleProtectedRoute roles={navRoles.grades}>
              <AppLayout><Grades /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/timetable" element={
            <RoleProtectedRoute roles={navRoles.timetable}>
              <AppLayout><Timetable /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/transport" element={
            <RoleProtectedRoute roles={navRoles.transport}>
              <AppLayout><Transport /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/hostels" element={
            <RoleProtectedRoute roles={navRoles.hostels}>
              <AppLayout><Hostels /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <RoleProtectedRoute roles={navRoles.attendance}>
              <AppLayout><Attendance /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/library" element={
            <RoleProtectedRoute roles={navRoles.library}>
              <AppLayout><Library /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/sick-bay" element={
            <RoleProtectedRoute roles={navRoles.sickBay}>
              <AppLayout><SickBay /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/fees" element={
            <RoleProtectedRoute roles={navRoles.fees}>
              <AppLayout><Fees /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/finance" element={
            <RoleProtectedRoute roles={navRoles.finance}>
              <AppLayout><Finance /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/communication" element={
            <RoleProtectedRoute roles={navRoles.communication}>
              <AppLayout><Communication /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <RoleProtectedRoute roles={navRoles.reports}>
              <AppLayout><Reports /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/ai-accounting" element={
            <RoleProtectedRoute roles={navRoles.aiAccounting}>
              <AppLayout><AiAccounting /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/inventory" element={
            <RoleProtectedRoute roles={navRoles.inventory}>
              <AppLayout><Inventory /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <RoleProtectedRoute roles={navRoles.settings}>
              <AppLayout><Settings /></AppLayout>
            </RoleProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ToastProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <h2 className="text-xl font-bold text-gray-900">{title} Module</h2>
      <p className="text-gray-500 mt-2">This module is currently being developed. Stay tuned!</p>
    </div>
  );
}

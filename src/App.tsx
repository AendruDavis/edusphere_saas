import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { AppModule } from "../shared/permissions";
import AppLayout from "./components/layout/AppLayout";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Finance = lazy(() => import("./pages/Finance"));
const Staff = lazy(() => import("./pages/Staff"));
const StaffMonitoring = lazy(() => import("./pages/StaffMonitoring"));
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
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

const protectedRoutes: Array<{ path: string; module: AppModule; component: React.LazyExoticComponent<React.ComponentType> }> = [
  { path: "/students", module: "students", component: Students },
  { path: "/students/admissions", module: "admissions", component: Admissions },
  { path: "/students/:id", module: "students", component: StudentDetail },
  { path: "/staff", module: "staff", component: Staff },
  { path: "/staff/m-e", module: "staff", component: StaffMonitoring },
  { path: "/staff/appraisal", module: "staff", component: StaffMonitoring },
  { path: "/academics", module: "academics", component: Academics },
  { path: "/grades", module: "grades", component: Grades },
  { path: "/timetable", module: "timetable", component: Timetable },
  { path: "/transport", module: "transport", component: Transport },
  { path: "/hostels", module: "hostels", component: Hostels },
  { path: "/attendance", module: "attendance", component: Attendance },
  { path: "/library", module: "library", component: Library },
  { path: "/sick-bay", module: "sickBay", component: SickBay },
  { path: "/fees", module: "fees", component: Fees },
  { path: "/finance", module: "finance", component: Finance },
  { path: "/communication", module: "communication", component: Communication },
  { path: "/reports", module: "reports", component: Reports },
  { path: "/ai-accounting", module: "aiAccounting", component: AiAccounting },
  { path: "/inventory", module: "inventory", component: Inventory },
  { path: "/settings", module: "settings", component: Settings },
];

function LoadingView() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-slate-900" />
        <p className="text-xs font-semibold text-slate-500">Loading workspace...</p>
      </div>
    </div>
  );
}

function CapabilityRoute({ children, module }: { children: React.ReactNode; module: AppModule }) {
  const { currentUser, can } = useApp();
  if (!currentUser) return <Navigate to="/login" />;
  if (!can(module)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser } = useApp();
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingView />}>
        {!currentUser ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/school/:schoolSlug/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : currentUser.mustChangePassword ? (
          <Routes>
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/change-password" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            {protectedRoutes.map(({ path, module, component: Component }) => (
              <React.Fragment key={path}>
                <Route
                  path={path}
                  element={(
                    <CapabilityRoute module={module}>
                      <AppLayout><Component /></AppLayout>
                    </CapabilityRoute>
                  )}
                />
              </React.Fragment>
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
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

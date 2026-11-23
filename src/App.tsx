import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GeofenceProvider } from "@/context/GeofenceContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChaosEngine } from "@/components/chaos/ChaosEngine";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import DataEntryPage from "./pages/DataEntryPage";
import ReservoirsPage from "./pages/ReservoirsPage";
import BugControllerPage from "./pages/BugControllerPage";
import CyberLeekPortal from './pages/CyberLeekPortal';
import EmployeesPage from "./pages/EmployeesPage";
import LocationsPage from "./pages/LocationsPage";
import SettingsPage from "./pages/SettingsPage";
import EmailConfirmation from "./pages/EmailConfirmation";
import AuditLogPage from "./pages/AuditLogPage";
import ReservoirKPIsPage from "./pages/ReservoirKPIsPage";
import ReservoirBreakdownPage from "./pages/ReservoirBreakdownPage";
import TagTrackingPage from "./pages/TagTrackingPage";
import IceDetailsPage from "./pages/IceDetailsPage";
import NotificationsPage from "./pages/NotificationsPage";

import AssociationBillEntryPage from "./pages/AssociationBillEntryPage";
import AssociationBillsAdminPage from "./pages/AssociationBillsAdminPage";
import SuppliersPage from "./pages/SuppliersPage";
import PricesItemsPage from "./pages/PricesItemsPage";
import HarvestDetailsReportPage from "./pages/HarvestDetailsReportPage";
import HarvestDailyCostPage from "./pages/HarvestDailyCostPage";
import PackingBillsPage from "./pages/PackingBillsPage";
import AssociationRegistrationPage from "./pages/AssociationRegistrationPage";
import CenterExpensesPage from "./pages/CenterExpensesPage";
import { supabase } from "@/integrations/supabase/client";
import '@fontsource/outfit/300.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
// Helper to bypass strict typing
const db = supabase as any;

function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  allowedRoles?: Array<'super_admin' | 'employee' | 'fisheries_association' | 'packing_staff'>;
}) {
  const { isAuthenticated, isLoading, hasRole, user, userRole } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const checkEmployeeStatus = async () => {
      try {
        if (!user || hasRole('super_admin') || userRole === 'packing_staff') {
          // Super admins and packing staff are always allowed
          setIsActive(true);
          return;
        }

        // Check employee status for regular employees
        const { data: employeeData, error } = await db
          .from('employees')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking employee status in ProtectedRoute:", error);
          setIsActive(true);
        } else if (employeeData && employeeData.status === 'inactive') {
          setIsActive(false);
          // Sign out inactive employee
          await supabase.auth.signOut();
        } else {
          setIsActive(true);
        }
      } catch (err) {
        console.error("Failed to check employee status in ProtectedRoute:", err);
        setIsActive(true);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (isAuthenticated && user) {
      checkEmployeeStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [isAuthenticated, user, hasRole, userRole]);

  if (isLoading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isActive) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !hasRole('super_admin')) {
    return <Navigate to="/admin/association-bills" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const ok = allowedRoles.some((r) => hasRole(r as any));
    if (!ok) {
      if (userRole === 'fisheries_association') return <Navigate to="/association/bills/new" replace />;
      if (userRole === 'packing_staff') return <Navigate to="/packing/bills" replace />;
      return <Navigate to="/admin/association-bills" replace />;
    }
  }

  return <MainLayout>{children}</MainLayout>;
}

function RoleHomeRedirect() {
  const { userRole, isLoading } = useAuth();
  if (isLoading) return null;
  if (userRole === 'fisheries_association') {
    return <Navigate to="/association/bills/new" replace />;
  }
  if (userRole === 'packing_staff') {
    return <Navigate to="/packing/bills" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <RoleHomeRedirect />
            : <LoginForm
              title="ReservoirApp"
              description="Geofencing-based water management system"
              requiredRoles={['super_admin', 'employee']}
              alternateLogin={{
                label: "Fisheries Association Login",
                to: "/association/login",
              }}
            />
        }
      />
      <Route
        path="/association/login"
        element={
          isAuthenticated
            ? <RoleHomeRedirect />
            : <LoginForm
              title="Fisheries Association Portal"
              description="Login to enter invoices/bills"
              requiredRoles={['fisheries_association']}
              alternateLogin={{
                label: "Admin / Employee Login",
                to: "/login",
              }}
            />
        }
      />
      <Route
        path="/packing/login"
        element={
          isAuthenticated
            ? <RoleHomeRedirect />
            : <LoginForm
              title="Packing Staff Portal"
              description="Login to verify and confirm packing data"
              requiredRoles={['packing_staff']}
              alternateLogin={{
                label: "Admin / Employee Login",
                to: "/login",
              }}
            />
        }
      />
      <Route
        path="/auth/callback"
        element={<EmailConfirmation />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <RoleHomeRedirect /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/association/bills/new"
        element={
          <ProtectedRoute allowedRoles={['fisheries_association', 'super_admin']}>
            <AssociationBillEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing/bills"
        element={
          <ProtectedRoute allowedRoles={['packing_staff', 'super_admin']}>
            <PackingBillsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/association-bills"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <AssociationBillsAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/association-registration"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <AssociationRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservoirs"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <ReservoirsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservoirs/kpis"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <ReservoirKPIsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservoirs/breakdown"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <ReservoirBreakdownPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tags"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <TagTrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ice-details"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <IceDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee', 'fisheries_association', 'packing_staff']}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <LocationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prices-items"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <PricesItemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/harvest"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'packing_staff', 'employee']}>
            <HarvestDetailsReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/daily-harvest-cost"
        element={
          <ProtectedRoute adminOnly allowedRoles={['super_admin']}>
            <HarvestDailyCostPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/center/expenses"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'employee']}>
            <CenterExpensesPage />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

function RealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("Initializing Supabase Realtime synchronization...");
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload) => {
          console.log('Realtime database update received:', payload);
          if (payload.table) {
            // Invalidate query key matching the table name
            queryClient.invalidateQueries({ queryKey: [payload.table] });
            
            // Handle special/derived query keys
            if (payload.table === 'employees') {
              queryClient.invalidateQueries({ queryKey: ['current_employee'] });
            }
            if (payload.table === 'locations' || payload.table === 'employees') {
              queryClient.invalidateQueries({ queryKey: ['employee_locations'] });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GeofenceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* <ChaosEngine /> */}
          <BrowserRouter>
            {/* <RealtimeSync /> */}
            <Routes>
              <Route path="/cyber-leek" element={<CyberLeekPortal />} />
              <Route path="*" element={<AppRoutes />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GeofenceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

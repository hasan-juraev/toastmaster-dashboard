import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./app/AuthProvider";
import { useAuth } from "./app/AuthContext";
import { useProfile } from "./hooks/useProfile";
import { queryClient } from "./lib/queryClient";
import { AppLoadingScreen } from "./components/ui/AppLoadingScreen";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import Analytics from "./pages/Analytics";
import LinkProfile from "./pages/LinkProfile";
import RoleSignup from "./pages/RoleSignup";
import MyRoleDashboard from "./pages/MyRoleDashboard";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen message="Checking your club session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LinkedRoute({ children }: { children: React.ReactNode }) {
  const { isLinked } = useProfile();
  const { loading } = useAuth();

  if (loading) return <AppLoadingScreen />;
  if (!isLinked) return <Navigate to="/link-profile" replace />;
  return <>{children}</>;
}

function MemberSelfRoute({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, memberId } = useProfile();

  if (!isAdmin && memberId !== id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-app-text-muted">Access denied.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useProfile();
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-app-text-muted">Access denied — admins only.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/link-profile"
        element={
          <ProtectedRoute>
            <LinkProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/role-signup"
        element={
          <ProtectedRoute>
            <LinkedRoute>
              <RoleSignup />
            </LinkedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-role/:meetingId"
        element={
          <ProtectedRoute>
            <LinkedRoute>
              <MyRoleDashboard />
            </LinkedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Members />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute>
            <MemberSelfRoute>
              <MemberDetail />
            </MemberSelfRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute>
            <Meetings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings/:id"
        element={
          <ProtectedRoute>
            <MeetingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

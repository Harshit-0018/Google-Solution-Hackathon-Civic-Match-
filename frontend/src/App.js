import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import NGOPortal from "./pages/NGOPortal";
import VolunteerPortal from "./pages/VolunteerPortal";
import AdminPortal from "./pages/AdminPortal";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="label-mono">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.role) return <Navigate to="/onboarding" replace />;
  if (roles && !roles.includes(user.role)) {
    const home = user.role === "admin" ? "/admin" : user.role === "ngo" ? "/ngo" : "/volunteer";
    return <Navigate to={home} replace />;
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Check URL fragment (not query params) for session_id - MUST run synchronously during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={
        <ProtectedRoute roles={null}><Onboarding /></ProtectedRoute>
      } />
      <Route path="/ngo/*" element={
        <ProtectedRoute roles={["ngo", "admin"]}><NGOPortal /></ProtectedRoute>
      } />
      <Route path="/volunteer/*" element={
        <ProtectedRoute roles={["volunteer", "admin"]}><VolunteerPortal /></ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute roles={["admin"]}><AdminPortal /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

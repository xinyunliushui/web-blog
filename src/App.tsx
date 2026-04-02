/*
 * @Date: 2026-03-31 08:59:27
 * @Author: zhongwenhao
 * @LastEditors: zhongwenhao
 * @LastEditTime: 2026-04-02 10:05:48
 * @Description:
 */
import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "antd/dist/reset.css";
import AdminLayout from "./layouts/AdminLayout";
import UserPage from "./pages/UserPage";
import RolePage from "./pages/RolePage";
import ResourcePage from "./pages/ResourcePage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";

/** 已登录访问 `/` 时进后台，未登录进登录页 */
function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/users" : "/login"} replace />;
}

/** 已登录时不允许留在登录/注册页 */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/users" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/users" element={<UserPage />} />
          <Route path="/roles" element={<RolePage />} />
          <Route path="/resources" element={<ResourcePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

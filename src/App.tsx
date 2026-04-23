/*
 * @Date: 2026-03-31 08:59:27
 * @Author: zhongwenhao
 * @LastEditors: zhongwenhao
 * @LastEditTime: 2026-04-02 10:05:48
 * @Description:
 */
import { ReactNode } from "react";
import { Spin } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "antd/dist/reset.css";
import AdminLayout from "./layouts/AdminLayout";
import UserPage from "./pages/UserPage";
import RolePage from "./pages/RolePage";
import ResourcePage from "./pages/ResourcePage";
import BlogPage from "./pages/BlogPage";
import BlogCreatePage from "./pages/BlogCreatePage";
import BlogPublicListPage from "./pages/BlogPublicListPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthorizedRoute from "./components/AuthorizedRoute";
import NoAccessPage from "./pages/NoAccessPage";

/** 已登录访问 `/` 时进后台，未登录进登录页 */
function RootRedirect() {
  const { user, sessionReady, accessMenuLoading, accessMenuPaths } = useAuth();
  if (!sessionReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (accessMenuLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (accessMenuPaths.length === 0) {
    return <Navigate to="/no-access" replace />;
  }
  return <Navigate to={accessMenuPaths[0]} replace />;
}

/** 已登录时不允许留在登录/注册页 */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user, sessionReady, accessMenuLoading, accessMenuPaths } = useAuth();
  if (!sessionReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (accessMenuLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={accessMenuPaths[0] || "/no-access"} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/blogs" element={<BlogPublicListPage />} />
      <Route path="/blogs/:blogId" element={<BlogDetailPage />} />
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
          <Route path="/no-access" element={<NoAccessPage />} />
          <Route path="/blog/create" element={<BlogCreatePage />} />
          <Route path="/blog/edit/:blogId" element={<BlogCreatePage />} />
          <Route element={<AuthorizedRoute />}>
            <Route path="/system/users" element={<UserPage />} />
            <Route path="/system/roles" element={<RolePage />} />
            <Route path="/system/resources" element={<ResourcePage />} />
            <Route path="/content/blogs" element={<BlogPage />} />
          </Route>
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

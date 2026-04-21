import { Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoadingScreen = () => (
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

export const AuthorizedRoute = () => {
  const location = useLocation();
  const { user, sessionReady, accessMenuLoading, accessMenuPaths } = useAuth();

  if (!sessionReady || accessMenuLoading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const pathname = location.pathname;
  if (pathname === "/no-access") {
    return <Outlet />;
  }

  if (accessMenuPaths.length === 0) {
    return <Navigate to="/no-access" replace />;
  }

  if (!accessMenuPaths.includes(pathname)) {
    return <Navigate to="/no-access" replace />;
  }

  return <Outlet />;
};

export default AuthorizedRoute;

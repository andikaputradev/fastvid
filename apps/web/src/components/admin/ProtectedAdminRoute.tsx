import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminSession } from "../../hooks/useAdminAuth";
import { LoadingState } from "./LoadingState";

export function ProtectedAdminRoute() {
  const location = useLocation();
  const session = useAdminSession();

  if (session.isLoading) {
    return <LoadingState label="Checking admin session" />;
  }

  if (session.isError || session.data === undefined) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

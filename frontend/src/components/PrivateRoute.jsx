import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingBlock } from "./LoadingBlock";
import { useAuth } from "../context/AuthContext";

export function PrivateRoute() {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingBlock label="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
